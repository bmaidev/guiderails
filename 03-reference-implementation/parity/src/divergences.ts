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
 * The declared divergence inventory (FIXTURE-SPEC.md §8).
 *
 * The parity boundary says: anything not a catalogued pattern and not a listed
 * conformance feature must be identical between builds. Auditing that by hand
 * across two running servers is not tractable, so this file states every
 * permitted difference and the checks assert that nothing else differs.
 *
 * Three kinds, and the third is easy to miss:
 *
 *  1. CATALOGUED   — a baseline anti-pattern (B-xx), derived in PATTERN-CATALOGUE.md.
 *  2. CONFORMANCE  — a Guiderails feature the conformant build implements.
 *  3. DERIVED      — a difference *forced* by (1), not chosen. If a catalogued
 *                    pattern removes a concept, everything keyed on that concept
 *                    must change with it. An undeclared derived divergence looks
 *                    exactly like a parity defect to an auditor, so each is
 *                    enumerated here with the pattern that causes it.
 */

export type DivergenceKind = 'catalogued' | 'conformance' | 'derived';

export interface Divergence {
  id: string;
  kind: DivergenceKind;
  /** What differs, observably. */
  description: string;
  /** For `derived`: the catalogued pattern that forces it. */
  causedBy?: string;
}

export const DECLARED_DIVERGENCES: Divergence[] = [
  // 1. Catalogued baseline anti-patterns (see PATTERN-CATALOGUE.md for derivations).
  { id: 'B-01', kind: 'catalogued', description: 'Placeholder-only labels; generic text controls; div submit.' },
  { id: 'B-02', kind: 'catalogued', description: 'Meaning carried by layout/colour alone.' },
  { id: 'B-03', kind: 'catalogued', description: 'Eligibility guidance as PDF only.' },
  { id: 'B-04', kind: 'catalogued', description: 'Undeclared 15-minute session timeout with silent data loss.' },
  { id: 'B-05', kind: 'catalogued', description: 'Visual challenge gate on consequential submission, no alternative path.' },
  { id: 'B-06', kind: 'catalogued', description: 'No rules endpoint; eligibility only via prose that omits s11.' },
  { id: 'B-07', kind: 'catalogued', description: 'No delegation, confirmation checkpoint, attribution, or agent-action record.' },
  { id: 'B-08', kind: 'catalogued', description: 'Validation errors as a generic unassociated banner.' },
  { id: 'B-09', kind: 'catalogued', description: 'No journey-state, schema, or discovery machine surfaces.' },
  { id: 'B-10', kind: 'catalogued', description: 'Interruption discards the journey; no resume.' },
  { id: 'B-11', kind: 'catalogued', description: 'Third-party content rendered inline, indistinguishable from the operator\'s.' },
  { id: 'B-12', kind: 'catalogued', description: 'No agent-discovery file and no machine-readable link relation.' },

  // 2. Conformance features the conformant build implements.
  { id: 'CF-discovery', kind: 'conformance', description: '/llms.txt, /.well-known/guiderails.json, service-desc link relation and Link headers (1.1.x).' },
  { id: 'CF-rules', kind: 'conformance', description: '/api/rules/ssp/determination and changelog, with provenance and binding/indicative labelling (4.x).' },
  { id: 'CF-tools', kind: 'conformance', description: 'Declared tool endpoints and published step schemas (3.1.1).' },
  { id: 'CF-state', kind: 'conformance', description: 'Journey-state surface (2.4.x).' },
  { id: 'CF-delegation', kind: 'conformance', description: 'Delegation scope enforcement and legible rejection codes (5.1.x).' },
  { id: 'CF-confirmation', kind: 'conformance', description: 'Principal-attributable confirmation via single-use tokens from /api/confirmations (5.3.2).' },
  { id: 'CF-attribution', kind: 'conformance', description: 'Agent-originated submissions flagged in service records (5.2.1).' },
  { id: 'CF-provenance', kind: 'conformance', description: 'Third-party content fenced with a provenance marker (5.6.3).' },
  { id: 'CF-period', kind: 'conformance', description: 'J2 reporting-period surface with explicit timezone semantics (2.6.2).' },
  { id: 'CF-audit', kind: 'conformance', description: 'Principal-channel audit record of agent actions, plain-language and machine-readable, with the determinations relied upon and a contestability statement (5.4.1, 5.4.2).' },
  { id: 'CF-notifications', kind: 'conformance', description: 'Notification of each agent-executed consequential action, delivered to the principal\'s channel (5.5.2).' },
  { id: 'CF-delegation-lifecycle', kind: 'conformance', description: 'The principal suspends, revokes or reinstates a delegation through an always-available channel; revocation is terminal and takes effect before any further consequential action (5.1.2, 5.5.1).' },
  { id: 'CF-resume', kind: 'conformance', description: 'Resume of an interrupted journey: work is checkpointed against the principal, not the session, and adopted by a new session under the same delegation for a declared period (3.4.2). The baseline discards the journey (B-10).' },

  // 3. Derived: forced by a catalogued pattern, not chosen.
  {
    id: 'DV-duplicate-scope',
    kind: 'derived',
    causedBy: 'B-07',
    description:
      'Duplicate-protection KEY SCOPE differs. The register scopes CA-1 to one claim per principal, CA-2 to one report per principal per period, CA-3x to idempotence per principal per value-set. B-07 removes the principal from the baseline entirely, so the baseline cannot key on one: it degrades to applicant identity (CA-1) and session (CA-2, CA-3x). Duplicate protection itself is retained and behaves identically for a repeated identical submission; only the scope of "the same submission" differs. Consequence, and it is observable: for one session submitting two DIFFERENT applicants, the conformant build records one effect and the baseline two; for two sessions submitting the SAME applicant, the conformant build records two effects and the baseline one.',
  },
];

export const DECLARED_IDS = new Set(DECLARED_DIVERGENCES.map((d) => d.id));

/** Machine surfaces the conformant build serves and the baseline does not (CF-* / B-06 / B-09 / B-12). */
export const CONFORMANT_ONLY_PATHS = [
  '/llms.txt',
  '/.well-known/guiderails.json',
  '/api/essentiality-test',
  '/api/confirmations',
  '/api/rules/ssp/determination',
  '/api/rules/ssp/changelog',
  '/api/journeys/J1/schema',
  '/api/journeys/J1/state',
  '/api/journeys/J2/period',
];

/** Surfaces the baseline serves and the conformant build does not (B-03). */
export const BASELINE_ONLY_PATHS = ['/guidance.pdf'];
