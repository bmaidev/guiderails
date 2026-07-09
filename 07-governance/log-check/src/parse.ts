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

/** Pure parsers over the governance artefacts. No file access; the tests supply the text. */

export type DecisionStatus = 'decided' | 'proposed';

export interface DecisionRow {
  id: string;
  number: number;
  status: DecisionStatus;
  rationale: string;
}

/** A decision row lands as Decided only when its status cell says so, in bold, exactly. */
export function parseDecisions(markdown: string): DecisionRow[] {
  const rows: DecisionRow[] = [];
  for (const line of markdown.split('\n')) {
    if (!/^\| D-\d{3} \|/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] is the empty string before the leading pipe.
    const id = cells[1]!;
    const status = cells[5] ?? '';
    const rationale = cells[6] ?? '';
    if (!status.includes('**Decided**') && !status.startsWith('Proposed')) {
      throw new Error(
        `${id}: status must be "**Decided**" or begin "Proposed" — the log's own preamble says the verbs mean what they say. Found: "${status}"`,
      );
    }
    rows.push({
      id,
      number: Number(id.slice(2)),
      status: status.includes('**Decided**') ? 'decided' : 'proposed',
      rationale,
    });
  }
  return rows;
}

export type CriterionLevel = 'A' | 'AA' | 'AAA';

export interface Criterion {
  id: string;
  level: CriterionLevel;
}

const CRITERION = /^- \*\*(\d+\.\d+\.\d+) \((A|AA|AAA)\)\*\*/gm;

export function parseCriteria(markdown: string): Criterion[] {
  return [...markdown.matchAll(CRITERION)].map((m) => ({
    id: m[1]!,
    level: m[2] as CriterionLevel,
  }));
}

export interface Totals {
  total: number;
  a: number;
  aa: number;
  aaa: number;
}

export function countByLevel(criteria: Criterion[]): Totals {
  return {
    total: criteria.length,
    a: criteria.filter((c) => c.level === 'A').length,
    aa: criteria.filter((c) => c.level === 'AA').length,
    aaa: criteria.filter((c) => c.level === 'AAA').length,
  };
}

/** The version the model declares in its header, e.g. "0.5". */
export function parseVersion(markdown: string): string {
  const m = /^\*\*Version (\d+\.\d+) —/m.exec(markdown);
  if (!m) throw new Error('MODEL.md has no "**Version X.Y — " header line.');
  return m[1]!;
}

/** The criterion count the contents line advertises. */
export function parseContentsCount(markdown: string): number {
  const m = /§5 the five principles and (\d+) success criteria/.exec(markdown);
  if (!m) throw new Error('MODEL.md contents line does not state a success-criterion count.');
  return Number(m[1]);
}

/**
 * The totals asserted by the change-log entry that lands the current version.
 * Ties the header, the change log and the criteria themselves to one number:
 * a criterion added without a change-log entry fails here, and so does an
 * entry whose arithmetic is stale.
 */
export function parseChangelogTotals(markdown: string, version: string): Totals {
  const entry = markdown
    .split('\n')
    .find((line) => line.includes(`→ v${version} (`) || line.includes(`-> v${version} (`));
  if (!entry) throw new Error(`MODEL.md has no change-log entry landing v${version}.`);
  const m = /Totals: (\d+) criteria \((\d+) A, (\d+) AA, (\d+) AAA\)/.exec(entry);
  if (!m) throw new Error(`The change-log entry for v${version} states no totals.`);
  return { total: Number(m[1]), a: Number(m[2]), aa: Number(m[3]), aaa: Number(m[4]) };
}

/** Every decision id a document leans on. */
export function citedDecisions(...documents: string[]): string[] {
  const found = new Set<string>();
  for (const doc of documents) for (const m of doc.matchAll(/D-\d{3}/g)) found.add(m[0]);
  return [...found].sort();
}
