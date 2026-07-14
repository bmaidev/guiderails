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

import { getControlAttributes, toModelContextTool, journeyState, type FieldSpec } from '../../agent-surface/src/index.ts';
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

/**
 * The accessible name of a control, by the paths the fixture and typical design
 * systems use. Uses the control's OWN id for label association (a design system's
 * control id need not equal the field name — a radio group's controls are
 * `name-0`, `name-1`), then a group `<legend>` for grouped controls, then aria.
 */
function accessibleName(root: DomElement, control: DomElement): string {
  const ariaLabel = control.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
  const labelledBy = control.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.split(/\s+/).map((id) => root.querySelector(`#${id}`)?.textContent ?? '');
    if (parts.join('').trim()) return parts.join(' ').trim();
  }
  const id = control.getAttribute('id');
  if (id) {
    const label = root.querySelector(`label[for="${id}"]`);
    if (label?.textContent && label.textContent.trim()) return label.textContent.trim();
  }
  // A grouped control (radio/checkbox in a fieldset) is named by its legend.
  const legend = root.querySelector('fieldset > legend');
  if (legend?.textContent && legend.textContent.trim()) return legend.textContent.trim();
  return '';
}

/**
 * Whether a control's DOM input `type` is compatible with the spec-derived type.
 * A design system may render any field as an accessible **text** control — an
 * AgDS DatePicker is a formatted text input, not `<input type="date">` — so text
 * is universally compatible. An exact match is compatible. A *different specific*
 * type (a date field rendered as `type="email"`) is not: that is a real mismatch.
 */
export function typeCompatible(specType: string, domType: string): boolean {
  return domType === specType || domType === 'text';
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
    if (!accessibleName(root, control)) failures.push(`"${field.name}" has no accessible name`);
    const bag = getControlAttributes(field);
    const requiredInDom = control.getAttribute('aria-required') === 'true' || control.getAttribute('required') !== null;
    if (field.required && !requiredInDom) failures.push(`"${field.name}" is required in the spec but not marked required in the DOM`);
    const domType = control.getAttribute('type');
    if (bag.type && domType && !typeCompatible(String(bag.type), domType)) {
      failures.push(`"${field.name}" renders type="${domType}", incompatible with the spec's "${bag.type}"`);
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

/**
 * 2.4.1: a multi-step journey exposes programmatically the current step, the set
 * of remaining steps, unsatisfied prerequisites, and each step's safe/consequential
 * classification. Recomputes the authoritative state surface from the spec and
 * checks the rendered rail carries it in `data-gr-*` attributes — DOM against spec.
 */
function check_2_4_1(root: DomElement, params: GuiderailsParameters): CriterionResult {
  if (!params.journeySpec || !params.journeyProgress) {
    return { criterion: '2.4.1', applicable: false, pass: true, failures: [] };
  }
  const failures: string[] = [];
  const state = journeyState(params.journeySpec, params.journeyProgress);
  const rail = root.querySelector('[data-gr-journey-state]');
  if (!rail) {
    return { criterion: '2.4.1', applicable: true, pass: false, failures: ['no [data-gr-journey-state] region exposes the journey state'] };
  }
  if ((rail.getAttribute('data-gr-current') ?? null) !== (state.currentStep ?? '')) {
    failures.push(`current step exposed as "${rail.getAttribute('data-gr-current')}", expected "${state.currentStep ?? ''}"`);
  }
  const byId = (id: string) => rail.querySelector(`[data-gr-step="${id}"]`);
  const done = new Set(params.journeyProgress.completedSteps);
  for (const step of params.journeySpec.steps) {
    const el = byId(step.id);
    if (!el) { failures.push(`step "${step.id}" is not exposed`); continue; }
    const expectedStatus = done.has(step.id) ? 'done' : step.id === state.currentStep ? 'doing' : 'todo';
    if (el.getAttribute('data-gr-step-status') !== expectedStatus) {
      failures.push(`step "${step.id}" status "${el.getAttribute('data-gr-step-status')}", expected "${expectedStatus}"`);
    }
    if (el.getAttribute('data-gr-step-kind') !== step.kind) {
      failures.push(`step "${step.id}" kind "${el.getAttribute('data-gr-step-kind')}", expected "${step.kind}"`);
    }
  }
  // Every unsatisfied prerequisite the surface reports must be exposed on its step.
  for (const { step, missing } of state.prerequisitesUnsatisfied) {
    const exposed = (byId(step)?.getAttribute('data-gr-step-requires') ?? '').split(/\s+/).filter(Boolean);
    for (const m of missing) {
      if (!exposed.includes(m)) failures.push(`step "${step}" does not expose unsatisfied prerequisite "${m}"`);
    }
  }
  return { criterion: '2.4.1', applicable: true, pass: failures.length === 0, failures };
}

/**
 * 2.4.2: after a consequential action, the journey states programmatically that
 * it occurred, when, and its reference identifier. Checks the rendered receipt
 * against the expected event.
 */
function check_2_4_2(root: DomElement, params: GuiderailsParameters): CriterionResult {
  if (!params.receipt) return { criterion: '2.4.2', applicable: false, pass: true, failures: [] };
  const failures: string[] = [];
  const receipt = root.querySelector('[data-gr-receipt]');
  if (!receipt) {
    return { criterion: '2.4.2', applicable: true, pass: false, failures: ['no [data-gr-receipt] region states the action occurred'] };
  }
  if (receipt.getAttribute('data-gr-occurred') !== 'true') failures.push('receipt does not state the action occurred');
  const checkAttr = (attr: string, expected: string, label: string) => {
    if (receipt.getAttribute(attr) !== expected) failures.push(`receipt ${label} "${receipt.getAttribute(attr)}", expected "${expected}"`);
  };
  checkAttr('data-gr-action', params.receipt.actionId, 'action');
  checkAttr('data-gr-reference', params.receipt.reference, 'reference');
  checkAttr('data-gr-at', params.receipt.at, 'timestamp');
  // The reference must also be human-visible, not attribute-only.
  if (!(receipt.textContent ?? '').includes(params.receipt.reference)) {
    failures.push('the reference identifier is not stated in visible text');
  }
  return { criterion: '2.4.2', applicable: true, pass: failures.length === 0, failures };
}

/** 5.2.1: an agent-originated submission is flagged as such in the rendered record. */
function check_5_2_1(root: DomElement, params: GuiderailsParameters): CriterionResult {
  if (!params.attribution) return { criterion: '5.2.1', applicable: false, pass: true, failures: [] };
  const failures: string[] = [];
  const badge = root.querySelector('[data-gr-attribution]');
  if (!badge) {
    return { criterion: '5.2.1', applicable: true, pass: false, failures: ['no [data-gr-attribution] flag on the record'] };
  }
  const expected = params.attribution.agentOriginated ? 'agent' : 'principal';
  if (badge.getAttribute('data-gr-attribution') !== expected) {
    failures.push(`attribution "${badge.getAttribute('data-gr-attribution')}", expected "${expected}"`);
  }
  if (params.attribution.agentOriginated) {
    if (params.attribution.agentId && badge.getAttribute('data-gr-agent-id') !== params.attribution.agentId) {
      failures.push(`agent id "${badge.getAttribute('data-gr-agent-id')}", expected "${params.attribution.agentId}"`);
    }
    if (!/agent/i.test(badge.textContent ?? '')) failures.push('agent origination is not stated in visible text');
  }
  return { criterion: '5.2.1', applicable: true, pass: failures.length === 0, failures };
}

/**
 * 5.6.2: no agent-facing surface presents an affordance whose effect contradicts
 * the human-facing meaning of the same step. The step's primary affordance carries
 * a machine `data-gr-effect`, and the agent's-eye view carries `data-gr-destructive`;
 * both must equal the spec-derived hint, so the two surfaces cannot disagree.
 */
function check_5_6_2(root: DomElement, params: GuiderailsParameters): CriterionResult {
  if (!params.step) return { criterion: '5.6.2', applicable: false, pass: true, failures: [] };
  const failures: string[] = [];
  const tool = toModelContextTool(params.journeyId ?? 'J', params.step, params.fields, params.action);
  const expectedEffect = tool.annotations.destructiveHint ? 'consequential' : 'safe';
  const affordance = root.querySelector('[data-gr-effect]');
  const agentView = root.querySelector('[data-gr-agent-view]');
  if (!affordance) failures.push('the primary affordance carries no machine effect marker (data-gr-effect)');
  else if (affordance.getAttribute('data-gr-effect') !== expectedEffect) {
    failures.push(`affordance effect "${affordance.getAttribute('data-gr-effect')}" contradicts the step's "${expectedEffect}"`);
  }
  if (!agentView) failures.push('no agent-view marker (data-gr-agent-view) to compare against');
  else if (agentView.getAttribute('data-gr-destructive') !== String(tool.annotations.destructiveHint)) {
    failures.push(`agent-view destructiveHint "${agentView.getAttribute('data-gr-destructive')}" contradicts the spec's "${tool.annotations.destructiveHint}"`);
  }
  return { criterion: '5.6.2', applicable: true, pass: failures.length === 0, failures };
}

/**
 * 5.6.3: third-party or user-generated content rendered within a journey is
 * programmatically distinguishable from the operator's own content. Checks the
 * story marks such content with `data-gr-origin="third-party"`, distinct from the
 * operator's regions.
 */
function check_5_6_3(root: DomElement, params: GuiderailsParameters): CriterionResult {
  if (!params.thirdPartyContent) return { criterion: '5.6.3', applicable: false, pass: true, failures: [] };
  const failures: string[] = [];
  const thirdParty = Array.from(root.querySelectorAll('[data-gr-origin="third-party"]'));
  const operator = Array.from(root.querySelectorAll('[data-gr-origin="operator"]'));
  if (thirdParty.length === 0) failures.push('story renders third-party content but no [data-gr-origin="third-party"] region marks it');
  if (operator.length === 0) failures.push('no [data-gr-origin="operator"] region to distinguish operator content from third-party');
  for (const el of thirdParty) {
    if (!(el.textContent ?? '').trim()) failures.push('a third-party region is marked but empty');
  }
  return { criterion: '5.6.3', applicable: true, pass: failures.length === 0, failures };
}

const CHECKERS: Record<string, (root: DomElement, params: GuiderailsParameters) => CriterionResult> = {
  '2.2.1': (root, p) => check_2_2_1(root, p.fields),
  '2.2.2': (root, p) => check_2_2_2(root, p.fields),
  '2.4.1': (root, p) => check_2_4_1(root, p),
  '2.4.2': (root, p) => check_2_4_2(root, p),
  '3.1.1': (root, p) => check_3_1_1(root, p),
  '3.4.3': (_root, p) => check_3_4_3(p),
  '5.2.1': (root, p) => check_5_2_1(root, p),
  '5.6.2': (root, p) => check_5_6_2(root, p),
  '5.6.3': (root, p) => check_5_6_3(root, p),
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
