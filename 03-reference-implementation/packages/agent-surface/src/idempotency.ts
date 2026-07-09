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
 * Duplicate protection (Guiderails 3.4.1, definition "duplicate-protected"):
 * repeat submission of the same action cannot create an additional legal or
 * administrative effect, and the response identifies the original effect.
 */

export interface EffectRecord {
  reference: string;
  /** ISO 8601 timestamp of the original effect. */
  at: string;
}

export interface DuplicateOutcome {
  /** True when a prior effect existed and no new effect was created. */
  duplicate: boolean;
  /** The effect the caller should report — always the original (2.4.2). */
  record: EffectRecord;
}

export class DuplicateGuard {
  private readonly effects = new Map<string, EffectRecord>();

  /**
   * Execute an effect at most once per key. On a repeat key the effect
   * callback is NOT invoked and the original record is returned.
   */
  execute(key: string, effect: () => EffectRecord): DuplicateOutcome {
    const existing = this.effects.get(key);
    if (existing) return { duplicate: true, record: existing };
    const record = effect();
    this.effects.set(key, record);
    return { duplicate: false, record };
  }

  lookup(key: string): EffectRecord | undefined {
    return this.effects.get(key);
  }
}
