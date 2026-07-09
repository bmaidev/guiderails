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
import { createBaselineServer, challengeDigits } from './server.ts';
import { BaselineStore } from './store.ts';

let server: http.Server;
let store: BaselineStore;
let base: string;

before(async () => {
  store = new BaselineStore();
  server = createBaselineServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => server.close());

async function post(sid: string, jid: string, step: string, values: Record<string, string>): Promise<Response> {
  return fetch(`${base}/journeys/${jid}/steps/${step}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: `sid=${sid}` },
    body: new URLSearchParams(values).toString(),
    redirect: 'manual',
  });
}

test('J2 baseline: same journey completes via HTML; effect occurs with no confirmation anywhere (B-07)', async () => {
  const sid = 'j2b';
  await post(sid, 'J2', 'period', {});
  const r = await post(sid, 'J2', 'report', { incomeForPeriod: '1480', attendance: 'attended' });
  assert.equal(r.status, 303);
  const submit = await post(sid, 'J2', 'declare', { declaration: 'on', challenge: challengeDigits(sid) });
  const html = await submit.text();
  assert.match(html, /Your reference is SSPR-\d{8}/);
  assert.equal(store.log.some((e) => (e.type as string) === 'confirmation'), false);
});

test('J3 baseline: payment destination changes for whoever posts — no delegation, no confirmation (B-07, T6/CA-3b exposure)', async () => {
  const sid = 'j3b';
  const r = await post(sid, 'J3', 'payment', {
    bsb: '123-456', accountNumber: '12345678', accountName: 'R Ashe', challenge: challengeDigits(sid),
  });
  const html = await r.text();
  assert.match(html, /Your reference is SSPU-\d{8}/); // executed: the fraud-salient action needed nothing
  const effect = store.claims.find((c) => c.actionId === 'CA-3b');
  assert.ok(effect);
});

test('B-09 extends to J2: no period machine surface; due date exists only as prose without timezone', async () => {
  const r = await fetch(`${base}/api/journeys/J2/period`);
  assert.equal(r.status, 404);
  const pageText = await (await fetch(`${base}/journeys/J2/steps/period`, { headers: { cookie: 'sid=j2p' } })).text();
  assert.match(pageText, /Don't be late/);
  assert.doesNotMatch(pageText, /Australia\/Canberra/);
});

test('parity: J2 duplicate report for the same period returns the original reference', async () => {
  const sid = 'j2dup';
  await post(sid, 'J2', 'period', {});
  await post(sid, 'J2', 'report', { incomeForPeriod: '900', attendance: 'attended' });
  const first = await (await post(sid, 'J2', 'declare', { declaration: 'on', challenge: challengeDigits(sid) })).text();
  const again = await (await post(sid, 'J2', 'declare', { declaration: 'on', challenge: challengeDigits(sid) })).text();
  const ref = (h: string) => /Your reference is (SSPR-\d{8})/.exec(h)?.[1];
  assert.equal(ref(first), ref(again));
});
