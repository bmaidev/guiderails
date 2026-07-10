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
 * Prime directive 4: items under consent gates C1–C4 do not ship without
 * recorded consent. No exceptions, "including just this once."
 *
 * The LEDA establishment pack sits under three of those gates and cannot obtain
 * consent, because the body that consents does not yet exist. D-018 proposes a
 * narrow exemption. Until D-018 reads Decided, every file in the pack must say,
 * in its own text, that it is not to be published. A directory of ready-looking
 * recruitment documents with no such marking is one copy-paste from breaching a
 * gate that the whole framework is built on.
 */

import { deepStrictEqual, ok } from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parseDecisions } from './parse.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(root + path, 'utf8');

const GATED_DIRECTORIES = ['05-pilot/leda', '05-pilot/easy-read'];

function markdownIn(dir: string): string[] {
  return readdirSync(root + dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `${dir}/${f}`);
}

const D018 = parseDecisions(read('DECISIONS.md')).find((d) => d.id === 'D-018');

test('D-018 exists and states the gates it touches', () => {
  ok(D018, 'the LEDA establishment pack exists with no decision governing its publication');
  ok(/C1/.test(D018.rationale) || /C1/.test(read('DECISIONS.md')), 'D-018 must name the gates it suspends');
});

test('while D-018 is Proposed, no pack document may present itself as publishable', () => {
  // The exemption is not in force. Every file says so, or CI fails.
  if (D018!.status === 'decided') return; // once decided, the markings come off deliberately

  const unmarked: string[] = [];
  for (const dir of GATED_DIRECTORIES) {
    for (const file of markdownIn(dir)) {
      const text = read(file);
      const marked = /NOT FOR PUBLICATION/i.test(text) || /NOT EASY READ YET/i.test(text);
      if (!marked) unmarked.push(file);
    }
  }
  deepStrictEqual(
    unmarked,
    [],
    'these documents sit under LEDA consent gates C1/C3/C4 and do not say they must not be published. ' +
      'Prime directive 4 admits no exceptions.',
  );
});

test('the pack does not quietly amend the framework it is gated by', () => {
  // Amending CO-DESIGN-FRAMEWORK.md is itself a C4 act. Escaping a C4 problem by
  // committing a C4 act is the precise failure this project exists to name, so
  // the establishment clause lives in DECISIONS.md as a proposal, not in §3.
  const framework = read('05-pilot/CO-DESIGN-FRAMEWORK.md');
  ok(
    !/establishment exemption|D-018/.test(framework),
    'the framework was amended to solve a problem only LEDA may consent to solving',
  );
});

test('the Easy Read draft never claims to be Easy Read', () => {
  const draft = read('05-pilot/easy-read/EOI-easy-read.md');
  ok(
    /NOT EASY READ YET/i.test(draft),
    'drafted text published as Easy Read is the project doing what it accuses services of doing',
  );
  ok(
    read('05-pilot/easy-read/README.md').includes('tested with people with intellectual disability'),
    'the README must state the production and testing that Easy Read actually requires',
  );
});

test('the pack tells prospective members that ratification can fail', () => {
  // A ratification that cannot fail is not a ratification. Members are told
  // before they apply, not after they are recruited.
  const role = read('05-pilot/leda/ROLE-DESCRIPTION.md');
  ok(/You may reject it/i.test(role) || /may reject/i.test(role), 'the role description must say the framework can be rejected');
  ok(
    /before you apply/i.test(role),
    'members must be told about the ratification vote before applying, not at the first meeting',
  );
});

test('no pack document collects disability information into this repository', () => {
  // D-009: no real personal data anywhere in the repository, including examples.
  for (const dir of GATED_DIRECTORIES) {
    for (const file of markdownIn(dir)) {
      const text = read(file);
      // Only documents that actually ask a person for information. A file that
      // merely mentions the EOI solicits nothing.
      if (!/How to register interest|How to tell us you are interested/i.test(text)) continue;
      ok(
        /outside this project's public repository|never published there|not put it on the internet/i.test(text),
        `${file} invites people to send information without saying where it does not go`,
      );
    }
  }
});
