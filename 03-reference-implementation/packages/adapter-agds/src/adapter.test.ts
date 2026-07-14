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
import { checkStory, typeCompatible, type DomElement } from '../../storybook-addon/src/checks.ts';
import { J1_FIELDS } from '../../../conformant/src/journeys.ts';

/**
 * Model the DOM AgDS renders for a field binding, per component (v1.35.1). This
 * models AgDS's documented output — a label associated by id, plus the control —
 * so the check engine can be run in Node; the live React render is verified by
 * the browser gate in the Storybook app.
 */
function modelAgdsRender(binding: ReturnType<typeof agdsFieldBinding>): string {
  const p = binding.props as Record<string, string | boolean>;
  const id = String(p.id ?? p.name);
  const label = p.children ?? p.label;
  const attr = (name: string, value: unknown) => (value === undefined ? '' : ` ${name}="${String(value)}"`);
  const req = p.required ? ' required aria-required="true"' : '';
  const describedBy = p.hint ? ` aria-describedby="${id}-hint"` : '';
  const hint = p.hint ? `<p id="${id}-hint">${String(p.hint)}</p>` : '';
  const invalid = p.invalid ? ` aria-invalid="true" aria-describedby="${id}-error"` : '';
  const errorNode = p.invalid ? `<p id="${id}-error">${String(p.message)}</p>` : '';
  const nameAttr = attr('name', p.name) + attr('autocomplete', p.autoComplete) + attr('inputmode', p.inputMode);

  const labelHtml = `<label for="${id}">${String(label)}</label>`;

  switch (binding.component) {
    case 'Select':
      return `<div>${labelHtml}${hint}${errorNode}<select id="${id}"${nameAttr}${req}${describedBy}${invalid}></select></div>`;
    case 'Textarea':
      return `<div>${labelHtml}${hint}${errorNode}<textarea id="${id}"${nameAttr}${req}${describedBy}${invalid}></textarea></div>`;
    case 'DatePicker':
      // AgDS DatePicker: an accessible text input with a date format hint.
      return `<div>${labelHtml}${hint}${errorNode}<input id="${id}" type="text"${nameAttr}${req}${describedBy}${invalid}></div>`;
    case 'FileInput':
      // AgDS FileInput (v1.35.1) renders a labelled BUTTON plus a file input that
      // carries the name and is named by the label (aria-labelledby) — but does
      // NOT convey `required`/aria-required on the control. The browser gate
      // surfaced this; the model matches it, so an optional file passes and a
      // required file legibly shows the gap rather than hiding it.
      return `<div><button id="${id}" type="button">select</button><label id="${id}-label" for="${id}">${String(label)}</label>${hint}${errorNode}<input type="file"${attr('name', p.name)} aria-labelledby="${id}-label"></div>`;
    case 'Checkbox':
      return `<div>${labelHtml}${hint}${errorNode}<input id="${id}" type="checkbox"${nameAttr}${req}${describedBy}${invalid}></div>`;
    case 'Radio': {
      // AgDS ControlGroup: a fieldset with a legend naming the group, and radio
      // inputs sharing the field name, each with its own option label.
      const radios = ((p as unknown as { options?: { value: string; label: string }[] }).options ?? [])
        .map((o, i) => `<input type="radio" id="${id}-${i}" name="${p.name}"${req}><label for="${id}-${i}">${o.label}</label>`).join('');
      return `<fieldset><legend>${String(label)}</legend>${hint}${errorNode}${radios}</fieldset>`;
    }
    default:
      return `<div>${labelHtml}${hint}${errorNode}<input id="${id}"${attr('type', p.type ?? 'text')}${nameAttr}${req}${describedBy}${invalid}></div>`;
  }
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

// ---- Every data type maps to an AgDS component and stays agent-legible ----

const EVERY_TYPE: import('../../agent-surface/src/index.ts').FieldSpec[] = [
  { name: 'fullName', label: 'Full name', dataType: 'text', required: true },
  { name: 'email', label: 'Email', dataType: 'email', required: true, autocomplete: 'email' },
  { name: 'mobile', label: 'Mobile', dataType: 'tel', required: true },
  { name: 'dob', label: 'Date of birth', dataType: 'date', required: true },
  { name: 'weeks', label: 'Course weeks', dataType: 'integer', required: true },
  { name: 'income', label: 'Fortnightly income', dataType: 'money', required: true },
  { name: 'load', label: 'Study load', dataType: 'decimal', required: true },
  { name: 'status', label: 'Enrolment status', dataType: 'enum', required: true, constraints: { enumValues: ['enrolled', 'offer'] } },
  { name: 'declaration', label: 'I declare this is true', dataType: 'boolean', required: true },
  { name: 'evidence', label: 'Enrolment document', dataType: 'file', required: false, constraints: { acceptFormats: ['pdf'] } },
];

const expectedComponent: Record<string, string> = {
  text: 'TextInput', email: 'TextInput', tel: 'TextInput', integer: 'TextInput', money: 'TextInput', decimal: 'TextInput',
  date: 'DatePicker', enum: 'Select', boolean: 'Checkbox', file: 'FileInput',
};

test('a REQUIRED file field surfaces the known AgDS FileInput gap (required not conveyed on the control)', () => {
  // AgDS FileInput does not mark required programmatically on its file input, so
  // a required file field is not fully legible. The engine catches this — a real
  // finding, tested, not hidden. In the demo it is a 'todo' warning, not a fail.
  const f: import('../../agent-surface/src/index.ts').FieldSpec = { name: 'evidence', label: 'Document', dataType: 'file', required: true };
  const report = checkStory(render(modelAgdsRender(agdsFieldBinding(f))), { fields: [f], criteria: ['2.2.1'] });
  ok(!report.pass);
  ok(report.results[0].failures.some((x) => /required/.test(x)), 'the gap is the required-state, not the name');
});

test('every data type maps to the right AgDS component', () => {
  for (const f of EVERY_TYPE) {
    strictEqual(agdsFieldBinding(f).component, expectedComponent[f.dataType], `${f.dataType} -> ${expectedComponent[f.dataType]}`);
  }
});

test('every data type, rendered through AgDS, passes the check engine (2.2.1, 3.1.1)', () => {
  // The whole control set — text/email/tel/date/number/money/enum/checkbox/file —
  // legible to an agent by the same oracle the fixture passes.
  for (const f of EVERY_TYPE) {
    const html = modelAgdsRender(agdsFieldBinding(f));
    const report = checkStory(render(html), { fields: [f], journeyId: 'J1', criteria: ['2.2.1', '3.1.1'] });
    ok(report.pass, `${f.dataType} (${f.name}) failed: ${JSON.stringify(report.results.filter((r) => r.applicable && !r.pass))}`);
  }
});

test('an enum can render as a Radio group and stay legible', () => {
  const f = EVERY_TYPE.find((x) => x.dataType === 'enum')!;
  const binding = agdsFieldBinding(f, { variant: 'radio' });
  strictEqual(binding.component, 'Radio');
  const report = checkStory(render(modelAgdsRender(binding)), { fields: [f], criteria: ['2.2.1', '3.1.1'] });
  ok(report.pass, `radio enum failed: ${JSON.stringify(report.results.filter((r) => !r.pass))}`);
});

test('a text field can render as a Textarea', () => {
  const f = EVERY_TYPE[0];
  strictEqual(agdsFieldBinding(f, { variant: 'textarea' }).component, 'Textarea');
});

test('a date field rendered as an AgDS DatePicker (text) is compatible; a wrong specific type is not', () => {
  // The DatePicker is a text input, not <input type=date> — the engine accepts it.
  strictEqual(typeCompatible('date', 'text'), true);
  strictEqual(typeCompatible('date', 'date'), true);
  strictEqual(typeCompatible('date', 'email'), false);
});
