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
import { J1_FIELDS, J1_SPEC, J2_SPEC } from '../../../conformant/src/journeys.ts';
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

// ---- Layer 1: journey-state, receipt, attribution, parity, third-party ----

const J2 = J2_SPEC;
const j2Progress = { completedSteps: ['period'], consequentialEvents: [] };

test('2.4.1 passes when the rail exposes current/remaining/kind/prerequisites, fails when it does not', () => {
  // period done, report is current (its prereq period is satisfied), declare is
  // remaining/consequential with an unsatisfied prerequisite (report).
  const rail =
    '<nav data-gr-journey-state data-gr-current="report">' +
    '<span data-gr-step="period" data-gr-step-status="done" data-gr-step-kind="safe"></span>' +
    '<span data-gr-step="report" data-gr-step-status="doing" data-gr-step-kind="safe"></span>' +
    '<span data-gr-step="declare" data-gr-step-status="todo" data-gr-step-kind="consequential" data-gr-step-requires="report"></span>' +
    '</nav>';
  const p: GuiderailsParameters = { fields: [], journeySpec: J2, journeyProgress: j2Progress, criteria: ['2.4.1'] };
  ok(checkStory(render(rail), p).pass, '2.4.1 should pass a faithful rail');

  const wrongCurrent = rail.replace('data-gr-current="report"', 'data-gr-current="declare"');
  ok(!checkStory(render(wrongCurrent), p).pass, 'wrong current step must fail');

  const wrongKind = rail.replace('data-gr-step="declare" data-gr-step-status="todo" data-gr-step-kind="consequential"', 'data-gr-step="declare" data-gr-step-status="todo" data-gr-step-kind="safe"');
  ok(!checkStory(render(wrongKind), p).pass, 'a consequential step mislabelled safe must fail');
});

test('2.4.2 passes when the receipt states occurrence, reference and time; fails when the reference is attribute-only', () => {
  const receipt = { stepId: 'declare', actionId: 'CA-2', at: '2026-07-14T02:00:00Z', reference: 'SSP-REP-0001' };
  const p: GuiderailsParameters = { fields: [], receipt, criteria: ['2.4.2'] };
  const good = `<div data-gr-receipt data-gr-occurred="true" data-gr-action="CA-2" data-gr-reference="SSP-REP-0001" data-gr-at="2026-07-14T02:00:00Z">Report lodged. Reference SSP-REP-0001.</div>`;
  ok(checkStory(render(good), p).pass, '2.4.2 should pass a complete receipt');
  const hidden = good.replace('Report lodged. Reference SSP-REP-0001.', 'Report lodged.');
  ok(!checkStory(render(hidden), p).pass, 'a reference present only in an attribute must fail');
});

test('5.2.1 flags an agent-originated submission and its agent id', () => {
  const p: GuiderailsParameters = { fields: [], attribution: { agentOriginated: true, agentId: 'agent-ci' }, criteria: ['5.2.1'] };
  const good = '<p data-gr-attribution="agent" data-gr-agent-id="agent-ci">Submitted by an agent (agent-ci) on your behalf.</p>';
  ok(checkStory(render(good), p).pass, '5.2.1 should pass a flagged record');
  const unflagged = '<p>Submitted.</p>';
  ok(!checkStory(render(unflagged), p).pass, 'an unflagged agent submission must fail');
});

test('5.6.2 fails when the human affordance and the agent view disagree with the step', () => {
  const declare = J2.steps.find((s) => s.id === 'declare')!;
  const ca2 = { id: 'CA-2', journeyId: 'J2', title: 'Lodge fortnightly report', confirmationDesignated: false };
  const p: GuiderailsParameters = { fields: [], journeyId: 'J2', step: declare, action: ca2, criteria: ['5.6.2'] };
  const agree = '<button data-gr-effect="consequential">Submit report</button><code data-gr-agent-view data-gr-destructive="true"></code>';
  ok(checkStory(render(agree), p).pass, 'agreeing surfaces pass 5.6.2');
  const contradict = '<button data-gr-effect="safe">Save draft</button><code data-gr-agent-view data-gr-destructive="true"></code>';
  ok(!checkStory(render(contradict), p).pass, 'a "safe"-marked affordance on a consequential step must fail');
});

test('5.6.3 requires third-party content to be programmatically distinct from operator content', () => {
  const p: GuiderailsParameters = { fields: [], thirdPartyContent: true, criteria: ['5.6.3'] };
  const good = '<section data-gr-origin="operator">Official guidance.</section><aside data-gr-origin="third-party">Provider note: classes start Monday.</aside>';
  ok(checkStory(render(good), p).pass, '5.6.3 should pass distinguished content');
  const undistinguished = '<section>Official guidance.</section><aside>Provider note: classes start Monday.</aside>';
  ok(!checkStory(render(undistinguished), p).pass, 'unmarked third-party content must fail');
});

test('2.2.3 passes when name+state are programmatic, fails on colour-only invalidity', () => {
  const good = form('/x', identityFields, {}, [], 'Go');
  ok(checkStory(render(good), { fields: identityFields, criteria: ['2.2.3'] }).pass, '2.2.3 passes a programmatically-labelled form');
  // A control marked invalid with no associated error text signals by colour alone.
  const colourOnly = render('<label for="email">Email</label><input name="email" id="email" required aria-required="true" aria-invalid="true">');
  ok(!checkStory(colourOnly, { fields: [identityFields.find((f) => f.name === 'email')!], criteria: ['2.2.3'] }).pass, 'colour-only invalidity must fail 2.2.3');
});
