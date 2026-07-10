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
 * Prime directive 1 — evidence or silence — checked by machine.
 *
 * Every claim traces to a register ID; every register ID must trace to a record
 * that says where the source is and when it was read. The register was prose,
 * so the gaps were invisible. These make them countable, and stop them growing.
 */

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(root + path, 'utf8');

interface SourceRecord {
  id: string;
  description: string;
  status: string;
  citedIn: string;
  url: string | null;
  host: string | null;
  accessed: string;
  archive: string | null;
  checksum: string | null;
  licence: string | null;
  note: string | null;
}

const RECORDS: SourceRecord[] = JSON.parse(read('01-research/sources/sources.json')).sources;

/** The register rows, as the dossier and the legal brief actually write them. */
function registerRows(markdown: string): Array<{ id: string; status: string }> {
  return [...markdown.matchAll(/^\| ([SL]-\d+) \| (.*?) \| (.*?) \|\s*$/gm)].map((m) => ({
    id: m[1]!,
    status: m[3]!.trim(),
  }));
}

const REGISTER = [
  ...registerRows(read('01-research/RESEARCH-DOSSIER.md')),
  ...registerRows(read('01-research/LEGAL-ISSUES-BRIEF.md')),
];

/**
 * VERIFIED sources with no URL. A source nobody can open cannot be checked, and
 * the dossier's own key defines VERIFIED as a source that was *accessed*.
 *
 * THIS NUMBER MAY ONLY GO DOWN. Lowering it means opening the source and
 * recording its locator. Raising it means a new unbacked claim, which is the
 * thing prime directive 1 forbids. There is no circumstance in which the honest
 * move is to edit this upward.
 */
const UNBACKED_VERIFIED_BUDGET = 31;

test('every register ID has a source record, and every record has a register ID', () => {
  const registerIds = REGISTER.map((r) => r.id).sort();
  const recordIds = RECORDS.map((r) => r.id).sort();
  deepStrictEqual(
    recordIds.filter((id) => !registerIds.includes(id)),
    [],
    'a record exists for a source the register never declared',
  );
  deepStrictEqual(
    registerIds.filter((id) => !recordIds.includes(id)),
    [],
    'a register ID has no record in 01-research/sources/sources.json',
  );
});

test('a record never contradicts the register about a source\'s status', () => {
  const byId = new Map(RECORDS.map((r) => [r.id, r]));
  const disagreements: string[] = [];
  for (const row of REGISTER) {
    const record = byId.get(row.id);
    if (record && record.status !== row.status) disagreements.push(row.id);
  }
  deepStrictEqual(disagreements, [], 'these records disagree with the register about a source\'s verification status');
});

test('source IDs are unique — numbering is forever', () => {
  const ids = RECORDS.map((r) => r.id);
  deepStrictEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'a source ID was reused (prime directive 7)');
});

test('the unbacked-VERIFIED count does not rise: the ratchet', () => {
  // 50 sources read VERIFIED; 31 of them have no locator. That is the debt.
  // Nobody has to repay it today. Nobody may add to it.
  const unbacked = RECORDS.filter((r) => r.status.startsWith('VERIFIED') && !r.url);
  ok(
    unbacked.length <= UNBACKED_VERIFIED_BUDGET,
    `${unbacked.length} VERIFIED sources have no URL, above the budget of ${UNBACKED_VERIFIED_BUDGET}. ` +
      `A VERIFIED source that cannot be opened cannot be checked. Record its locator rather than raising the budget. ` +
      `New: ${unbacked.map((r) => r.id).slice(0, 5).join(', ')}`,
  );
  // And when it falls, the budget must fall with it, or the ratchet slips.
  strictEqual(
    unbacked.length,
    UNBACKED_VERIFIED_BUDGET,
    `the debt has changed to ${unbacked.length}. If you repaid some, lower UNBACKED_VERIFIED_BUDGET to match.`,
  );
});

test('a record that claims a licence names one; null means unknown, not permissive', () => {
  for (const record of RECORDS) {
    if (record.licence === null) continue;
    ok(record.licence.trim().length > 0, `${record.id}: an empty licence string is worse than null`);
  }
});

test('no record claims an archive or a checksum, because no capture pass has run', () => {
  // If this fails, someone captured a source. Good — but then the README's
  // account of what is missing is now wrong, and must be updated with it.
  const captured = RECORDS.filter((r) => r.archive !== null || r.checksum !== null).map((r) => r.id);
  deepStrictEqual(captured, [], 'a capture appeared; update sources/README.md, which says none exists');
});

test('every record carries an access date', () => {
  const undated = RECORDS.filter((r) => !/^\d{4}-\d{2}-\d{2}$/.test(r.accessed)).map((r) => r.id);
  deepStrictEqual(undated, [], 'an undated claim is a stale claim (CLAUDE.md, research protocol)');
});
