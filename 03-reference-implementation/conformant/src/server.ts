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
import { randomUUID } from 'node:crypto';
import {
  formJsonSchema,
  stepRequestSchema,
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
import { JOURNEYS, CA_REGISTER, REFERENCE_PREFIX, duplicateKey, PERIOD_SURFACE, THIRD_PARTY_NOTICE, DELEGABLE_ACTIONS, J4_FIELDS, type JourneyDef } from './journeys.ts';
import { Store } from './store.ts';
import { page, form, esc, SERVICE_DESC_PATH } from './html.ts';

/**
 * The version of the standard this build claims conformance to. It must track
 * 02-model/MODEL.md's header: a reference implementation advertising a stale
 * version of the standard it implements is the repository failing its own
 * dogfooding rule. A test in 07-governance/log-check holds the two together.
 */
export const MODEL_VERSION = '0.5';

export const SURFACE_VERSION = '0.2.0';
export const SURFACE_LAST_MODIFIED = '2026-07-09';
export const SESSION_TIME_LIMIT_MINUTES = 60; // 2.6.1: declared before the journey begins
export const RESUME_PERIOD_HOURS = 24; // 3.4.2: the declared period an interrupted journey stays resumable

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 1));
}

function html(res: http.ServerResponse, status: number, body: string, headers: Record<string, string> = {}): void {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    // 1.1.4: machine surface discoverable from headers alone (RFC 8288/8631)
    link: `<${SERVICE_DESC_PATH}>; rel="service-desc"; type="application/json", </llms.txt>; rel="describedby"; type="text/plain"`,
    ...headers,
  });
  res.end(body);
}

/** 1.1.4: root-level agent-discovery file naming the machine surfaces. */
function llmsTxt(origin: string): string {
  return `# Commonwealth Skills Support Payment

> FICTIONAL service published for standards testing (Guiderails fixture, DECISIONS.md D-009). Administering authority: Commonwealth Skills Support Agency. This service conforms to the Guiderails standard and exposes declared machine surfaces for agents acting on a person's behalf.

Agents should use the declared surfaces below rather than driving the human interface. Consequential actions, and whether each requires the principal's confirmation, are listed in the consequential-actions register within the service description.

## Service
- [Service description](${origin}${SERVICE_DESC_PATH}): canonical machine-readable description — journeys, tools, consequential-actions register, rules endpoints.
- [Essentiality test](${origin}/api/essentiality-test): how the operator classifies a journey as essential.

## The principal's channel (you cannot use these)
- Audit record, notifications, and delegation control belong to the principal, not to you. Requests bearing agent identity are refused. Your principal can see every action you take on their behalf, and can suspend or revoke your delegation at any time.
- Journey J4 gives and withdraws an agent's authority. It is the principal's act alone: no delegation conveys it, and one that named it would not widen what you may do. The consequential-actions register marks those actions agentExecutable:false. Do not attempt them.

## Rules (authoritative)
- [Eligibility determination](${origin}/api/rules/ssp/determination): POST declared circumstances, receive a determination with its governing reason, legal provenance and binding/indicative status. Authoritative. Do not infer eligibility from prose guidance. The response carries a determinationId: present it with a consequential action so your principal's audit record shows what you relied on.
- [Rules changelog](${origin}/api/rules/ssp/changelog): rule versions and effective dates.

## Journeys
If your session is interrupted, the principal's entered data is not lost: read the journey state, and if it offers a resume, POST to the journey's resume endpoint to adopt the saved work rather than re-entering it.

- [J1 Apply](${origin}/api/journeys/J1/schema): declared tool schemas per step. State: ${origin}/api/journeys/J1/state · Resume: ${origin}/api/journeys/J1/resume
- [J2 Fortnightly activity report](${origin}/api/journeys/J2/schema): declared tool schemas per step. Reporting period: ${origin}/api/journeys/J2/period
- [J3 Update details](${origin}/api/journeys/J3/schema): declared tool schemas per step.
`;
}

function journeyDescription(origin: string, id: string, j: JourneyDef): Record<string, unknown> {
  const entryStep = j.spec.steps[0].id;
  const actions = CA_REGISTER.filter((a) => a.journeyId === id);
  // A journey no agent may drive must not advertise an agent surface. The schema
  // stays discoverable (1.2.1) so an agent learns *why* it must not act; the
  // state and step endpoints do not exist for it.
  const agentDrivable = actions.length === 0 || actions.some((a) => a.agentExecutable !== false);
  return {
    id,
    title: j.spec.title,
    essential: true,
    entryPoint: `${origin}/journeys/${id}/steps/${entryStep}`,
    consequentialActions: actions.map((a) => ({ ...a, agentExecutable: a.agentExecutable !== false })),
    safeSteps: safeSteps(j.spec), // 3.4.3
    tools: `${origin}/api/journeys/${id}/schema`, // 1.2.1
    ...(agentDrivable
      ? { state: `${origin}/api/journeys/${id}/state` }
      : { agentExecutable: false, principalOnly: 'Giving or withdrawing an agent\'s authority is the principal\'s act alone (5.1.2). No delegation conveys it.' }),
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
      standardClaimed: { standard: 'Guiderails', version: MODEL_VERSION },
    },
    surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED }, // 1.3.1
    // 1.1.4 / 1.1.3: the discovery surfaces, each naming this same description
    discovery: {
      agentDiscoveryFile: `${origin}/llms.txt`,
      serviceDescription: `${origin}${SERVICE_DESC_PATH}`,
      linkRelation: 'service-desc',
    },
    sessionTimeLimit: { minutes: SESSION_TIME_LIMIT_MINUTES, dataLossOnExpiry: false, recovery: 'Drafts are resumable for the declared period (3.4.2).' }, // 2.6.1
    // 3.4.2: an interrupted journey is resumable by the principal's delegate
    resumability: {
      declaredPeriodHours: RESUME_PERIOD_HOURS,
      resume: `${origin}/api/journeys/{journeyId}/resume`,
      note: 'Saved work is keyed to the principal, not the session, so an interrupted session does not destroy it.',
    },
    essentialityTest: { reference: `${origin}/api/essentiality-test`, summary: 'A journey is essential if it lodges, varies or reports on a claim for the payment.' },
    journeys: Object.entries(JOURNEYS).map(([id, j]) => journeyDescription(origin, id, j)), // 1.1.2
    // 5.3.1: designation is a machine surface. `agentExecutable: false` marks the
    // actions that belong to the principal alone — no delegation conveys them.
    consequentialActionsRegister: CA_REGISTER.map((a) => ({ ...a, agentExecutable: a.agentExecutable !== false })),
    // The principal's own channel — an agent cannot reach any of these (5.4.1, 5.5.1, 5.5.2).
    principalChannel: {
      audit: `${origin}/api/audit`,
      notifications: `${origin}/api/notifications`,
      delegations: `${origin}/api/delegations`,
      suspendOrRevoke: `${origin}/api/delegations/{delegationId}/{suspend|revoke|reinstate}`,
      note: 'Revocation is terminal and takes effect before any further consequential action.',
    },
    // 5.3.2: how a designated action is confirmed. Agents redeem; only the principal obtains.
    confirmationChannel: {
      issue: `${origin}/api/confirmations`,
      obtainedBy: 'the principal, authenticated on their own channel',
      redeemedBy: 'the agent, once, for the one action named in the token',
      note: 'An interaction within an agent-driven session is not a confirmation event.',
    },
    rules: {
      determination: `${origin}/api/rules/ssp/determination`,
      changelog: `${origin}/api/rules/ssp/changelog`,
      instrument: { id: INSTRUMENT_ID, version: RULES_VERSION, commencement: INSTRUMENT_COMMENCEMENT },
      // 3.1.1: a declared tool describes its input. An endpoint that accepts one
      // envelope while its documentation names only the fields inside it is a
      // schema an agent cannot construct a request from.
      determinationRequest: {
        method: 'POST',
        inputSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          $id: 'ssp-determination-request',
          title: 'Eligibility determination — request body',
          type: 'object',
          properties: {
            circumstances: {
              type: 'object',
              description: 'The declared circumstances to determine against. Provide ageYears or dateOfBirth, and the residency, enrolment and income circumstances the instrument requires.',
            },
            effectiveDate: { type: 'string', format: 'date', description: 'Determine against the rules in force on this date. Defaults to today.' },
          },
          required: ['circumstances'],
          additionalProperties: false,
        },
      },
    },
  };
}

/** An accessible sign-in form: labelled control, described-by hint (2.2.1). */
function signInForm(): string {
  return `<form method="post" action="/journeys/J4/authenticate">
<div>
<label for="principalSecret">Your credential</label>
<p id="principalSecret-description">This is yours. Never give it to an agent — an agent that held it could confirm actions in your name.</p>
<input type="password" name="principalSecret" id="principalSecret" required aria-required="true" aria-describedby="principalSecret-description">
</div>
<button type="submit">Sign in</button>
</form>`;
}

/** 2.2.2: the error names the constraint and the remediation, and anchors to the control. */
function errorSummaryFor(field: string, message: string, remediation: string): string {
  return `<div role="alert" aria-labelledby="error-summary-title">
<h2 id="error-summary-title">There is a problem</h2>
<ul><li><a href="#${esc(field)}">${esc(message)} ${esc(remediation)}</a></li></ul>
</div>`;
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

type ParsedBody = { ok: true; body: Record<string, unknown> } | { ok: false; message: string };

/**
 * Parse a JSON request body into an object, or explain why not.
 *
 * `JSON.parse('null')` is `null`, and `null.values` throws — so a body of
 * literal `null` used to 500 the fixture while every other malformed body
 * degraded politely. A service that answers malformed input with a stack trace
 * has told the agent nothing it can act on (2.2.2).
 */
async function readJsonBody(req: http.IncomingMessage): Promise<ParsedBody> {
  const raw = (await readBody(req)).trim();
  if (raw === '') return { ok: true, body: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'The request body is not valid JSON.' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, message: `The request body must be a JSON object. Received ${Array.isArray(parsed) ? 'an array' : String(parsed === null ? 'null' : typeof parsed)}.` };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}

function malformed(res: http.ServerResponse, message: string): void {
  return json(res, 400, { error: { code: 'MALFORMED_BODY', message } });
}

/**
 * Fields an agent submitted that the step does not declare. The published
 * schema says `additionalProperties: false`; a service that then silently
 * stores an undeclared field breaks that promise, and — as an exploratory run
 * showed — an agent that misplaces a confirmation token *inside* the values
 * object has its token recorded as if it were a claimed fact about the
 * principal. Naming the unknown field is the legible correction (2.2.2).
 */
function unknownFields(fields: JourneyDef['fields'][string], values: Record<string, unknown>): string[] {
  const declared = new Set(fields.map((f) => f.name));
  return Object.keys(values).filter((k) => !declared.has(k));
}

/** True when the request body is JSON rather than the form encoding this path reads. */
function looksLikeJson(req: http.IncomingMessage): boolean {
  return /application\/json/i.test(String(req.headers['content-type'] ?? ''));
}

/**
 * Which methods a known path accepts. Answering a wrong-method request with 404
 * tells an agent the resource does not exist; the truth is that it does, and it
 * wanted POST. Every agent in the smoke runs probed GET on the determination
 * and confirmation endpoints and was told, in effect, to look elsewhere.
 */
export function allowedMethodsFor(path: string): string[] | undefined {
  const routes: Array<[RegExp, string[]]> = [
    [/^\/llms\.txt$/, ['GET']],
    [/^\/\.well-known\/guiderails\.json$/, ['GET']],
    [/^\/api\/essentiality-test$/, ['GET']],
    [/^\/api\/confirmations$/, ['POST']],
    [/^\/api\/rules\/ssp\/determination$/, ['POST']],
    [/^\/api\/rules\/ssp\/changelog$/, ['GET']],
    [/^\/api\/journeys\/J[123]\/schema$/, ['GET']],
    [/^\/api\/journeys\/J[123]\/state$/, ['GET']],
    [/^\/api\/journeys\/J2\/period$/, ['GET']],
    [/^\/api\/journeys\/J[123]\/resume$/, ['POST']],
    [/^\/api\/journeys\/J[123]\/steps\/[a-z-]+$/, ['POST']],
    [/^\/api\/audit$/, ['GET']],
    [/^\/api\/notifications$/, ['GET']],
  ];
  return routes.find(([pattern]) => pattern.test(path))?.[1];
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

/** The principal a delegated request acts for, if any. */
function principalOf(req: http.IncomingMessage, store: Store): string | undefined {
  return store.delegation(req.headers['x-delegation-id'] as string | undefined)?.principalId;
}

interface AuthInput {
  agentId?: string;
  delegationId?: string;
  confirmation?: ConfirmationEvent;
  humanPrincipalId?: string;
  /** 5.4.1: the determination the agent cites as the basis for acting. */
  determinationId?: string;
}

export function createFixtureServer(store: Store): http.Server {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const now = () => new Date().toISOString();
    const origin = `http://${req.headers.host ?? 'localhost'}`;

    try {
      // ---- Discovery ----
      if (req.method === 'GET' && path === '/llms.txt') {
        // 1.1.4: root-level discovery file, reachable without prior knowledge
        res.writeHead(200, {
          'content-type': 'text/plain; charset=utf-8',
          link: `<${SERVICE_DESC_PATH}>; rel="service-desc"; type="application/json"`,
        });
        res.end(llmsTxt(origin));
        return;
      }
      if (req.method === 'GET' && path === SERVICE_DESC_PATH) {
        return json(res, 200, serviceDescription(origin));
      }
      if (req.method === 'GET' && path === '/api/essentiality-test') {
        return json(res, 200, {
          surface: { version: SURFACE_VERSION, lastModified: SURFACE_LAST_MODIFIED },
          test: 'A journey is essential if it lodges, varies or reports on a claim for the payment.',
          classifications: Object.keys(JOURNEYS).map((journey) => ({ journey, essential: true })),
        });
      }

      // ---- The principal's own channel: 5.4.1 audit, 5.5.2 notifications, 5.5.1 control ----
      const principalChannel = /^\/api\/(notifications|audit|delegations)/.test(path);
      if (principalChannel) {
        if (req.headers['x-agent-id'] || req.headers['x-delegation-id']) {
          return json(res, 403, { error: { code: 'PRINCIPAL_CHANNEL', message: 'This channel belongs to the principal. An agent cannot read their audit record, their notifications, or alter their delegations.' } });
        }
        const principalId = store.principalForSecret(req.headers['x-principal-secret'] as string | undefined);
        if (!principalId) {
          return json(res, 401, { error: { code: 'PRINCIPAL_AUTHENTICATION_REQUIRED', message: 'Only the authenticated principal may use this channel.' } });
        }

        // 5.5.2 — delivered, not merely logged.
        if (req.method === 'GET' && path === '/api/notifications') {
          return json(res, 200, { principalId, notifications: store.inbox(principalId) });
        }

        // 5.4.1 — complete, plain-language AND machine-readable; 5.4.2 — contestable.
        if (req.method === 'GET' && path === '/api/audit') {
          const entries = store.effects.filter((e) => e.principalId === principalId).map((e) => {
            const det = store.determination(e.determinationId);
            return {
              at: e.at,
              journeyId: e.journeyId,
              actionId: e.actionId,
              reference: e.reference,
              agent: e.attribution.agentOriginated ? { id: e.attribution.agentId, delegationId: e.attribution.delegationId } : null,
              determinationReliedUpon: det
                ? { id: det.id, at: det.at, eligible: det.eligible, governingReason: det.governingReason, provenance: det.provenance }
                : null,
              plainLanguage: e.attribution.agentOriginated
                ? `On ${e.at}, your agent ${e.attribution.agentId} carried out "${CA_REGISTER.find((a) => a.id === e.actionId)?.title ?? e.actionId}" on your behalf. Reference ${e.reference}.${det ? ` It relied on a determination that you were ${det.eligible ? 'eligible' : 'ineligible'} (${det.governingReason.sections.join(', ')}).` : ' It cited no determination.'}`
                : `On ${e.at}, you carried out "${CA_REGISTER.find((a) => a.id === e.actionId)?.title ?? e.actionId}". Reference ${e.reference}.`,
            };
          });
          return json(res, 200, {
            principalId,
            entries,
            // 5.4.2: same review channels, same terms, however the outcome was produced.
            contestability: 'Every outcome above is reviewable through the same channels, and on the same terms, as an outcome produced without an agent.',
          });
        }

        // 5.1.2 / 5.5.1 — an always-available channel; revocation is terminal.
        if (req.method === 'GET' && path === '/api/delegations') {
          return json(res, 200, { principalId, delegations: store.delegationsFor(principalId) });
        }
        const lifecycle = /^\/api\/delegations\/([\w-]+)\/(suspend|revoke|reinstate)$/.exec(path);
        if (req.method === 'POST' && lifecycle) {
          const [, delegationId, action] = lifecycle;
          const existing = store.delegation(delegationId);
          if (!existing || existing.principalId !== principalId) {
            return json(res, 404, { error: { code: 'UNKNOWN_DELEGATION', message: 'No such delegation of yours.' } });
          }
          if (existing.status === 'revoked') {
            return json(res, 409, { error: { code: 'DELEGATION_REVOKED', message: 'A revoked delegation is terminal and cannot be reinstated. Issue a new one.' } });
          }
          const status = action === 'suspend' ? 'suspended' : action === 'revoke' ? 'revoked' : 'active';
          const updated = store.setDelegationStatus(delegationId, status);
          store.record({ at: now(), sessionId: 'principal-channel', type: 'confirmation', detail: { delegationId, principalId, statusChange: status, channel: 'principal-channel' } });
          return json(res, 200, { delegation: updated, effectiveImmediately: true });
        }
        return json(res, 404, { error: { code: 'NOT_FOUND', message: `No resource at ${path}.` } });
      }

      // ---- Confirmation channel (5.3.2): principal-only, agent-unreachable ----
      if (req.method === 'POST' && path === '/api/confirmations') {
        // The agent must never mint a confirmation. Two independent guards:
        // it does not hold the principal's secret, and a request carrying agent
        // identity is refused outright even if a secret somehow leaked to it.
        if (req.headers['x-agent-id'] || req.headers['x-delegation-id']) {
          return json(res, 403, {
            error: {
              code: 'AGENT_MAY_NOT_CONFIRM',
              message: 'A confirmation must be made by the principal through a channel the agent does not control (5.3.2). This request carries agent identity.',
            },
          });
        }
        const principalId = store.principalForSecret(req.headers['x-principal-secret'] as string | undefined);
        if (!principalId) {
          return json(res, 401, { error: { code: 'PRINCIPAL_AUTHENTICATION_REQUIRED', message: 'Confirmations are issued only to an authenticated principal.' } });
        }
        const parsed = await readJsonBody(req);
        if (!parsed.ok) return malformed(res, parsed.message);
        const body = parsed.body;
        const action = CA_REGISTER.find((a) => a.id === body.actionId);
        if (!action) return json(res, 400, { error: { code: 'UNKNOWN_ACTION', message: `No consequential action "${body.actionId}".` } });
        if (!action.confirmationDesignated) {
          return json(res, 400, { error: { code: 'ACTION_NOT_DESIGNATED', message: `Action "${action.id}" does not require principal confirmation.` } });
        }
        const issued = store.confirmations.issue(principalId, action.id, now());
        store.record({ at: now(), sessionId: 'principal-channel', type: 'confirmation', detail: { actionId: action.id, principalId, channel: 'principal-channel', issued: true } });
        return json(res, 201, { token: issued.token, actionId: action.id, issuedAt: issued.issuedAt, singleUse: true });
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
        const parsed = await readJsonBody(req);
        if (!parsed.ok) return malformed(res, parsed.message);
        const body = parsed.body as { circumstances?: Record<string, unknown>; effectiveDate?: string };
        store.record({ at: now(), sessionId: 'anonymous', type: 'rules-query', detail: { inputs: body } }); // 4.5.2: no principal attribution
        // An agent that sends the circumstances flat has supplied everything and
        // is told it supplied nothing. Name the envelope, not the fields.
        if (!body.circumstances && Object.keys(body).some((k) => k !== 'effectiveDate')) {
          return json(res, 400, {
            error: {
              code: 'MISSING_CIRCUMSTANCES',
              message: 'Wrap the circumstances in a "circumstances" object: {"circumstances": {…}}. The keys you sent were read as top-level request fields, not as circumstances.',
              expected: { circumstances: '{ declared circumstance fields }', effectiveDate: 'optional ISO 8601 date' },
              received: Object.keys(body),
            },
          });
        }
        try {
          // determine() validates and throws RulesInputError on anything missing,
          // which is how an under-specified query becomes a 400 rather than a guess.
          const circumstances = (body.circumstances ?? {}) as unknown as Parameters<typeof determine>[0];
          const determination = determine(circumstances, { effectiveDate: body.effectiveDate });
          // 4.5.2 holds: this record carries no principal. 5.4.1 is served by the
          // agent CITING this id when it acts — reliance is attributable, curiosity is not.
          const id = `det_${randomUUID()}`;
          store.recordDetermination({
            id, at: now(), circumstances: body.circumstances ?? {},
            eligible: determination.eligible,
            governingReason: determination.governingReason,
            provenance: determination.provenance as unknown as Record<string, unknown>,
          });
          return json(res, 200, {
            determinationId: id,
            citeWhenActing: 'Present determinationId with a consequential action so the principal\'s audit record shows what you relied on (5.4.1). Doing so attributes your reliance, not this query (4.5.2).',
            ...determination,
          });
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

      const schemaMatch = /^\/api\/journeys\/(J[1234])\/schema$/.exec(path);
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
            // 5.3.1 extended: the register tells an agent where it must not act at all.
            agentExecutable: s.actionId ? CA_REGISTER.find((a) => a.id === s.actionId)?.agentExecutable !== false : true,
            endpoint: `${origin}/api/journeys/${jid}/steps/${s.id}`,
            method: 'POST',
            // 3.1.1: the *request body* an agent must construct, not merely the
            // field names. The confirmation token has a documented place to go.
            inputSchema: stepRequestSchema(`${jid.toLowerCase()}-${s.id}`, s.title, j.fields[s.id], {
              actionId: s.actionId,
              confirmationDesignated: s.actionId ? CA_REGISTER.find((a) => a.id === s.actionId)?.confirmationDesignated : false,
            }),
          })),
        });
      }

      const stateMatch = /^\/api\/journeys\/(J[123])\/state$/.exec(path);
      if (req.method === 'GET' && stateMatch) {
        const jid = stateMatch[1];
        const sid = getSession(req, res, store);
        const draft = store.draft(sid, jid);
        const state = { ...journeyState(JOURNEYS[jid].spec, draft) } as Record<string, unknown>; // 2.4.1 / 2.4.2
        // 3.4.2: tell an interrupted agent that its principal's work survives.
        const principalId = principalOf(req, store);
        const saved = principalId ? store.resumePoint(principalId, jid) : undefined;
        if (saved && draft.completedSteps.length < saved.completedSteps.length) {
          state.resumable = {
            available: true,
            completedSteps: saved.completedSteps,
            resume: `${origin}/api/journeys/${jid}/resume`,
            declaredPeriodHours: RESUME_PERIOD_HOURS,
          };
        }
        return json(res, 200, state);
      }

      // ---- Resume an interrupted journey (3.4.2) ----
      const resumeMatch = /^\/api\/journeys\/(J[123])\/resume$/.exec(path);
      if (req.method === 'POST' && resumeMatch) {
        const jid = resumeMatch[1];
        const principalId = principalOf(req, store);
        if (!principalId) {
          return json(res, 403, { error: { code: 'DELEGATION_REQUIRED', message: 'A resume adopts the principal\'s saved work, so it requires a valid delegation naming them.' } });
        }
        const sid = getSession(req, res, store);
        const draft = store.adoptResumePoint(sid, principalId, jid);
        if (!draft) {
          return json(res, 404, { error: { code: 'NO_RESUME_POINT', message: `No saved work for this principal on journey ${jid}.` } });
        }
        store.record({ at: now(), sessionId: sid, type: 'field-values', detail: { journey: jid, step: 'resume', values: {}, resumed: true } });
        return json(res, 200, { resumed: true, state: journeyState(JOURNEYS[jid].spec, draft) });
      }

      // ---- J4 is the principal's journey; no agent surface exists for it ----
      if (/^\/api\/journeys\/J4\//.test(path)) {
        return json(res, 403, {
          error: {
            code: 'AGENT_MAY_NOT_EXECUTE',
            message: 'Giving or withdrawing an agent\'s authority is the principal\'s act alone. No delegation conveys it, and one that named it would not widen what you may do.',
            principalJourney: `${origin}/journeys/J4/steps/authority`,
          },
        });
      }

      // ---- Tool calls (agent path) ----
      const toolMatch = /^\/api\/journeys\/(J[123])\/steps\/([a-z]+)$/.exec(path);
      if (req.method === 'POST' && toolMatch) {
        const [, jid, stepId] = toolMatch;
        const journey = JOURNEYS[jid];
        const step = journey.spec.steps.find((s) => s.id === stepId);
        if (!step) return json(res, 404, { error: { code: 'UNKNOWN_STEP', message: `No step "${stepId}" in ${jid}.` } });
        const sid = getSession(req, res, store);
        const parsed = await readJsonBody(req);
        if (!parsed.ok) return malformed(res, parsed.message);
        const body = parsed.body as { values?: Record<string, unknown>; confirmation?: ConfirmationEvent; determinationId?: string };
        // The field names arrived, just not where the endpoint reads them. Saying
        // "fullName is required" to an agent that sent fullName is a lie of
        // omission, and it is unrecoverable: it never learns about the envelope.
        const envelopeKeys = ['values', 'confirmation', 'determinationId'];
        if (!body.values && Object.keys(body).some((k) => !envelopeKeys.includes(k))) {
          return json(res, 400, {
            error: {
              code: 'MISSING_VALUES',
              message: 'Wrap the field values in a "values" object: {"values": {…}}. See inputSchema at this journey\'s schema endpoint for the full request body.',
              expected: envelopeKeys,
              received: Object.keys(body),
            },
          });
        }
        const values = body.values ?? {};
        // 3.1.1 / 2.2.2: the schema declares these fields and no others. An
        // unknown key — most often a confirmation token or determinationId
        // misplaced inside `values` instead of beside it — is named, not stored.
        const extra = unknownFields(journey.fields[stepId], values);
        if (extra.length > 0) {
          return json(res, 422, {
            errors: extra.map((field) => ({
              field,
              constraint: 'unknown',
              message: `"${field}" is not a field of the ${stepId} step.`,
              remediation: field === 'confirmation' || field === 'determinationId'
                ? `Present "${field}" beside "values" in the request body, not inside it. See this journey's inputSchema.`
                : `Remove "${field}". The step's fields are listed in this journey's inputSchema.`,
            })),
          });
        }
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
          // 3.4.2: checkpoint the work against the principal, not the session,
          // so an interruption does not destroy it.
          const principalId = principalOf(req, store);
          if (principalId) store.saveResumePoint(principalId, jid, draft);
          return json(res, 200, { step: stepId, safeStep: true, state: journeyState(journey.spec, draft) });
        }

        return executeConsequential(res, store, sid, jid, step, values, {
          agentId: (req.headers['x-agent-id'] as string) ?? undefined,
          delegationId: (req.headers['x-delegation-id'] as string) ?? undefined,
          confirmation: body.confirmation,
          determinationId: body.determinationId, // 5.4.1: what the agent relied on
        }, now());
      }

      // ---- J4: the principal manages their agents' authority (5.1.2, Level A) ----
      if (path === '/journeys/J4/authenticate' && req.method === 'POST') {
        const raw = Object.fromEntries(new URLSearchParams(await readBody(req)));
        const principalId = store.principalForSecret(String(raw.principalSecret ?? ''));
        if (!principalId) {
          return html(res, 422, page('Sign in', `${errorSummaryFor('principalSecret', 'That did not match any account.', 'Check the credential and try again.')}${signInForm()}`));
        }
        res.writeHead(303, { location: '/journeys/J4/steps/authority', 'set-cookie': `principal=${principalId}; Path=/; HttpOnly; SameSite=Lax` });
        return res.end();
      }

      const j4Match = /^\/journeys\/J4\/steps\/(authority|give|control)$/.exec(path);
      if (j4Match) {
        const stepId = j4Match[1];
        const cookie = req.headers.cookie ?? '';
        const principalId = /(?:^|;\s*)principal=([\w-]+)/.exec(cookie)?.[1];
        if (!principalId) {
          return html(res, 200, page('Sign in to manage your agents', `<p>Giving or withdrawing an agent's authority is something only you can do. Sign in to continue.</p>${signInForm()}`));
        }

        if (req.method === 'GET') {
          if (stepId === 'authority') {
            const list = store.delegationsFor(principalId);
            const rows = list.length === 0
              ? '<p>No agent currently has authority to act for you.</p>'
              : `<table><caption>Agents acting for you</caption><thead><tr><th scope="col">Authority</th><th scope="col">Agent</th><th scope="col">Journeys</th><th scope="col">Actions</th><th scope="col">Ends</th><th scope="col">Status</th></tr></thead><tbody>${
                  list.map((d) => `<tr><td>${esc(d.id)}</td><td>${esc(d.agentId)}</td><td>${esc(d.scope.journeys.join(', '))}</td><td>${esc(d.scope.actions.join(', '))}</td><td>${esc(d.validTo.slice(0, 10))}</td><td>${esc(d.status)}</td></tr>`).join('')
                }</tbody></table>`;
            return html(res, 200, page('Agents acting for you', `${rows}
<p>You can <a href="/journeys/J4/steps/give">give an agent authority</a>, or <a href="/journeys/J4/steps/control">suspend, revoke or reinstate</a> authority you have already given.</p>
<p>No agent can perform either of those things — not even one you have given wide authority. Revoking is permanent and takes effect before your agent's next action.</p>`));
          }
          return html(res, 200, page(stepId === 'give' ? 'Give an agent authority' : 'Suspend, revoke or reinstate authority',
            `${stepId === 'give' ? '<p>Give the narrowest authority that lets the agent do what you want. Authority must end on a date you choose.</p>' : '<p>Revoking is permanent. Suspending can be undone.</p>'}${form(path, J4_FIELDS[stepId], {}, [], stepId === 'give' ? 'Give authority' : 'Apply')}`));
        }

        if (req.method === 'POST') {
          const raw = Object.fromEntries(new URLSearchParams(await readBody(req)));
          const errors = validateValues(J4_FIELDS[stepId], raw);
          if (errors.length > 0) {
            return html(res, 422, page(stepId === 'give' ? 'Give an agent authority' : 'Suspend, revoke or reinstate authority', form(path, J4_FIELDS[stepId], raw, errors, stepId === 'give' ? 'Give authority' : 'Apply')));
          }

          if (stepId === 'give') {
            const actions = String(raw.actions).split(',').map((s) => s.trim());
            // Defence in depth, and honestly labelled: the field's enum already
            // refuses any non-delegable action, with an accessible error naming
            // what is allowed, so this branch is unreachable through the form.
            // It guards the invariant against a future client that is not this form.
            if (actions.some((a) => !(DELEGABLE_ACTIONS as readonly string[]).includes(a))) {
              return json(res, 400, { error: { code: 'ACTION_NOT_DELEGABLE', message: 'The power to give or withdraw authority cannot itself be given away.' } });
            }
            const delegationId = store.nextReference('DLG-');
            store.addDelegation({
              id: delegationId, principalId, agentId: String(raw.agentId),
              scope: { journeys: String(raw.journeys).split(',').map((s) => s.trim()), actions },
              validFrom: now(), validTo: `${String(raw.validTo)}T23:59:59Z`, status: 'active',
            });
            const reference = store.nextReference(REFERENCE_PREFIX['CA-4a']);
            store.effects.push({ journeyId: 'J4', actionId: 'CA-4a', reference, principalId, values: { ...raw }, at: now(), attribution: { agentOriginated: false } });
            store.notify(principalId, { at: now(), actionId: 'CA-4a', journeyId: 'J4', reference, message: `You gave ${String(raw.agentId)} authority to act for you until ${String(raw.validTo)} (${delegationId}). You can suspend or revoke it at any time.` });
            return html(res, 201, page('Authority given', `<p>${esc(String(raw.agentId))} may now act for you until ${esc(String(raw.validTo))}.</p><p>Your reference is <strong>${esc(reference)}</strong>, and the authority is <strong>${esc(delegationId)}</strong>.</p><p><a href="/journeys/J4/steps/authority">Back to agents acting for you</a></p>`));
          }

          const target = store.delegation(String(raw.delegationId));
          if (!target || target.principalId !== principalId) {
            return html(res, 422, page('Suspend, revoke or reinstate authority', `${errorSummaryFor('delegationId', 'No authority of yours has that reference.', 'Check the reference on the previous page.')}${form(path, J4_FIELDS.control, raw, [], 'Apply')}`));
          }
          if (target.status === 'revoked') {
            return html(res, 409, page('Already revoked', '<p>That authority was revoked. Revoking is permanent — give new authority instead.</p>'));
          }
          const change = String(raw.change);
          const status = change === 'suspend' ? 'suspended' : change === 'revoke' ? 'revoked' : 'active';
          store.setDelegationStatus(target.id, status);
          const reference = store.nextReference(REFERENCE_PREFIX['CA-4b']);
          store.effects.push({ journeyId: 'J4', actionId: 'CA-4b', reference, principalId, values: { ...raw }, at: now(), attribution: { agentOriginated: false } });
          store.notify(principalId, { at: now(), actionId: 'CA-4b', journeyId: 'J4', reference, message: `You ${change}d the authority ${target.id}. It takes effect before that agent's next action.` });
          return html(res, 200, page('Authority updated', `<p>Authority <strong>${esc(target.id)}</strong> is now <strong>${esc(status)}</strong>. It takes effect before that agent's next action.</p><p><a href="/journeys/J4/steps/authority">Back to agents acting for you</a></p>`));
        }
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
          // This is the human HTML surface. An agent that POSTs JSON here has
          // taken a wrong turn: URLSearchParams would read the whole JSON string
          // as a single field name and store garbage. Send it to the declared
          // tool instead of silently mangling its request (5.6.2, 2.2.2).
          if (looksLikeJson(req)) {
            res.setHeader('link', `<${origin}/api/journeys/${jid}/schema>; rel="describedby"`);
            return json(res, 415, {
              error: {
                code: 'USE_DECLARED_TOOL',
                message: 'This is the human form endpoint and reads form-encoded input. To act as an agent, POST to the declared tool.',
                declaredTool: `${origin}/api/journeys/${jid}/steps/${stepId}`,
                schema: `${origin}/api/journeys/${jid}/schema`,
              },
            });
          }
          const raw = Object.fromEntries(new URLSearchParams(await readBody(req)));
          const extra = unknownFields(fields, raw);
          if (extra.length > 0) {
            // A field the form never rendered. Do not store it (D-009-adjacent:
            // the human surface accepts exactly what it advertises).
            return html(res, 422, page(step.title, form(path, fields, raw, extra.map((field) => ({
              field, constraint: 'unknown', message: `"${field}" is not part of this form.`, remediation: 'Remove it.',
            })), submitLabel)));
          }
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
          // 5.3.2: a session presenting agent identity is agent-driven, so the
          // posted declaration is the AGENT's act, not the principal's. Route it
          // through the same authorisation as the declared-tool path — which will
          // demand a principal-issued confirmation token it does not have.
          const agentId = req.headers['x-agent-id'] as string | undefined;
          const delegationId = req.headers['x-delegation-id'] as string | undefined;
          if (agentId || delegationId) {
            return executeConsequential(res, store, sid, jid, step, values, {
              agentId,
              delegationId,
              confirmation: { actionId: step.actionId!, principalId: '', at: now(), channel: 'in-session' },
            }, now(), true);
          }
          // Human path: no agent identity is presented, so the service has no basis
          // to treat the actor as anyone but the principal, and the posted
          // declaration is their own act. The residual case — an undeclared agent
          // driving this surface — is a documented limitation, not a defence
          // (MODEL.md §5 Principle 5 rationale, Q10).
          return executeConsequential(res, store, sid, jid, step, values, { humanPrincipalId: `principal-${sid}` }, now(), true);
        }
      }

      if (req.method === 'GET' && path === '/') {
        res.writeHead(303, { location: '/journeys/J1/steps/identity' });
        return res.end();
      }

      // 2.2.2: a wrong method is not a missing resource. Say which method works.
      const allowed = allowedMethodsFor(path);
      if (allowed && req.method && !allowed.includes(req.method)) {
        res.setHeader('allow', allowed.join(', '));
        return json(res, 405, {
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `${req.method} is not allowed at ${path}. Use ${allowed.join(' or ')}.`,
            allow: allowed,
          },
        });
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
  let attribution: { agentOriginated: boolean; agentId?: string; delegationId?: string };

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
      // 5.3.2: the service verifies the token; the agent can only present one.
      redeemConfirmation: (q) => store.confirmations.redeem(q),
    });
    if (!result.authorised) {
      store.record({ at, sessionId: sid, type: 'rejection', detail: { actionId: action.id, ...result.reason } });
      const body = {
        error: {
          ...result.reason,
          // 5.1.1 requires rejecting *with a reason*; a reason the agent cannot act
          // on is half a rejection. Tell it where a confirmation comes from.
          ...(result.reason.code.startsWith('CONFIRMATION')
            ? { confirmationChannel: '/api/confirmations', obtainedBy: 'the principal, not the agent' }
            : {}),
        },
      };
      if (asHtml) {
        res.writeHead(403, { 'content-type': 'text/html; charset=utf-8' });
        res.end(page('Cannot submit', `<p>${esc(result.reason.message)}</p>`));
        return;
      }
      return json(res, 403, body); // 5.1.1: safe, legible rejection
    }
    principalId = result.principalId;
    attribution = { ...result.attribution, delegationId: auth.delegationId };
    if (action.confirmationDesignated) {
      store.record({ at, sessionId: sid, type: 'confirmation', detail: { actionId: action.id, principalId, channel: 'principal-channel', redeemedBy: auth.agentId } });
    }
  }

  // 5.4.1: an agent may only cite a determination the service actually issued.
  const cited = store.determination(auth.determinationId);
  if (auth.determinationId && !cited) {
    return json(res, 400, { error: { code: 'UNKNOWN_DETERMINATION', message: `No determination "${auth.determinationId}" was issued by this service.` } });
  }

  // 3.4.1: duplicate protection per the register; repeats return the original effect
  const outcome = store.guard.execute(duplicateKey(action.id, principalId, values), () => {
    const reference = store.nextReference(REFERENCE_PREFIX[action.id]);
    store.effects.push({ journeyId: jid, actionId: action.id, reference, principalId, values: { ...draft.values }, at, attribution, determinationId: cited?.id });
    store.record({ at, sessionId: sid, type: 'effect', detail: { actionId: action.id, reference, attribution, determinationId: cited?.id } });

    // 5.5.2: notify the principal through their own channel. Delivered, not queued —
    // an obligation recorded in a log the principal cannot read is not a notification.
    if (attribution.agentOriginated) {
      store.notify(principalId, {
        at, actionId: action.id, journeyId: jid, reference, agentId: attribution.agentId,
        message: `Your agent ${attribution.agentId} carried out "${action.title}" on your behalf. Reference ${reference}. If you did not intend this, you can suspend or revoke the delegation at any time.`,
      });
    }
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
