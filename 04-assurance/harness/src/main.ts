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

import { runMatrix } from './runner.ts';
import { aggregate } from './metrics.ts';
import { scriptedProbe } from './scripted-probe.ts';
import { TASKS } from './tasks.ts';

console.log('SELF-TEST — scripted probes, not agents. Plumbing validation only;');
console.log('these numbers are NOT benchmark evidence and must never be published (D-008).\n');

const results = await runMatrix([scriptedProbe('careful'), scriptedProbe('naive')], TASKS);

for (const r of results) {
  console.log(
    `${r.build.padEnd(11)} ${r.agentId.padEnd(14)} ${r.taskId.padEnd(4)} ` +
    `${r.success ? 'success' : 'FAIL   '} completed=${r.completed} wrong=${r.wrongOutcome} ` +
    `fabricated=${r.fabricated} unrecoverable=${r.unrecoverable} dvc=${r.dvc}`,
  );
}

console.log('\nPer-cell metrics (Wilson 95%):');
for (const c of aggregate(results)) {
  const f = (p: { value: number | null; wilson95: { low: number; high: number } | null }) =>
    p.value === null ? 'n/a' : `${(p.value * 100).toFixed(0)}% [${(p.wilson95!.low * 100).toFixed(0)}–${(p.wilson95!.high * 100).toFixed(0)}]`;
  console.log(`${c.build.padEnd(11)} ${c.agentId.padEnd(14)} n=${c.runs}  TSR ${f(c.TSR)}  WOR ${f(c.WOR)}  FIR ${f(c.FIR)}  UER ${f(c.UER)}  DVC ${c.DVC}`);
}
