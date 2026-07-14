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
 * The coverage-manifest validator (dogfooding — DECISIONS.md D-022, proposed).
 *
 * Fails CI if `coverage.json` drifts from MODEL.md or makes an unbacked claim.
 * The load-bearing rule is the last-but-one test: a criterion may be marked
 * `covered` or `shown` only if it names an evidence file that exists AND
 * mentions the criterion id — so the manifest cannot claim coverage the tests
 * do not carry.
 *
 * Zero runtime dependencies; JSON (not YAML) keeps the manifest parseable
 * without one.
 */

import { ok, strictEqual, deepStrictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const MODEL = join(REPO_ROOT, '02-model', 'MODEL.md');
const MANIFEST = join(REPO_ROOT, '03-reference-implementation', 'coverage.json');

const SURFACES = new Set(['story', 'machine-surface', 'behaviour', 'manual']);
const STATUSES = new Set(['shown', 'covered', 'gap']);

interface Entry {
  id: string;
  level: 'A' | 'AA' | 'AAA';
  surface: string;
  status: string;
  evidence: string[];
}

/** The canonical criteria from MODEL.md: lines like `- **N.N.N (LEVEL)** …`. */
function modelCriteria(): Map<string, string> {
  const text = readFileSync(MODEL, 'utf8');
  const re = /^- \*\*(\d+\.\d+\.\d+) \((A|AA|AAA)\)\*\*/gm;
  const out = new Map<string, string>();
  for (const m of text.matchAll(re)) out.set(m[1], m[2]);
  return out;
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { criteria: Entry[] };
const entries = manifest.criteria;
const model = modelCriteria();

test('the manifest covers exactly MODEL.md, once each, with matching levels', () => {
  strictEqual(model.size, 56, `expected 56 criteria in MODEL.md, found ${model.size}`);
  const ids = entries.map((e) => e.id);
  strictEqual(new Set(ids).size, ids.length, 'duplicate criterion id in the manifest');
  deepStrictEqual([...ids].sort(), [...model.keys()].sort(), 'manifest criteria differ from MODEL.md');
  for (const e of entries) {
    strictEqual(e.level, model.get(e.id), `level mismatch for ${e.id}: manifest ${e.level} vs model ${model.get(e.id)}`);
  }
});

test('level tally is 22 A / 28 AA / 6 AAA', () => {
  const tally = { A: 0, AA: 0, AAA: 0 } as Record<string, number>;
  for (const e of entries) tally[e.level]++;
  deepStrictEqual(tally, { A: 22, AA: 28, AAA: 6 });
});

test('every entry has a valid surface and status; shown implies a story', () => {
  for (const e of entries) {
    ok(SURFACES.has(e.surface), `${e.id}: bad surface ${e.surface}`);
    ok(STATUSES.has(e.status), `${e.id}: bad status ${e.status}`);
    if (e.status === 'shown') strictEqual(e.surface, 'story', `${e.id}: shown must be a story`);
    if (e.status === 'gap') strictEqual(e.evidence.length, 0, `${e.id}: a gap carries no evidence`);
    else ok(e.evidence.length > 0, `${e.id}: a non-gap must name evidence`);
  }
});

test('every non-gap names an evidence file that exists and mentions the criterion', () => {
  for (const e of entries.filter((x) => x.status !== 'gap')) {
    for (const rel of e.evidence) {
      const abs = join(REPO_ROOT, rel);
      ok(existsSync(abs), `${e.id}: evidence file missing: ${rel}`);
      ok(readFileSync(abs, 'utf8').includes(e.id), `${e.id}: evidence ${rel} does not mention ${e.id}`);
    }
  }
});

test('coverage summary (informational)', () => {
  const by = (s: string) => entries.filter((e) => e.status === s).length;
  const shown = by('shown');
  const covered = by('covered');
  const gap = by('gap');
  strictEqual(shown + covered + gap, 56);
  console.log(`coverage: ${shown} shown, ${covered} covered, ${gap} gap (of 56)`);
  // Guard the headline the write-up quotes; bump deliberately as layers land.
  // Layer 0 baseline: 31. Layer 1: 32 (5.6.2 gap -> shown).
  ok(shown + covered === 32, `expected 32 with automated evidence, found ${shown + covered}`);
});
