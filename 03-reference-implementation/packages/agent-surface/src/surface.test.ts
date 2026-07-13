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

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import {
  getControlAttributes,
  mergeAgentProps,
  getStepObligations,
  toModelContextTool,
  htmlControl,
  type FieldSpec,
  type StepSpec,
  type ConsequentialActionSpec,
} from './index.ts';

const EMAIL: FieldSpec = { name: 'email', label: 'Email', dataType: 'email', required: true, autocomplete: 'email' };
const NAME: FieldSpec = { name: 'fullName', label: 'Full name', dataType: 'text', required: true };

test('getControlAttributes is the htmlControl attribute bag — one source, so surfaces cannot diverge', () => {
  deepStrictEqual(getControlAttributes(EMAIL), htmlControl(EMAIL).attributes);
  const bag = getControlAttributes(EMAIL);
  strictEqual(bag.type, 'email');
  strictEqual(bag['aria-required'], 'true');
  strictEqual(bag.autocomplete, 'email');
});

test('mergeAgentProps: the agent bag wins on the semantics it owns, design system keeps the rest', () => {
  const dsProps = { className: 'agds-input', type: 'text', 'data-theme': 'gold' };
  const merged = mergeAgentProps(dsProps, getControlAttributes(EMAIL));
  strictEqual(merged.className, 'agds-input', 'styling is the design system\'s');
  strictEqual(merged['data-theme'], 'gold');
  strictEqual(merged.type, 'email', 'the semantic type is the standard\'s');
  strictEqual(merged['aria-required'], 'true');
});

test('mergeAgentProps chains handlers rather than dropping one', () => {
  const calls: string[] = [];
  const ds = { onFocus: () => calls.push('ds') };
  const bag = { onFocus: (() => calls.push('agent')) as unknown as string };
  const merged = mergeAgentProps(ds, bag);
  (merged.onFocus as unknown as () => void)();
  deepStrictEqual(calls, ['ds', 'agent'], 'design-system handler first, then the agent bag\'s');
});

const SUBMIT: StepSpec = { id: 'submit', title: 'Declaration and submit', kind: 'consequential', actionId: 'CA-1' };
const IDENTITY: StepSpec = { id: 'identity', title: 'Identity and contact', kind: 'safe' };
const CA1: ConsequentialActionSpec = { id: 'CA-1', journeyId: 'J1', title: 'Submit claim', confirmationDesignated: true };
const CA_PRINCIPAL_ONLY: ConsequentialActionSpec = { id: 'CA-4a', journeyId: 'J4', title: 'Give authority', confirmationDesignated: true, agentExecutable: false };

test('getStepObligations reflects the register: designation and executability', () => {
  strictEqual(getStepObligations(SUBMIT, CA1).confirmationDesignated, true);
  strictEqual(getStepObligations(SUBMIT, CA1).agentExecutable, true);
  strictEqual(getStepObligations(IDENTITY).kind, 'safe');
  strictEqual(getStepObligations(IDENTITY).confirmationDesignated, false);
  strictEqual(getStepObligations(SUBMIT, CA_PRINCIPAL_ONLY).agentExecutable, false);
});

test('toModelContextTool: a safe step is read-only with no confirmation hint', () => {
  const tool = toModelContextTool('J1', IDENTITY, [NAME, EMAIL]);
  strictEqual(tool.name, 'j1.identity');
  strictEqual(tool.annotations.readOnlyHint, true);
  strictEqual(tool.annotations.destructiveHint, false);
  strictEqual(tool.annotations.requiresPrincipalConfirmation, false);
  strictEqual(tool.annotations.principalOnly, false);
  // The inputSchema is the request body an agent constructs (3.1.1): values wrapper.
  strictEqual(tool.inputSchema.type, 'object');
  ok((tool.inputSchema.required as string[]).includes('values'));
});

test('toModelContextTool: a confirmation-designated step carries the hint and a confirmation in its schema', () => {
  const tool = toModelContextTool('J1', SUBMIT, [], CA1);
  strictEqual(tool.annotations.readOnlyHint, false);
  strictEqual(tool.annotations.destructiveHint, true);
  strictEqual(tool.annotations.requiresPrincipalConfirmation, true);
  ok((tool.inputSchema.required as string[]).includes('confirmation'), 'the schema demands the confirmation an agent must present');
});

test('toModelContextTool: a principal-only action is flagged so an agent is warned off (5.3.3)', () => {
  const tool = toModelContextTool('J4', { id: 'give', title: 'Give authority', kind: 'consequential', actionId: 'CA-4a' }, [], CA_PRINCIPAL_ONLY);
  strictEqual(tool.annotations.principalOnly, true);
});
