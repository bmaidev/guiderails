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
 * Boots both builds and drives them through the HUMAN interface.
 *
 * The human path is the only apples-to-apples comparison: the agent path
 * diverges by design (B-07 removes delegation and confirmation from the
 * baseline entirely), so comparing agent journeys would measure the catalogued
 * divergence rather than test for undeclared ones.
 */

import type http from 'node:http';
import { createFixtureServer } from '../../conformant/src/server.ts';
import { Store } from '../../conformant/src/store.ts';
import { createBaselineServer, challengeDigits } from '../../baseline/src/server.ts';
import { BaselineStore } from '../../baseline/src/store.ts';

export type BuildName = 'conformant' | 'baseline';

export interface Build {
  name: BuildName;
  baseUrl: string;
  close(): Promise<void>;
}

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  return `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
}

export async function startBoth(): Promise<Record<BuildName, Build>> {
  const conformantServer = createFixtureServer(new Store());
  const baselineServer = createBaselineServer(new BaselineStore());
  const [conformantUrl, baselineUrl] = await Promise.all([listen(conformantServer), listen(baselineServer)]);
  return {
    conformant: { name: 'conformant', baseUrl: conformantUrl, close: () => new Promise((r) => conformantServer.close(() => r())) },
    baseline: { name: 'baseline', baseUrl: baselineUrl, close: () => new Promise((r) => baselineServer.close(() => r())) },
  };
}

const FORM = { 'content-type': 'application/x-www-form-urlencoded' };

/** Post a journey step through the human interface. Returns the raw response. */
export async function postStep(
  build: Build,
  sid: string,
  journey: string,
  step: string,
  values: Record<string, string>,
): Promise<Response> {
  const body = new URLSearchParams(values).toString();
  return fetch(`${build.baseUrl}/journeys/${journey}/steps/${step}`, {
    method: 'POST',
    headers: { ...FORM, cookie: `sid=${sid}` },
    body,
    redirect: 'manual',
  });
}

/**
 * Did the service ACCEPT this step's values? Normalised across builds: the
 * conformant build answers 303/201 and rejects with 422; the baseline answers
 * 303 and re-renders the form with a banner on rejection (B-08). Comparing raw
 * status codes would measure B-08; comparing acceptance is the parity question.
 */
export async function stepAccepted(build: Build, sid: string, journey: string, step: string, values: Record<string, string>): Promise<boolean> {
  const res = await postStep(build, sid, journey, step, values);
  if (res.status === 303) return true;
  if (res.status === 201) return true;
  if (res.status === 422 || res.status === 403) return false;
  // Baseline re-renders the form (HTTP 200) when it rejects.
  const text = await res.text();
  if (/is not valid|did not match|incomplete/i.test(text)) return false;
  return /Your reference is/.test(text);
}

/** Consequential submit through the human path, satisfying each build's own gate. */
export async function submit(build: Build, sid: string, journey: string, step: string, values: Record<string, string>): Promise<Response> {
  const withGate = build.name === 'baseline'
    ? { ...values, challenge: challengeDigits(sid) } // B-05
    : values; // conformant: the human's own declaration is the confirmation
  return postStep(build, sid, journey, step, withGate);
}

export interface Effect {
  actionId?: string;
  reference: string;
  values: Record<string, unknown>;
}

export async function effects(build: Build): Promise<Effect[]> {
  const r = await fetch(`${build.baseUrl}/api/_fixture/claims`);
  return (await r.json()) as Effect[];
}

/** The V1 applicant (FIXTURE-SPEC §2 test vectors): eligible, base threshold. */
export const V1_APPLICANT: Record<string, Record<string, string>> = {
  identity: { fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001' },
  circumstances: { residentSince: '2018-02-05', fortnightlyIncome: '950', courseProvider: 'Ridgeline TAFE', courseName: 'Certificate III in Horticulture', courseWeeks: '26', studyLoadEFT: '1.0', enrolmentStatus: 'enrolled' },
  evidence: { enrolmentDocument: 'enrolment-confirmation.pdf', incomeDeclared: 'on' },
  review: {},
};

/** A second, different applicant — same journey, same session. */
export const V2_APPLICANT: Record<string, Record<string, string>> = {
  identity: { fullName: 'Mina Kovac', dateOfBirth: '2006-11-02', email: 'mina@example.com', mobile: '0400000002' },
  circumstances: { residentSince: '2023-08-21', fortnightlyIncome: '1500', courseProvider: 'Harbourline Institute', courseName: 'Certificate IV in Cyber Security', courseWeeks: '12', studyLoadEFT: '0.8', enrolmentStatus: 'enrolled' },
  evidence: { enrolmentDocument: 'enrolment-confirmation.pdf', incomeDeclared: 'on' },
  review: {},
};

/** Complete J1 for an applicant through the human path. Returns the submit response. */
export async function completeJ1(build: Build, sid: string, applicant: Record<string, Record<string, string>>): Promise<Response> {
  for (const step of ['identity', 'circumstances', 'evidence', 'review']) {
    const res = await postStep(build, sid, 'J1', step, applicant[step]);
    if (res.status !== 303) throw new Error(`${build.name}: step ${step} did not advance (${res.status})`);
  }
  return submit(build, sid, 'J1', 'submit', { declaration: 'on' });
}
