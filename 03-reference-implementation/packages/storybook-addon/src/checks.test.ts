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
 * The check engine, tested against the *real HTML the conformant fixture ships*.
 * That is the dogfood: the same form() output the human sees is fed to the
 * parity oracle, so a pass here means an agent reading that surface finds the
 * machine meaning the spec declares. jsdom stands in for the browser DOM the
 * Storybook test-runner would supply.
 */

import { ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { form } from '../../../conformant/src/html.ts';
import { J1_FIELDS, J1_SPEC } from '../../../conformant/src/journeys.ts';
import { CA_REGISTER } from '../../../conformant/src/j1.ts';
import { checkStory, type DomElement } from './checks.ts';
import type { GuiderailsParameters } from './parameters.ts';

/** Render a fixture form and hand its root back as the DOM the engine sees. */
function render(html: string): DomElement {
  return new JSDOM(`<!doctype html><body>${html}</body>`).window.document.body as unknown as DomElement;
}

const identityFields = J1_FIELDS.identity;
const identityStep = J1_SPEC.steps.find((s) => s.id === 'identity')!;
const submitStep = J1_SPEC.steps.find((s) => s.id === 'submit')!;
const ca1 = CA_REGISTER.find((a) => a.id === 'CA-1');

const identityParams: GuiderailsParameters = {
  fields: identityFields, journeyId: 'J1', step: identityStep, criteria: ['2.2.1', '3.1.1', '3.4.3'],
};

test('the fixture\'s own identity form passes 2.2.1, 3.1.1, 3.4.3', () => {
  const root = render(form('/api/journeys/J1/steps/identity', identityFields, {}, [], 'Continue'));
  const report = checkStory(root, identityParams);
  ok(report.pass, `expected pass, failures: ${JSON.stringify(report.results.flatMap((r) => r.failures))}`);
  strictEqual(report.results.find((r) => r.criterion === '2.2.1')!.pass, true);
  strictEqual(report.results.find((r) => r.criterion === '3.1.1')!.pass, true);
});

test('2.2.1 fails when a required field renders without an accessible name', () => {
  const root = render('<input name="fullName" id="fullName" required aria-required="true">');
  const report = checkStory(root, { fields: identityFields.filter((f) => f.name === 'fullName'), criteria: ['2.2.1'] });
  strictEqual(report.pass, false);
  ok(report.results[0].failures.some((f) => /accessible name/.test(f)));
});

test('3.1.1 is a parity oracle: an undeclared control fails, a missing one fails', () => {
  const extra = render(form('/x', identityFields, {}, [], 'Go') + '<input name="ssn" id="ssn">');
  strictEqual(checkStory(extra, { fields: identityFields, journeyId: 'J1', step: identityStep, criteria: ['3.1.1'] }).pass, false);

  const missing = render('<label for="fullName">Full name</label><input name="fullName" id="fullName">');
  const rep = checkStory(missing, { fields: identityFields, journeyId: 'J1', step: identityStep, criteria: ['3.1.1'] });
  strictEqual(rep.pass, false);
  ok(rep.results[0].failures.some((f) => /not rendered/.test(f)));
});

test('2.2.2 is applicable only when an error is rendered, and checks the described-by error node', () => {
  const clean = render(form('/x', identityFields, {}, [], 'Go'));
  const cleanReport = checkStory(clean, { fields: identityFields, criteria: ['2.2.2'] });
  strictEqual(cleanReport.results[0].applicable, false);
  strictEqual(cleanReport.pass, true);

  const withError = render(form('/x', identityFields, {}, [{ field: 'email', constraint: 'format', message: 'Enter a valid email.', remediation: 'e.g. name@example.com' }], 'Go'));
  const errReport = checkStory(withError, { fields: identityFields, criteria: ['2.2.2'] });
  strictEqual(errReport.results[0].applicable, true);
  ok(errReport.results[0].pass, `2.2.2 should pass on the fixture's error markup: ${errReport.results[0].failures}`);

  const broken = render('<label for="email">Email</label><input name="email" id="email" aria-invalid="true">');
  strictEqual(checkStory(broken, { fields: identityFields.filter((f) => f.name === 'email'), criteria: ['2.2.2'] }).pass, false);
});

test('3.4.3: a consequential submit step is not read-only', () => {
  const root = render(form('/x', J1_FIELDS.submit, {}, [], 'Submit'));
  const report = checkStory(root, { fields: J1_FIELDS.submit, journeyId: 'J1', step: submitStep, action: ca1, criteria: ['3.4.3'] });
  ok(report.pass);
});

test('claiming a criterion the engine cannot check is itself a failure', () => {
  const report = checkStory(render('<div></div>'), { fields: [], criteria: ['5.1.1'] });
  strictEqual(report.pass, false);
  ok(report.results[0].failures.some((f) => /no per-story checker/.test(f)));
});

test('test mode is carried through for the wrapper to act on', () => {
  strictEqual(checkStory(render('<div></div>'), { fields: identityFields, criteria: ['2.2.1'], test: 'todo' }).mode, 'todo');
  strictEqual(checkStory(render('<div></div>'), { fields: identityFields, criteria: ['2.2.1'] }).mode, 'error');
});

test('the gate catches an agent-legibility regression a story would introduce', () => {
  // If a component stopped associating its label — a real regression — the story
  // that claims 2.2.1 must fail, exactly as an axe regression fails the a11y gate.
  const identityFields = J1_FIELDS.identity;
  const brokenLabelStripped = form('/x', identityFields, {}, [], 'Go')
    .replace(/<label[^>]*>[^<]*<\/label>/g, ''); // strip every label
  const root = render(brokenLabelStripped);
  const report = checkStory(root, { fields: identityFields, journeyId: 'J1', criteria: ['2.2.1'], test: 'error' });
  ok(!report.pass, 'a story that lost its labels must fail the 2.2.1 gate');
});
