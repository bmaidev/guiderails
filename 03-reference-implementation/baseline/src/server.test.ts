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
import { createBaselineServer, challengeDigits, SESSION_TIMEOUT_MS } from './server.ts';
import { BaselineStore } from './store.ts';

let server: http.Server;
let store: BaselineStore;
let base: string;
let clock = Date.now();

before(async () => {
  store = new BaselineStore(() => clock);
  server = createBaselineServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => server.close());

const FORM = { 'content-type': 'application/x-www-form-urlencoded' };
const VALUES: Record<string, Record<string, string>> = {
  identity: { fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001' },
  circumstances: { residentSince: '2018-02-05', fortnightlyIncome: '950', courseProvider: 'Ridgeline TAFE', courseName: 'Certificate III in Horticulture', courseWeeks: '26', studyLoadEFT: '1.0', enrolmentStatus: 'enrolled' },
  evidence: { enrolmentDocument: 'enrolment-confirmation.pdf', incomeDeclared: 'on' },
  review: {},
};

async function post(sid: string, step: string, values: Record<string, string>): Promise<Response> {
  return fetch(`${base}/journeys/J1/steps/${step}`, {
    method: 'POST', headers: { ...FORM, cookie: `sid=${sid}` },
    body: new URLSearchParams(values).toString(), redirect: 'manual',
  });
}

async function completeSafeSteps(sid: string): Promise<void> {
  for (const step of ['identity', 'circumstances', 'evidence', 'review']) {
    const r = await post(sid, step, VALUES[step]);
    assert.equal(r.status, 303, `safe step ${step}`);
  }
}

test('B-01: placeholder-only inputs, no labels, div-based submit control', async () => {
  const html = await (await fetch(`${base}/journeys/J1/steps/identity`, { headers: { cookie: 'sid=b01' } })).text();
  assert.doesNotMatch(html, /<label/);
  assert.match(html, /placeholder="Name"/);
  assert.match(html, /type="text" name="dateOfBirth"/); // date semantics stripped
  assert.match(html, /<div class="btn" onclick=/);
});

test('B-08: validation failure yields a generic unassociated banner, same underlying rules', async () => {
  const r = await post('b08', 'identity', { ...VALUES.identity, email: 'not-an-email' });
  const html = await r.text();
  assert.match(html, /Some of the information you entered is not valid/);
  assert.doesNotMatch(html, /role="alert"|aria-invalid|href="#email"/);
});

test('B-09/B-06/B-07: no state surface, no rules endpoint, no service description', async () => {
  for (const p of ['/api/journeys/J1/state', '/api/rules/ssp/determination', '/.well-known/guiderails.json']) {
    const r = await fetch(`${base}${p}`);
    assert.equal(r.status, 404, p);
  }
});

test('B-03: eligibility guidance is a PDF whose prose omits s11', async () => {
  const r = await fetch(`${base}/guidance.pdf`);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  const body = Buffer.from(await r.arrayBuffer()).toString('latin1');
  assert.match(body, /%PDF-1\.4/);
  assert.match(body, /under 22 and/); // s10 present
  assert.doesNotMatch(body, /104/); // s11's residency condition absent — the trap
});

test('B-05: submission blocked by the challenge; correct digits pass; claim issued without confirmation (B-07)', async () => {
  const sid = 'b05';
  await completeSafeSteps(sid);

  const wrong = await post(sid, 'submit', { declaration: 'on', challenge: '0000' });
  assert.match(await wrong.text(), /characters you entered did not match/);

  const right = await post(sid, 'submit', { declaration: 'on', challenge: challengeDigits(sid) });
  const html = await right.text();
  assert.match(html, /Your reference is SSP-\d{8}/);
  // B-07: the effect occurred with no confirmation event and no attribution anywhere in the log
  assert.equal(store.log.some((e) => e.type === 'effect'), true);
  assert.equal(store.log.some((e) => (e.type as string) === 'confirmation'), false);
});

test('parity: duplicate submission returns the original reference (not catalogued, so must match conformant)', async () => {
  const sid = 'b05'; // same applicant identity as previous test
  const again = await post(sid, 'submit', { declaration: 'on', challenge: challengeDigits(sid) });
  const html = await again.text();
  const ref = /Your reference is (SSP-\d{8})/.exec(html)?.[1];
  assert.equal(ref, store.claims[0].reference);
  assert.equal(store.claims.length, 1);
});

test('B-04/B-10: 15-minute silent expiry discards the draft; restart required', async () => {
  const sid = 'b04';
  await post(sid, 'identity', VALUES.identity);
  clock += SESSION_TIMEOUT_MS + 1000; // cross the undeclared boundary
  const r = await fetch(`${base}/journeys/J1/steps/circumstances`, { headers: { cookie: `sid=${sid}` } });
  assert.match(await r.text(), /Your session has expired/);
  const submitAttempt = await post(sid, 'submit', { declaration: 'on', challenge: challengeDigits(sid) });
  assert.match(await submitAttempt.text(), /application is incomplete/i);
});

test('parity: identical valid inputs are accepted end-to-end (V2 applicant, same field set as conformant)', async () => {
  const sid = 'parity-v2';
  await post(sid, 'identity', { fullName: 'Mina Kovac', dateOfBirth: '2006-11-02', email: 'mina@example.com', mobile: '0400000002' });
  const r = await post(sid, 'circumstances', { residentSince: '2023-08-21', fortnightlyIncome: '1500', courseProvider: 'Harbourline Institute', courseName: 'Certificate IV in Cyber Security', courseWeeks: '12', studyLoadEFT: '0.8', enrolmentStatus: 'enrolled' });
  assert.equal(r.status, 303); // same validation logic accepts the same values
});
