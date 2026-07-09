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
 * Conformant fixture build — HTTP server. FICTIONAL service (D-009);
 * localhost only; no external network calls.
 *
 * Criteria wired in this increment: 1.1.1/1.1.2/1.2.1/1.3.1 (service
 * description + discovery), 2.2.x (semantics/errors), 2.4.x (state
 * surfaces), 2.6.1 (declared time limit), 3.1.1 (declared tools for J1),
 * 3.4.1/3.4.2/3.4.3 (duplicate protection, resumability, safe steps),
 * 4.1.1/4.2.1/4.4.x/4.5.x (rules endpoint + changelog),
 * 5.1.x/5.2.1/5.3.1/5.5.2-adjacent (delegation, attribution,
 * confirmation checkpoint, notification obligation recorded).
 */

import http from 'node:http';
import {
  formJsonSchema,
  validateValues,
  journeyState,
  safeSteps,
  authoriseConsequentialAction,
  type ConfirmationEvent,
  type FieldError,
} from '../../packages/agent-surface/src/index.ts';
import {
  determine,
  RulesInputError,
  INSTRUMENT_ID,
  RULES_VERSION,
  INSTRUMENT_COMMENCEMENT,
  ageInYears,
} from '../../packages/rules-sspd-2026/src/determination.ts';
import { J1_SPEC, J1_FIELDS, CA_REGISTER } from './j1.ts';
import { Store } from './store.ts';
import { page, form, esc } from './html.ts';

export const SURFACE_VERSION = '0.1.0';
export const SURFACE_LAST_MODIFIED = '2026-07-09';
export const SESSION_TIME_LIMIT_MINUTES = 60; // 2.6.1: declared before the journey begins

const STEP_ORDER = J1_SPEC.steps.map((s) => s.id);

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 1));
}

function html(res: http.ServerResponse, status: number, body: string, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

function serviceDescription(origin: string): Record<string, unknown> {
  return {
    // 1.1.1: name, authority, purpose, entry point, standard version claimed
    service: {
      name: 'Commonwealth Skills Support Payment',
      administeringAuthority: 'Commonwealth Skills Support Agency (FICTIONAL — Guiderails fixture, D-009)',
      purpose: 'A flat-rate fortnightly payment supporting people undertaking approved skills courses.',
      canonicalEntryPoint: `${origin}/journeys/J1/steps/identity`,
      standardClaimed: { standard: 'Guiderails', version: '0.2' },
    },
    surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED }, // 1.3.1
    sessionTimeLimit: { minutes: SESSION_TIME_LIMIT_MINUTES, dataLossOnExpiry: false, recovery: 'Drafts are resumable for the declared period (3.4.2).' }, // 2.6.1
    // 1.1.2: essential journeys with entry points, consequential-actions register, essentiality test
    essentialityTest: { reference: `${origin}/api/essentiality-test`, summary: 'A journey is essential if it lodges, varies or reports on a claim for the payment.' },
    journeys: [
      {
        id: 'J1',
        title: J1_SPEC.title,
        essential: true,
        entryPoint: `${origin}/journeys/J1/steps/identity`,
        consequentialActions: CA_REGISTER.filter((a) => a.journeyId === 'J1'),
        safeSteps: safeSteps(J1_SPEC), // 3.4.3
        tools: `${origin}/api/journeys/J1/schema`, // 1.2.1: discoverable without navigation/auth/side effects
        state: `${origin}/api/journeys/J1/state`,
      },
      { id: 'J2', title: 'Fortnightly activity report', essential: true, status: 'not yet implemented in this increment' },
      { id: 'J3', title: 'Update details', essential: true, status: 'not yet implemented in this increment' },
    ],
    consequentialActionsRegister: CA_REGISTER, // 5.3.1: designation is a machine surface
    rules: {
      determination: `${origin}/api/rules/ssp/determination`,
      changelog: `${origin}/api/rules/ssp/changelog`,
      instrument: { id: INSTRUMENT_ID, version: RULES_VERSION, commencement: INSTRUMENT_COMMENCEMENT },
    },
  };
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function parseFormBody(body: string): Record<string, unknown> {
  return Object.fromEntries(new URLSearchParams(body));
}

function getSession(req: http.IncomingMessage, res: http.ServerResponse, store: Store): string {
  const cookie = req.headers.cookie ?? '';
  const match = /(?:^|;\s*)sid=([A-Za-z0-9-]+)/.exec(cookie);
  if (match) return match[1];
  const sid = store.newSessionId();
  res.setHeader('set-cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  return sid;
}

/** Coerce urlencoded strings to the typed values tool calls submit directly. */
function coerce(fields: typeof J1_FIELDS[string], values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const f of fields) {
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

interface SubmitAuthInput {
  agentId?: string;
  delegationId?: string;
  confirmation?: ConfirmationEvent;
  humanPrincipalId?: string;
}

export function createFixtureServer(store: Store): http.Server {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const now = () => new Date().toISOString();
    const origin = `http://${req.headers.host ?? 'localhost'}`;

    try {
      // ---- Discovery ----
      if (req.method === 'GET' && path === '/.well-known/guiderails.json') {
        return json(res, 200, serviceDescription(origin));
      }
      if (req.method === 'GET' && path === '/api/essentiality-test') {
        return json(res, 200, {
          surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED },
          test: 'A journey is essential if it lodges, varies or reports on a claim for the payment.',
          classifications: [{ journey: 'J1', essential: true }, { journey: 'J2', essential: true }, { journey: 'J3', essential: true }],
        });
      }

      // ---- Harness instrumentation (not a service surface; methodology §6 log access) ----
      if (req.method === 'GET' && path === '/api/_fixture/claims') {
        return json(res, 200, store.claims);
      }
      if (req.method === 'GET' && path === '/api/_fixture/log') {
        return json(res, 200, store.log);
      }

      // ---- Rules (Principle 4) ----
      if (req.method === 'GET' && path === '/api/rules/ssp/changelog') {
        return json(res, 200, {
          instrument: INSTRUMENT_ID,
          surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED },
          changes: [{ rulesVersion: RULES_VERSION, effectiveDate: INSTRUMENT_COMMENCEMENT, summary: 'Initial determination (fictional).', publishedInAdvance: true }],
        });
      }
      if (req.method === 'POST' && path === '/api/rules/ssp/determination') {
        const body = JSON.parse((await readBody(req)) || '{}');
        store.record({ at: now(), sessionId: 'anonymous', type: 'rules-query', detail: { inputs: body } }); // 4.5.2: no principal attribution
        try {
          const determination = determine(body.circumstances ?? {}, { effectiveDate: body.effectiveDate });
          return json(res, 200, determination);
        } catch (e) {
          if (e instanceof RulesInputError) {
            return json(res, 400, { error: { code: 'INVALID_CIRCUMSTANCES', message: e.message } });
          }
          throw e;
        }
      }

      // ---- J1 machine surfaces ----
      if (req.method === 'GET' && path === '/api/journeys/J1/schema') {
        // 3.1.1: published input/output schemas for every step, no auth, no side effects
        return json(res, 200, {
          journey: J1_SPEC.id,
          surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED },
          steps: J1_SPEC.steps.map((s) => ({
            id: s.id,
            title: s.title,
            kind: s.kind,
            actionId: s.actionId,
            confirmationDesignated: s.actionId ? CA_REGISTER.find((a) => a.id === s.actionId)?.confirmationDesignated : undefined,
            endpoint: `${origin}/api/journeys/J1/steps/${s.id}`,
            inputSchema: formJsonSchema(`j1-${s.id}`, s.title, J1_FIELDS[s.id]),
          })),
        });
      }
      if (req.method === 'GET' && path === '/api/journeys/J1/state') {
        const sid = getSession(req, res, store);
        const draft = store.draft(sid);
        return json(res, 200, journeyState(J1_SPEC, draft)); // 2.4.1 / 2.4.2
      }

      // ---- J1 tool calls (agent path) ----
      const toolMatch = /^\/api\/journeys\/J1\/steps\/([a-z]+)$/.exec(path);
      if (req.method === 'POST' && toolMatch) {
        const stepId = toolMatch[1];
        const step = J1_SPEC.steps.find((s) => s.id === stepId);
        if (!step) return json(res, 404, { error: { code: 'UNKNOWN_STEP', message: `No step "${stepId}" in J1.` } });
        const sid = getSession(req, res, store);
        const body = JSON.parse((await readBody(req)) || '{}');
        const values = body.values ?? {};
        store.record({ at: now(), sessionId: sid, type: 'tool-call', detail: { step: stepId, values } });

        const errors = validateValues(J1_FIELDS[stepId], values);
        if (errors.length > 0) {
          return json(res, 422, { errors }); // 2.2.2: structured, per-control
        }
        const draft = store.draft(sid);
        Object.assign(draft.values, values);
        store.record({ at: now(), sessionId: sid, type: 'field-values', detail: { step: stepId, values } });

        if (step.kind === 'safe') {
          if (!draft.completedSteps.includes(stepId)) draft.completedSteps.push(stepId);
          return json(res, 200, { step: stepId, safeStep: true, state: journeyState(J1_SPEC, draft) });
        }

        // Consequential: CA-1, confirmation-designated (5.3.1)
        return submitClaim(res, store, sid, {
          agentId: (req.headers['x-agent-id'] as string) ?? undefined,
          delegationId: (req.headers['x-delegation-id'] as string) ?? undefined,
          confirmation: body.confirmation,
        }, now());
      }

      // ---- J1 HTML journey (human path) ----
      const htmlMatch = /^\/journeys\/J1\/steps\/([a-z]+)$/.exec(path);
      if (htmlMatch) {
        const stepId = htmlMatch[1];
        const step = J1_SPEC.steps.find((s) => s.id === stepId);
        if (!step) return html(res, 404, page('Page not found', '<p>This step does not exist.</p>'));
        const sid = getSession(req, res, store);
        const draft = store.draft(sid);
        const fields = J1_FIELDS[stepId];
        const idx = STEP_ORDER.indexOf(stepId);

        if (req.method === 'GET') {
          const stepInfo = `<p>Step ${idx + 1} of ${STEP_ORDER.length}. This step ${step.kind === 'safe' ? 'saves your progress and has no legal effect' : 'submits your application — a consequential action'}.</p>
<p>Session time limit: ${SESSION_TIME_LIMIT_MINUTES} minutes; your draft is kept and you can resume without losing entered data.</p>`;
          const reviewHtml = stepId === 'review'
            ? `<dl>${J1_SPEC.steps.flatMap((s) => J1_FIELDS[s.id]).map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(draft.values[f.name] ?? 'Not provided')}</dd>`).join('')}</dl>`
            : '';
          return html(res, 200, page(step.title, `${stepInfo}${reviewHtml}${form(path, fields, draft.values, [], stepId === 'submit' ? 'Submit application' : 'Save and continue')}`));
        }

        if (req.method === 'POST') {
          const raw = parseFormBody(await readBody(req));
          const values = coerce(fields, raw);
          store.record({ at: now(), sessionId: sid, type: 'field-values', detail: { step: stepId, values } });
          const errors = validateValues(fields, values);
          if (errors.length > 0) {
            return html(res, 422, page(step.title, form(path, fields, values, errors, stepId === 'submit' ? 'Submit application' : 'Save and continue')));
          }
          Object.assign(draft.values, values);
          if (step.kind === 'safe') {
            if (!draft.completedSteps.includes(stepId)) draft.completedSteps.push(stepId);
            const next = STEP_ORDER[idx + 1];
            res.writeHead(303, { location: `/journeys/J1/steps/${next}` });
            return res.end();
          }
          // Human path: the session principal's own declaration IS the confirmation event.
          return submitClaim(res, store, sid, {
            humanPrincipalId: `principal-${sid}`,
          }, now(), true);
        }
      }

      if (req.method === 'GET' && path === '/') {
        res.writeHead(303, { location: '/journeys/J1/steps/identity' });
        return res.end();
      }

      return json(res, 404, { error: { code: 'NOT_FOUND', message: `No resource at ${path}.` } });
    } catch (e) {
      store.record({ at: now(), sessionId: 'server', type: 'rejection', detail: { path, error: String(e) } });
      return json(res, 500, { error: { code: 'INTERNAL', message: 'Unexpected fixture error; logged.' } });
    }
  });
}

function submitClaim(
  res: http.ServerResponse,
  store: Store,
  sid: string,
  auth: SubmitAuthInput,
  at: string,
  asHtml = false,
): void {
  const draft = store.draft(sid);
  const action = CA_REGISTER.find((a) => a.id === 'CA-1')!;

  // Prerequisites (2.4.1): all safe steps must be complete
  const missing = STEP_ORDER.filter((s) => s !== 'submit' && !draft.completedSteps.includes(s));
  if (missing.length > 0) {
    const body = { error: { code: 'PREREQUISITES_UNSATISFIED', message: `Complete these steps first: ${missing.join(', ')}.`, missing } };
    if (asHtml) return html(res, 422, page('Cannot submit yet', `<p>${esc(body.error.message)}</p>`));
    return json(res, 422, body);
  }

  let principalId: string;
  let attribution: { agentOriginated: boolean; agentId?: string };

  if (auth.humanPrincipalId) {
    // Principal acting directly; the posted declaration is the confirmation event.
    principalId = auth.humanPrincipalId;
    attribution = { agentOriginated: false };
    store.record({ at, sessionId: sid, type: 'confirmation', detail: { actionId: action.id, principalId, channel: 'human-declaration' } });
  } else {
    const delegation = store.delegation(auth.delegationId);
    const result = authoriseConsequentialAction({
      action,
      agentId: auth.agentId ?? '',
      delegation,
      confirmation: auth.confirmation,
      at,
    });
    if (!result.authorised) {
      store.record({ at, sessionId: sid, type: 'rejection', detail: { actionId: action.id, ...result.reason } });
      return json(res, 403, { error: result.reason }); // 5.1.1: safe, legible rejection
    }
    principalId = result.principalId;
    attribution = result.attribution;
    store.record({ at, sessionId: sid, type: 'confirmation', detail: { actionId: action.id, principalId, channel: 'delegated-confirmation' } });
  }

  // 3.4.1: one open claim per principal; repeats return the original effect
  const outcome = store.guard.execute(`${principalId}:CA-1`, () => {
    const reference = store.nextClaimReference();
    store.claims.push({ reference, principalId, values: { ...draft.values }, at, attribution });
    store.record({ at, sessionId: sid, type: 'effect', detail: { actionId: action.id, reference, attribution, notificationQueued: true } }); // 5.5.2 obligation recorded
    return { reference, at };
  });

  if (!outcome.duplicate) {
    draft.consequentialEvents.push({ stepId: 'submit', actionId: action.id, at: outcome.record.at, reference: outcome.record.reference });
    if (!draft.completedSteps.includes('submit')) draft.completedSteps.push('submit');
  }

  const body = {
    // 2.4.2: it occurred, when, and its reference identifier
    consequentialAction: { actionId: action.id, occurred: true, at: outcome.record.at, reference: outcome.record.reference },
    duplicate: outcome.duplicate,
    attribution,
  };
  if (asHtml) {
    return html(res, outcome.duplicate ? 200 : 201, page(
      outcome.duplicate ? 'Application already submitted' : 'Application submitted',
      `<p>${outcome.duplicate ? 'This application was already submitted; no new application has been created.' : 'Your application has been submitted.'}</p>
<p>Your claim reference is <strong>${esc(outcome.record.reference)}</strong> (submitted ${esc(outcome.record.at)}).</p>`,
    ));
  }
  return json(res, outcome.duplicate ? 200 : 201, body);
}
