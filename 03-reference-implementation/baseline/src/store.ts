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

import { randomUUID } from 'node:crypto';
import { DuplicateGuard } from '../../packages/agent-surface/src/index.ts';

export interface BaselineDraft {
  values: Record<string, unknown>;
  completedSteps: string[];
  lastTouched: number;
}

export interface BaselineClaim {
  reference: string;
  values: Record<string, unknown>;
  at: string;
}

export interface BaselineLogEvent {
  at: string;
  sessionId: string;
  type: 'field-values' | 'effect' | 'challenge-failed' | 'error';
  detail: Record<string, unknown>;
}

/**
 * Baseline state. The injectable clock exists so tests can cross the
 * B-04 timeout boundary deterministically.
 */
export class BaselineStore {
  readonly guard = new DuplicateGuard();
  readonly claims: BaselineClaim[] = [];
  readonly log: BaselineLogEvent[] = [];
  private readonly sessions = new Map<string, BaselineDraft>();
  private claimCounter = 0;

  readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  newSessionId(): string {
    return randomUUID();
  }

  /** B-04/B-10: an expired draft is silently discarded — data loss by design (catalogued). */
  draftWithTimeout(sid: string, timeoutMs: number): { draft: BaselineDraft; expired: boolean } {
    const existing = this.sessions.get(sid);
    let expired = false;
    if (existing && this.now() - existing.lastTouched > timeoutMs) {
      this.sessions.delete(sid);
      expired = true;
    }
    let draft = this.sessions.get(sid);
    if (!draft) {
      draft = { values: {}, completedSteps: [], lastTouched: this.now() };
      this.sessions.set(sid, draft);
    }
    draft.lastTouched = this.now();
    return { draft, expired };
  }

  nextClaimReference(): string {
    this.claimCounter += 1;
    return `SSP-${String(this.claimCounter).padStart(8, '0')}`;
  }

  record(event: BaselineLogEvent): void {
    this.log.push(event);
  }
}
