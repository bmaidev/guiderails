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
 * The AgDS adapter — pure prop mapping (D-021, DESIGN §3/§4).
 *
 * Maps a Guiderails FieldSpec onto the props of an AgDS (`@ag.ds-next/react`,
 * v1.35.1, MIT — S-78, S-83) field component, carrying the agent-surface
 * semantic meaning through. AgDS is provider-coupled and Emotion-styled, not
 * headless, so the adapter WRAPS AgDS's own component (it does not compose
 * primitives): AgDS supplies label/hint/required/invalid rendering and the
 * label→control association; the adapter supplies the machine semantics the
 * standard is about (name, type, autocomplete, inputmode) as forwarded native
 * attributes, plus a stable `id` so an agent can locate the control.
 *
 * This module has no React and no AgDS import — it returns plain prop objects.
 * The React binding that renders them is `components.tsx` (the browser layer).
 *
 * The AgDS prop names here are verified against the v1.35.1 TypeScript types
 * (label, hint, required, invalid, message, id, options; Checkbox label is
 * children). Re-check against the pinned AgDS version before shipping.
 */

import { getControlAttributes, type FieldSpec, type ConsequentialActionSpec } from '../../agent-surface/src/index.ts';
import type { GuiderailsAdapter, RenderCtx } from './contract.ts';

/** The AgDS components the adapter targets, one per Guiderails data type. */
export type AgdsComponent = 'TextInput' | 'Textarea' | 'Select' | 'Radio' | 'Checkbox' | 'DatePicker' | 'FileInput';

/** Which AgDS component renders a field, and the props to pass it. */
export interface AgdsFieldBinding {
  component: AgdsComponent;
  props: Record<string, unknown>;
}

export interface RenderCtxExt extends RenderCtx {
  /**
   * Presentational preference the design system honours without changing the
   * spec: an enum may render as a Select (default) or, for a small closed set,
   * a Radio group; a long text field as a Textarea. The machine meaning is
   * identical either way, which is the point.
   */
  variant?: 'radio' | 'textarea';
}

function invalidProps(ctx?: RenderCtx): Record<string, unknown> {
  return ctx?.error ? { invalid: true, message: `${ctx.error.message} ${ctx.error.remediation}`.trim() } : {};
}

/** inputMode for the numeric data types, so an agent and a phone keyboard both read intent. */
function inputModeFor(dataType: FieldSpec['dataType']): string | undefined {
  if (dataType === 'integer') return 'numeric';
  if (dataType === 'money' || dataType === 'decimal') return 'decimal';
  return undefined;
}

/**
 * Map a FieldSpec to an AgDS component binding, for ALL ten data types. The
 * semantic bag drives the forwarded native attributes; AgDS's own props carry
 * label/hint/required/invalid. The human and agent surfaces both derive from
 * this one FieldSpec, so they cannot diverge.
 */
export function agdsFieldBinding(field: FieldSpec, ctx?: RenderCtxExt): AgdsFieldBinding {
  const bag = getControlAttributes(field);
  const inputMode = inputModeFor(field.dataType) ?? (typeof bag.inputmode === 'string' ? bag.inputmode : undefined);
  const native: Record<string, unknown> = {
    name: field.name,
    id: field.name, // stable, so the label associates and an agent can find it
    ...(typeof bag.autocomplete === 'string' ? { autoComplete: bag.autocomplete } : {}),
    ...(inputMode ? { inputMode } : {}),
  };
  const labelled = { label: field.label, hint: field.description, required: Boolean(field.required) };

  switch (field.dataType) {
    case 'boolean':
      // AgDS Checkbox takes its label as children, and has no hint/message of its own.
      return { component: 'Checkbox', props: { children: field.label, required: Boolean(field.required), ...native, ...invalidProps(ctx) } };

    case 'date':
      // AgDS DatePicker is an accessible text-based picker (not a native date input).
      return { component: 'DatePicker', props: { ...labelled, ...native, ...invalidProps(ctx) } };

    case 'file':
      return { component: 'FileInput', props: { ...labelled, ...native, ...invalidProps(ctx), maxSize: field.constraints?.maximum, accept: field.constraints?.acceptFormats } };

    case 'enum': {
      const options = (field.constraints?.enumValues ?? []).map((v) => ({ label: v, value: v }));
      if (ctx?.variant === 'radio') {
        // A Radio group inside an AgDS ControlGroup — same closed set, different affordance.
        return { component: 'Radio', props: { ...labelled, name: field.name, options, ...invalidProps(ctx) } };
      }
      return { component: 'Select', props: { ...labelled, options, ...native, ...invalidProps(ctx) } };
    }

    case 'text':
      if (ctx?.variant === 'textarea') {
        return { component: 'Textarea', props: { ...labelled, ...native, ...invalidProps(ctx) } };
      }
    // falls through to TextInput
    // eslint-disable-next-line no-fallthrough
    default:
      return {
        component: 'TextInput',
        props: {
          ...labelled,
          ...(typeof bag.type === 'string' ? { type: bag.type } : {}),
          ...native, ...invalidProps(ctx),
        },
      };
  }
}

/** The GuiderailsAdapter contract, realised for AgDS. `Props` is left broad — AgDS types live in the React layer. */
export const agdsAdapter: GuiderailsAdapter<Record<string, unknown>> = {
  system: 'agds',
  fieldProps(field, ctx) {
    return agdsFieldBinding(field, ctx).props;
  },
  confirmationCheckpointProps(action: ConsequentialActionSpec, obtained: boolean) {
    // Rendered as an AgDS Callout/status region in components.tsx.
    return {
      tone: obtained ? 'info' : 'warning',
      title: obtained ? 'Confirmed by the principal' : 'Awaiting the principal\'s confirmation',
      children: action.confirmationDesignated
        ? 'This action requires a confirmation the principal makes on their own channel (5.3.2).'
        : 'This action does not require the principal\'s confirmation.',
    };
  },
  attributionBadgeProps(attribution) {
    return {
      tone: 'neutral',
      children: attribution.agentOriginated ? `Submitted by an agent${attribution.agentId ? ` (${attribution.agentId})` : ''} (5.2.1)` : 'Submitted by the principal',
    };
  },
};
