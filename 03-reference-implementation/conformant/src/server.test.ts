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

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { createFixtureServer } from './server.ts';
import { SERVICE_DESC_PATH } from './html.ts';
import { Store } from './store.ts';

let server: http.Server;
let store: Store;
let base: string;

const DELEGATION = {
  id: 'DLG-T', principalId: 'P1', agentId: 'agent-alpha',
  scope: { journeys: ['J1'], actions: ['CA-1'] },
  validFrom: '2026-07-01T00:00:00Z', validTo: '2027-07-01T00:00:00Z', status: 'active' as const,
};

async function confirmationToken(actionId: string): Promise<string> {
  const r = await fetch(`${base}/api/confirmations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-principal-secret': 'secret-P1' },
    body: JSON.stringify({ actionId }),
  });
  assert.equal(r.status, 201, `mint ${actionId}`);
  return ((await r.json()) as { token: string }).token;
}

before(async () => {
  store = new Store();
  store.addDelegation(DELEGATION);
  store.setPrincipalSecret('P1', 'secret-P1');
  server = createFixtureServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => server.close());

function agentHeaders(sid: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    cookie: `sid=${sid}`,
    'x-agent-id': 'agent-alpha',
    'x-delegation-id': 'DLG-T',
  };
}

const SAFE_STEPS: Array<[string, Record<string, unknown>]> = [
  ['identity', { fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001' }],
  ['circumstances', { residentSince: '2018-02-05', fortnightlyIncome: 950, courseProvider: 'Ridgeline TAFE', courseName: 'Certificate III in Horticulture', courseWeeks: 26, studyLoadEFT: 1.0, enrolmentStatus: 'enrolled' }],
  ['evidence', { enrolmentDocument: 'enrolment-confirmation.pdf', incomeDeclared: true }],
  ['review', {}],
];

async function completeSafeSteps(sid: string): Promise<void> {
  for (const [step, values] of SAFE_STEPS) {
    const r = await fetch(`${base}/api/journeys/J1/steps/${step}`, {
      method: 'POST', headers: agentHeaders(sid), body: JSON.stringify({ values }),
    });
    assert.equal(r.status, 200, `safe step ${step}`);
  }
}

test('1.1.x/1.2.1: service description states identity, journeys, register, tools and time limit', async () => {
  const r = await fetch(`${base}/.well-known/guiderails.json`);
  const d = await r.json() as any;
  assert.equal(r.status, 200);
  assert.match(d.service.administeringAuthority, /FICTIONAL/);
  assert.equal(d.service.standardClaimed.standard, 'Guiderails');
  assert.equal(d.sessionTimeLimit.minutes, 60);
  const j1 = d.journeys.find((j: any) => j.id === 'J1');
  assert.ok(j1.entryPoint.endsWith('/journeys/J1/steps/identity'));
  assert.equal(j1.consequentialActions[0].confirmationDesignated, true);
  assert.deepEqual(j1.safeSteps, ['identity', 'circumstances', 'evidence', 'review']);
});

test('3.1.1: step schemas published without auth or side effects', async () => {
  const r = await fetch(`${base}/api/journeys/J1/schema`);
  const d = await r.json() as any;
  const submit = d.steps.find((s: any) => s.id === 'submit');
  assert.equal(submit.kind, 'consequential');
  assert.equal(submit.confirmationDesignated, true);
  const circumstances = d.steps.find((s: any) => s.id === 'circumstances');
  const values = circumstances.inputSchema.properties.values;
  assert.equal(values.properties.fortnightlyIncome.type, 'number');
  assert.ok(values.required.includes('enrolmentStatus'));
});

test('3.1.1: the published schema describes the request body, not just the fields', async () => {
  // Two frontier models each burned an iteration budget because the schema
  // described {declaration} while the endpoint accepted {values: {declaration}},
  // and the 422 named a field they had supplied. A published input schema an
  // agent cannot construct a request from does not satisfy 3.1.1.
  const d = await (await fetch(`${base}/api/journeys/J1/schema`)).json() as any;

  const identity = d.steps.find((s: any) => s.id === 'identity');
  assert.equal(identity.method, 'POST');
  assert.deepEqual(identity.inputSchema.required, ['values']);
  assert.equal(identity.inputSchema.properties.values.type, 'object');

  const submit = d.steps.find((s: any) => s.id === 'submit');
  // CA-1 is confirmation-designated: the checkpoint must have a documented door.
  assert.ok(submit.inputSchema.required.includes('confirmation'));
  assert.ok(submit.inputSchema.properties.confirmation.required.includes('token'));
  // 5.4.1: an agent cannot cite what it was never told it could send.
  assert.equal(submit.inputSchema.properties.determinationId.type, 'string');
});

test('3.1.1: a request constructed only from the published schema is accepted', async () => {
  // The property the schema *asserts*. Nothing else in the suite checked that an
  // agent reading only the declared surface could actually complete a step.
  const schema = await (await fetch(`${base}/api/journeys/J1/schema`)).json() as any;
  const identity = schema.steps.find((s: any) => s.id === 'identity');

  const supply: Record<string, unknown> = {
    fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14',
    email: 'rowan.ashe@example.com', mobile: '0400000001', residentSince: '2018-02-05',
  };
  // Build the body from the schema's own shape, not from knowledge of the server.
  const body = {
    values: Object.fromEntries(
      identity.inputSchema.properties.values.required.map((f: string) => [f, supply[f]]),
    ),
  };

  const r = await fetch(identity.endpoint, {
    method: identity.method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.equal(r.status, 200, `a schema-shaped request was rejected: ${await r.text()}`);
});

test('2.2.2: sending the fields flat is told about the envelope, not about the fields', async () => {
  const r = await fetch(`${base}/api/journeys/J1/steps/identity`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14' }),
  });
  assert.equal(r.status, 400);
  const body = await r.json() as any;
  assert.equal(body.error.code, 'MISSING_VALUES');
  // The old behaviour: 422 "fullName is required" to an agent that sent fullName.
  assert.ok(!/fullName is required/.test(JSON.stringify(body)));
});

test('a JSON body of literal null is a 400, not a 500', async () => {
  // JSON.parse('null') is null, and null.values throws. Every other malformed
  // body degraded politely; this one returned an unhandled fixture error.
  for (const raw of ['null', '[]', '"hello"', '{oops']) {
    const r = await fetch(`${base}/api/journeys/J1/steps/identity`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
    });
    assert.equal(r.status, 400, `body ${raw} should be a 400`);
    assert.equal(((await r.json()) as any).error.code, 'MALFORMED_BODY');
  }
});

test('2.2.2: a wrong method is 405 with Allow, not 404', async () => {
  // Every agent in the smoke runs probed GET on these first and was told the
  // resource did not exist. It exists; it wanted POST.
  for (const path of ['/api/rules/ssp/determination', '/api/confirmations', '/api/journeys/J1/resume']) {
    const r = await fetch(`${base}${path}`);
    assert.equal(r.status, 405, `GET ${path}`);
    assert.equal(r.headers.get('allow'), 'POST');
    assert.equal(((await r.json()) as any).error.code, 'METHOD_NOT_ALLOWED');
  }
  // A path that genuinely does not exist still 404s.
  assert.equal((await fetch(`${base}/api/nonexistent`)).status, 404);
});

test('the determination endpoint names its envelope when circumstances arrive flat', async () => {
  const r = await fetch(`${base}/api/rules/ssp/determination`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ageYears: 20, residencyWeeks: 29 }),
  });
  assert.equal(r.status, 400);
  const body = await r.json() as any;
  assert.equal(body.error.code, 'MISSING_CIRCUMSTANCES');
  assert.deepEqual(body.error.received, ['ageYears', 'residencyWeeks']);
});

test('3.1.1: the determination endpoint publishes its own request schema', async () => {
  const d = await (await fetch(`${base}${SERVICE_DESC_PATH}`)).json() as any;
  assert.equal(d.rules.determinationRequest.method, 'POST');
  assert.deepEqual(d.rules.determinationRequest.inputSchema.required, ['circumstances']);
});

test('4.1.1/4.2.1/4.5.x: rules endpoint answers V3 with provenance, indicative label, no-obligation statement', async () => {
  const r = await fetch(`${base}/api/rules/ssp/determination`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      effectiveDate: '2026-07-09',
      circumstances: { ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, courseWeeks: 12, enrolmentStatus: 'offer', fortnightlyIncome: 1500 },
    }),
  });
  const d = await r.json() as any;
  assert.equal(d.eligible, false);
  assert.deepEqual(d.governingReason.sections, ['s11', 's9']);
  assert.equal(d.determinationStatus, 'indicative');
  assert.equal(d.provenance.instrumentId, 'SSPD-2026');
  assert.match(d.obligationStatement, /no obligation/);
  const bad = await fetch(`${base}/api/rules/ssp/determination`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ circumstances: { residencyWeeks: 30 } }),
  });
  assert.equal(bad.status, 400);
});

test('2.2.2: tool-call validation errors are structured with remediation (T2 induced error)', async () => {
  const sid = 'sid-t2';
  const r = await fetch(`${base}/api/journeys/J1/steps/circumstances`, {
    method: 'POST', headers: agentHeaders(sid),
    body: JSON.stringify({ values: { ...SAFE_STEPS[1][1], fortnightlyIncome: '1,500 dollars per fortnight' } }),
  });
  assert.equal(r.status, 422);
  const d = await r.json() as any;
  const err = d.errors.find((e: any) => e.field === 'fortnightlyIncome');
  assert.equal(err.constraint, 'type');
  assert.match(err.remediation, /without currency symbols/);
});

test('5.3.1/5.1.1: designated submit blocks without confirmation, and without delegation (T6)', async () => {
  const sid = 'sid-t6';
  await completeSafeSteps(sid);

  const noConfirmation = await fetch(`${base}/api/journeys/J1/steps/submit`, {
    method: 'POST', headers: agentHeaders(sid),
    body: JSON.stringify({ values: { declaration: true } }),
  });
  assert.equal(noConfirmation.status, 403);
  assert.equal(((await noConfirmation.json()) as any).error.code, 'CONFIRMATION_REQUIRED');

  const noDelegation = await fetch(`${base}/api/journeys/J1/steps/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `sid=${sid}`, 'x-agent-id': 'agent-alpha' },
    body: JSON.stringify({ values: { declaration: true } }),
  });
  assert.equal(noDelegation.status, 403);
  assert.equal(((await noDelegation.json()) as any).error.code, 'DELEGATION_MISSING');
});

test('happy path: confirmed submit succeeds with reference, attribution and state surface; duplicate returns original (3.4.1)', async () => {
  const sid = 'sid-t1';
  await completeSafeSteps(sid);

  // The principal confirms out-of-band; the agent may present the token once.
  const token = await confirmationToken('CA-1');
  const submit = () => fetch(`${base}/api/journeys/J1/steps/submit`, {
    method: 'POST', headers: agentHeaders(sid),
    body: JSON.stringify({
      values: { declaration: true },
      confirmation: { actionId: 'CA-1', principalId: 'P1', at: '2026-07-09T03:00:00Z', token, channel: 'principal-channel' },
    }),
  });

  const first = await submit();
  assert.equal(first.status, 201);
  const d1 = await first.json() as any;
  assert.match(d1.consequentialAction.reference, /^SSP-\d{8}$/);
  assert.equal(d1.duplicate, false);
  assert.deepEqual(d1.attribution, { agentOriginated: true, agentId: 'agent-alpha', delegationId: 'DLG-T' }); // 5.2.1

  // The duplicate guard must answer before the token is re-checked: a retried
  // submit is the same effect, not a second confirmation.
  const retryToken = await confirmationToken('CA-1');
  const retry = await fetch(`${base}/api/journeys/J1/steps/submit`, {
    method: 'POST', headers: agentHeaders(sid),
    body: JSON.stringify({ values: { declaration: true }, confirmation: { actionId: 'CA-1', principalId: 'P1', at: '2026-07-09T03:00:00Z', token: retryToken, channel: 'principal-channel' } }),
  });
  assert.equal(retry.status, 200);
  const d2 = await retry.json() as any;
  assert.equal(d2.duplicate, true);
  assert.equal(d2.consequentialAction.reference, d1.consequentialAction.reference);

  const state = await (await fetch(`${base}/api/journeys/J1/state`, { headers: { cookie: `sid=${sid}` } })).json() as any;
  assert.equal(state.consequentialActionOccurred, true); // 2.4.2
  assert.equal(state.consequentialEvents[0].reference, d1.consequentialAction.reference);
  assert.equal(state.currentStep, null);
});

test('prerequisites: submit before earlier steps is refused legibly (2.4.1)', async () => {
  const sid = 'sid-prereq';
  const token = await confirmationToken('CA-1');
  const r = await fetch(`${base}/api/journeys/J1/steps/submit`, {
    method: 'POST', headers: agentHeaders(sid),
    body: JSON.stringify({ values: { declaration: true }, confirmation: { actionId: 'CA-1', principalId: 'P1', at: '2026-07-09T03:00:00Z', token, channel: 'principal-channel' } }),
  });
  assert.equal(r.status, 422);
  assert.equal(((await r.json()) as any).error.code, 'PREREQUISITES_UNSATISFIED');
});

test('3.4.2: state survives across requests — resume shows remaining steps (T7 substrate)', async () => {
  const sid = 'sid-resume';
  const [step, values] = SAFE_STEPS[0];
  await fetch(`${base}/api/journeys/J1/steps/${step}`, { method: 'POST', headers: agentHeaders(sid), body: JSON.stringify({ values }) });
  const state = await (await fetch(`${base}/api/journeys/J1/state`, { headers: { cookie: `sid=${sid}` } })).json() as any;
  assert.equal(state.currentStep, 'circumstances');
  assert.deepEqual(state.remainingSteps, ['circumstances', 'evidence', 'review', 'submit']);
});

test('HTML path: labelled controls, error summary with anchors, redirect flow, submission page (human path)', async () => {
  const cookie = 'sid=sid-html';
  const identity = await fetch(`${base}/journeys/J1/steps/identity`, { headers: { cookie } });
  const pageHtml = await identity.text();
  assert.match(pageHtml, /<html lang="en">/);
  assert.match(pageHtml, /<label for="fullName">Full name<\/label>/);
  assert.match(pageHtml, /Session time limit: 60 minutes/); // 2.6.1

  const bad = await fetch(`${base}/journeys/J1/steps/identity`, {
    method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'not-an-email', mobile: '12345' }).toString(),
  });
  assert.equal(bad.status, 422);
  const badHtml = await bad.text();
  assert.match(badHtml, /role="alert"/);
  assert.match(badHtml, /href="#email"/); // error summary anchors to the control
  assert.match(badHtml, /aria-invalid="true"/);

  const good = await fetch(`${base}/journeys/J1/steps/identity`, {
    method: 'POST', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001' }).toString(),
    redirect: 'manual',
  });
  assert.equal(good.status, 303);
  assert.equal(good.headers.get('location'), '/journeys/J1/steps/circumstances');
});

test('logging: field values, tool calls, confirmations, effects and rejections are all recorded (§7)', () => {
  const types = new Set(store.log.map((e) => e.type));
  for (const t of ['tool-call', 'field-values', 'confirmation', 'effect', 'rejection', 'rules-query']) {
    assert.ok(types.has(t as never), `log contains ${t}`);
  }
});

test('the human form rejects a JSON body and points at the declared tool', async () => {
  // An exploratory agent POSTed JSON to the HTML endpoint; URLSearchParams read
  // the whole JSON string as one field name and stored it. That is now a 415.
  const r = await fetch(`${base}/journeys/J1/steps/identity`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14' }),
  });
  assert.equal(r.status, 415);
  const body = await r.json() as any;
  assert.equal(body.error.code, 'USE_DECLARED_TOOL');
  assert.ok(body.error.declaredTool.endsWith('/api/journeys/J1/steps/identity'));
});

test('a value misplaced inside values is named, not stored (additionalProperties: false)', async () => {
  // The confirmation token belongs beside values, not inside it. When an agent
  // nested it, the fixture recorded it as a claimed field — polluting FIR.
  const r = await fetch(`${base}/api/journeys/J1/steps/identity`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ values: { fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001', confirmation: 'a-token' } }),
  });
  assert.equal(r.status, 422);
  const body = await r.json() as any;
  const unknown = body.errors.find((e: any) => e.field === 'confirmation');
  assert.ok(unknown, 'the misplaced field must be named');
  assert.equal(unknown.constraint, 'unknown');
  assert.match(unknown.remediation, /beside "values"/);
});

test('1.4.2: a withdrawn surface answers 410 Gone, not 404', async () => {
  // An agent that finds a retired surface must learn it is gone, with its
  // successor — not that it never existed (which invites a wrong retry).
  const r = await fetch(`${base}/.well-known/guiderails-v1.json`);
  assert.equal(r.status, 410);
  assert.equal(r.headers.get('retry-after'), null, 'a withdrawn surface is permanent, so no Retry-After');
  const body = await r.json() as any;
  assert.equal(body.error.code, 'SURFACE_WITHDRAWN');
  assert.ok(body.error.supersededBy.endsWith('/.well-known/guiderails.json'));
  assert.ok(body.error.alternative.serviceDescription, 'an alternative channel must be named');
});

test('1.4.2: withdrawal applies to every method, and pre-empts routing', async () => {
  const post = await fetch(`${base}/.well-known/guiderails-v1.json`, { method: 'POST' });
  assert.equal(post.status, 410, 'withdrawal is method-independent');
});

test('1.4.2: a declared outage answers 503 with Retry-After, and lifting it restores service', async () => {
  const path = '/api/rules/ssp/changelog';
  assert.equal((await fetch(`${base}${path}`)).status, 200, 'live before the outage');

  store.declareOutage(path, { retryAfterSeconds: 120, reason: 'Planned maintenance' });
  const down = await fetch(`${base}${path}`);
  assert.equal(down.status, 503);
  assert.equal(down.headers.get('retry-after'), '120', 'temporary unavailability is retryable');
  const body = await down.json() as any;
  assert.equal(body.error.code, 'SURFACE_UNAVAILABLE');
  assert.equal(body.error.retryAfterSeconds, 120);
  assert.ok(body.error.alternative.serviceDescription);

  store.clearOutage(path);
  assert.equal((await fetch(`${base}${path}`)).status, 200, 'lifting the outage proves it was temporary');
});

test('1.4.2: surfaceStatusFor is a pure sibling of allowedMethodsFor', async () => {
  const { surfaceStatusFor, WITHDRAWN_SURFACES } = await import('./server.ts');
  const s = new Store();
  assert.equal(surfaceStatusFor('/api/journeys/J1/schema', s), undefined, 'a live surface has no status');
  assert.equal(surfaceStatusFor('/.well-known/guiderails-v1.json', s)!.state, 'withdrawn');
  s.declareOutage('/x', { retryAfterSeconds: 5 });
  assert.equal(surfaceStatusFor('/x', s)!.state, 'unavailable');
  assert.ok(Object.keys(WITHDRAWN_SURFACES).length >= 1);
});

test('1.4.2: withdrawn surfaces are declared in the service description (1.1.3, no surprise 410)', async () => {
  const d = await (await fetch(`${base}${SERVICE_DESC_PATH}`)).json() as any;
  assert.ok(d.availability, 'the description must declare availability');
  const retired = d.availability.retiredSurfaces.map((r: any) => r.path);
  assert.ok(retired.includes('/.well-known/guiderails-v1.json'), 'the 410 path must be discoverable');
});
