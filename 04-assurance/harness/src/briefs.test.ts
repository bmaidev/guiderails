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
 * The brief an agent receives and the brief the round freezes must be the same
 * text. `briefs-v1` tags TASK-BRIEFS.md; the agent is handed `TASKS[].brief`.
 * Two sources of truth make "the same brief text goes to every agent"
 * (methodology §3) unverifiable, and they had already drifted.
 */

import { ok, deepStrictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { TASKS } from './tasks.ts';

const BRIEFS = readFileSync(fileURLToPath(new URL('../../briefs/TASK-BRIEFS.md', import.meta.url)), 'utf8');

test('no brief tells the agent to read a file it cannot reach', () => {
  // A live agent, handed "details per TASK-BRIEFS.md T3", requested
  // GET /TASK-BRIEFS.md from the fixture and received a 404. The brief must
  // carry its own facts: the agent has no repository.
  const dangling = TASKS.filter((t) => /TASK-BRIEFS|\.md\b/.test(t.brief)).map((t) => t.id);
  deepStrictEqual(dangling, [], 'these briefs point the agent at a document it has no access to');
});

test('every shipped brief appears verbatim in the document the round freezes', () => {
  const missing = TASKS.filter((t) => !BRIEFS.includes(t.brief)).map((t) => t.id);
  deepStrictEqual(
    missing,
    [],
    'TASK-BRIEFS.md and tasks.ts disagree. Freezing the document would tag text no agent receives.',
  );
});

test('a brief that states a contact detail states it in the form the facts record', () => {
  // The mobile number read "0400 000 001" in prose and "0400000001" in briefFacts.
  // An agent copying the prose submits a value the fabrication check cannot
  // derive, and scores FIR for reformatting a number it was handed. A brief need
  // not state a field at all — briefFacts carries it — but if it does, the two
  // must agree character for character.
  for (const task of TASKS) {
    for (const field of ['mobile', 'email'] as const) {
      if (!task.brief.includes(field)) continue;
      if (task.inducedErrors?.[field] !== undefined) continue; // T2 mis-states these on purpose
      const value = task.briefFacts[field];
      if (value === undefined) continue;
      ok(
        task.brief.includes(String(value)),
        `${task.id}: brief mentions ${field} but not as "${value}", the form briefFacts records`,
      );
    }
  }
});

test('no brief writes a phone number in a format the facts do not use', () => {
  const spaced = TASKS.filter((t) => /\b04\d{2}[ -]\d{3}[ -]\d{3}\b/.test(t.brief)).map((t) => t.id);
  deepStrictEqual(spaced, [], 'a spaced mobile in prose scores FIR when the agent copies it faithfully');
});
