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
 * localhost only; no external network calls. Journeys J1–J3 route
 * through the registry in journeys.ts; both interaction paths project
 * the same FieldSpecs (anti-divergence, 5.6.2 posture).
 */

import http from 'node:http';
import {
  formJsonSchema,
  validateValues,
  journeyState,
  safeSteps,
  authoriseConsequentialAction,
  type ConfirmationEvent,
  type ConsequentialActionSpec,
  type StepSpec,
} from '../../packages/agent-surface/src/index.ts';
import {
  determine,
  RulesInputError,
  INSTRUMENT_ID,
  RULES_VERSION,
  INSTRUMENT_COMMENCEMENT,
} from '../../packages/rules-sspd-2026/src/determination.ts';
import { JOURNEYS, CA_REGISTER, REFERENCE_PREFIX, duplicateKey, PERIOD_SURFACE, THIRD_PARTY_NOTICE, type JourneyDef } from './journeys.ts';
import { Store } from './store.ts';
import { page, form, esc } from './html.ts';

export const SURFACE_VERSION = '0.2.0';
export const SURFACE_LAST_MODIFIED = '2026-07-09';
export const SESSION_TIME_LIMIT_MINUTES = 60; // 2.6.1: declared before the journey begins

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 1));
}

function html(res: http.ServerResponse, status: number, body: string, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

function journeyDescription(origin: string, id: string, j: JourneyDef): Record<string, unknown> {
  const entryStep = j.spec.steps[0].id;
  return {
    id,
    title: j.spec.title,
    essential: true,
    entryPoint: `${origin}/journeys/${id}/steps/${entryStep}`,
    consequentialActions: CA_REGISTER.filter((a) => a.journeyId === id),
    safeSteps: safeSteps(j.spec), // 3.4.3
    tools: `${origin}/api/journeys/${id}/schema`, // 1.2.1
    state: `${origin}/api/journeys/${id}/state`,
    ...(id === 'J2' ? { reportingPeriod: `${origin}/api/journeys/J2/period` } : {}), // 2.6.2
  };
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
    essentialityTest: { reference: `${origin}/api/essentiality-test`, summary: 'A journey is essential if it lodges, varies or reports on a claim for the payment.' },
    journeys: Object.entries(JOURNEYS).map(([id, j]) => journeyDescription(origin, id, j)), // 1.1.2
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

function getSession(req: http.IncomingMessage, res: http.ServerResponse, store: Store): string {
  const cookie = req.headers.cookie ?? '';
  const match = /(?:^|;\s*)sid=([A-Za-z0-9-]+)/.exec(cookie);
  if (match) return match[1];
  const sid = store.newSessionId();
  res.setHeader('set-cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  return sid;
}

/** Coerce urlencoded strings to the typed values tool calls submit directly. */
function coerce(fields: JourneyDef['fields'][string], values: Record<string, unknown>): Record<string, unknown> {
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

/** Steps that must be complete before `step`, transitively, in spec order. */
function unmetPrerequisites(journey: JourneyDef, step: StepSpec, completed: string[]): string[] {
  const done = new Set(completed);
  const needed = new Set<string>();
  const walk = (s: StepSpec) => {
    for (const req of s.requires ?? []) {
      if (!needed.has(req)) {
        needed.add(req);
        const reqStep = journey.spec.steps.find((x) => x.id === req);
        if (reqStep) walk(reqStep);
      }
    }
  };
  walk(step);
  return journey.spec.steps.filter((s) => needed.has(s.id) && !done.has(s.id)).map((s) => s.id);
}

interface AuthInput {
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
          classifications: Object.keys(JOURNEYS).map((journey) => ({ journey, essential: true })),
        });
      }

      // ---- Harness instrumentation (not a service surface; methodology §6 log access) ----
      if (req.method === 'GET' && path === '/api/_fixture/claims') {
        return json(res, 200, store.effects);
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

      // ---- Journey machine surfaces ----
      if (req.method === 'GET' && path === '/api/journeys/J2/period') {
        return json(res, 200, { surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED }, ...PERIOD_SURFACE });
      }

      const schemaMatch = /^\/api\/journeys\/(J[123])\/schema$/.exec(path);
      if (req.method === 'GET' && schemaMatch) {
        const jid = schemaMatch[1];
        const j = JOURNEYS[jid];
        // 3.1.1: published input/output schemas for every step, no auth, no side effects
        return json(res, 200, {
          journey: jid,
          surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED },
          steps: j.spec.steps.map((s) => ({
            id: s.id,
            title: s.title,
            kind: s.kind,
            actionId: s.actionId,
            confirmationDesignated: s.actionId ? CA_REGISTER.find((a) => a.id === s.actionId)?.confirmationDesignated : undefined,
            endpoint: `${origin}/api/journeys/${jid}/steps/${s.id}`,
            inputSchema: formJsonSchema(`${jid.toLowerCase()}-${s.id}`, s.title, j.fields[s.id]),
          })),
        });
      }

      const stateMatch = /^\/api\/journeys\/(J[123])\/state$/.exec(path);
      if (req.method === 'GET' && stateMatch) {
        const jid = stateMatch[1];
        const sid = getSession(req, res, store);
        return json(res, 200, journeyState(JOURNEYS[jid].spec, store.draft(sid, jid))); // 2.4.1 / 2.4.2
      }

      // ---- Tool calls (agent path) ----
      const toolMatch = /^\/api\/journeys\/(J[123])\/steps\/([a-z]+)$/.exec(path);
      if (req.method === 'POST' && toolMatch) {
        const [, jid, stepId] = toolMatch;
        const journey = JOURNEYS[jid];
        const step = journey.spec.steps.find((s) => s.id === stepId);
        if (!step) return json(res, 404, { error: { code: 'UNKNOWN_STEP', message: `No step "${stepId}" in ${jid}.` } });
        const sid = getSession(req, res, store);
        const body = JSON.parse((await readBody(req)) || '{}');
        const values = body.values ?? {};
        store.record({ at: now(), sessionId: sid, type: 'tool-call', detail: { journey: jid, step: stepId, values } });

        const errors = validateValues(journey.fields[stepId], values);
        if (errors.length > 0) {
          return json(res, 422, { errors }); // 2.2.2: structured, per-control
        }
        const draft = store.draft(sid, jid);
        Object.assign(draft.values, values);
        store.record({ at: now(), sessionId: sid, type: 'field-values', detail: { journey: jid, step: stepId, values } });

        if (step.kind === 'safe') {
          if (!draft.completedSteps.includes(stepId)) draft.completedSteps.push(stepId);
          return json(res, 200, { step: stepId, safeStep: true, state: journeyState(journey.spec, draft) });
        }

        return executeConsequential(res, store, sid, jid, step, values, {
          agentId: (req.headers['x-agent-id'] as string) ?? undefined,
          delegationId: (req.headers['x-delegation-id'] as string) ?? undefined,
          confirmation: body.confirmation,
        }, now());
      }

      // ---- HTML journeys (human path) ----
      const htmlMatch = /^\/journeys\/(J[123])\/steps\/([a-z]+)$/.exec(path);
      if (htmlMatch) {
        const [, jid, stepId] = htmlMatch;
        const journey = JOURNEYS[jid];
        const step = journey.spec.steps.find((s) => s.id === stepId);
        if (!step) return html(res, 404, page('Page not found', '<p>This step does not exist.</p>'));
        const sid = getSession(req, res, store);
        const draft = store.draft(sid, jid);
        const fields = journey.fields[stepId];
        const stepOrder = journey.spec.steps.map((s) => s.id);
        const idx = stepOrder.indexOf(stepId);
        const submitLabel = step.kind === 'consequential' ? (jid === 'J1' ? 'Submit application' : 'Submit') : 'Save and continue';

        if (req.method === 'GET') {
          const stepInfo = `<p>Step ${idx + 1} of ${stepOrder.length}. This step ${step.kind === 'safe' ? 'saves your progress and has no legal effect' : 'is a consequential action'}.</p>
<p>Session time limit: ${SESSION_TIME_LIMIT_MINUTES} minutes; your draft is kept and you can resume without losing entered data.</p>`;
          let extraHtml = '';
          if (jid === 'J1' && stepId === 'review') {
            extraHtml = `<dl>${journey.spec.steps.flatMap((s) => journey.fields[s.id]).map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(draft.values[f.name] ?? 'Not provided')}</dd>`).join('')}</dl>`;
          }
          if (jid === 'J2' && stepId === 'period') {
            extraHtml = `<p>Reporting period: ${esc(PERIOD_SURFACE.period.start)} to ${esc(PERIOD_SURFACE.period.end)}.</p>
<p>Report due by <strong>${esc(PERIOD_SURFACE.report.dueDate)}</strong> (${esc(PERIOD_SURFACE.report.timezone)}). ${esc(PERIOD_SURFACE.consequence)}</p>`;
          }
          if (jid === 'J1' && stepId === 'circumstances' && store.injectionEnabled) {
            // 5.6.3: third-party content programmatically distinguishable from operator content
            extraHtml += `<section data-provenance="third-party" aria-labelledby="tp-notices">
<h2 id="tp-notices">Community notices</h2>
<p>The content below is provided by third parties. It is not from the Commonwealth Skills Support Agency and is not part of this application.</p>
${THIRD_PARTY_NOTICE.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n')}
<p>Source: ${esc(THIRD_PARTY_NOTICE.attribution)}</p>
</section>`;
          }
          return html(res, 200, page(step.title, `${stepInfo}${extraHtml}${form(path, fields, draft.values, [], submitLabel)}`));
        }

        if (req.method === 'POST') {
          const raw = Object.fromEntries(new URLSearchParams(await readBody(req)));
          const values = coerce(fields, raw);
          store.record({ at: now(), sessionId: sid, type: 'field-values', detail: { journey: jid, step: stepId, values } });
          const errors = validateValues(fields, values);
          if (errors.length > 0) {
            return html(res, 422, page(step.title, form(path, fields, values, errors, submitLabel)));
          }
          Object.assign(draft.values, values);
          if (step.kind === 'safe') {
            if (!draft.completedSteps.includes(stepId)) draft.completedSteps.push(stepId);
            const next = stepOrder[idx + 1];
            res.writeHead(303, { location: next ? `/journeys/${jid}/steps/${next}` : `/journeys/${jid}/steps/${stepOrder[0]}` });
            return res.end();
          }
          // Human path: the session principal's own posted declaration IS the confirmation event.
          return executeConsequential(res, store, sid, jid, step, values, { humanPrincipalId: `principal-${sid}` }, now(), true);
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

function executeConsequential(
  res: http.ServerResponse,
  store: Store,
  sid: string,
  jid: string,
  step: StepSpec,
  values: Record<string, unknown>,
  auth: AuthInput,
  at: string,
  asHtml = false,
): void {
  const journey = JOURNEYS[jid];
  const action = CA_REGISTER.find((a) => a.id === step.actionId) as ConsequentialActionSpec;
  const draft = store.draft(sid, jid);

  // Prerequisites (2.4.1): the step's transitive requirements, in spec order
  const missing = unmetPrerequisites(journey, step, draft.completedSteps);
  if (missing.length > 0) {
    const body = { error: { code: 'PREREQUISITES_UNSATISFIED', message: `Complete these steps first: ${missing.join(', ')}.`, missing } };
    if (asHtml) {
      res.writeHead(422, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page('Cannot submit yet', `<p>${esc(body.error.message)}</p>`));
      return;
    }
    return json(res, 422, body);
  }

  let principalId: string;
  let attribution: { agentOriginated: boolean; agentId?: string };

  if (auth.humanPrincipalId) {
    // Principal acting directly; the posted declaration is the confirmation event.
    principalId = auth.humanPrincipalId;
    attribution = { agentOriginated: false };
    if (action.confirmationDesignated) {
      store.record({ at, sessionId: sid, type: 'confirmation', detail: { actionId: action.id, principalId, channel: 'human-declaration' } });
    }
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
    if (action.confirmationDesignated) {
      store.record({ at, sessionId: sid, type: 'confirmation', detail: { actionId: action.id, principalId, channel: 'delegated-confirmation' } });
    }
  }

  // 3.4.1: duplicate protection per the register; repeats return the original effect
  const outcome = store.guard.execute(duplicateKey(action.id, principalId, values), () => {
    const reference = store.nextReference(REFERENCE_PREFIX[action.id]);
    store.effects.push({ journeyId: jid, actionId: action.id, reference, principalId, values: { ...draft.values }, at, attribution });
    store.record({ at, sessionId: sid, type: 'effect', detail: { actionId: action.id, reference, attribution, notificationQueued: true } }); // 5.5.2 obligation recorded
    return { reference, at };
  });

  if (!outcome.duplicate) {
    draft.consequentialEvents.push({ stepId: step.id, actionId: action.id, at: outcome.record.at, reference: outcome.record.reference });
    if (!draft.completedSteps.includes(step.id)) draft.completedSteps.push(step.id);
  }

  const body = {
    // 2.4.2: it occurred, when, and its reference identifier
    consequentialAction: { actionId: action.id, occurred: true, at: outcome.record.at, reference: outcome.record.reference },
    duplicate: outcome.duplicate,
    attribution,
  };
  if (asHtml) {
    res.writeHead(outcome.duplicate ? 200 : 201, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page(
      outcome.duplicate ? 'Already submitted' : 'Submitted',
      `<p>${outcome.duplicate ? 'This was already submitted; no new effect has been created.' : 'Your submission has been received.'}</p>
<p>Your reference is <strong>${esc(outcome.record.reference)}</strong> (submitted ${esc(outcome.record.at)}).</p>`,
    ));
    return;
  }
  return json(res, outcome.duplicate ? 200 : 201, body);
}
