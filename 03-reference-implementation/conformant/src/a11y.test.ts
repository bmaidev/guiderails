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
 * Criterion 2.1.1 (A) — the journey's human interface conforms to WCAG 2.2 AA —
 * demonstrated. This is the prerequisite criterion (MODEL.md §4, D-006), and
 * this file is the technique that enforces it.
 *
 * Automated WCAG checks (OI-2, first half): axe-core over every rendered
 * page state of the J1 journey, in jsdom. Violations fail the build
 * (CLAUDE.md engineering standards). Colour-contrast is excluded here —
 * jsdom does not render — and is carried by the recorded manual pass
 * (OI-2's second half), alongside everything else automation cannot see
 * (axe's own docs put automated coverage at roughly half of WCAG issues).
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { JSDOM } from 'jsdom';
import axe from 'axe-core';
import { createFixtureServer } from './server.ts';
import { Store } from './store.ts';

let server: http.Server;
let base: string;

before(async () => {
  const store = new Store();
  server = createFixtureServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => server.close());

async function axeViolations(html: string): Promise<string[]> {
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const win = dom.window as unknown as { eval(code: string): void; axe: typeof axe; document: Document };
  win.eval(axe.source);
  const results = await win.axe.run(win.document.documentElement, {
    rules: { 'color-contrast': { enabled: false } },
  });
  // Array.from: results come from the jsdom realm; rebuild as a host-realm array
  return Array.from(results.violations, (v) => `${v.id}: ${v.help} — ${v.nodes.map((n) => n.target.join(' ')).join('; ')}`);
}

const PAGES: Array<{ name: string; get: () => Promise<string> }> = [
  {
    name: 'identity step (clean)',
    get: async () => (await fetch(`${base}/journeys/J1/steps/identity`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'identity step (validation errors shown)',
    get: async () =>
      (
        await fetch(`${base}/journeys/J1/steps/identity`, {
          method: 'POST',
          headers: { cookie: 'sid=a11y', 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ fullName: 'Rowan Ashe', dateOfBirth: 'yesterday', email: 'nope', mobile: '1' }).toString(),
        })
      ).text(),
  },
  {
    name: 'circumstances step',
    get: async () => (await fetch(`${base}/journeys/J1/steps/circumstances`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'evidence step',
    get: async () => (await fetch(`${base}/journeys/J1/steps/evidence`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'review step',
    get: async () => (await fetch(`${base}/journeys/J1/steps/review`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'submit step',
    get: async () => (await fetch(`${base}/journeys/J1/steps/submit`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'J2 period step',
    get: async () => (await fetch(`${base}/journeys/J2/steps/period`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'J2 report step',
    get: async () => (await fetch(`${base}/journeys/J2/steps/report`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'J3 contact step',
    get: async () => (await fetch(`${base}/journeys/J3/steps/contact`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    name: 'J3 payment step',
    get: async () => (await fetch(`${base}/journeys/J3/steps/payment`, { headers: { cookie: 'sid=a11y' } })).text(),
  },
  {
    // 5.1.2 requires the revocation journey to itself conform at Level A.
    name: 'J4 sign-in (unauthenticated)',
    get: async () => (await fetch(`${base}/journeys/J4/steps/authority`)).text(),
  },
  {
    name: 'J4 authority list',
    get: async () => (await fetch(`${base}/journeys/J4/steps/authority`, { headers: { cookie: 'principal=P-A11Y' } })).text(),
  },
  {
    name: 'J4 give authority',
    get: async () => (await fetch(`${base}/journeys/J4/steps/give`, { headers: { cookie: 'principal=P-A11Y' } })).text(),
  },
  {
    name: 'J4 control authority',
    get: async () => (await fetch(`${base}/journeys/J4/steps/control`, { headers: { cookie: 'principal=P-A11Y' } })).text(),
  },
];

for (const p of PAGES) {
  test(`axe: ${p.name} has no violations (colour-contrast deferred to manual pass)`, async () => {
    const violations = await axeViolations(await p.get());
    assert.deepEqual(violations, [], violations.join('\n'));
  });
}
