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
 *   npm run agents -- [--vendor anthropic|openai|google] [--model <id>] [--build conformant|baseline|both] [--tasks T1a,T3,...]
 *
 * Requires the chosen vendor's API credentials in the environment. The model
 * defaults to the cheap tier; `--model` or `<VENDOR>_MODEL` in .env overrides it.
 * Results are written to runs/ (gitignored). D-008: these are EXPLORATORY runs —
 * not a benchmark round (no preregistration, no frozen briefs, n=1,
 * single vendor) — and must never be published or cited.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { runOne } from './runner.ts';
import { credentialSource, missingCredentialMessage } from './credentials.ts';
import { llmAgent, MODEL_VARIABLES, ROUND_MODELS, VENDORS, liveSmokeRunFor, resolveModel, type Vendor } from './llm-agent.ts';
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
// Before anything is spun up or any request is made. A run that dies on task 4
// of 12 for want of a key has already cost minutes and told us nothing.
const missing = missingCredentialMessage(vendor);
if (missing) {
  console.error(missing);
  process.exit(1);
}

const flagModel = positionalModel ?? (args.indexOf('--model') >= 0 ? flag('model', '') : '');
const { model, source: modelSource, tier } = resolveModel(vendor, flagModel);
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
// The variable name, never the value: enough to catch "I set the wrong one".
console.log(`credential=${credentialSource(vendor)} (value never logged)`);
console.log(`model tier=${tier} (from ${modelSource === 'flag' ? '--model' : modelSource === 'env' ? MODEL_VARIABLES[vendor] : 'default'})`);

if (tier === 'round') {
  // The frontier tier is what a round pins and what a round pays for. On an
  // exploratory run it buys nothing a cheap model does not: the question is
  // whether the driver speaks the wire protocol.
  console.log(`WARNING: ${model} is the frontier tier. Expect this to cost dollars, not cents.`);
  console.log(`         For a smoke run, drop --model, or unset ${MODEL_VARIABLES[vendor]}.`);
} else {
  console.log(`NOTE:    cheap tier — enough to prove the driver speaks the wire protocol.`);
  console.log(`         A round pins ${ROUND_MODELS[vendor]} and discloses it in the preregistration.`);
  console.log(`         Behaviour observed here says nothing about how a frontier agent behaves.`);
}
// Verification is per model, not per vendor: gpt-5-mini speaking Chat
// Completions says the driver works, and says nothing about whether gpt-5
// accepts the same request.
const verified = liveSmokeRunFor(vendor, model);
if (verified) {
  console.log(`live-verified: ${model}, ${verified.date}. Wire-shape correction: ${verified.correction}`);
} else {
  console.log(`NOTE:    ${model} has never made a live request through this driver.`);
  console.log(`         An untested instrument cannot produce evidence. Record any wire-shape`);
  console.log(`         correction it needs in LIVE_SMOKE_RUNS (models.ts) before any round.`);
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
// tier and modelSource are recorded because a model set from an untracked .env
// is otherwise invisible to whoever later reads the run file and wonders why
// the numbers look like that.
writeFileSync(
  outPath,
  JSON.stringify({ exploratory: true, vendor, model, tier, modelSource, date: stamp, results }, null, 1),
);
console.log(`\nSaved (local only, gitignored): ${outPath.pathname}`);
console.log('Reminder: exploratory — not publishable (D-008).');
