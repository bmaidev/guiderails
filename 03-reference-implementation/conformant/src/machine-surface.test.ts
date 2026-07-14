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
 * Layer 2 of the conformance-demo harness: validate the served machine surfaces
 * against the Principle 1–4 "surface" criteria — the artifacts an agent reads
 * before or instead of a rendered page. Each test names its criterion and
 * asserts the shape MODEL.md requires, against the running conformant service.
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

before(async () => {
  server = createFixtureServer(new Store());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  desc = await (await fetch(`${base}${SERVICE_DESC_PATH}`)).json();
});
after(() => server.close());

test('1.1.1: the service description states name, authority, purpose, entry point and standard claimed', () => {
  const s = desc.service;
  for (const key of ['name', 'administeringAuthority', 'purpose', 'canonicalEntryPoint']) {
    assert.ok(typeof s[key] === 'string' && s[key].length > 0, `service.${key} is required by 1.1.1`);
  }
  assert.equal(s.standardClaimed.standard, 'Guiderails');
  assert.ok(s.standardClaimed.version, '1.1.1: the claimed standard version is stated');
});

test('1.3.1: every machine surface carries a version and a last-modified date', async () => {
  assert.ok(desc.surface.version, '1.3.1: surface version');
  assert.ok(desc.surface.lastModified, '1.3.1: surface lastModified');
  const glossary = await (await fetch(`${base}/api/glossary`)).json();
  assert.ok(glossary.surface.version && glossary.surface.lastModified, '1.3.1: the glossary surface is versioned too');
});

test('1.4.1: planned outages are announced with start and end times', async () => {
  const status = await (await fetch(`${base}/api/status`)).json();
  assert.ok(Array.isArray(status.plannedOutages) && status.plannedOutages.length > 0, '1.4.1: a status surface lists planned outages');
  for (const o of status.plannedOutages) {
    assert.ok(Date.parse(o.start) && Date.parse(o.end), '1.4.1: each outage has parseable start and end times');
    assert.ok(Date.parse(o.end) >= Date.parse(o.start), '1.4.1: an outage ends no earlier than it starts');
  }
  assert.equal(desc.status.url, `${base}/api/status`, '1.4.1: the status surface is discoverable from the description');
});

test('2.3.1/2.3.2: glossary terms resolve to a definition, a legal source, and a stable id', () => {
  const terms = desc.glossary.terms;
  assert.ok(Array.isArray(terms) && terms.length > 0, '2.3.1: the glossary enumerates terms');
  for (const t of terms) {
    assert.ok(t.definition && t.definition.length > 0, `2.3.1: "${t.term}" has a definition`);
    assert.ok(t.legalSource?.instrument && t.legalSource?.provision, `2.3.1: "${t.term}" cites a legal source`);
    assert.ok(/^guiderails:/.test(t.id), `2.3.2: "${t.term}" has a stable, reusable id`);
  }
  const ids = terms.map((t: any) => t.id);
  assert.equal(new Set(ids).size, ids.length, '2.3.2: term ids are unique');
});

test('2.5.1/2.5.2: issued documents are accessible+machine-readable, and evidence rules are enumerated', () => {
  for (const doc of desc.documents.issued) {
    assert.ok(doc.accessible === true, `2.5.1: "${doc.title}" is available in an accessible format`);
    assert.ok(doc.formats.includes('json') || doc.formats.includes('html'), `2.5.1: "${doc.title}" has a machine-readable format`);
  }
  for (const ev of desc.documents.evidence) {
    assert.ok(Array.isArray(ev.acceptableFormats) && ev.acceptableFormats.length > 0, `2.5.2: "${ev.title}" states acceptable formats`);
    assert.ok(Array.isArray(ev.mustEstablish) && ev.mustEstablish.length > 0, `2.5.2: "${ev.title}" states the criteria it must satisfy`);
  }
});

test('3.1.2: every journey publishes a machine-readable workflow with order, dependencies and success criteria', () => {
  const workflows = desc.workflows;
  assert.ok(Array.isArray(workflows) && workflows.length >= 4, '3.1.2: a workflow per essential journey');
  for (const w of workflows) {
    assert.ok(w.steps.every((s: any) => Number.isInteger(s.order)), `3.1.2: ${w.journey} steps declare order`);
    assert.ok(w.steps.every((s: any) => Array.isArray(s.requires)), `3.1.2: ${w.journey} steps declare dependencies`);
    assert.ok(typeof w.successCriterion === 'string' && w.successCriterion.length > 0, `3.1.2: ${w.journey} declares success criteria`);
  }
});

test('3.3.2: rate limits for authorised agents are published, sufficient, and use standard machinery', () => {
  const rl = desc.rateLimits.authorisedAgent;
  assert.ok(rl.requestsPerMinute > 0, '3.3.2: a published limit');
  assert.ok(rl.sufficientFor && /journey/i.test(rl.sufficientFor), '3.3.2: stated to be sufficient to complete a journey');
  assert.ok(rl.headers.includes('RateLimit-Limit'), '3.3.2: standard rate-limit headers');
});

test('4.1.2: prose eligibility guidance is flagged non-authoritative and names the authoritative channel', () => {
  const g = desc.rules.eligibilityGuidance;
  assert.equal(g.authoritative, false, '4.1.2: prose guidance is flagged non-authoritative');
  assert.equal(g.authoritativeChannel, desc.rules.determination, '4.1.2: it points to the determination endpoint');
});

test('4.4.2: the rules changelog states effective dates and whether published in advance', async () => {
  const cl = await (await fetch(`${base}/api/rules/ssp/changelog`)).json();
  assert.ok(Array.isArray(cl.changes) && cl.changes.length > 0, '4.4.2: the changelog enumerates changes');
  for (const c of cl.changes) {
    assert.ok(Date.parse(c.effectiveDate), '4.4.2: each change states an effective date');
    assert.equal(typeof c.publishedInAdvance, 'boolean', '4.4.2: each change states whether it was published in advance');
  }
});

test('4.5.1: a determination is labelled binding or indicative and states what would make it binding', async () => {
  const r = await fetch(`${base}/api/rules/ssp/determination`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ circumstances: { ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, courseWeeks: 12, enrolmentStatus: 'offer', fortnightlyIncome: 1500 } }),
  });
  const d = await r.json();
  assert.ok(['binding', 'indicative'].includes(d.determinationStatus), '4.5.1: the determination is labelled binding or indicative');
  if (d.determinationStatus === 'indicative') assert.ok(d.bindingCondition && d.bindingCondition.length > 0, '4.5.1: an indicative determination states what would make it binding');
});
