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
 * The per-story criterion-check engine — the parity oracle (DESIGN §2, D-021).
 *
 * It is **renderer-agnostic**: it takes a rendered DOM root (a jsdom Element in
 * tests, a browser Element under the Storybook test-runner) and the story's
 * `parameters.guiderails`, and answers, per claimed criterion, whether the
 * rendered human surface carries the machine meaning the spec derives. It
 * compares DOM against SPEC, never DOM against DOM — so two wrong surfaces
 * agreeing cannot pass.
 *
 * This module has no Storybook and no browser dependency. It is the substance;
 * the Storybook panel and the Playwright test-runner are thin wrappers that
 * feed it a DOM and report its verdict.
 */

import { getControlAttributes, toModelContextTool, type FieldSpec } from '../../agent-surface/src/index.ts';
import type { GuiderailsParameters } from './parameters.ts';

/** The minimal DOM surface the engine uses, so it needs neither lib.dom nor jsdom types. */
export interface DomElement {
  getAttribute(name: string): string | null;
  querySelector(selectors: string): DomElement | null;
  querySelectorAll(selectors: string): ArrayLike<DomElement>;
  textContent: string | null;
}

export interface CriterionResult {
  criterion: string;
  /** False when the story does not exercise this criterion (e.g. 2.2.2 with no error rendered). */
  applicable: boolean;
  pass: boolean;
  failures: string[];
}

export interface CheckReport {
  pass: boolean;
  mode: NonNullable<GuiderailsParameters['test']>;
  results: CriterionResult[];
}

/** Find the control that renders a field, by its `name` (what htmlControl sets) or `id`. */
function controlFor(root: DomElement, field: FieldSpec): DomElement | null {
  return root.querySelector(`[name="${field.name}"]`) ?? root.querySelector(`#${field.name}`);
}

/** The accessible name of a control, by the paths the fixture and typical design systems use. */
function accessibleName(root: DomElement, control: DomElement, fieldName: string): string {
  const ariaLabel = control.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
  const labelledBy = control.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map((id) => root.querySelector(`#${id}`)?.textContent ?? '');
    if (parts.join('').trim()) return parts.join(' ').trim();
  }
  const label = root.querySelector(`label[for="${fieldName}"]`);
  if (label?.textContent && label.textContent.trim()) return label.textContent.trim();
  return '';
}

/** 2.2.1: every declared field renders a control with a programmatic name, correct required-state and type. */
function check_2_2_1(root: DomElement, fields: FieldSpec[]): CriterionResult {
  const failures: string[] = [];
  for (const field of fields) {
    const control = controlFor(root, field);
    if (!control) {
      failures.push(`no control renders field "${field.name}"`);
      continue;
    }
    if (!accessibleName(root, control, field.name)) failures.push(`"${field.name}" has no accessible name`);
    const bag = getControlAttributes(field);
    const requiredInDom = control.getAttribute('aria-required') === 'true' || control.getAttribute('required') !== null;
    if (field.required && !requiredInDom) failures.push(`"${field.name}" is required in the spec but not marked required in the DOM`);
    if (bag.type && control.getAttribute('type') && control.getAttribute('type') !== bag.type) {
      failures.push(`"${field.name}" renders type="${control.getAttribute('type')}" but the spec derives "${bag.type}"`);
    }
  }
  return { criterion: '2.2.1', applicable: fields.length > 0, pass: failures.length === 0, failures };
}

/** 2.2.2: any control marked invalid must point, via aria-describedby, at an error node carrying remediation text. */
function check_2_2_2(root: DomElement, fields: FieldSpec[]): CriterionResult {
  const failures: string[] = [];
  let anyInvalid = false;
  for (const field of fields) {
    const control = controlFor(root, field);
    if (!control || control.getAttribute('aria-invalid') !== 'true') continue;
    anyInvalid = true;
    const describedBy = control.getAttribute('aria-describedby');
    const errorNode = describedBy
      ? describedBy.split(/\s+/).map((id) => root.querySelector(`#${id}`)).find((n) => (n?.textContent ?? '').trim())
      : null;
    if (!errorNode) failures.push(`"${field.name}" is aria-invalid but references no error node with text`);
  }
  return { criterion: '2.2.2', applicable: anyInvalid, pass: failures.length === 0, failures };
}

/** 3.1.1: the rendered controls are exactly the declared fields — no more, no fewer. The parity oracle. */
function check_3_1_1(root: DomElement, params: GuiderailsParameters): CriterionResult {
  const failures: string[] = [];
  const declared = new Set(params.fields.map((f) => f.name));
  // Every declared field must render.
  for (const field of params.fields) {
    if (!controlFor(root, field)) failures.push(`declared field "${field.name}" is not rendered`);
  }
  // No named form control may appear that the spec did not declare (additionalProperties: false, in the DOM).
  const named = params.fields.length > 0 ? Array.from(root.querySelectorAll('input[name], select[name], textarea[name]')) : [];
  for (const el of named) {
    const name = el.getAttribute('name');
    if (name && !declared.has(name)) failures.push(`control "${name}" is rendered but not a declared field`);
  }
  // And the declared tool is derivable and covers the fields.
  if (params.step) {
    const tool = toModelContextTool(params.journeyId ?? 'J', params.step, params.fields, params.action);
    const values = (tool.inputSchema.properties as Record<string, { properties?: Record<string, unknown> }>).values;
    const schemaFields = new Set(Object.keys(values?.properties ?? {}));
    for (const field of params.fields) {
      if (!schemaFields.has(field.name)) failures.push(`field "${field.name}" is missing from the declared tool's inputSchema`);
    }
  }
  return { criterion: '3.1.1', applicable: params.fields.length > 0, pass: failures.length === 0, failures };
}

/** 3.4.3: the step's safe/consequential classification is consistent with its tool annotations. */
function check_3_4_3(params: GuiderailsParameters): CriterionResult {
  if (!params.step) return { criterion: '3.4.3', applicable: false, pass: true, failures: [] };
  const tool = toModelContextTool(params.journeyId ?? 'J', params.step, params.fields, params.action);
  const failures: string[] = [];
  if (tool.annotations.readOnlyHint !== (params.step.kind === 'safe')) {
    failures.push(`step kind "${params.step.kind}" disagrees with the tool's readOnlyHint`);
  }
  return { criterion: '3.4.3', applicable: true, pass: failures.length === 0, failures };
}

const CHECKERS: Record<string, (root: DomElement, params: GuiderailsParameters) => CriterionResult> = {
  '2.2.1': (root, p) => check_2_2_1(root, p.fields),
  '2.2.2': (root, p) => check_2_2_2(root, p.fields),
  '3.1.1': (root, p) => check_3_1_1(root, p),
  '3.4.3': (_root, p) => check_3_4_3(p),
};

/** Which criteria this engine can check per story. A claimed criterion outside this set is a config error. */
export const CHECKABLE_CRITERIA = Object.keys(CHECKERS);

/**
 * Run the checks a story claims. A claimed criterion with no checker is itself a
 * failure — a story must not claim what the engine cannot verify. Applicability
 * is honoured: an inapplicable criterion neither passes nor fails the build.
 */
export function checkStory(root: DomElement, params: GuiderailsParameters): CheckReport {
  const mode = params.test ?? 'error';
  const results: CriterionResult[] = params.criteria.map((criterion) => {
    const checker = CHECKERS[criterion];
    if (!checker) {
      return { criterion, applicable: true, pass: false, failures: [`no per-story checker for ${criterion}; claim it only where the engine can verify it (${CHECKABLE_CRITERIA.join(', ')})`] };
    }
    return checker(root, params);
  });
  const pass = results.filter((r) => r.applicable).every((r) => r.pass);
  return { pass, mode, results };
}
