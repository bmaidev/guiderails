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
 * In-memory state for the conformant fixture build. Everything is
 * fictional (D-009); nothing persists beyond the process; no network.
 * Every field value, tool call, confirmation event and effect is logged
 * (BENCHMARK-METHODOLOGY.md §6; FIXTURE-SPEC.md §7).
 */

import { randomUUID } from 'node:crypto';
import { DuplicateGuard, ConfirmationTokenStore, type Delegation, type ConsequentialEvent } from '../../packages/agent-surface/src/index.ts';

export interface DraftState {
  values: Record<string, unknown>;
  completedSteps: string[];
  consequentialEvents: ConsequentialEvent[];
}

export interface EffectRecord {
  journeyId: string;
  actionId: string;
  reference: string;
  principalId: string;
  values: Record<string, unknown>;
  at: string;
  attribution: { agentOriginated: boolean; agentId?: string; delegationId?: string };
  /** 5.4.1: the determination the agent CITED when it acted, if any. */
  determinationId?: string;
}

/** 5.5.2: delivered to the principal's nominated channel, not merely logged. */
export interface Notification {
  at: string;
  actionId: string;
  journeyId: string;
  reference: string;
  agentId?: string;
  message: string;
}

/**
 * 4.5.2 vs 5.4.1. A hypothetical query must create "no record attributed to any
 * principal"; the audit must show "the determinations relied upon". Both hold
 * only if the query is stored WITHOUT a principal and the agent cites it when
 * it acts. Curiosity is unattributable; reliance is attributable. Nothing here
 * carries a principal id.
 */
export interface StoredDetermination {
  id: string;
  at: string;
  circumstances: Record<string, unknown>;
  eligible: boolean;
  governingReason: { sections: string[]; statement: string };
  provenance: Record<string, unknown>;
}

export interface LogEvent {
  at: string;
  sessionId: string;
  type: 'field-values' | 'tool-call' | 'confirmation' | 'effect' | 'rejection' | 'rules-query';
  detail: Record<string, unknown>;
}

export class Store {
  readonly guard = new DuplicateGuard();
  /** 5.3.2: confirmations the service issued to principals, redeemable once. */
  readonly confirmations = new ConfirmationTokenStore();
  /**
   * The principal's own credential. Models the out-of-band channel: the agent
   * never holds this, so it can never mint a confirmation on the principal's
   * behalf. Seeded by the service; in a real deployment this is the person's
   * authenticated session on their own device.
   */
  private readonly principalSecrets = new Map<string, string>();
  /** T5: render the third-party notice block (harness-controlled; default off). */
  injectionEnabled = false;
  private readonly sessions = new Map<string, Map<string, DraftState>>();
  private readonly delegations = new Map<string, Delegation>();
  readonly effects: EffectRecord[] = [];
  readonly log: LogEvent[] = [];
  /** 5.5.2: the principal's channel. Keyed by principal, written by the service. */
  private readonly notifications = new Map<string, Notification[]>();
  /** 4.5.2: determinations, stored with no principal attached. */
  private readonly determinations = new Map<string, StoredDetermination>();
  private readonly counters = new Map<string, number>();

  newSessionId(): string {
    return randomUUID();
  }

  /** 3.4.2: drafts survive interruption for the declared period (fixture: process lifetime). */
  draft(sessionId: string, journeyId: string): DraftState {
    let journeys = this.sessions.get(sessionId);
    if (!journeys) {
      journeys = new Map();
      this.sessions.set(sessionId, journeys);
    }
    let d = journeys.get(journeyId);
    if (!d) {
      d = { values: {}, completedSteps: [], consequentialEvents: [] };
      journeys.set(journeyId, d);
    }
    return d;
  }

  /**
   * 3.4.2: an interrupted journey is resumable "without loss of entered data for
   * a declared period". A draft keyed on the session cookie is not resumable —
   * it merely survives as long as the cookie does, which is precisely what an
   * interruption destroys. Resume points are therefore keyed on the PRINCIPAL,
   * so a new session under the same delegation can adopt the work.
   */
  private readonly resumePoints = new Map<string, DraftState>();

  private resumeKey(principalId: string, journeyId: string): string {
    return `${principalId}|${journeyId}`;
  }

  saveResumePoint(principalId: string, journeyId: string, draft: DraftState): void {
    this.resumePoints.set(this.resumeKey(principalId, journeyId), {
      values: { ...draft.values },
      completedSteps: [...draft.completedSteps],
      consequentialEvents: [...draft.consequentialEvents],
    });
  }

  resumePoint(principalId: string, journeyId: string): DraftState | undefined {
    return this.resumePoints.get(this.resumeKey(principalId, journeyId));
  }

  /** Adopt the principal's resume point into this session's draft. */
  adoptResumePoint(sessionId: string, principalId: string, journeyId: string): DraftState | undefined {
    const saved = this.resumePoint(principalId, journeyId);
    if (!saved) return undefined;
    const draft = this.draft(sessionId, journeyId);
    Object.assign(draft.values, saved.values);
    draft.completedSteps = [...saved.completedSteps];
    draft.consequentialEvents = [...saved.consequentialEvents];
    return draft;
  }

  notify(principalId: string, n: Notification): void {
    const inbox = this.notifications.get(principalId) ?? [];
    inbox.push(n);
    this.notifications.set(principalId, inbox);
  }

  inbox(principalId: string): Notification[] {
    return this.notifications.get(principalId) ?? [];
  }

  recordDetermination(d: StoredDetermination): void {
    this.determinations.set(d.id, d);
  }

  determination(id: string | undefined): StoredDetermination | undefined {
    return id ? this.determinations.get(id) : undefined;
  }

  addDelegation(d: Delegation): void {
    this.delegations.set(d.id, d);
  }

  /** 5.1.2 / 5.5.1: the principal changes a delegation's status. Revocation is terminal. */
  setDelegationStatus(id: string, status: Delegation['status']): Delegation | undefined {
    const d = this.delegations.get(id);
    if (!d) return undefined;
    if (d.status === 'revoked') return d; // terminal: a revoked delegation never returns
    d.status = status;
    return d;
  }

  delegationsFor(principalId: string): Delegation[] {
    return [...this.delegations.values()].filter((d) => d.principalId === principalId);
  }

  setPrincipalSecret(principalId: string, secret: string): void {
    this.principalSecrets.set(principalId, secret);
  }

  /** Returns the principal a secret authenticates, or undefined. */
  principalForSecret(secret: string | undefined): string | undefined {
    if (!secret) return undefined;
    for (const [principalId, s] of this.principalSecrets) if (s === secret) return principalId;
    return undefined;
  }

  delegation(id: string | undefined): Delegation | undefined {
    return id ? this.delegations.get(id) : undefined;
  }

  nextReference(prefix: string): string {
    const n = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, n);
    return `${prefix}${String(n).padStart(8, '0')}`;
  }

  /** J1 claim effects (compatibility view over the generic effect list). */
  get claims(): EffectRecord[] {
    return this.effects.filter((e) => e.actionId === 'CA-1');
  }

  record(event: LogEvent): void {
    this.log.push(event);
  }
}
