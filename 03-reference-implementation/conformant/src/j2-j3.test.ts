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
  for (const id of ['DLG-REVOKE', 'DLG-SUSPEND']) {
    store.addDelegation({
      id, principalId: 'P1', agentId: 'agent-alpha',
      scope: { journeys: ['J1', 'J2', 'J3'], actions: ['CA-1', 'CA-2', 'CA-3a', 'CA-3b'] },
      validFrom: '2026-07-01T00:00:00Z', validTo: '2027-07-01T00:00:00Z', status: 'active',
    });
  }
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
  assert.deepEqual(d.attribution, { agentOriginated: true, agentId: 'agent-alpha', delegationId: 'DLG-NARROW' });

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

test('1.1.2: service description enumerates every journey, and marks the one no agent may drive', async () => {
  const d = await (await fetch(`${base}/.well-known/guiderails.json`)).json() as any;
  assert.deepEqual(d.journeys.map((j: any) => j.id), ['J1', 'J2', 'J3', 'J4']);

  const j4 = d.journeys.find((j: any) => j.id === 'J4');
  assert.equal(j4.agentExecutable, false);
  assert.equal(j4.state, undefined, 'a journey no agent drives advertises no agent state surface');
  assert.ok(j4.tools, 'but its schema stays discoverable, so an agent learns why it must not act');
  assert.match(j4.principalOnly, /No delegation conveys it/);
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

// ---- 3.4.2: resumability that survives a killed session ----

test('3.4.2: a killed session does not destroy the work — a new session resumes it under the same delegation', async () => {
  const first = 'sid-t7-a';
  for (const [step, values] of [['identity', { fullName: 'Mina Kovač', dateOfBirth: '2006-11-02', email: 'mina@example.com', mobile: '0400000002' }], ['circumstances', { residentSince: '2023-08-21', fortnightlyIncome: 1500, courseProvider: 'Harbourline', courseName: 'Cert IV', courseWeeks: 12, studyLoadEFT: 0.8, enrolmentStatus: 'enrolled' }]] as const) {
    const r = await fetch(`${base}/api/journeys/J1/steps/${step}`, { method: 'POST', headers: headers(first), body: JSON.stringify({ values }) });
    assert.equal(r.status, 200, step);
  }

  // The session dies. A fresh cookie, same delegation.
  const resumed = 'sid-t7-b';
  const state = await (await fetch(`${base}/api/journeys/J1/state`, { headers: headers(resumed) })).json() as any;
  assert.equal(state.currentStep, 'identity', 'the new session starts empty');
  assert.equal(state.resumable.available, true, 'but the principal\'s work survives');
  assert.deepEqual(state.resumable.completedSteps, ['identity', 'circumstances']);
  assert.equal(state.resumable.declaredPeriodHours, 24);

  const r = await fetch(`${base}/api/journeys/J1/resume`, { method: 'POST', headers: headers(resumed) });
  assert.equal(r.status, 200);
  const after = ((await r.json()) as any).state;
  assert.equal(after.currentStep, 'evidence', 'resumed at the next step, no data re-entered');
  assert.deepEqual(after.remainingSteps, ['evidence', 'review', 'submit']);
});

test('3.4.2: a resume adopts the principal\'s work, so it requires a delegation naming them', async () => {
  const r = await fetch(`${base}/api/journeys/J1/resume`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'sid=noauth' } });
  assert.equal(r.status, 403);
  assert.equal(((await r.json()) as any).error.code, 'DELEGATION_REQUIRED');
});

test('3.4.2: with no saved work there is nothing to resume, said legibly', async () => {
  const r = await fetch(`${base}/api/journeys/J3/resume`, { method: 'POST', headers: headers('sid-noresume') });
  assert.equal(r.status, 404);
  assert.equal(((await r.json()) as any).error.code, 'NO_RESUME_POINT');
});

test('1.1.2: the service description declares the resume period and endpoint (3.4.2)', async () => {
  const d = await (await fetch(`${base}/.well-known/guiderails.json`)).json() as any;
  assert.equal(d.resumability.declaredPeriodHours, 24);
  assert.match(d.resumability.resume, /\/api\/journeys\/\{journeyId\}\/resume$/);
  assert.match(d.resumability.note, /keyed to the principal, not the session/);
});

// ---- Principle 5, performed rather than asserted ----

async function principal(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${base}${path}`, { ...init, headers: { 'content-type': 'application/json', 'x-principal-secret': 'secret-P1', ...(init.headers ?? {}) } });
}

test('5.5.2: the principal is NOTIFIED of an agent-executed action, through their own channel', async () => {
  const sid = 'sid-notify';
  await fetch(`${base}/api/journeys/J3/steps/contact`, { method: 'POST', headers: headers(sid), body: JSON.stringify({ values: { email: 'notify@example.net' } }) });

  const d = await (await principal('/api/notifications')).json() as any;
  const n = d.notifications.find((x: any) => x.actionId === 'CA-3a');
  assert.ok(n, 'a notification was delivered, not merely logged');
  assert.equal(n.agentId, 'agent-alpha');
  assert.match(n.message, /carried out "Update contact details" on your behalf/);
  assert.match(n.message, /suspend or revoke the delegation at any time/);
});

test('5.4.1: the audit record is complete, plain-language and machine-readable, and names the agent', async () => {
  const d = await (await principal('/api/audit')).json() as any;
  assert.ok(d.entries.length > 0);
  const e = d.entries.find((x: any) => x.actionId === 'CA-3a');
  assert.equal(e.agent.id, 'agent-alpha');
  assert.equal(e.agent.delegationId, 'DLG-T');
  assert.match(e.plainLanguage, /your agent agent-alpha carried out/);
  assert.match(d.contestability, /same channels, and on the same terms/); // 5.4.2
});

test('4.5.2 + 5.4.1: a hypothetical query is unattributed; CITING it at the moment of action is what puts it in the audit', async () => {
  // The query itself carries no principal — that is 4.5.2, and it is why the
  // rules endpoint needs no account.
  const det = await (await fetch(`${base}/api/rules/ssp/determination`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ effectiveDate: '2026-07-09', circumstances: { ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, courseWeeks: 12, enrolmentStatus: 'offer', fortnightlyIncome: 1500 } }),
  })).json() as any;
  assert.match(det.determinationId, /^det_/);
  assert.match(det.citeWhenActing, /attributes your reliance, not this query/);

  // Before any citation, the principal's audit shows no determination for this.
  const sid = 'sid-cite';
  await fetch(`${base}/api/journeys/J3/steps/contact`, { method: 'POST', headers: headers(sid), body: JSON.stringify({ values: { email: 'cite-a@example.net' }, determinationId: det.determinationId }) });

  const audit = await (await principal('/api/audit')).json() as any;
  const cited = audit.entries.find((e: any) => e.determinationReliedUpon?.id === det.determinationId);
  assert.ok(cited, 'the cited determination appears in the audit');
  assert.equal(cited.determinationReliedUpon.eligible, false);
  assert.deepEqual(cited.determinationReliedUpon.governingReason.sections, ['s11', 's9']);
  assert.match(cited.plainLanguage, /relied on a determination that you were ineligible \(s11, s9\)/);
});

test('5.4.1: an agent cannot cite a determination the service never issued', async () => {
  const r = await fetch(`${base}/api/journeys/J3/steps/contact`, {
    method: 'POST', headers: headers('sid-forged'),
    body: JSON.stringify({ values: { email: 'forged@example.net' }, determinationId: 'det_invented' }),
  });
  assert.equal(r.status, 400);
  assert.equal(((await r.json()) as any).error.code, 'UNKNOWN_DETERMINATION');
});

test('5.5.1 / 5.1.2: the principal revokes, and the service gives effect BEFORE any further consequential action', async () => {
  const sid = 'sid-revoke';
  // Works while active.
  const before = await fetch(`${base}/api/journeys/J3/steps/contact`, { method: 'POST', headers: headers(sid, 'DLG-REVOKE'), body: JSON.stringify({ values: { email: 'before@example.net' } }) });
  assert.equal(before.status, 201);

  const rev = await principal('/api/delegations/DLG-REVOKE/revoke', { method: 'POST' });
  assert.equal(rev.status, 200);
  assert.equal(((await rev.json()) as any).effectiveImmediately, true);

  const after = await fetch(`${base}/api/journeys/J3/steps/contact`, { method: 'POST', headers: headers('sid-revoke-2', 'DLG-REVOKE'), body: JSON.stringify({ values: { email: 'after@example.net' } }) });
  assert.equal(after.status, 403);
  assert.equal(((await after.json()) as any).error.code, 'DELEGATION_REVOKED');
});

test('5.5.1: revocation is terminal — a revoked delegation cannot be reinstated', async () => {
  const r = await principal('/api/delegations/DLG-REVOKE/reinstate', { method: 'POST' });
  assert.equal(r.status, 409);
  assert.equal(((await r.json()) as any).error.code, 'DELEGATION_REVOKED');
});

test('5.5.1: suspension is reversible', async () => {
  await principal('/api/delegations/DLG-SUSPEND/suspend', { method: 'POST' });
  const blocked = await fetch(`${base}/api/journeys/J3/steps/contact`, { method: 'POST', headers: headers('sid-susp', 'DLG-SUSPEND'), body: JSON.stringify({ values: { email: 's@example.net' } }) });
  assert.equal(((await blocked.json()) as any).error.code, 'DELEGATION_SUSPENDED');

  await principal('/api/delegations/DLG-SUSPEND/reinstate', { method: 'POST' });
  const ok = await fetch(`${base}/api/journeys/J3/steps/contact`, { method: 'POST', headers: headers('sid-susp-2', 'DLG-SUSPEND'), body: JSON.stringify({ values: { email: 's2@example.net' } }) });
  assert.equal(ok.status, 201);
});

test('the principal channel belongs to the principal: an agent cannot read the audit or alter delegations', async () => {
  for (const p of ['/api/audit', '/api/notifications', '/api/delegations']) {
    const asAgent = await fetch(`${base}${p}`, { headers: { 'x-principal-secret': 'secret-P1', 'x-agent-id': 'agent-alpha' } });
    assert.equal(asAgent.status, 403, p);
    assert.equal(((await asAgent.json()) as any).error.code, 'PRINCIPAL_CHANNEL');

    const anon = await fetch(`${base}${p}`);
    assert.equal(anon.status, 401, p);
  }
  const revoke = await fetch(`${base}/api/delegations/DLG-T/revoke`, { method: 'POST', headers: { 'x-agent-id': 'agent-alpha', 'x-principal-secret': 'secret-P1' } });
  assert.equal(revoke.status, 403);
});

// ---- J4: the delegation journey (5.1.2), and the power that cannot be delegated ----

const j4 = (path: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, { ...init, headers: { cookie: 'principal=P1', ...(init.headers ?? {}) } });

const formPost = (path: string, values: Record<string, string>, cookie = 'principal=P1') =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie }, body: new URLSearchParams(values).toString(), redirect: 'manual' });

test('5.1.2: no agent surface exists for J4 — the register says so, and the endpoint proves it', async () => {
  const schema = await (await fetch(`${base}/api/journeys/J4/schema`)).json() as any;
  const give = schema.steps.find((s: any) => s.id === 'give');
  assert.equal(give.agentExecutable, false, 'the register tells an agent not to try');

  const attempt = await fetch(`${base}/api/journeys/J4/steps/give`, {
    method: 'POST', headers: headers('sid-j4'), body: JSON.stringify({ values: { agentId: 'agent-alpha' } }),
  });
  assert.equal(attempt.status, 403);
  const d = await attempt.json() as any;
  assert.equal(d.error.code, 'AGENT_MAY_NOT_EXECUTE');
  assert.match(d.error.message, /principal's act alone/);
  assert.match(d.error.principalJourney, /\/journeys\/J4\/steps\/authority$/);
});

test('the consequential-actions register marks the principal-only actions', async () => {
  const d = await (await fetch(`${base}/.well-known/guiderails.json`)).json() as any;
  const reg = Object.fromEntries(d.consequentialActionsRegister.map((a: any) => [a.id, a.agentExecutable]));
  assert.equal(reg['CA-1'], true);
  assert.equal(reg['CA-4a'], false);
  assert.equal(reg['CA-4b'], false);
});

test('5.1.2: J4 requires the principal to sign in, and the credential is never given to an agent', async () => {
  const anon = await fetch(`${base}/journeys/J4/steps/authority`);
  const html = await anon.text();
  assert.match(html, /Sign in to manage your agents/);
  assert.match(html, /<label for="principalSecret">/); // 2.2.1
  assert.match(html, /Never give it to an agent/);

  const bad = await formPost('/journeys/J4/authenticate', { principalSecret: 'wrong' }, '');
  assert.equal(bad.status, 422);
  assert.match(await bad.text(), /role="alert"/); // 2.2.2

  const good = await formPost('/journeys/J4/authenticate', { principalSecret: 'secret-P1' }, '');
  assert.equal(good.status, 303);
  assert.match(good.headers.get('set-cookie') ?? '', /^principal=P1/);
});

test('5.1.2: the principal gives scoped, time-bounded authority, and is notified', async () => {
  const r = await formPost('/journeys/J4/steps/give', {
    agentId: 'agent-new', journeys: 'J1,J2,J3', actions: 'CA-1,CA-2,CA-3a,CA-3b', validTo: '2026-12-31',
  });
  assert.equal(r.status, 201);
  const body = await r.text();
  const delegationId = /authority is <strong>(DLG-\d{8})<\/strong>/.exec(body)?.[1];
  assert.ok(delegationId, 'a delegation was issued');

  const inbox = await (await fetch(`${base}/api/notifications`, { headers: { 'x-principal-secret': 'secret-P1' } })).json() as any;
  const n = inbox.notifications.find((x: any) => x.actionId === 'CA-4a');
  assert.match(n.message, /You gave agent-new authority to act for you until 2026-12-31/);

  // The new delegation is real, scoped and time-bounded.
  const list = await (await fetch(`${base}/api/delegations`, { headers: { 'x-principal-secret': 'secret-P1' } })).json() as any;
  const issued = list.delegations.find((d: any) => d.id === delegationId);
  assert.equal(issued.agentId, 'agent-new');
  assert.deepEqual(issued.scope.actions, ['CA-1', 'CA-2', 'CA-3a', 'CA-3b']);
  assert.equal(issued.validTo, '2026-12-31T23:59:59Z');
});

test('the power to delegate is not delegable — even the principal cannot confer it', async () => {
  const r = await formPost('/journeys/J4/steps/give', {
    agentId: 'agent-greedy', journeys: 'J1', actions: 'CA-4a', validTo: '2026-12-31',
  });
  // The field's enum refuses it first, with an accessible error naming what is
  // allowed (2.2.2). The ACTION_NOT_DELEGABLE guard behind it is defence in
  // depth for a client that is not this form, and is unreachable from here.
  assert.equal(r.status, 422);
  const body = await r.text();
  assert.match(body, /role="alert"/);
  assert.match(body, /Provide one of: CA-1, CA-2, CA-3a, CA-3b/);
  assert.doesNotMatch(body, /CA-4a<\/option>/, 'the option is not offered');
});

test('5.1.2: the journey validates like any Level A form — missing end date is caught and associated', async () => {
  const r = await formPost('/journeys/J4/steps/give', { agentId: 'a', journeys: 'J1', actions: 'CA-1' });
  assert.equal(r.status, 422);
  const body = await r.text();
  assert.match(body, /role="alert"/);
  assert.match(body, /href="#validTo"/);   // anchored to the control (2.2.2)
  assert.match(body, /aria-invalid="true"/);
});

test('5.1.2 / 5.5.1: the principal revokes through the journey, and it bites immediately', async () => {
  const give = await formPost('/journeys/J4/steps/give', { agentId: 'agent-doomed', journeys: 'J3', actions: 'CA-3a', validTo: '2026-12-31' });
  const delegationId = /authority is <strong>(DLG-\d{8})<\/strong>/.exec(await give.text())?.[1]!;

  const before = await fetch(`${base}/api/journeys/J3/steps/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'sid=j4-rev', 'x-agent-id': 'agent-doomed', 'x-delegation-id': delegationId },
    body: JSON.stringify({ values: { email: 'ok@example.net' } }),
  });
  assert.equal(before.status, 201);

  const revoke = await formPost('/journeys/J4/steps/control', { delegationId, change: 'revoke' });
  assert.equal(revoke.status, 200);
  assert.match(await revoke.text(), /now <strong>revoked<\/strong>/);

  const after = await fetch(`${base}/api/journeys/J3/steps/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'sid=j4-rev2', 'x-agent-id': 'agent-doomed', 'x-delegation-id': delegationId },
    body: JSON.stringify({ values: { email: 'nope@example.net' } }),
  });
  assert.equal(after.status, 403);
  assert.equal(((await after.json()) as any).error.code, 'DELEGATION_REVOKED');
});

test('5.5.1: revocation through the journey is terminal', async () => {
  const give = await formPost('/journeys/J4/steps/give', { agentId: 'agent-term', journeys: 'J3', actions: 'CA-3a', validTo: '2026-12-31' });
  const delegationId = /authority is <strong>(DLG-\d{8})<\/strong>/.exec(await give.text())?.[1]!;
  await formPost('/journeys/J4/steps/control', { delegationId, change: 'revoke' });
  const r = await formPost('/journeys/J4/steps/control', { delegationId, change: 'reinstate' });
  assert.equal(r.status, 409);
  assert.match(await r.text(), /Revoking is permanent/);
});
