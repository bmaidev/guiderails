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
 * Layer 3 of the conformance-demo harness: behavioural scenarios that need the
 * running service — state, time and side effects — closing the criteria a static
 * render or artifact cannot decide: tool-contract stability (3.2.1), no
 * challenge-gating (3.3.1), prefill of held data (3.5.1), single structured
 * submission (3.5.2), rule-path enumeration (4.3.1), past-date determination
 * (4.4.1), rule-change subscription (4.4.3), principal-only enforcement (5.3.3),
 * and review-before-execute (5.5.3). Each test names its criterion. Fictional
 * (D-009): the seeded principal, agent and delegations are invented.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { createFixtureServer } from './server.ts';
import { SERVICE_DESC_PATH } from './html.ts';
import { Store } from './store.ts';

let server: http.Server;
let base: string;
let desc: any;

const DLG_N = { id: 'DLG-N', principalId: 'P1', agentId: 'agent-alpha', scope: { journeys: ['J1', 'J2', 'J3'], actions: ['CA-1', 'CA-2', 'CA-3a', 'CA-3b'] }, validFrom: '2026-01-01T00:00:00Z', validTo: '2027-01-01T00:00:00Z', status: 'active' as const };
const DLG_R = { ...DLG_N, id: 'DLG-R', agentId: 'agent-beta', reviewBeforeExecute: true };

before(async () => {
  const store = new Store();
  store.addDelegation(DLG_N);
  store.addDelegation(DLG_R);
  // 3.5.1: information the service already holds for the principal.
  store.effects.push({ journeyId: 'J1', actionId: 'CA-1', reference: 'SSP-CLM-0001', principalId: 'P1', values: { email: 'jaya@example.com', fullName: 'Jaya Example' }, at: '2026-07-01T00:00:00Z', attribution: { agentOriginated: false } });
  server = createFixtureServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  desc = await (await fetch(`${base}${SERVICE_DESC_PATH}`)).json();
});
after(() => server.close());

test('3.2.1: tool contracts declare a major version, a stability policy, and a deprecation notice period', () => {
  const tc = desc.toolContracts;
  assert.ok(Number.isInteger(tc.majorVersion), '3.2.1: a major version');
  assert.ok(tc.stabilityPolicy && /major/i.test(tc.stabilityPolicy), '3.2.1: a stability policy within the major version');
  assert.ok(tc.deprecationNoticePeriodDays >= 90, '3.2.1: a published deprecation notice period');
});

test('3.3.1: no essential journey step is gated by a challenge; every step is callable via a declared tool', async () => {
  const schema = await (await fetch(`${base}/api/journeys/J1/schema`)).json();
  for (const step of schema.steps) {
    assert.ok(step.endpoint && step.method, `3.3.1: step "${step.id}" is reachable by a declared tool`);
    assert.ok(!('challenge' in step) && !('captcha' in step), `3.3.1: step "${step.id}" is not challenge-gated`);
  }
  assert.ok(!JSON.stringify(desc).toLowerCase().includes('captcha'), '3.3.1: the service declares no CAPTCHA gate');
});

test('3.5.1: prefill returns information the service already holds, without submitting anything', async () => {
  const r = await fetch(`${base}/api/journeys/J1/prefill`, { headers: { 'x-delegation-id': 'DLG-N' } });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.prefill.email, 'jaya@example.com', '3.5.1: held email is offered for prefill');
  // Without a delegation the principal's held data is not returned.
  assert.equal((await fetch(`${base}/api/journeys/J1/prefill`)).status, 403, '3.5.1: prefill requires a delegation naming the principal');
});

test('3.5.2: a single structured submission is accepted when valid and validated against the schema when not', async () => {
  const good = await fetch(`${base}/api/journeys/J2/submit`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ values: { period: {}, report: { incomeForPeriod: 500, attendance: 'attended' }, declare: { declaration: true } } }),
  });
  assert.equal(good.status, 200, '3.5.2: a valid single structured submission is accepted');
  assert.equal((await good.json()).accepted, true);
  const bad = await fetch(`${base}/api/journeys/J2/submit`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ values: { period: {}, report: { attendance: 'attended' }, declare: {} } }),
  });
  assert.equal(bad.status, 422, '3.5.2: an invalid submission is rejected against the same schema');
  assert.ok((await bad.json()).errors.some((e: any) => e.step === 'declare'), '3.5.2: errors are per step');
});

test('4.3.1: a determination enumerates the rule path and inputs, in machine-readable and plain-language forms', async () => {
  const r = await fetch(`${base}/api/rules/ssp/determination`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ circumstances: { ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, courseWeeks: 12, enrolmentStatus: 'offer', fortnightlyIncome: 1500 } }),
  });
  const d = await r.json();
  assert.ok(Array.isArray(d.rulePath.sectionsApplied) && d.rulePath.sectionsApplied.length > 0, '4.3.1: the rule path is enumerated');
  assert.ok(d.rulePath.inputs && typeof d.rulePath.inputs === 'object', '4.3.1: the inputs are enumerated');
  assert.ok(typeof d.rulePath.plainLanguage === 'string' && d.rulePath.plainLanguage.length > 0, '4.3.1: a plain-language form');
});

test('4.4.1: the rules endpoint answers for a supplied past effective date', async () => {
  const past = desc.rules.instrument.commencement; // the earliest date the instrument applies
  const r = await fetch(`${base}/api/rules/ssp/determination`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ circumstances: { ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, courseWeeks: 12, enrolmentStatus: 'offer', fortnightlyIncome: 1500 }, effectiveDate: past }),
  });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.provenance.effectiveDateApplied, past, '4.4.1: the determination applies the supplied effective date');
});

test('4.4.3: a consumer can subscribe to rule-change notifications', async () => {
  const r = await fetch(`${base}/api/rules/ssp/subscribe`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ callbackUrl: 'https://agent.example/hooks/ssp-rules' }),
  });
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.ok(b.subscriptionId, '4.4.3: a subscription id is issued');
  assert.equal((await fetch(`${base}/api/rules/ssp/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callbackUrl: 'not-a-url' }) })).status, 422, '4.4.3: an invalid callback is rejected');
});

test('5.3.3: a principal-only action is refused to an agent whatever delegation is presented', async () => {
  const r = await fetch(`${base}/api/journeys/J4/steps/give`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-delegation-id': 'DLG-N', 'x-agent-id': 'agent-alpha' },
    body: JSON.stringify({ values: {} }),
  });
  assert.equal(r.status, 403, '5.3.3: the agent surface for J4 refuses');
  assert.equal((await r.json()).error.code, 'AGENT_MAY_NOT_EXECUTE');
  // The register marks the give/withdraw actions non-executable by any agent.
  const reg = desc.consequentialActionsRegister;
  assert.equal(reg.find((a: any) => a.id === 'CA-4a').agentExecutable, false, '5.3.3: designated principal-only in the register');
});

test('5.5.3: under a review-before-execute delegation, a consequential action queues instead of executing', async () => {
  const q = await fetch(`${base}/api/review-queue`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ delegationId: 'DLG-R', actionId: 'CA-1', values: { declaration: true } }),
  });
  assert.equal(q.status, 202, '5.5.3: the action is queued, not executed');
  const body = await q.json();
  assert.equal(body.status, 'awaiting-principal');
  const queue = await (await fetch(`${base}/api/review-queue`, { headers: { 'x-delegation-id': 'DLG-R' } })).json();
  assert.ok(queue.queue.some((e: any) => e.id === body.reviewId && e.status === 'awaiting-principal'), '5.5.3: it awaits the principal in the queue');
  // A normal delegation is not in review mode.
  const notReview = await fetch(`${base}/api/review-queue`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ delegationId: 'DLG-N', actionId: 'CA-1', values: {} }),
  });
  assert.equal(notReview.status, 409, '5.5.3: a non-review delegation does not queue');
});
