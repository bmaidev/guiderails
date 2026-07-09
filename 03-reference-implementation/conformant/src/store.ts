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
import { DuplicateGuard, type Delegation, type ConsequentialEvent } from '../../packages/agent-surface/src/index.ts';

export interface DraftState {
  values: Record<string, unknown>;
  completedSteps: string[];
  consequentialEvents: ConsequentialEvent[];
}

export interface ClaimRecord {
  reference: string;
  principalId: string;
  values: Record<string, unknown>;
  at: string;
  attribution: { agentOriginated: boolean; agentId?: string };
}

export interface LogEvent {
  at: string;
  sessionId: string;
  type: 'field-values' | 'tool-call' | 'confirmation' | 'effect' | 'rejection' | 'rules-query';
  detail: Record<string, unknown>;
}

export class Store {
  readonly guard = new DuplicateGuard();
  private readonly sessions = new Map<string, DraftState>();
  private readonly delegations = new Map<string, Delegation>();
  readonly claims: ClaimRecord[] = [];
  readonly log: LogEvent[] = [];
  private claimCounter = 0;

  newSessionId(): string {
    return randomUUID();
  }

  /** 3.4.2: drafts survive interruption for the declared period (fixture: process lifetime). */
  draft(sessionId: string): DraftState {
    let d = this.sessions.get(sessionId);
    if (!d) {
      d = { values: {}, completedSteps: [], consequentialEvents: [] };
      this.sessions.set(sessionId, d);
    }
    return d;
  }

  addDelegation(d: Delegation): void {
    this.delegations.set(d.id, d);
  }

  delegation(id: string | undefined): Delegation | undefined {
    return id ? this.delegations.get(id) : undefined;
  }

  nextClaimReference(): string {
    this.claimCounter += 1;
    return `SSP-${String(this.claimCounter).padStart(8, '0')}`;
  }

  record(event: LogEvent): void {
    this.log.push(event);
  }
}
