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

import { ok, strictEqual, throws } from 'node:assert/strict';
import { test } from 'node:test';
import { assessAgreement, cohenKappaBinary, KAPPA_THRESHOLD, type DualJudgement } from './adjudication.ts';

const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('perfect agreement on a mixed set is κ = 1', () => {
  const a = [true, false, true, false, true];
  const r = cohenKappaBinary(a, a);
  strictEqual(r.kappa, 1);
  strictEqual(r.unanimous, true);
  strictEqual(r.degenerate, false);
});

test('a textbook value: κ matches the (po−pe)/(1−pe) hand computation', () => {
  // 10 items. A: 6 yes; B: 6 yes; agree on 8.
  const a = [true, true, true, true, true, true, false, false, false, false];
  const b = [true, true, true, true, false, true, false, false, false, true];
  const r = cohenKappaBinary(a, b);
  // po = 8/10 = 0.8; pYesA=pYesB=0.6; pe = .36+.16 = .52; κ = (.8-.52)/(1-.52)
  ok(approx(r.po, 0.8));
  ok(approx(r.pe, 0.52));
  ok(approx(r.kappa!, (0.8 - 0.52) / (1 - 0.52)));
});

test('chance-level agreement is κ near 0', () => {
  // Independent-ish patterns that agree about as often as chance predicts.
  const a = [true, false, true, false, true, false, true, false];
  const b = [true, true, false, false, true, true, false, false];
  const r = cohenKappaBinary(a, b);
  ok(Math.abs(r.kappa!) < 0.35, `expected near-zero κ, got ${r.kappa}`);
});

test('both raters all-yes: κ is undefined, not 1 and not 0', () => {
  // Perfect agreement, but chance already explains it. Reporting κ=1 would
  // certify reliability the data cannot support; κ=0 would deny total agreement.
  const all = [true, true, true, true];
  const r = cohenKappaBinary(all, all);
  strictEqual(r.kappa, null);
  strictEqual(r.degenerate, true);
  strictEqual(r.unanimous, true);
});

test('misaligned rater arrays throw — a data error, not a low-agreement finding', () => {
  throws(() => cohenKappaBinary([true, false], [true]));
});

test('an empty set throws rather than scoring nothing as agreement', () => {
  throws(() => cohenKappaBinary([], []));
});

const jud = (runId: string, metric: DualJudgement['metric'], a: boolean, b: boolean): DualJudgement => ({ runId, metric, adjudicatorA: a, adjudicatorB: b });

test('a metric at or above 0.8 is accepted; below it is sent back to revise-and-rescore', () => {
  // FIR: 10 runs, strong agreement (κ ≥ 0.8). WOR: weak agreement.
  const strong: DualJudgement[] = [];
  for (let i = 0; i < 10; i++) strong.push(jud(`r${i}`, 'FIR', i < 5, i < 5)); // identical, mixed → κ=1
  const weak: DualJudgement[] = [
    jud('r0', 'WOR', true, false), jud('r1', 'WOR', false, true), jud('r2', 'WOR', true, true),
    jud('r3', 'WOR', false, false), jud('r4', 'WOR', true, false), jud('r5', 'WOR', false, true),
  ];
  const out = assessAgreement([...strong, ...weak]);
  const fir = out.find((o) => o.metric === 'FIR')!;
  const wor = out.find((o) => o.metric === 'WOR')!;
  strictEqual(fir.meetsThreshold, true);
  strictEqual(fir.action, 'accept');
  strictEqual(wor.meetsThreshold, false);
  strictEqual(wor.action, 'revise-rubric-and-rescore');
  ok(wor.note?.includes(String(KAPPA_THRESHOLD)));
});

test('a degenerate metric is surfaced for a human read, never auto-accepted', () => {
  // Both adjudicators say "no fabrication" on every run — total agreement, but κ
  // undefined. It must not pass silently.
  const js = Array.from({ length: 8 }, (_, i) => jud(`r${i}`, 'FIR', false, false));
  const [fir] = assessAgreement(js);
  strictEqual(fir.kappa.kappa, null);
  strictEqual(fir.meetsThreshold, false);
  strictEqual(fir.action, 'revise-rubric-and-rescore');
  ok(fir.note?.includes('human judgement'));
});

test('duplicate judgements for one run are a data error', () => {
  throws(() => assessAgreement([jud('r0', 'T4', true, true), jud('r0', 'T4', false, false)]));
});
