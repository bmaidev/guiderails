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
 * The glossary and the technique map are generated from MODEL.md. A generated
 * artefact that is not regenerated is a second source of truth, and the copy is
 * always the one that drifts. These tests rebuild both and compare.
 *
 * They also enforce the definition of done that nothing enforced: every
 * criterion has a technique mapped, or a gap noted.
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parseCriteria, parseVersion } from './parse.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(root + path, 'utf8');
const MODEL = read('02-model/MODEL.md');

test('glossary.yaml is what MODEL.md §3 generates — regenerate it, do not edit it', () => {
  const fresh = execFileSync('node', [root + '02-model/glossary/build.mjs', '--check'], { encoding: 'utf8' });
  strictEqual(
    read('02-model/glossary/glossary.yaml'),
    fresh,
    'glossary.yaml is stale. Run: node 02-model/glossary/build.mjs',
  );
});

test('the glossary defines every term MODEL.md §3 introduces or carries forward', () => {
  const yaml = read('02-model/glossary/glossary.yaml');
  const count = Number(/^termCount: (\d+)$/m.exec(yaml)![1]);
  const terms = [...yaml.matchAll(/^  - term: "(.+?)"$/gm)].length;
  strictEqual(terms, count, 'glossary.yaml disagrees with its own termCount');
  ok(terms >= 20, 'the glossary lost terms; §3 defines at least twenty');
  // The eight v0.1 terms carry forward by name only; their definitions live in
  // the superseded skeleton, and must still reach the glossary.
  for (const term of ['Principal', 'Agent', 'Delegation', 'Determination']) {
    ok(yaml.includes(`  - term: "${term}"`), `${term} carries forward from v0.1 and must be defined`);
  }
});

test('the glossary tracks the model version', () => {
  const yaml = read('02-model/glossary/glossary.yaml');
  strictEqual(/^modelVersion: "(.+?)"$/m.exec(yaml)![1], parseVersion(MODEL));
});

test('every criterion has a technique mapped or a gap noted — the definition of done', () => {
  const techniques = JSON.parse(read('02-model/techniques/techniques.json'));
  const criteria = parseCriteria(MODEL);

  deepStrictEqual(
    techniques.records.map((r: { criterion: string }) => r.criterion).sort(),
    criteria.map((c) => c.id).sort(),
    'the technique map and MODEL.md disagree about which criteria exist',
  );

  const silent = techniques.records
    .filter((r: { demonstratedBy: unknown[]; gap: string | null }) => r.demonstratedBy.length === 0 && !r.gap)
    .map((r: { criterion: string }) => r.criterion);
  deepStrictEqual(silent, [], 'these criteria have neither a demonstrated technique nor a noted gap');
});

test('techniques.json is regenerated, not hand-edited', () => {
  execFileSync('node', [root + '02-model/techniques/build.mjs'], { encoding: 'utf8', stdio: 'pipe' });
  const rebuilt = JSON.parse(read('02-model/techniques/techniques.json'));
  strictEqual(rebuilt.modelVersion, parseVersion(MODEL));
  strictEqual(rebuilt.criteria, parseCriteria(MODEL).length);
  // A demonstration must point at a file that cites the criterion. The build
  // derives them from source, so a hand-written claim cannot survive a rebuild.
  ok(rebuilt.demonstrated + rebuilt.gaps === rebuilt.criteria);
});

test('a criterion demonstrated in code names a file that exists', () => {
  const techniques = JSON.parse(read('02-model/techniques/techniques.json'));
  for (const record of techniques.records) {
    for (const demo of record.demonstratedBy) {
      ok(read(demo.file).length > 0, `${record.criterion} points at ${demo.file}, which is empty or missing`);
    }
  }
});

// ---- The conformance-claim format (D-017, Proposed — not normative yet) ----

const CLAIM_SCHEMA = JSON.parse(read('07-governance/conformance-claim.schema.json'));

test('the claim schema forbids per-criterion claims, as MODEL.md §4 requires', () => {
  // "Claims are made per journey; per-criterion claims are not recognised."
  // additionalProperties:false is what makes that true rather than aspirational.
  strictEqual(CLAIM_SCHEMA.additionalProperties, false);
  ok(!('criteria' in CLAIM_SCHEMA.properties), 'the schema must offer no place to claim a single criterion');
  ok(CLAIM_SCHEMA.required.includes('journeysInScope'));
});

test('the claim schema requires one named accountable human', () => {
  const owner = CLAIM_SCHEMA.properties.accountableOwner;
  deepStrictEqual(owner.required.sort(), ['name', 'organisation', 'role']);
  ok(CLAIM_SCHEMA.required.includes('accountableOwner'), 'prime directive 9: one obligation, one obligated party');
});

test('the claim schema requires an expiry and a contest route', () => {
  ok(CLAIM_SCHEMA.required.includes('expires'), 'an unexpiring claim describes a service that has since changed');
  ok(CLAIM_SCHEMA.required.includes('contest'), '5.4.2: a claim nobody can challenge is marketing');
});

test('the claim schema makes benchmark evidence mandatory at AA and above', () => {
  // MODEL.md §7. A claim at AA with no evidence must be malformed, not merely
  // unsupported — otherwise the assurance requirement is advisory.
  const rule = CLAIM_SCHEMA.allOf.find((r: { if?: unknown }) => r.if);
  deepStrictEqual(rule.if.properties.claimedLevel.enum, ['AA', 'AAA']);
  ok(rule.then.required.includes('benchmarkEvidence'));
  deepStrictEqual(
    rule.then.properties.benchmarkEvidence.required.sort(),
    ['preregistration', 'required', 'resultsUrl', 'roundDate'],
  );
});

test('the claim format stays Proposed until the steward decides it', () => {
  // D-017 is a policy change. Until it reads Decided, no criterion may cite it
  // and the fixture must not publish a claim: the drift check in log-check.test.ts
  // already fails the build if MODEL.md leans on a Proposed decision.
  const row = /^\| D-017 \|.*$/m.exec(read('DECISIONS.md'))![0];
  ok(row.includes('Proposed'), 'D-017 was adopted without a steward decision');
  ok(
    read('07-governance/CONFORMANCE-CLAIM.md').includes('**Status: PROPOSED'),
    'the format document must say it binds nothing yet',
  );
});
