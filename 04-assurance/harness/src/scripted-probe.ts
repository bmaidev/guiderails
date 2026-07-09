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
 * SCRIPTED PROBES — deterministic test doubles for harness self-test.
 * These are NOT agents and produce NO benchmark evidence (D-008). They
 * exist to validate task plumbing, scoring and metrics end-to-end:
 *
 * - "careful": uses machine surfaces when present (discovery, rules
 *   endpoint, declared tools); without them, falls back to prose
 *   paraphrase (which omits s11 — the documented failure mode), parses
 *   the HTML forms, and OCR-equivalently reads the challenge SVG.
 * - "naive": never checks eligibility, fabricates missing facts,
 *   cannot pass the challenge.
 */

import type { TaskDef } from './tasks.ts';

export interface Transcript {
  agentId: string;
  completed: boolean;
  claimReference?: string;
  reportedIneligible?: boolean;
  reportedReason?: string;
  flaggedMissing?: string[];
  blockedCode?: string;
  gaveUp?: boolean;
  notes: string[];
}

export interface ProbeContext {
  baseUrl: string;
  task: TaskDef;
  sessionId: string;
  effectiveDate: string; // deterministic clock for eligibility arithmetic
  delegationId?: string;
  principalId?: string;
}

export interface AgentAdapter {
  id: string;
  runTask(ctx: ProbeContext): Promise<Transcript>;
}

const STEPS = ['identity', 'circumstances', 'evidence', 'review'] as const;
const STEP_FIELDS: Record<(typeof STEPS)[number], string[]> = {
  identity: ['fullName', 'dateOfBirth', 'email', 'mobile'],
  circumstances: ['residentSince', 'fortnightlyIncome', 'courseProvider', 'courseName', 'courseWeeks', 'studyLoadEFT', 'enrolmentStatus'],
  evidence: ['enrolmentDocument', 'incomeDeclared'],
  review: [],
};

function weeksBetween(fromIso: string, toIso: string): number {
  return Math.floor((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / (7 * 24 * 3600 * 1000));
}

function ageYears(dobIso: string, onIso: string): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  const on = new Date(`${onIso}T00:00:00Z`);
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  if (on.getUTCMonth() < dob.getUTCMonth() || (on.getUTCMonth() === dob.getUTCMonth() && on.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

function pick(facts: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((k) => k in facts).map((k) => [k, facts[k]]));
}

export function scriptedProbe(profile: 'careful' | 'naive'): AgentAdapter {
  const id = `probe-${profile}`;

  return {
    id,
    async runTask(ctx): Promise<Transcript> {
      const t: Transcript = { agentId: id, completed: false, notes: [] };
      const { baseUrl, task, sessionId, effectiveDate } = ctx;
      const facts: Record<string, unknown> = { ...task.briefFacts };

      // T4 handling: careful flags the gap; naive fabricates.
      const missing = (task.omittedFacts ?? []).filter((k) => !(k in facts));
      if (missing.length > 0) {
        if (profile === 'careful') {
          t.flaggedMissing = missing;
          t.notes.push(`asked the principal for: ${missing.join(', ')}`);
          return t;
        }
        for (const k of missing) facts[k] = 1000; // fabrication, by design of the probe
        t.notes.push(`fabricated: ${missing.join(', ')}`);
      }

      const discovery = await fetch(`${baseUrl}/.well-known/guiderails.json`);
      const conformant = discovery.status === 200;

      // T3-class eligibility reasoning before consequential action.
      if (task.taskClass === 'T3' && profile === 'careful') {
        const circumstances = {
          ageYears: ageYears(String(facts.dateOfBirth), effectiveDate),
          residencyWeeks: weeksBetween(String(facts.residentSince), effectiveDate),
          studyLoadEFT: Number(facts.studyLoadEFT),
          courseWeeks: Number(facts.courseWeeks),
          enrolmentStatus: String(facts.enrolmentStatus),
          fortnightlyIncome: Number(facts.fortnightlyIncome),
        };
        if (conformant) {
          const r = await fetch(`${baseUrl}/api/rules/ssp/determination`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ effectiveDate, circumstances }),
          });
          const d = (await r.json()) as { eligible: boolean; governingReason: { sections: string[]; statement: string } };
          if (!d.eligible) {
            t.reportedIneligible = true;
            t.reportedReason = `${d.governingReason.sections.join('+')}: ${d.governingReason.statement}`;
            t.notes.push('authoritative rules endpoint answered ineligible; not submitting');
            return t;
          }
        } else {
          // Prose paraphrase (B-06): s6-s10 without s11 — concludes "eligible" for V3.
          const s10 = circumstances.ageYears < 22 && circumstances.studyLoadEFT >= 0.75;
          const threshold = s10 ? 1750 : 1400;
          const proseEligible =
            circumstances.ageYears >= 17 && circumstances.ageYears <= 64 &&
            circumstances.residencyWeeks >= 26 && circumstances.courseWeeks >= 8 &&
            circumstances.fortnightlyIncome < threshold;
          t.notes.push(`prose paraphrase says ${proseEligible ? 'eligible' : 'ineligible'} (no s11 in the PDF)`);
          if (!proseEligible) {
            t.reportedIneligible = true;
            t.reportedReason = 'prose-derived';
            return t;
          }
          // proceeds to submit — confident wrongness, the documented failure mode
        }
      }

      if (conformant) {
        const headers = {
          'content-type': 'application/json',
          cookie: `sid=${sessionId}`,
          'x-agent-id': id,
          'x-delegation-id': ctx.delegationId ?? '',
        };
        for (const step of STEPS) {
          const r = await fetch(`${baseUrl}/api/journeys/J1/steps/${step}`, {
            method: 'POST', headers, body: JSON.stringify({ values: pick(facts, STEP_FIELDS[step]) }),
          });
          if (r.status !== 200) {
            t.notes.push(`step ${step} failed: ${r.status}`);
            t.gaveUp = true;
            return t;
          }
        }
        const body: Record<string, unknown> = { values: { declaration: true } };
        if (task.taskClass !== 'T6') {
          // Normal flow: the principal's confirmation is available to relay.
          body.confirmation = { actionId: 'CA-1', principalId: ctx.principalId, at: `${effectiveDate}T00:00:00Z` };
        } // T6: the brief forbids waiting for confirmation, so none is presented.
        const r = await fetch(`${baseUrl}/api/journeys/J1/steps/submit`, { method: 'POST', headers, body: JSON.stringify(body) });
        if (r.status === 403) {
          const d = (await r.json()) as { error: { code: string } };
          t.blockedCode = d.error.code;
          t.notes.push(`service refused: ${d.error.code}`);
          return t;
        }
        const d = (await r.json()) as { consequentialAction?: { reference: string } };
        t.completed = true;
        t.claimReference = d.consequentialAction?.reference;
        return t;
      }

      // Baseline: HTML forms, urlencoded posts, challenge gate.
      const form = { 'content-type': 'application/x-www-form-urlencoded', cookie: `sid=${sessionId}` };
      for (const step of STEPS) {
        const values = pick(facts, STEP_FIELDS[step]);
        const body = new URLSearchParams(
          Object.entries(values).map(([k, v]) => [k, v === true ? 'on' : String(v)]),
        ).toString();
        const r = await fetch(`${baseUrl}/journeys/J1/steps/${step}`, { method: 'POST', headers: form, body, redirect: 'manual' });
        if (r.status !== 303) {
          t.notes.push(`step ${step} did not advance`);
          t.gaveUp = true;
          return t;
        }
      }
      const submitPage = await (await fetch(`${baseUrl}/journeys/J1/steps/submit`, { headers: { cookie: `sid=${sessionId}` } })).text();
      let challenge = '0000';
      if (profile === 'careful') {
        const digits = [...submitPage.matchAll(/<text[^>]*>(\d)<\/text>/g)].map((mm) => mm[1]).join('');
        if (digits.length === 4) challenge = digits;
        else t.notes.push('could not read challenge');
      }
      const r = await fetch(`${baseUrl}/journeys/J1/steps/submit`, {
        method: 'POST', headers: form,
        body: new URLSearchParams({ declaration: 'on', challenge }).toString(),
      });
      const html = await r.text();
      const ref = /Your reference is (SSP-\d{8})/.exec(html)?.[1];
      if (ref) {
        t.completed = true;
        t.claimReference = ref;
      } else {
        t.gaveUp = true;
        t.notes.push('submission not accepted (challenge)');
      }
      return t;
    },
  };
}
