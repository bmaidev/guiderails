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
 * The repository's governance, checked by machine.
 *
 * Two failures these catch, both of which happened before they existed:
 *
 *  - **Log drift.** Four decisions read *Proposed* while the artefacts were
 *    already built on them, and the harness enforced one of them in code. A
 *    decision that binds is Decided or it is not a decision (CLAUDE.md, change
 *    protocol). D-002 is the one lawful exception and must say why.
 *  - **Count drift.** MODEL.md states its criterion count in three places. Add
 *    a criterion and forget one, and the standard misreports its own size.
 *
 * These check form, never substance. Nothing here can tell you a decision was
 * *right*; they tell you the log says what the repository does.
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  citedDecisions,
  citedQuestions,
  countByLevel,
  parseChangelogTotals,
  parseContentsCount,
  parseCriteria,
  parseDecisions,
  parseVersion,
  questionsDefinedInChangeLog,
} from './parse.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(root + path, 'utf8');

const SKIP = new Set(['node_modules', '.git', '.github', 'runs']);

/** Every markdown and TypeScript file in the repository, so a new one cannot escape the checks. */
function* sourceFiles(dir = root): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) yield* sourceFiles(`${path}/`);
    else if (/\.(md|ts)$/.test(entry.name)) yield path;
  }
}

const DECISIONS = read('DECISIONS.md');
const MODEL = read('02-model/MODEL.md');
const CLAUDE_MD = read('CLAUDE.md');

/**
 * Decisions a normative document may cite while still Proposed, and the reason.
 * Adding to this list is itself a policy act: it says the repository is content
 * to lean on something the owner has not decided. Keep it near-empty.
 */
const MAY_BE_CITED_WHILE_PROPOSED: Record<string, string> = {
  'D-002':
    'The working name. Use necessarily precedes the decision — every document must call the project something — and the artefacts label it a working name. Blocked on the trademark search, the domain and GitHub checks, and OD-01.',
};

test('every decision row carries a well-formed status', () => {
  const decisions = parseDecisions(DECISIONS);
  ok(decisions.length > 0, 'no decision rows parsed — has the table shape changed?');
});

test('decision ids are unique and contiguous — numbering is forever', () => {
  const numbers = parseDecisions(DECISIONS).map((d) => d.number);
  deepStrictEqual(
    numbers,
    numbers.map((_, i) => i + 1),
    'decision ids must run D-001 upward with no gap and no reuse (prime directive 7)',
  );
});

test('a decision the normative documents lean on reads Decided', () => {
  const byId = new Map(parseDecisions(DECISIONS).map((d) => [d.id, d]));
  const cited = citedDecisions(CLAUDE_MD, MODEL);
  ok(cited.length > 0, 'expected the operating manual and the model to cite decisions');

  const drifted: string[] = [];
  for (const id of cited) {
    const decision = byId.get(id);
    ok(decision, `${id} is cited but has no row in DECISIONS.md`);
    if (decision.status === 'decided') continue;
    if (id in MAY_BE_CITED_WHILE_PROPOSED) {
      // The exemption is only honest if the row itself records the blocker.
      ok(
        /cannot be decided by fiat/i.test(decision.rationale) ||
          /remains proposed/i.test(decision.rationale),
        `${id} is exempt from the Decided requirement but its rationale does not say what blocks the decision`,
      );
      continue;
    }
    drifted.push(id);
  }

  deepStrictEqual(
    drifted,
    [],
    `these decisions are cited as binding by CLAUDE.md or MODEL.md but still read Proposed. ` +
      `Promote them, or make the dependent artefacts provisional, or record an exemption with its blocker.`,
  );
});

test('the model reports its own size consistently in all three places', () => {
  const actual = countByLevel(parseCriteria(MODEL));
  const version = parseVersion(MODEL);

  strictEqual(parseContentsCount(MODEL), actual.total, 'the contents line disagrees with the criteria');
  deepStrictEqual(
    parseChangelogTotals(MODEL, version),
    actual,
    `the change-log entry landing v${version} disagrees with the criteria`,
  );
});

test('no criterion number is used twice — numbering is forever', () => {
  const ids = parseCriteria(MODEL).map((c) => c.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  deepStrictEqual(duplicates, [], 'a criterion number was reused (prime directive 7)');
});

test('every open question a file cites is written down in §8', () => {
  // Q11 and Q12 were cited by three implementation documents — one of them
  // pointing at "MODEL.md §8 Q12" — while §8 recorded neither. A question the
  // repository reasons about but never wrote down cannot be reviewed, and
  // cannot be closed, because there is nothing to close.
  const defined = questionsDefinedInChangeLog(MODEL);
  const dangling: string[] = [];
  for (const file of sourceFiles()) {
    // The to-do file is the steward's, untracked, and may run ahead of §8.
    if (file.endsWith('OUTSTANDING-ACTIONS.md')) continue;
    for (const question of citedQuestions(read(file.slice(root.length)))) {
      if (!defined.has(question)) dangling.push(`${question} in ${file.slice(root.length)}`);
    }
  }
  deepStrictEqual(dangling, [], 'these open questions are referred to but never recorded in MODEL.md §8');
});

test('a resolved open question names the decision that resolved it', () => {
  // §8 marks a closed question by striking it through; the resolving decision
  // must be a real, Decided row — otherwise the standard cites a proposal.
  const byId = new Map(parseDecisions(DECISIONS).map((d) => [d.id, d]));
  const resolved = [...MODEL.matchAll(/~~(Q\d+)~~ \*\*resolved\*\*[^\n]*?\((D-\d{3})\)/g)];
  ok(resolved.length > 0, 'expected at least one resolved open question in §8');
  for (const [, question, decisionId] of resolved) {
    const decision = byId.get(decisionId!);
    ok(decision, `${question} claims resolution by ${decisionId}, which has no row`);
    strictEqual(decision.status, 'decided', `${question} is resolved by ${decisionId}, which is not Decided`);
  }
});
