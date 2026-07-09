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
 * Server-rendered HTML for the conformant build. Semantics are generated
 * from the same FieldSpecs that produce the tool schemas (anti-divergence,
 * 5.6.2). WCAG-relevant mechanics here: skip link, single h1, labels bound
 * by for/id, described-by hints, error summary as an anchor list, errors
 * associated with controls via aria-describedby (2.2.2 / WCAG 3.3.x).
 * Automated axe + manual pass are tracked as CI work — see conformant
 * README.
 */

import { htmlControl, type FieldSpec, type FieldError } from '../../packages/agent-surface/src/index.ts';

export function esc(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Skills Support Payment (fictional service)</title>
</head>
<body>
<a href="#main">Skip to main content</a>
<header><p><strong>Commonwealth Skills Support Agency</strong> — fictional service for standards testing (Guiderails fixture, D-009)</p></header>
<main id="main">
<h1>${esc(title)}</h1>
${body}
</main>
</body>
</html>`;
}

export function errorSummary(errors: FieldError[]): string {
  if (errors.length === 0) return '';
  const items = errors
    .map((e) => `<li><a href="#${esc(e.field)}">${esc(e.message)} ${esc(e.remediation)}</a></li>`)
    .join('\n');
  return `<div role="alert" aria-labelledby="error-summary-title">
<h2 id="error-summary-title">There is a problem</h2>
<ul>
${items}
</ul>
</div>`;
}

function controlHtml(f: FieldSpec, value: unknown, error?: FieldError): string {
  const { element, attributes } = htmlControl(f);
  const describedBy: string[] = [];
  if (f.description) describedBy.push(`${f.name}-description`);
  if (error) describedBy.push(`${f.name}-error`);
  const attrs: Record<string, string | boolean> = { ...attributes, id: f.name };
  if (describedBy.length > 0) attrs['aria-describedby'] = describedBy.join(' ');
  if (error) attrs['aria-invalid'] = 'true';

  const attrString = Object.entries(attrs)
    .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`))
    .filter((s) => s !== 'false')
    .join(' ');

  const hint = f.description ? `<p id="${esc(f.name)}-description">${esc(f.description)}</p>` : '';
  const err = error ? `<p id="${esc(f.name)}-error"><strong>Error:</strong> ${esc(error.message)} ${esc(error.remediation)}</p>` : '';

  let control: string;
  if (element === 'select') {
    const options = (f.constraints?.enumValues ?? [])
      .map((o) => `<option value="${esc(o)}"${value === o ? ' selected' : ''}>${esc(o)}</option>`)
      .join('');
    control = `<select ${attrString}><option value="">Select an option</option>${options}</select>`;
  } else if (attrs.type === 'checkbox') {
    const checked = value === true || value === 'true' || value === 'on' ? ' checked' : '';
    control = `<input ${attrString}${checked}>`;
  } else {
    const v = value === undefined || value === null ? '' : ` value="${esc(value)}"`;
    control = `<input ${attrString}${v}>`;
  }
  return `<div>
<label for="${esc(f.name)}">${esc(f.label)}${f.required ? '' : ' (optional)'}</label>
${hint}
${err}
${control}
</div>`;
}

export function form(
  action: string,
  fields: FieldSpec[],
  values: Record<string, unknown>,
  errors: FieldError[],
  submitLabel: string,
  extra = '',
): string {
  const byField = new Map(errors.map((e) => [e.field, e]));
  const controls = fields.map((f) => controlHtml(f, values[f.name], byField.get(f.name))).join('\n');
  return `${errorSummary(errors)}
<form method="post" action="${esc(action)}" novalidate>
${controls}
${extra}
<button type="submit">${esc(submitLabel)}</button>
</form>`;
}
