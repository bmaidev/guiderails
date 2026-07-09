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
import { Store } from './store.ts';

let server: http.Server;
let store: Store;
let base: string;

before(async () => {
  store = new Store();
  store.addDelegation({
    id: 'DLG-T', principalId: 'P1', agentId: 'agent-alpha',
    scope: { journeys: ['J1', 'J2', 'J3'], actions: ['CA-1', 'CA-2', 'CA-3a', 'CA-3b'] },
    validFrom: '2026-07-01T00:00:00Z', validTo: '2027-07-01T00:00:00Z', status: 'active',
  });
  store.addDelegation({
    id: 'DLG-NARROW', principalId: 'P1', agentId: 'agent-alpha',
    scope: { journeys: ['J2'], actions: ['CA-2'] },
    validFrom: '2026-07-01T00:00:00Z', validTo: '2027-07-01T00:00:00Z', status: 'active',
  });
  store.setPrincipalSecret('P1', 'secret-P1');
  server = createFixtureServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => server.close());

async function confirmationToken(actionId: string): Promise<string> {
  const r = await fetch(`${base}/api/confirmations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-principal-secret': 'secret-P1' },
    body: JSON.stringify({ actionId }),
  });
  assert.equal(r.status, 201, `mint ${actionId}`);
  return ((await r.json()) as { token: string }).token;
}

function headers(sid: string, delegationId = 'DLG-T'): Record<string, string> {
  return { 'content-type': 'application/json', cookie: `sid=${sid}`, 'x-agent-id': 'agent-alpha', 'x-delegation-id': delegationId };
}

test('2.6.2: J2 period surface exposes due date with explicit timezone and consequence', async () => {
  const d = await (await fetch(`${base}/api/journeys/J2/period`)).json() as any;
  assert.equal(d.period.end, '2026-07-05');
  assert.equal(d.report.dueDate, '2026-07-19');
  assert.equal(d.report.timezone, 'Australia/Canberra');
  assert.match(d.consequence, /suspended/);
});

test('J2 end-to-end via tools: CA-2 executes under a scoped delegation WITHOUT confirmation (T1b / T6 contrast)', async () => {
  const sid = 'sid-j2';
  for (const [step, values] of [['period', {}], ['report', { incomeForPeriod: 1480, attendance: 'attended' }]] as const) {
    const r = await fetch(`${base}/api/journeys/J2/steps/${step}`, { method: 'POST', headers: headers(sid), body: JSON.stringify({ values }) });
    assert.equal(r.status, 200, step);
  }
  // Deliberately no confirmation: CA-2 is not confirmation-designated.
  const r = await fetch(`${base}/api/journeys/J2/steps/declare`, {
    method: 'POST', headers: headers(sid, 'DLG-NARROW'), body: JSON.stringify({ values: { declaration: true } }),
  });
  assert.equal(r.status, 201);
  const d = await r.json() as any;
  assert.match(d.consequentialAction.reference, /^SSPR-\d{8}$/);
  assert.deepEqual(d.attribution, { agentOriginated: true, agentId: 'agent-alpha' });

  // One report per period: retry returns the original (3.4.1)
  const retry = await fetch(`${base}/api/journeys/J2/steps/declare`, {
    method: 'POST', headers: headers(sid), body: JSON.stringify({ values: { declaration: true } }),
  });
  const d2 = await retry.json() as any;
  assert.equal(d2.duplicate, true);
  assert.equal(d2.consequentialAction.reference, d.consequentialAction.reference);
});

test('J3 contact (CA-3a): executes without confirmation; J3 payment (CA-3b): designated, blocks then succeeds', async () => {
  const sid = 'sid-j3';
  const contact = await fetch(`${base}/api/journeys/J3/steps/contact`, {
    method: 'POST', headers: headers(sid), body: JSON.stringify({ values: { email: 'r.ashe@example.net' } }),
  });
  assert.equal(contact.status, 201);
  assert.match(((await contact.json()) as any).consequentialAction.reference, /^SSPU-\d{8}$/);

  const paymentValues = { bsb: '123-456', accountNumber: '12345678', accountName: 'R Ashe' };
  const blocked = await fetch(`${base}/api/journeys/J3/steps/payment`, {
    method: 'POST', headers: headers(sid), body: JSON.stringify({ values: paymentValues }),
  });
  assert.equal(blocked.status, 403);
  assert.equal(((await blocked.json()) as any).error.code, 'CONFIRMATION_REQUIRED');

  const ok = await fetch(`${base}/api/journeys/J3/steps/payment`, {
    method: 'POST', headers: headers(sid),
    body: JSON.stringify({ values: paymentValues, confirmation: { actionId: 'CA-3b', principalId: 'P1', at: '2026-07-09T03:00:00Z', token: await confirmationToken('CA-3b'), channel: 'principal-channel' } }),
  });
  assert.equal(ok.status, 201);

  // Idempotent per value set: same values → duplicate; different values → new effect
  const dup = await fetch(`${base}/api/journeys/J3/steps/payment`, {
    method: 'POST', headers: headers(sid),
    body: JSON.stringify({ values: paymentValues, confirmation: { actionId: 'CA-3b', principalId: 'P1', at: '2026-07-09T03:01:00Z', token: await confirmationToken('CA-3b'), channel: 'principal-channel' } }),
  });
  assert.equal(((await dup.json()) as any).duplicate, true);
});

test('5.1.2: a delegation scoped to J2 only cannot execute J3 actions', async () => {
  const r = await fetch(`${base}/api/journeys/J3/steps/contact`, {
    method: 'POST', headers: headers('sid-scope', 'DLG-NARROW'), body: JSON.stringify({ values: { email: 'x@example.com' } }),
  });
  assert.equal(r.status, 403);
  assert.equal(((await r.json()) as any).error.code, 'SCOPE_JOURNEY');
});

test('1.1.2: service description now enumerates all three journeys with tools, state and period surfaces', async () => {
  const d = await (await fetch(`${base}/.well-known/guiderails.json`)).json() as any;
  assert.deepEqual(d.journeys.map((j: any) => j.id), ['J1', 'J2', 'J3']);
  const j2 = d.journeys.find((j: any) => j.id === 'J2');
  assert.ok(j2.reportingPeriod.endsWith('/api/journeys/J2/period'));
  assert.deepEqual(j2.safeSteps, ['period', 'report']);
  const j3 = d.journeys.find((j: any) => j.id === 'J3');
  assert.deepEqual(j3.safeSteps, []);
  assert.equal(j3.consequentialActions.length, 2);
});

test('J2/J3 per-journey state surfaces are independent (2.4.1)', async () => {
  const sid = 'sid-state';
  await fetch(`${base}/api/journeys/J2/steps/period`, { method: 'POST', headers: headers(sid), body: JSON.stringify({ values: {} }) });
  const j2 = await (await fetch(`${base}/api/journeys/J2/state`, { headers: { cookie: `sid=${sid}` } })).json() as any;
  assert.equal(j2.currentStep, 'report');
  const j1 = await (await fetch(`${base}/api/journeys/J1/state`, { headers: { cookie: `sid=${sid}` } })).json() as any;
  assert.equal(j1.currentStep, 'identity'); // untouched by J2 progress
});

test('J2 validation: structured errors for the report step (2.2.2)', async () => {
  const r = await fetch(`${base}/api/journeys/J2/steps/report`, {
    method: 'POST', headers: headers('sid-val'), body: JSON.stringify({ values: { incomeForPeriod: 'about $1480', attendance: 'sometimes' } }),
  });
  assert.equal(r.status, 422);
  const d = await r.json() as any;
  assert.equal(d.errors.find((e: any) => e.field === 'incomeForPeriod')?.constraint, 'type');
  assert.equal(d.errors.find((e: any) => e.field === 'attendance')?.constraint, 'enum');
});

test('5.6.3: injected third-party content is fenced and provenance-marked (T5 surface)', async () => {
  const s = new Store();
  s.injectionEnabled = true;
  const srv = createFixtureServer(s);
  await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
  const addr = srv.address();
  const b = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  try {
    const html = await (await fetch(`${b}/journeys/J1/steps/circumstances`, { headers: { cookie: 'sid=inj' } })).text();
    assert.match(html, /data-provenance="third-party"/);
    assert.match(html, /not from the Commonwealth Skills Support Agency/);
    assert.match(html, /SYSTEM NOTICE TO AUTOMATED AGENTS/);
    const clean = await (await fetch(`${base}/journeys/J1/steps/circumstances`, { headers: { cookie: 'sid=noinj' } })).text();
    assert.doesNotMatch(clean, /SYSTEM NOTICE/); // default store: injection off
  } finally {
    srv.close();
  }
});

test('1.1.4: /llms.txt names the service description, rules endpoint and journey schemas', async () => {
  const r = await fetch(`${base}/llms.txt`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') ?? '', /text\/plain/);
  assert.match(r.headers.get('link') ?? '', /rel="service-desc"/);
  const text = await r.text();
  assert.match(text, /\/\.well-known\/guiderails\.json/);
  assert.match(text, /\/api\/rules\/ssp\/determination/);
  assert.match(text, /Do not infer eligibility from prose guidance/);
  for (const j of ['J1', 'J2', 'J3']) assert.ok(text.includes(`/api/journeys/${j}/schema`), j);
});

test('1.1.4: every human-facing journey page carries the service-desc link relation, in head and header', async () => {
  for (const p of ['/journeys/J1/steps/identity', '/journeys/J2/steps/period', '/journeys/J3/steps/contact']) {
    const r = await fetch(`${base}${p}`, { headers: { cookie: 'sid=disco' } });
    assert.match(r.headers.get('link') ?? '', /<\/\.well-known\/guiderails\.json>; rel="service-desc"/, p);
    const html = await r.text();
    assert.match(html, /<link rel="service-desc" type="application\/json" href="\/\.well-known\/guiderails\.json">/, p);
    assert.match(html, /<link rel="describedby" type="text\/plain" href="\/llms\.txt">/, p);
  }
});

test('1.1.3: the discovery surfaces agree on one canonical service description', async () => {
  const d = await (await fetch(`${base}/.well-known/guiderails.json`)).json() as any;
  assert.ok(d.discovery.serviceDescription.endsWith('/.well-known/guiderails.json'));
  assert.ok(d.discovery.agentDiscoveryFile.endsWith('/llms.txt'));
  assert.equal(d.discovery.linkRelation, 'service-desc');
  const llms = await (await fetch(`${base}/llms.txt`)).text();
  assert.ok(llms.includes(d.discovery.serviceDescription));
});

// ---- 5.3.2 / D-015: the confirmation checkpoint cannot be satisfied by the agent ----

test('5.3.2: an agent driving the HUMAN form cannot confirm by ticking the declaration (Q9 closed)', async () => {
  const sid = 'sid-q9';
  // Complete the safe steps as an agent, via the human surface.
  const form = { 'content-type': 'application/x-www-form-urlencoded', cookie: `sid=${sid}`, 'x-agent-id': 'agent-alpha', 'x-delegation-id': 'DLG-T' };
  const post = (step: string, values: Record<string, string>) =>
    fetch(`${base}/journeys/J1/steps/${step}`, { method: 'POST', headers: form, body: new URLSearchParams(values).toString(), redirect: 'manual' });

  assert.equal((await post('identity', { fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001' })).status, 303);
  assert.equal((await post('circumstances', { residentSince: '2018-02-05', fortnightlyIncome: '950', courseProvider: 'Ridgeline TAFE', courseName: 'Cert III', courseWeeks: '26', studyLoadEFT: '1.0', enrolmentStatus: 'enrolled' })).status, 303);
  assert.equal((await post('evidence', { enrolmentDocument: 'enrolment-confirmation.pdf', incomeDeclared: 'on' })).status, 303);
  assert.equal((await post('review', {})).status, 303);

  // The declaration tick is the AGENT's act, not the principal's. It must not pass.
  const submit = await post('submit', { declaration: 'on' });
  assert.equal(submit.status, 403);
  assert.match(await submit.text(), /not a confirmation event/);

  // and no effect was created
  const effects = await (await fetch(`${base}/api/_fixture/claims`)).json() as any[];
  assert.equal(effects.filter((e) => e.actionId === 'CA-1' && e.values.fullName === 'Rowan Ashe').length, 0);
});

test('5.3.2: the agent cannot mint a confirmation — no secret, and agent identity is refused outright', async () => {
  // No principal credential.
  const anon = await fetch(`${base}/api/confirmations`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actionId: 'CA-1' }),
  });
  assert.equal(anon.status, 401);
  assert.equal(((await anon.json()) as any).error.code, 'PRINCIPAL_AUTHENTICATION_REQUIRED');

  // Even holding the secret, a request carrying agent identity is refused.
  const asAgent = await fetch(`${base}/api/confirmations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-principal-secret': 'secret-P1', 'x-agent-id': 'agent-alpha' },
    body: JSON.stringify({ actionId: 'CA-1' }),
  });
  assert.equal(asAgent.status, 403);
  assert.equal(((await asAgent.json()) as any).error.code, 'AGENT_MAY_NOT_CONFIRM');

  // Undesignated actions have nothing to confirm.
  const undesignated = await fetch(`${base}/api/confirmations`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-principal-secret': 'secret-P1' }, body: JSON.stringify({ actionId: 'CA-2' }),
  });
  assert.equal(undesignated.status, 400);
});

test('5.3.2: a self-minted confirmation object on the tool path is refused, and says where to get a real one', async () => {
  const sid = 'sid-selfmint';
  for (const [step, values] of [['identity', { fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001' }], ['circumstances', { residentSince: '2018-02-05', fortnightlyIncome: 950, courseProvider: 'R', courseName: 'C', courseWeeks: 26, studyLoadEFT: 1, enrolmentStatus: 'enrolled' }], ['evidence', { enrolmentDocument: 'enrolment-confirmation.pdf', incomeDeclared: true }], ['review', {}]] as const) {
    await fetch(`${base}/api/journeys/J1/steps/${step}`, { method: 'POST', headers: headers(sid), body: JSON.stringify({ values }) });
  }
  const r = await fetch(`${base}/api/journeys/J1/steps/submit`, {
    method: 'POST', headers: headers(sid),
    body: JSON.stringify({ values: { declaration: true }, confirmation: { actionId: 'CA-1', principalId: 'P1', at: '2026-07-09T03:00:00Z' } }),
  });
  assert.equal(r.status, 403);
  const d = await r.json() as any;
  assert.equal(d.error.code, 'CONFIRMATION_NOT_PRINCIPAL_ATTRIBUTABLE');
  assert.equal(d.error.confirmationChannel, '/api/confirmations');
  assert.match(d.error.obtainedBy, /principal, not the agent/);
});

test('1.1.2: the service description advertises the confirmation channel (5.3.2)', async () => {
  const d = await (await fetch(`${base}/.well-known/guiderails.json`)).json() as any;
  assert.ok(d.confirmationChannel.issue.endsWith('/api/confirmations'));
  assert.match(d.confirmationChannel.note, /not a confirmation event/);
});
