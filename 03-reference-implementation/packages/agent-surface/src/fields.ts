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
 * Field semantics (Guiderails 2.2) and tool-schema derivation (3.1.1).
 *
 * A FieldSpec is the single description of a form control; from it derive:
 * - the JSON Schema fragment for the declared tool contract,
 * - the HTML attributes carrying the same semantics programmatically,
 * - structured validation errors (2.2.2: which constraint failed, what
 *   remediation is accepted, associated with the control concerned).
 * One description, three surfaces — the human interface and the machine
 * meaning cannot diverge because they are generated from the same source.
 */

export type FieldDataType =
  | 'text'
  | 'email'
  | 'tel'
  | 'date'
  | 'integer'
  | 'money'
  | 'decimal'
  | 'enum'
  | 'boolean'
  | 'file';

export interface FieldConstraints {
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  /** Anchored ECMAScript regular expression source. */
  pattern?: string;
  enumValues?: string[];
  /** Accepted upload formats, e.g. ["application/pdf", "image/jpeg"]. */
  acceptFormats?: string[];
}

export interface FieldSpec {
  name: string;
  /** The accessible name (2.2.1). */
  label: string;
  dataType: FieldDataType;
  required: boolean;
  /** Plain-language purpose; surfaces as description text and aria-describedby. */
  description?: string;
  constraints?: FieldConstraints;
  /** WHATWG autofill token, e.g. "email", "bday", "tel". */
  autocomplete?: string;
}

export interface FieldError {
  field: string;
  constraint:
    | 'required'
    | 'type'
    | 'pattern'
    | 'enum'
    | 'minimum'
    | 'maximum'
    | 'maxLength'
    | 'format'
    /** The field is not declared by the step at all (additionalProperties: false). */
    | 'unknown';
  message: string;
  /** What input the service will accept (2.2.2). */
  remediation: string;
}

type JsonSchema = Record<string, unknown>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function fieldJsonSchema(f: FieldSpec): JsonSchema {
  const s: JsonSchema = { title: f.label };
  if (f.description) s.description = f.description;
  const c = f.constraints ?? {};
  switch (f.dataType) {
    case 'text':
    case 'tel':
      s.type = 'string';
      if (c.pattern) s.pattern = c.pattern;
      if (c.maxLength !== undefined) s.maxLength = c.maxLength;
      break;
    case 'email':
      s.type = 'string';
      s.format = 'email';
      break;
    case 'date':
      s.type = 'string';
      s.format = 'date';
      break;
    case 'integer':
      s.type = 'integer';
      if (c.minimum !== undefined) s.minimum = c.minimum;
      if (c.maximum !== undefined) s.maximum = c.maximum;
      break;
    case 'money':
      s.type = 'number';
      s.multipleOf = 0.01;
      s.minimum = c.minimum ?? 0;
      if (c.maximum !== undefined) s.maximum = c.maximum;
      break;
    case 'decimal':
      s.type = 'number';
      if (c.minimum !== undefined) s.minimum = c.minimum;
      if (c.maximum !== undefined) s.maximum = c.maximum;
      break;
    case 'enum':
      s.type = 'string';
      s.enum = c.enumValues ?? [];
      break;
    case 'boolean':
      s.type = 'boolean';
      break;
    case 'file':
      s.type = 'string';
      s.contentEncoding = 'base64';
      if (c.acceptFormats) s.description = `${f.description ?? f.label}. Accepted formats: ${c.acceptFormats.join(', ')}`;
      break;
  }
  return s;
}

/**
 * JSON Schema for the *values object* of a step — the field names and their
 * constraints. This is not the request body: see `stepRequestSchema`.
 */
export function formJsonSchema(id: string, title: string, fields: FieldSpec[]): JsonSchema {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: id,
    title,
    type: 'object',
    properties: Object.fromEntries(fields.map((f) => [f.name, fieldJsonSchema(f)])),
    required: fields.filter((f) => f.required).map((f) => f.name),
    additionalProperties: false,
  };
}

export interface StepRequestOptions {
  /** A consequential step; a safe step carries no action and no confirmation. */
  actionId?: string;
  /** 5.3.1: the register designates this action as requiring the principal's confirmation. */
  confirmationDesignated?: boolean;
}

/**
 * JSON Schema for the **request body** an agent POSTs to a step endpoint
 * (3.1.1: declared tool interfaces whose *inputs* are described by published
 * schemas).
 *
 * The field schema alone does not satisfy that criterion, and the gap is not
 * academic: a schema describing `{declaration}` while the endpoint accepts
 * `{values: {declaration}}` tells an agent to construct a request the service
 * rejects, and the 422 it gets back names a field it did in fact supply. Two
 * frontier models each spent an entire iteration budget on that discrepancy.
 * If the agent must send it, the published schema says so — including the
 * confirmation token, which is otherwise a checkpoint with no documented door.
 */
export function stepRequestSchema(
  id: string,
  title: string,
  fields: FieldSpec[],
  opts: StepRequestOptions = {},
): JsonSchema {
  const properties: JsonSchema = {
    values: formJsonSchema(`${id}-values`, `${title} — field values`, fields),
  };
  const required = ['values'];

  if (opts.actionId) {
    // 5.4.1: cite what you relied on. Optional — nothing obliges an agent to
    // cite a determination (MODEL.md §8 Q11) — but it cannot cite what it was
    // never told it could send.
    properties.determinationId = {
      type: 'string',
      title: 'Determination relied upon',
      description:
        'The determinationId returned by the rules endpoint, if this action relies on one. Presenting it records your reliance in the principal\'s audit (5.4.1) without attributing the query itself (4.5.2).',
    };
  }

  if (opts.confirmationDesignated) {
    properties.confirmation = {
      type: 'object',
      title: 'The principal\'s confirmation of this action',
      description:
        'Required: this action is confirmation-designated (5.3.1). Present the token your principal obtained through their own channel. An agent cannot mint one, and an interaction inside your own session is not a confirmation (5.3.2).',
      properties: {
        actionId: { type: 'string', description: 'The consequential action this confirmation is for.' },
        principalId: { type: 'string', description: 'The principal the confirmation is attributable to.' },
        at: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp.' },
        token: { type: 'string', description: 'The single-use, service-issued confirmation token.' },
      },
      required: ['actionId', 'principalId', 'at', 'token'],
      additionalProperties: false,
    };
    required.push('confirmation');
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: id,
    title: `${title} — request body`,
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

export interface HtmlControl {
  element: 'input' | 'select' | 'textarea';
  attributes: Record<string, string | boolean>;
}

/** HTML attributes carrying the same semantics programmatically (2.2.1). */
export function htmlControl(f: FieldSpec): HtmlControl {
  const c = f.constraints ?? {};
  const attrs: Record<string, string | boolean> = { name: f.name };
  if (f.required) {
    attrs.required = true;
    attrs['aria-required'] = 'true';
  }
  if (f.autocomplete) attrs.autocomplete = f.autocomplete;
  if (f.description) attrs['aria-describedby'] = `${f.name}-description`;

  let element: HtmlControl['element'] = 'input';
  switch (f.dataType) {
    case 'email':
      attrs.type = 'email';
      break;
    case 'tel':
      attrs.type = 'tel';
      break;
    case 'date':
      attrs.type = 'date';
      break;
    case 'integer':
      attrs.type = 'text';
      attrs.inputmode = 'numeric';
      break;
    case 'money':
    case 'decimal':
      attrs.type = 'text';
      attrs.inputmode = 'decimal';
      break;
    case 'enum':
      element = 'select';
      break;
    case 'boolean':
      attrs.type = 'checkbox';
      break;
    case 'file':
      attrs.type = 'file';
      if (c.acceptFormats) attrs.accept = c.acceptFormats.join(',');
      break;
    default:
      attrs.type = 'text';
  }
  if (element === 'input') {
    if (c.pattern && (f.dataType === 'text' || f.dataType === 'tel')) attrs.pattern = c.pattern;
    if (c.maxLength !== undefined) attrs.maxlength = String(c.maxLength);
  }
  return { element, attributes: attrs };
}

function anchored(pattern: string): RegExp {
  return new RegExp(`^(?:${pattern})$`);
}

/**
 * Structured validation (2.2.2). Values arrive as strings (form posts) or
 * typed values (tool calls); both are accepted where unambiguous.
 */
export function validateValues(
  fields: FieldSpec[],
  values: Record<string, unknown>,
): FieldError[] {
  const errors: FieldError[] = [];
  for (const f of fields) {
    const raw = values[f.name];
    const empty = raw === undefined || raw === null || raw === '';
    if (empty) {
      if (f.required) {
        errors.push({
          field: f.name,
          constraint: 'required',
          message: `${f.label} is required.`,
          remediation: `Provide a value for ${f.label}.`,
        });
      }
      continue;
    }
    const c = f.constraints ?? {};
    const err = (constraint: FieldError['constraint'], message: string, remediation: string) =>
      errors.push({ field: f.name, constraint, message, remediation });

    switch (f.dataType) {
      case 'email': {
        if (typeof raw !== 'string' || !EMAIL.test(raw)) {
          err('format', `${f.label} is not a valid email address.`, 'Provide an address in the form name@domain, e.g. jo@example.com.');
        }
        break;
      }
      case 'date': {
        if (typeof raw !== 'string' || !ISO_DATE.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
          err('format', `${f.label} is not a valid date.`, 'Provide a date as YYYY-MM-DD.');
        }
        break;
      }
      case 'integer':
      case 'money':
      case 'decimal': {
        const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
        if (!Number.isFinite(n)) {
          err('type', `${f.label} must be a number.`, 'Provide a plain number without currency symbols, words or thousands separators, e.g. 1500.');
          break;
        }
        if (f.dataType === 'integer' && !Number.isInteger(n)) {
          err('type', `${f.label} must be a whole number.`, 'Provide a whole number with no decimal places.');
          break;
        }
        const min = f.dataType === 'money' ? (c.minimum ?? 0) : c.minimum;
        if (min !== undefined && n < min) {
          err('minimum', `${f.label} must be at least ${min}.`, `Provide a value of ${min} or more.`);
        }
        if (c.maximum !== undefined && n > c.maximum) {
          err('maximum', `${f.label} must be at most ${c.maximum}.`, `Provide a value of ${c.maximum} or less.`);
        }
        break;
      }
      case 'enum': {
        const allowed = c.enumValues ?? [];
        if (typeof raw !== 'string' || !allowed.includes(raw)) {
          err('enum', `${f.label} must be one of the listed options.`, `Provide one of: ${allowed.join(', ')}.`);
        }
        break;
      }
      case 'boolean': {
        if (typeof raw !== 'boolean' && raw !== 'true' && raw !== 'false' && raw !== 'on') {
          err('type', `${f.label} must be true or false.`, 'Provide true or false.');
        }
        break;
      }
      default: {
        if (typeof raw !== 'string') {
          err('type', `${f.label} must be text.`, 'Provide a text value.');
          break;
        }
        if (c.pattern && !anchored(c.pattern).test(raw)) {
          err('pattern', `${f.label} is not in the accepted format.`, f.description ?? `Provide a value matching the documented format for ${f.label}.`);
        }
        if (c.maxLength !== undefined && raw.length > c.maxLength) {
          err('maxLength', `${f.label} must be ${c.maxLength} characters or fewer.`, `Shorten the value to at most ${c.maxLength} characters.`);
        }
      }
    }
  }
  return errors;
}
