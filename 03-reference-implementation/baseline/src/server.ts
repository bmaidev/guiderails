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
 * BASELINE build — the scientific control (FICTIONAL, D-009).
 *
 * Journeys J1–J3: same specs, field sets, validation logic and outcomes
 * for identical inputs as the conformant build (parity, FIXTURE-SPEC §8);
 * degraded ONLY per catalogued patterns B-01..B-10
 * (../parity/PATTERN-CATALOGUE.md). Field specs and validation are
 * imported from the conformant module so parity of meaning is
 * structural, not aspirational.
 *
 *  B-01 placeholder-only labels, generic text controls, div submit
 *  B-02 meaning carried by layout/colour
 *  B-03/B-06 guidance as PDF only; prose omits s11; no rules endpoint
 *  B-04/B-10 15-minute undeclared timeout; no resume
 *  B-05 visual challenge gate on every consequential submission
 *  B-07 no delegation, confirmation, attribution
 *  B-08 generic unassociated error banner
 *  B-09 no machine surfaces (no state, schema, discovery, period)
 *  B-11 third-party content rendered inline, indistinguishable from the operator's
 *  B-12 no agent-discovery file and no machine-readable link relation (1.1.4)
 */

import http from 'node:http';
import { createHash } from 'node:crypto';
import { validateValues } from '../../packages/agent-surface/src/index.ts';
import { JOURNEYS, REFERENCE_PREFIX, PERIOD_SURFACE, THIRD_PARTY_NOTICE } from '../../conformant/src/journeys.ts';
import { BaselineStore } from './store.ts';

export const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // B-04: enforced, never declared

const PLACEHOLDER_TEXT: Record<string, string> = {
  fullName: 'Name', dateOfBirth: 'DOB', email: 'Email', mobile: 'Phone',
  residentSince: 'Resident since', fortnightlyIncome: 'Income', courseProvider: 'Provider',
  courseName: 'Course', courseWeeks: 'Weeks', studyLoadEFT: 'Load', enrolmentStatus: 'Status',
  enrolmentDocument: 'Document', incomeDeclared: 'Declared', declaration: 'I agree',
  incomeForPeriod: 'Income', attendance: 'Attendance', partialReason: 'Reason',
  bsb: 'BSB', accountNumber: 'Account', accountName: 'Account name',
};

function esc(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** B-05: deterministic per-session challenge digits. */
export function challengeDigits(sid: string): string {
  return String(parseInt(createHash('sha256').update(sid).digest('hex').slice(0, 6), 16) % 10000).padStart(4, '0');
}

function challengeSvg(digits: string): string {
  const glyphs = [...digits]
    .map((d, i) => `<text x="${14 + i * 22}" y="${24 + (i % 2) * 5}" transform="rotate(${i % 2 ? 8 : -7} ${14 + i * 22} 24)" font-size="20" fill="#444">${d}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="40" role="img"><rect width="110" height="40" fill="#e8e8e8"/>${glyphs}</svg>`;
}

// B-06: the PDF paraphrase presents s6-s10 but omits s11 entirely.
const GUIDANCE_LINES = [
  'Skills Support Payment - who can get it',
  'You may get SSP if you are 17 to 64, have been an Australian resident',
  'for at least 26 weeks, and are enrolled in or hold an offer for an',
  'approved skills course of at least 8 weeks.',
  'Your fortnightly income must be under $1,400. If you are under 22 and',
  'studying at least 0.75 of a full-time load, the limit is $1,750.',
  'Payment is $350 per fortnight.',
];

/** A minimal but valid single-page PDF carrying the guidance prose (B-03). */
export function guidancePdf(): Buffer {
  const text = GUIDANCE_LINES.map((l, i) => `BT /F1 11 Tf 40 ${760 - i * 16} Td (${l.replace(/[()\\]/g, '')}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

function pageHtml(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${esc(title)}</title>
<style>.btn{background:#2a6;color:#fff;padding:8px 14px;display:inline-block;cursor:pointer}.errors{color:#c00}.ok{background:#cfc}.no{background:#fcc}</style>
</head>
<body>
<p><b>Commonwealth Skills Support Agency</b> — fictional service for standards testing (Guiderails fixture, D-009)</p>
${body}
</body>
</html>`;
}

function controlHtml(name: string, value: unknown): string {
  // B-01: no <label>, placeholder-only, generic text inputs regardless of data type.
  const v = value === undefined || value === null || value === true ? '' : ` value="${esc(value)}"`;
  if (name === 'incomeDeclared' || name === 'declaration') {
    return `<div><input type="checkbox" name="${esc(name)}"${value ? ' checked' : ''}> ${esc(PLACEHOLDER_TEXT[name])}</div>`;
  }
  return `<div><input type="text" name="${esc(name)}" placeholder="${esc(PLACEHOLDER_TEXT[name] ?? name)}"${v}></div>`;
}

function stepForm(jid: string, stepId: string, values: Record<string, unknown>, errorBanner: string, sid: string, consequential: boolean): string {
  const fields = JOURNEYS[jid].fields[stepId];
  const controls = fields.map((f) => controlHtml(f.name, values[f.name])).join('\n');
  const challenge = consequential
    ? `<div>${challengeSvg(challengeDigits(sid))}<input type="text" name="challenge" placeholder="Enter the characters shown"></div>`
    : '';
  return `${errorBanner}
<form method="post" action="/journeys/${esc(jid)}/steps/${esc(stepId)}" id="f">
${controls}
${challenge}
<div class="btn" onclick="document.getElementById('f').submit()">Continue</div>
</form>`;
}

function coerce(jid: string, stepId: string, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const f of JOURNEYS[jid].fields[stepId]) {
    const v = out[f.name];
    if (typeof v !== 'string' || v === '') continue;
    if (f.dataType === 'integer' || f.dataType === 'money' || f.dataType === 'decimal') {
      const n = Number(v);
      if (Number.isFinite(n)) out[f.name] = n;
    } else if (f.dataType === 'boolean') {
      out[f.name] = v === 'true' || v === 'on';
    }
  }
  return out;
}

/** Baseline duplicate keys: no principal exists (B-07), so keys degrade to identity/session scope. */
function baselineDuplicateKey(jid: string, actionId: string, sid: string, draftValues: Record<string, unknown>, values: Record<string, unknown>): string {
  if (actionId === 'CA-1') return `${draftValues.fullName}|${draftValues.dateOfBirth}|CA-1`;
  if (actionId === 'CA-2') return `${sid}|CA-2|${PERIOD_SURFACE.period.end}`;
  const sorted = Object.keys(values).sort().map((k) => `${k}=${String(values[k])}`).join('&');
  return `${sid}|${actionId}|${sorted}`;
}

export function createBaselineServer(store: BaselineStore): http.Server {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const now = () => new Date(store.now()).toISOString();

    const html = (status: number, body: string) => {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
    };

    try {
      if (req.method === 'GET' && (path === '/' || path === '/journeys/J1')) {
        res.writeHead(303, { location: '/journeys/J1/steps/identity' });
        return res.end();
      }
      if (req.method === 'GET' && path === '/guidance.pdf') {
        res.writeHead(200, { 'content-type': 'application/pdf' }); // B-03: PDF only
        return res.end(guidancePdf());
      }

      // Harness instrumentation (not a service surface; parity-exempt tooling)
      if (req.method === 'GET' && path === '/api/_fixture/claims') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(store.claims));
      }
      if (req.method === 'GET' && path === '/api/_fixture/log') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(store.log));
      }

      // B-09: no state/schema/discovery/period surfaces. B-06: no rules. B-07: no delegation.
      // B-12: no /llms.txt agent-discovery file (and pageHtml emits no link relation).
      if (path.startsWith('/api/') || path === '/.well-known/guiderails.json' || path === '/llms.txt') {
        return html(404, pageHtml('Not found', '<p>Page not found.</p>'));
      }

      const m = /^\/journeys\/(J[123])\/steps\/([a-z]+)$/.exec(path);
      if (m) {
        const [, jid, stepId] = m;
        const journey = JOURNEYS[jid];
        const step = journey.spec.steps.find((s) => s.id === stepId);
        if (!step) return html(404, pageHtml('Not found', '<p>Page not found.</p>'));

        const cookie = req.headers.cookie ?? '';
        const cm = /(?:^|;\s*)sid=([A-Za-z0-9-]+)/.exec(cookie);
        let sid = cm?.[1];
        if (!sid) {
          sid = store.newSessionId();
          res.setHeader('set-cookie', `sid=${sid}; Path=/`);
        }
        // B-04/B-10: expiry silently discards the draft; no warning, no recovery.
        const { draft, expired } = store.draftWithTimeout(`${sid}|${jid}`, SESSION_TIMEOUT_MS);
        const stepOrder = journey.spec.steps.map((s) => s.id);
        const idx = stepOrder.indexOf(stepId);
        const consequential = step.kind === 'consequential';

        if (req.method === 'GET') {
          const expiredNote = expired ? '<p class="errors">Your session has expired. Please start again.</p>' : '';
          let guidance = '';
          if (jid === 'J1' && stepId === 'circumstances') {
            guidance = '<p>Not sure if you qualify? <a href="/guidance.pdf">Download the eligibility guide (PDF)</a>.</p>';
            if (store.injectionEnabled) {
              // B-11: third-party content rendered inline, indistinguishable from operator content
              guidance += THIRD_PARTY_NOTICE.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n');
            }
          }
          if (jid === 'J2' && stepId === 'period') {
            // Due date appears in prose only; no machine surface, no timezone semantics (B-09 / 2.6.2 violation by omission)
            guidance = `<p>Report for ${esc(PERIOD_SURFACE.period.start)} – ${esc(PERIOD_SURFACE.period.end)}. Don't be late or your payment may stop.</p>`;
          }
          return html(200, pageHtml(step.title, `${expiredNote}<h1>${esc(step.title)}</h1>${guidance}${stepForm(jid, stepId, draft.values, '', sid, consequential)}`));
        }

        if (req.method === 'POST') {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const raw = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')));
          const values = coerce(jid, stepId, raw);
          store.record({ at: now(), sessionId: sid, type: 'field-values', detail: { journey: jid, step: stepId, values } });

          // Same validation logic as conformant (parity); only the PRESENTATION degrades (B-08).
          const errors = validateValues(journey.fields[stepId], values);
          if (errors.length > 0) {
            return html(200, pageHtml(step.title, `<h1>${esc(step.title)}</h1>${stepForm(jid, stepId, values, '<div class="errors">Some of the information you entered is not valid. Please check the form and try again.</div>', sid, consequential)}`));
          }

          if (consequential) {
            // B-05: challenge gate; no alternative path.
            if (raw.challenge !== challengeDigits(sid)) {
              store.record({ at: now(), sessionId: sid, type: 'challenge-failed', detail: { journey: jid, step: stepId } });
              return html(200, pageHtml(step.title, `<h1>${esc(step.title)}</h1>${stepForm(jid, stepId, values, '<div class="errors">The characters you entered did not match. Try again.</div>', sid, true)}`));
            }
            const required = journey.spec.steps.filter((s) => s.kind === 'safe').map((s) => s.id);
            const missing = required.filter((s) => !draft.completedSteps.includes(s));
            if (missing.length > 0) {
              return html(200, pageHtml('Cannot submit', `<h1>Cannot submit</h1><div class="errors">Your application is incomplete. Please start again.</div>`));
            }
            Object.assign(draft.values, values);
            // B-07: executes for whoever posts — no delegation, no confirmation event, no attribution.
            const key = baselineDuplicateKey(jid, step.actionId!, sid, draft.values, values);
            const outcome = store.guard.execute(key, () => {
              const reference = store.nextReference(REFERENCE_PREFIX[step.actionId!]);
              store.claims.push({ journeyId: jid, actionId: step.actionId!, reference, values: { ...draft.values }, at: now() });
              store.record({ at: now(), sessionId: sid, type: 'effect', detail: { actionId: step.actionId, reference } });
              return { reference, at: now() };
            });
            return html(200, pageHtml('Submitted', `<h1>Thank you</h1><p>Your reference is ${esc(outcome.record.reference)}.</p>`));
          }

          Object.assign(draft.values, values);
          if (!draft.completedSteps.includes(stepId)) draft.completedSteps.push(stepId);
          const next = stepOrder[idx + 1];
          res.writeHead(303, { location: next ? `/journeys/${jid}/steps/${next}` : `/journeys/${jid}/steps/${stepOrder[0]}` });
          return res.end();
        }
      }

      return html(404, pageHtml('Not found', '<p>Page not found.</p>'));
    } catch (e) {
      store.record({ at: now(), sessionId: 'server', type: 'error', detail: { path, error: String(e) } });
      return html(500, pageHtml('Error', '<p>Something went wrong.</p>'));
    }
  });
}
