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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMatrix } from './runner.ts';
import { aggregate, wilson } from './metrics.ts';
import { scriptedProbe } from './scripted-probe.ts';
import { TASKS } from './tasks.ts';
import type { RunResult } from './metrics.ts';

let results: RunResult[];

test('matrix runs to completion: 2 builds x 2 probes x 4 tasks', async () => {
  results = await runMatrix([scriptedProbe('careful'), scriptedProbe('naive')], TASKS);
  assert.equal(results.length, 16);
});

function get(build: string, agent: string, task: string): RunResult {
  const r = results.find((x) => x.build === build && x.agentId === `probe-${agent}` && x.taskId === task);
  assert.ok(r, `${build}/${agent}/${task}`);
  return r!;
}

test('conformant + careful probe: every task class resolves correctly, DVC = 0', () => {
  assert.equal(get('conformant', 'careful', 'T1a').success, true, 'T1a happy path');
  const t3 = get('conformant', 'careful', 'T3');
  assert.equal(t3.success, true, 'T3: rules endpoint prevented the ineligible claim');
  assert.equal(t3.wrongOutcome, false);
  assert.equal(get('conformant', 'careful', 'T4').success, true, 'T4: flagged the omitted income');
  const t6 = get('conformant', 'careful', 'T6');
  assert.equal(t6.success, true, 'T6: designated confirmation checkpoint held');
  assert.equal(results.filter((r) => r.build === 'conformant').reduce((n, r) => n + r.dvc, 0) -
    // naive probe never gets past CONFIRMATION_REQUIRED without a confirmation on T6, so conformant DVC is zero
    0, 0);
});

test('baseline + careful probe: the s11 trap produces confident wrongness (T3 → WOR)', () => {
  const t3 = get('baseline', 'careful', 'T3');
  assert.equal(t3.success, false);
  assert.equal(t3.wrongOutcome, true, 'ineligible claim was lodged off the prose paraphrase');
  assert.ok(t3.notes.some((n) => n.includes('prose paraphrase says eligible')));
});

test('baseline: consequential actions execute without any confirmation event (T6 → DVC exposure)', () => {
  const t6 = get('baseline', 'careful', 'T6');
  assert.equal(t6.success, false);
  assert.equal(t6.wrongOutcome, true);
  assert.ok(t6.dvc >= 1, 'delegation-violation exposure measured');
});

test('naive probe: fabrication is caught by T8 provenance tracing (T4 → FIR)', () => {
  const conformantT4 = get('conformant', 'naive', 'T4');
  assert.equal(conformantT4.fabricated, true, 'invented income detected against briefFacts');
  assert.equal(conformantT4.success, false);
  const baselineT4 = get('baseline', 'naive', 'T4');
  // naive cannot pass the challenge, so on baseline it may not even reach submission
  assert.equal(baselineT4.success, false);
});

test('baseline + naive probe: challenge gate causes unrecoverable failure (T1a → UER)', () => {
  const t1 = get('baseline', 'naive', 'T1a');
  assert.equal(t1.success, false);
  assert.equal(t1.unrecoverable, true);
});

test('aggregate: four cells with coherent Wilson intervals', () => {
  const cells = aggregate(results);
  assert.equal(cells.length, 4);
  for (const c of cells) {
    assert.equal(c.runs, 4);
    if (c.TSR.value !== null && c.TSR.wilson95) {
      assert.ok(c.TSR.wilson95.low <= c.TSR.value && c.TSR.value <= c.TSR.wilson95.high);
    }
  }
  const conformantCareful = cells.find((c) => c.build === 'conformant' && c.agentId === 'probe-careful')!;
  assert.equal(conformantCareful.TSR.value, 1);
  assert.equal(conformantCareful.DVC, 0);
});

test('wilson: known values behave', () => {
  const p = wilson(30, 30);
  assert.ok(p.wilson95!.low > 0.85 && p.wilson95!.high === 1);
  assert.equal(wilson(0, 0).value, null);
  const half = wilson(15, 30);
  assert.ok(Math.abs(half.value! - 0.5) < 1e-9);
});
