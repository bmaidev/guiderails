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
 * Exploratory real-agent runs. Usage:
 *
 *   npm run agents -- [--vendor anthropic|openai] [--model <id>] [--build conformant|baseline|both] [--tasks T1a,T3,...]
 *
 * Requires the chosen vendor's API credentials in the environment. Results are
 * written to runs/ (gitignored). D-008: these are EXPLORATORY runs —
 * not a benchmark round (no preregistration, no frozen briefs, n=1,
 * single vendor) — and must never be published or cited.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { runOne } from './runner.ts';
import { llmAgent, DEFAULT_MODELS, VENDORS, type Vendor } from './llm-agent.ts';
import { TASKS } from './tasks.ts';
import type { RunResult } from './metrics.ts';

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

// npm swallows --flags unless the user remembers `npm run agents -- --build ...`.
// Accept bare positional forms too: a build name, a task list, a model ID.
const positionals = args.filter((a, i) => !a.startsWith('--') && args[i - 1]?.startsWith('--') !== true);
const positionalBuild = positionals.find((a) => /^(conformant|baseline|both)$/.test(a));
const positionalTasks = positionals.find((a) => /^T\d/.test(a));
const positionalModel = positionals.find((a) => /^(claude|gpt|o\d|gemini)/.test(a));

const vendor = (flag('vendor', 'anthropic')) as Vendor;
if (!VENDORS.includes(vendor)) {
  console.error(`Unknown vendor "${vendor}". Use one of: ${VENDORS.join(', ')}.`);
  process.exit(1);
}
const model = positionalModel ?? flag('model', DEFAULT_MODELS[vendor]);
const buildArg = positionalBuild ?? flag('build', 'conformant');
const taskIds = (positionalTasks ?? flag('tasks', 'T1a,T1b,T1c,T3,T4,T5,T6')).split(',');

const builds = buildArg === 'both' ? (['conformant', 'baseline'] as const) : ([buildArg] as ('conformant' | 'baseline')[]);
const tasks = TASKS.filter((t) => taskIds.includes(t.id));
if (tasks.length === 0) {
  console.error(`No tasks matched: ${taskIds.join(',')}`);
  process.exit(1);
}

console.log('EXPLORATORY REAL-AGENT RUN — not a benchmark round (D-008).');
console.log('No preregistration, no frozen briefs, n=1, single vendor. Never publish or cite.\n');
console.log(`vendor=${vendor} model=${model} builds=${builds.join(',')} tasks=${tasks.map((t) => t.id).join(',')}`);
if (vendor === 'openai' || vendor === 'google') {
  console.log(`NOTE: the ${vendor} driver has not yet completed a live smoke run. Record any wire-shape correction it needs.`);
}
console.log('');

const agent = llmAgent({ vendor, model });
const results: RunResult[] = [];

for (const build of builds) {
  for (const task of tasks) {
    process.stdout.write(`${build} ${task.id} ... `);
    const r = await runOne(build, agent, task);
    results.push(r);
    console.log(`${r.success ? 'success' : 'FAIL'} completed=${r.completed} wrong=${r.wrongOutcome} fabricated=${r.fabricated} pis=${r.injectionFollowed} dvc=${r.dvc}`);
    for (const n of r.notes) console.log(`    ${n}`);
  }
}

mkdirSync(new URL('../runs/', import.meta.url), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = new URL(`../runs/exploratory-${vendor}-${model}-${stamp}.json`, import.meta.url);
writeFileSync(outPath, JSON.stringify({ exploratory: true, vendor, model, date: stamp, results }, null, 1));
console.log(`\nSaved (local only, gitignored): ${outPath.pathname}`);
console.log('Reminder: exploratory — not publishable (D-008).');
