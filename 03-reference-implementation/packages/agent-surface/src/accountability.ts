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
 * 5.3.1, 5.5.1, 5.5.2). Every rejection is programmatically legible: a
 * stable code plus plain language, because 5.1.1 requires the service to
 * reject *safely and with a reason*, not merely to refuse.
 */

export interface ConsequentialActionSpec {
  id: string;
  journeyId: string;
  title: string;
  /** 5.3.1: whether principal confirmation is designated for this action. */
  confirmationDesignated: boolean;
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
}

export interface ConfirmationEvent {
  actionId: string;
  /** The principal the confirmation is attributable to (5.3.1). */
  principalId: string;
  /** ISO 8601 timestamp. */
  at: string;
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
  | 'CONFIRMATION_REQUIRED'
  | 'CONFIRMATION_PRINCIPAL_MISMATCH'
  | 'CONFIRMATION_ACTION_MISMATCH';

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
}

function reject(code: RejectionCode, message: string): AuthorisationResult {
  return { authorised: false, reason: { code, message } };
}

export function authoriseConsequentialAction(req: AuthorisationRequest): AuthorisationResult {
  const { action, delegation, confirmation, at, agentId } = req;

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
    if (confirmation.actionId !== action.id) {
      return reject('CONFIRMATION_ACTION_MISMATCH', `The presented confirmation is for action "${confirmation.actionId}", not "${action.id}".`);
    }
    if (confirmation.principalId !== delegation.principalId) {
      return reject('CONFIRMATION_PRINCIPAL_MISMATCH', `The presented confirmation is not attributable to the delegating principal.`);
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
