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
 * Two things are verified here, without React or AgDS installed:
 *
 *  1. The mapping is faithful — the AgDS props carry the machine semantics
 *     (name, type, required, autocomplete, a stable id, and the label/hint AgDS
 *     will render).
 *  2. The adapted surface is agent-legible — the DOM AgDS *documents* it renders
 *     from these props (a label associated to a control by id, plus the control
 *     with its forwarded native attributes) passes the SAME storybook-addon
 *     check engine the conformant fixture passes. So an AgDS-rendered Guiderails
 *     form is legible to an agent by the same oracle, on a real design system.
 *
 * The model of AgDS's render is documented, not asserted about the live library:
 * AgDS TextInput/Select render `<label for={id}>{label}` + the control with the
 * forwarded attrs (v1.35.1 types, S-83). The live React render is browser-
 * verified in the AgDS toolchain; this proves the props are sufficient.
 */

import { ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { agdsFieldBinding } from './adapter.ts';
import { checkStory, type DomElement } from '../../storybook-addon/src/checks.ts';
import { J1_FIELDS } from '../../../conformant/src/journeys.ts';

/** Model the DOM AgDS renders for a field binding: a label associated by id, plus the control. */
function modelAgdsRender(binding: ReturnType<typeof agdsFieldBinding>): string {
  const p = binding.props as Record<string, string | boolean>;
  const id = String(p.id);
  const label = p.children ?? p.label; // Checkbox uses children as its label
  const attr = (name: string, value: unknown) => (value === undefined ? '' : ` ${name}="${String(value)}"`);
  const requiredAttrs = p.required ? ' required aria-required="true"' : '';
  const describedBy = p.hint ? ` aria-describedby="${id}-hint"` : '';
  const hint = p.hint ? `<p id="${id}-hint">${String(p.hint)}</p>` : '';
  const invalid = p.invalid ? ` aria-invalid="true" aria-describedby="${id}-error"` : '';
  const errorNode = p.invalid ? `<p id="${id}-error">${String(p.message)}</p>` : '';

  const labelHtml = binding.component === 'Checkbox'
    ? `<label for="${id}">${String(label)}</label>`
    : `<label for="${id}">${String(label)}</label>`;

  let control: string;
  if (binding.component === 'Select') {
    control = `<select id="${id}"${attr('name', p.name)}${requiredAttrs}${describedBy}${invalid}></select>`;
  } else {
    control = `<input id="${id}"${attr('name', p.name)}${attr('type', p.type ?? (binding.component === 'Checkbox' ? 'checkbox' : 'text'))}${attr('autocomplete', p.autoComplete)}${attr('inputmode', p.inputMode)}${requiredAttrs}${describedBy}${invalid}>`;
  }
  return `<div>${labelHtml}${hint}${errorNode}${control}</div>`;
}

function render(html: string): DomElement {
  return new JSDOM(`<!doctype html><body>${html}</body>`).window.document.body as unknown as DomElement;
}

test('AgDS binding carries the semantics an agent needs', () => {
  const email = J1_FIELDS.identity.find((f) => f.name === 'email')!;
  const b = agdsFieldBinding(email);
  strictEqual(b.component, 'TextInput');
  strictEqual(b.props.label, email.label);
  strictEqual(b.props.name, 'email');
  strictEqual(b.props.id, 'email');
  strictEqual(b.props.type, 'email');
  strictEqual(b.props.required, true);
  strictEqual(b.props.autoComplete, 'email');
});

test('an enum field maps to AgDS Select with options', () => {
  const enumField = { name: 'load', label: 'Study load', dataType: 'enum' as const, required: true, constraints: { enumValues: ['full', 'part'] } };
  const b = agdsFieldBinding(enumField);
  strictEqual(b.component, 'Select');
  ok(Array.isArray(b.props.options));
  strictEqual((b.props.options as unknown[]).length, 2);
});

test('a validation error maps to AgDS invalid + message', () => {
  const email = J1_FIELDS.identity.find((f) => f.name === 'email')!;
  const b = agdsFieldBinding(email, { error: { message: 'Enter a valid email.', remediation: 'e.g. a@b.com' } });
  strictEqual(b.props.invalid, true);
  ok(String(b.props.message).includes('valid email'));
});

test('the AgDS-adapted identity form passes the check engine (2.2.1, 3.1.1) — legible on a real design system', () => {
  const fields = J1_FIELDS.identity;
  const html = fields.map((f) => modelAgdsRender(agdsFieldBinding(f))).join('\n');
  const report = checkStory(render(html), { fields, journeyId: 'J1', criteria: ['2.2.1', '3.1.1'] });
  ok(report.pass, `AgDS output failed the oracle: ${JSON.stringify(report.results.filter((r) => !r.pass))}`);
});

test('the AgDS-adapted error state passes 2.2.2', () => {
  const email = J1_FIELDS.identity.find((f) => f.name === 'email')!;
  const html = modelAgdsRender(agdsFieldBinding(email, { error: { message: 'Enter a valid email.', remediation: 'e.g. a@b.com' } }));
  const report = checkStory(render(html), { fields: [email], criteria: ['2.2.2'] });
  strictEqual(report.results[0].applicable, true);
  ok(report.results[0].pass, `2.2.2 failed: ${report.results[0].failures}`);
});
