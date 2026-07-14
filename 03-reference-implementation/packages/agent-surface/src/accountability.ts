/*
 * Copyright 2026 Black Mountain AI (BMAI)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Delegation and confirmation-checkpoint logic (Guiderails 5.1.1, 5.1.2,
 * 5.3.1, 5.3.2, 5.5.1, 5.5.2). Every rejection is programmatically legible: a
 * stable code plus plain language, because 5.1.1 requires the service to
 * reject *safely and with a reason*, not merely to refuse.
 */

import type { ConfirmationChannel, RedeemRequest, RedeemResult } from './confirmation.ts';

export interface ConsequentialActionSpec {
  id: string;
  journeyId: string;
  title: string;
  /** 5.3.1: whether principal confirmation is designated for this action. */
  confirmationDesignated: boolean;
  /**
   * 5.3.3: whether any agent may execute this action at all. Defaults to true;
   * `false` designates a **principal-only action**.
   *
   * The register as 5.3.1 describes it knows two kinds of action: agent-executable
   * with confirmation, and agent-executable without. Some actions are neither.
   * Issuing, widening or reinstating a delegation is the clearest case: an agent
   * permitted to do it can grant itself a new, unbounded delegation, and 5.1.2's
   * scoping and time-bounding become decorative. Such actions belong to the
   * principal alone, and by 5.1.3 no delegation — however carefully scoped —
   * conveys them.
   */
  agentExecutable?: boolean;
}

export type DelegationStatus = 'active' | 'suspended' | 'revoked';

export interface Delegation {
  id: string;
  principalId: string;
  agentId: string;
  /** 5.1.2: scoped to journeys and consequential actions. */
  scope: { journeys: string[]; actions: string[] };
  /** ISO 8601 timestamps; 5.1.2: time-bounded. */
  validFrom: string;
  validTo: string;
  status: DelegationStatus;
  /**
   * 5.5.3: when true, consequential actions under this delegation do not execute
   * directly — they queue for the principal's approval (the review-before-execute
   * mode). Optional; absent means the delegation executes in the normal way.
   */
  reviewBeforeExecute?: boolean;
}

export interface ConfirmationEvent {
  actionId: string;
  /** The principal the confirmation is attributable to (5.3.1). */
  principalId: string;
  /** ISO 8601 timestamp. */
  at: string;
  /**
   * 5.3.2: the service-issued token proving the principal confirmed through a
   * channel the agent does not control. An agent can present one; it cannot
   * mint one. Absent here, the "confirmation" is an interaction inside the
   * agent's own session and confirms nothing.
   */
  token?: string;
  /** How it reached the service. Only `principal-channel` is attributable. */
  channel?: ConfirmationChannel;
}

export type RejectionCode =
  | 'DELEGATION_MISSING'
  | 'DELEGATION_REVOKED'
  | 'DELEGATION_SUSPENDED'
  | 'DELEGATION_NOT_YET_VALID'
  | 'DELEGATION_EXPIRED'
  | 'SCOPE_JOURNEY'
  | 'SCOPE_ACTION'
  | 'AGENT_MISMATCH'
  /** 5.3.3: the action is the principal's alone; by 5.1.3 no delegation conveys it. */
  | 'AGENT_MAY_NOT_EXECUTE'
  | 'CONFIRMATION_REQUIRED'
  | 'CONFIRMATION_PRINCIPAL_MISMATCH'
  | 'CONFIRMATION_ACTION_MISMATCH'
  /** 5.3.2: presented from inside the agent-driven session, so not attributable. */
  | 'CONFIRMATION_NOT_PRINCIPAL_ATTRIBUTABLE'
  | 'CONFIRMATION_UNKNOWN'
  | 'CONFIRMATION_ALREADY_USED'
  | 'CONFIRMATION_EXPIRED';

export type AuthorisationResult =
  | {
      authorised: true;
      delegationId: string;
      principalId: string;
      /** 5.5.2: every consequential action under a delegation is notified. */
      requiresNotification: true;
      /** 5.2.1: the resulting record must be flagged agent-originated. */
      attribution: { agentOriginated: true; agentId: string };
    }
  | { authorised: false; reason: { code: RejectionCode; message: string } };

export interface AuthorisationRequest {
  action: ConsequentialActionSpec;
  agentId: string;
  delegation?: Delegation;
  confirmation?: ConfirmationEvent;
  /** ISO 8601 timestamp of the attempted action. */
  at: string;
  /**
   * 5.3.2: redeems a service-issued confirmation token. REQUIRED whenever the
   * action is confirmation-designated — without it there is no way to tell a
   * principal's confirmation from one the agent invented, and the checkpoint
   * is decorative. Supplied by the service, never by the agent.
   */
  redeemConfirmation?: (req: RedeemRequest) => RedeemResult;
}

function reject(code: RejectionCode, message: string): AuthorisationResult {
  return { authorised: false, reason: { code, message } };
}

export function authoriseConsequentialAction(req: AuthorisationRequest): AuthorisationResult {
  const { action, delegation, confirmation, at, agentId, redeemConfirmation } = req;

  // 5.3.3: checked before anything else, and independently of the delegation
  // presented. A delegation that names this action is not a wider grant — it is a
  // defective one, and honouring it would let an agent authorise itself.
  if (action.agentExecutable === false) {
    return reject(
      'AGENT_MAY_NOT_EXECUTE',
      `Action "${action.id}" can be performed only by the principal. No delegation conveys it, and one that names it does not widen what an agent may do.`,
    );
  }

  if (!delegation) {
    return reject(
      'DELEGATION_MISSING',
      `Consequential action "${action.id}" requires a valid delegation naming the principal and scoping the action; none was presented.`,
    );
  }
  if (delegation.agentId !== agentId) {
    return reject('AGENT_MISMATCH', `The presented delegation was issued to a different agent.`);
  }
  if (delegation.status === 'revoked') {
    return reject('DELEGATION_REVOKED', `Delegation ${delegation.id} has been revoked by the principal; no further consequential action may execute under it.`);
  }
  if (delegation.status === 'suspended') {
    return reject('DELEGATION_SUSPENDED', `Delegation ${delegation.id} is suspended by the principal.`);
  }
  if (at < delegation.validFrom) {
    return reject('DELEGATION_NOT_YET_VALID', `Delegation ${delegation.id} is not valid until ${delegation.validFrom}.`);
  }
  if (at > delegation.validTo) {
    return reject('DELEGATION_EXPIRED', `Delegation ${delegation.id} expired at ${delegation.validTo}.`);
  }
  if (!delegation.scope.journeys.includes(action.journeyId)) {
    return reject('SCOPE_JOURNEY', `Delegation ${delegation.id} does not cover journey "${action.journeyId}".`);
  }
  if (!delegation.scope.actions.includes(action.id)) {
    return reject('SCOPE_ACTION', `Delegation ${delegation.id} does not cover consequential action "${action.id}".`);
  }

  if (action.confirmationDesignated) {
    if (!confirmation) {
      return reject(
        'CONFIRMATION_REQUIRED',
        `Action "${action.id}" is designated as requiring principal confirmation; no confirmation event attributable to the principal was presented (5.3.1).`,
      );
    }
    // 5.3.2 first: an interaction inside the agent's own session is not a
    // confirmation regardless of whose name the agent puts on it. Checking
    // whose confirmation it is before checking whether it is one at all would
    // report a mismatched principal for something that was never a confirmation.
    if (confirmation.channel === 'in-session' || !confirmation.token) {
      return reject(
        'CONFIRMATION_NOT_PRINCIPAL_ATTRIBUTABLE',
        `Action "${action.id}" requires a confirmation made through a channel the agent does not control. An interaction within an agent-driven session — a declaration, checkbox or button press — is not a confirmation event (5.3.2).`,
      );
    }
    if (!redeemConfirmation) {
      // Fail closed: a service that cannot verify confirmations must not execute
      // designated actions. A decorative checkpoint is worse than none.
      return reject(
        'CONFIRMATION_NOT_PRINCIPAL_ATTRIBUTABLE',
        `The service supplied no means of verifying the confirmation token; the designated action cannot be authorised (5.3.2).`,
      );
    }
    if (confirmation.actionId !== action.id) {
      return reject('CONFIRMATION_ACTION_MISMATCH', `The presented confirmation is for action "${confirmation.actionId}", not "${action.id}".`);
    }
    if (confirmation.principalId !== delegation.principalId) {
      return reject('CONFIRMATION_PRINCIPAL_MISMATCH', `The presented confirmation is not attributable to the delegating principal.`);
    }
    const redeemed = redeemConfirmation({ token: confirmation.token, actionId: action.id, principalId: delegation.principalId, at });
    if (!redeemed.ok) {
      return reject(redeemed.reason, `The presented confirmation token was not accepted: ${redeemed.reason}.`);
    }
  }

  return {
    authorised: true,
    delegationId: delegation.id,
    principalId: delegation.principalId,
    requiresNotification: true,
    attribution: { agentOriginated: true, agentId },
  };
}
