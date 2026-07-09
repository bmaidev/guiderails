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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formJsonSchema,
  htmlControl,
  validateValues,
  type FieldSpec,
  journeyState,
  safeSteps,
  JourneySpecError,
  type JourneySpec,
  authoriseConsequentialAction,
  type ConsequentialActionSpec,
  type Delegation,
  ConfirmationTokenStore,
  DuplicateGuard,
} from './index.ts';

// ---- Fields (2.2.x, 3.1.1) ----

const INCOME: FieldSpec = {
  name: 'fortnightlyIncome',
  label: 'Assessable fortnightly income',
  dataType: 'money',
  required: true,
  description: 'Your assessable income for the fortnight, in dollars.',
  autocomplete: 'off',
};
const EMAIL_FIELD: FieldSpec = { name: 'email', label: 'Email address', dataType: 'email', required: true, autocomplete: 'email' };
const ENROLMENT: FieldSpec = {
  name: 'enrolmentStatus',
  label: 'Enrolment status',
  dataType: 'enum',
  required: true,
  constraints: { enumValues: ['enrolled', 'offer'] },
};

test('formJsonSchema publishes name, type, required and constraints (3.1.1)', () => {
  const schema = formJsonSchema('j1-step2', 'Circumstances', [INCOME, ENROLMENT]) as Record<string, any>;
  assert.equal(schema.type, 'object');
  assert.deepEqual(schema.required, ['fortnightlyIncome', 'enrolmentStatus']);
  assert.equal(schema.properties.fortnightlyIncome.type, 'number');
  assert.equal(schema.properties.fortnightlyIncome.multipleOf, 0.01);
  assert.deepEqual(schema.properties.enrolmentStatus.enum, ['enrolled', 'offer']);
  assert.equal(schema.additionalProperties, false);
});

test('htmlControl carries the same semantics programmatically (2.2.1)', () => {
  const money = htmlControl(INCOME);
  assert.equal(money.element, 'input');
  assert.equal(money.attributes.inputmode, 'decimal');
  assert.equal(money.attributes.required, true);
  assert.equal(money.attributes['aria-describedby'], 'fortnightlyIncome-description');
  const email = htmlControl(EMAIL_FIELD);
  assert.equal(email.attributes.type, 'email');
  assert.equal(email.attributes.autocomplete, 'email');
  assert.equal(htmlControl(ENROLMENT).element, 'select');
});

test('validateValues: errors state the failed constraint and accepted remediation (2.2.2)', () => {
  const errors = validateValues([INCOME, EMAIL_FIELD, ENROLMENT], {
    fortnightlyIncome: '1,500 dollars per fortnight', // T2's induced error
    email: 'mina.kovac@example',
    enrolmentStatus: 'maybe',
  });
  assert.equal(errors.length, 3);
  const income = errors.find((e) => e.field === 'fortnightlyIncome');
  assert.equal(income?.constraint, 'type');
  assert.match(income?.remediation ?? '', /without currency symbols/);
  assert.equal(errors.find((e) => e.field === 'email')?.constraint, 'format');
  const enrol = errors.find((e) => e.field === 'enrolmentStatus');
  assert.equal(enrol?.constraint, 'enum');
  assert.match(enrol?.remediation ?? '', /enrolled, offer/);
});

test('validateValues: required fields; valid values pass clean', () => {
  assert.equal(validateValues([INCOME], {}).length, 1);
  assert.equal(validateValues([INCOME], {})[0].constraint, 'required');
  assert.deepEqual(validateValues([INCOME, EMAIL_FIELD, ENROLMENT], {
    fortnightlyIncome: '1500',
    email: 'mina@example.com',
    enrolmentStatus: 'enrolled',
  }), []);
});

// ---- Journey state (2.4.x, 3.4.3) ----

const J1: JourneySpec = {
  id: 'J1',
  title: 'Apply for the Skills Support Payment',
  steps: [
    { id: 'identity', title: 'Identity and contact', kind: 'safe' },
    { id: 'circumstances', title: 'Circumstances', kind: 'safe', requires: ['identity'] },
    { id: 'evidence', title: 'Evidence upload', kind: 'safe', requires: ['circumstances'] },
    { id: 'review', title: 'Review', kind: 'safe', requires: ['evidence'] },
    { id: 'submit', title: 'Declaration and submit', kind: 'consequential', actionId: 'CA-1', requires: ['review'] },
  ],
};

test('journeyState exposes current step, remaining, unsatisfied prerequisites (2.4.1)', () => {
  const s = journeyState(J1, { completedSteps: ['identity'], consequentialEvents: [] });
  assert.equal(s.currentStep, 'circumstances');
  assert.deepEqual(s.remainingSteps, ['circumstances', 'evidence', 'review', 'submit']);
  assert.equal(s.consequentialActionOccurred, false);
  assert.deepEqual(s.safeSteps, ['identity', 'circumstances', 'evidence', 'review']);
  assert.deepEqual(
    s.prerequisitesUnsatisfied.find((p) => p.step === 'submit')?.missing,
    ['review'],
  );
});

test('journeyState reports consequential occurrence with time and reference (2.4.2)', () => {
  const s = journeyState(J1, {
    completedSteps: ['identity', 'circumstances', 'evidence', 'review', 'submit'],
    consequentialEvents: [{ stepId: 'submit', actionId: 'CA-1', at: '2026-07-09T03:00:00Z', reference: 'SSP-00000042' }],
  });
  assert.equal(s.consequentialActionOccurred, true);
  assert.equal(s.consequentialEvents[0].reference, 'SSP-00000042');
  assert.equal(s.currentStep, null);
});

test('spec validation: consequential steps must name an actionId; unknown requires rejected', () => {
  assert.throws(() => journeyState({ id: 'X', title: 'X', steps: [{ id: 'a', title: 'A', kind: 'consequential' }] }, { completedSteps: [], consequentialEvents: [] }), JourneySpecError);
  assert.throws(() => journeyState({ id: 'X', title: 'X', steps: [{ id: 'a', title: 'A', kind: 'safe', requires: ['nope'] }] }, { completedSteps: [], consequentialEvents: [] }), JourneySpecError);
  assert.deepEqual(safeSteps(J1), ['identity', 'circumstances', 'evidence', 'review']);
});

// ---- Accountability (5.1.x, 5.3.1, 5.5.x, 5.2.1) ----

const CA1: ConsequentialActionSpec = { id: 'CA-1', journeyId: 'J1', title: 'Submit claim', confirmationDesignated: true };
const CA2: ConsequentialActionSpec = { id: 'CA-2', journeyId: 'J2', title: 'Submit activity report', confirmationDesignated: false };

const DELEGATION: Delegation = {
  id: 'DLG-1',
  principalId: 'P1',
  agentId: 'agent-alpha',
  scope: { journeys: ['J1', 'J2'], actions: ['CA-1', 'CA-2'] },
  validFrom: '2026-07-01T00:00:00Z',
  validTo: '2026-08-01T00:00:00Z',
  status: 'active',
};
const NOW = '2026-07-09T03:00:00Z';

test('5.1.1: no delegation → safe, legible rejection', () => {
  const r = authoriseConsequentialAction({ action: CA1, agentId: 'agent-alpha', at: NOW });
  assert.equal(r.authorised, false);
  if (!r.authorised) assert.equal(r.reason.code, 'DELEGATION_MISSING');
});

test('5.3.1: designated action blocks without a confirmation (T6 conformant)', () => {
  const r = authoriseConsequentialAction({ action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW });
  assert.equal(r.authorised, false);
  if (!r.authorised) assert.equal(r.reason.code, 'CONFIRMATION_REQUIRED');
});

test('5.3.2: an in-session tick is never a confirmation, however well-formed', () => {
  const tokens = new ConfirmationTokenStore();
  const redeemConfirmation = (q: Parameters<typeof tokens.redeem>[0]) => tokens.redeem(q);

  // The agent asserts the right action, the right principal, the right time —
  // and has simply ticked a box in its own session. It confirms nothing.
  const ticked = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW, redeemConfirmation,
    confirmation: { actionId: 'CA-1', principalId: 'P1', at: NOW, channel: 'in-session' },
  });
  assert.equal(ticked.authorised, false);
  if (!ticked.authorised) assert.equal(ticked.reason.code, 'CONFIRMATION_NOT_PRINCIPAL_ATTRIBUTABLE');

  const selfMinted = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW, redeemConfirmation,
    confirmation: { actionId: 'CA-1', principalId: 'P1', at: NOW },
  });
  if (!selfMinted.authorised) assert.equal(selfMinted.reason.code, 'CONFIRMATION_NOT_PRINCIPAL_ATTRIBUTABLE');
});

test('5.3.2: a service that cannot verify confirmations fails closed', () => {
  const tokens = new ConfirmationTokenStore();
  const issued = tokens.issue('P1', 'CA-1', NOW);
  const r = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW,
    confirmation: { actionId: 'CA-1', principalId: 'P1', at: NOW, token: issued.token, channel: 'principal-channel' },
  });
  assert.equal(r.authorised, false);
  if (!r.authorised) assert.equal(r.reason.code, 'CONFIRMATION_NOT_PRINCIPAL_ATTRIBUTABLE');
});

test('5.3.1/5.3.2: a principal-issued token authorises once, with attribution and notification', () => {
  const tokens = new ConfirmationTokenStore();
  const redeemConfirmation = (q: Parameters<typeof tokens.redeem>[0]) => tokens.redeem(q);
  const issued = tokens.issue('P1', 'CA-1', NOW);
  const confirmation = { actionId: 'CA-1', principalId: 'P1', at: NOW, token: issued.token, channel: 'principal-channel' as const };

  const ok = authoriseConsequentialAction({ action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW, confirmation, redeemConfirmation });
  assert.equal(ok.authorised, true);
  if (ok.authorised) {
    assert.equal(ok.requiresNotification, true); // 5.5.2
    assert.deepEqual(ok.attribution, { agentOriginated: true, agentId: 'agent-alpha' }); // 5.2.1
  }

  // Replay is the obvious attack; the token is single-use.
  const replay = authoriseConsequentialAction({ action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW, confirmation, redeemConfirmation });
  assert.equal(replay.authorised, false);
  if (!replay.authorised) assert.equal(replay.reason.code, 'CONFIRMATION_ALREADY_USED');
});

test('5.3.2: a token issued to another principal, or for another action, is refused', () => {
  const tokens = new ConfirmationTokenStore();
  const redeemConfirmation = (q: Parameters<typeof tokens.redeem>[0]) => tokens.redeem(q);

  const otherPrincipal = tokens.issue('P2', 'CA-1', NOW);
  const wrongP = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW, redeemConfirmation,
    confirmation: { actionId: 'CA-1', principalId: 'P1', at: NOW, token: otherPrincipal.token, channel: 'principal-channel' },
  });
  if (!wrongP.authorised) assert.equal(wrongP.reason.code, 'CONFIRMATION_PRINCIPAL_MISMATCH');

  const otherAction = tokens.issue('P1', 'CA-3b', NOW);
  const wrongA = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW, redeemConfirmation,
    confirmation: { actionId: 'CA-1', principalId: 'P1', at: NOW, token: otherAction.token, channel: 'principal-channel' },
  });
  if (!wrongA.authorised) assert.equal(wrongA.reason.code, 'CONFIRMATION_ACTION_MISMATCH');

  const unknown = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW, redeemConfirmation,
    confirmation: { actionId: 'CA-1', principalId: 'P1', at: NOW, token: 'not-a-token', channel: 'principal-channel' },
  });
  if (!unknown.authorised) assert.equal(unknown.reason.code, 'CONFIRMATION_UNKNOWN');
});

test('5.3.2: an expired token is refused', () => {
  const tokens = new ConfirmationTokenStore(15);
  const redeemConfirmation = (q: Parameters<typeof tokens.redeem>[0]) => tokens.redeem(q);
  const issued = tokens.issue('P1', 'CA-1', '2026-07-09T03:00:00Z');
  const r = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, at: '2026-07-09T03:16:00Z', redeemConfirmation,
    confirmation: { actionId: 'CA-1', principalId: 'P1', at: NOW, token: issued.token, channel: 'principal-channel' },
  });
  if (!r.authorised) assert.equal(r.reason.code, 'CONFIRMATION_EXPIRED');
});

test('non-designated action proceeds under a valid scoped delegation without confirmation (T6 contrast)', () => {
  const r = authoriseConsequentialAction({ action: CA2, agentId: 'agent-alpha', delegation: DELEGATION, at: NOW });
  assert.equal(r.authorised, true);
});

test('5.1.2 / 5.5.1: scope, time-bounds, revocation and suspension are enforced', () => {
  const outOfScope = authoriseConsequentialAction({
    action: { id: 'CA-3b', journeyId: 'J3', title: 'Update payment destination', confirmationDesignated: true },
    agentId: 'agent-alpha', delegation: DELEGATION, at: NOW,
  });
  if (!outOfScope.authorised) assert.equal(outOfScope.reason.code, 'SCOPE_JOURNEY');

  const revoked = authoriseConsequentialAction({
    action: CA2, agentId: 'agent-alpha', delegation: { ...DELEGATION, status: 'revoked' }, at: NOW,
  });
  if (!revoked.authorised) assert.equal(revoked.reason.code, 'DELEGATION_REVOKED');

  const suspended = authoriseConsequentialAction({
    action: CA2, agentId: 'agent-alpha', delegation: { ...DELEGATION, status: 'suspended' }, at: NOW,
  });
  if (!suspended.authorised) assert.equal(suspended.reason.code, 'DELEGATION_SUSPENDED');

  const expired = authoriseConsequentialAction({ action: CA2, agentId: 'agent-alpha', delegation: DELEGATION, at: '2026-08-02T00:00:00Z' });
  if (!expired.authorised) assert.equal(expired.reason.code, 'DELEGATION_EXPIRED');

  const early = authoriseConsequentialAction({ action: CA2, agentId: 'agent-alpha', delegation: DELEGATION, at: '2026-06-30T00:00:00Z' });
  if (!early.authorised) assert.equal(early.reason.code, 'DELEGATION_NOT_YET_VALID');

  const wrongAgent = authoriseConsequentialAction({ action: CA2, agentId: 'agent-beta', delegation: DELEGATION, at: NOW });
  if (!wrongAgent.authorised) assert.equal(wrongAgent.reason.code, 'AGENT_MISMATCH');
});

// ---- Duplicate protection (3.4.1) ----

test('DuplicateGuard: repeat key creates no new effect and identifies the original (T7)', () => {
  const guard = new DuplicateGuard();
  let executions = 0;
  const effect = () => {
    executions += 1;
    return { reference: `SSP-0000000${executions}`, at: NOW };
  };
  const first = guard.execute('P1:CA-1', effect);
  const second = guard.execute('P1:CA-1', effect);
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.record.reference, 'SSP-00000001');
  assert.equal(executions, 1);
  assert.equal(guard.execute('P1:CA-2', effect).duplicate, false);
});

// ---- Integration: J1 submit wired end-to-end as the conformant build will ----

test('integration: designated submit requires confirmation, then duplicates return the original reference', () => {
  const guard = new DuplicateGuard();
  const tokens = new ConfirmationTokenStore();
  const issued = tokens.issue('P1', 'CA-1', NOW);
  const confirmation = { actionId: 'CA-1', principalId: 'P1', at: NOW, token: issued.token, channel: 'principal-channel' as const };

  const auth = authoriseConsequentialAction({
    action: CA1, agentId: 'agent-alpha', delegation: DELEGATION, confirmation, at: NOW,
    redeemConfirmation: (q) => tokens.redeem(q),
  });
  assert.equal(auth.authorised, true);

  const submit = () => guard.execute('P1:CA-1', () => ({ reference: 'SSP-00000042', at: NOW }));
  const first = submit();
  const retry = submit();
  assert.equal(retry.duplicate, true);
  assert.equal(retry.record.reference, first.record.reference);

  const state = journeyState(J1, {
    completedSteps: ['identity', 'circumstances', 'evidence', 'review', 'submit'],
    consequentialEvents: [{ stepId: 'submit', actionId: 'CA-1', at: NOW, reference: first.record.reference }],
  });
  assert.equal(state.consequentialActionOccurred, true);
  assert.equal(state.consequentialEvents[0].reference, 'SSP-00000042');
});
