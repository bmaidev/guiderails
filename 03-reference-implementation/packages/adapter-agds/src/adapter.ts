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

/** Which AgDS component renders a field, and the props to pass it. */
export interface AgdsFieldBinding {
  component: 'TextInput' | 'Select' | 'Checkbox';
  props: Record<string, unknown>;
}

function invalidProps(ctx?: RenderCtx): Record<string, unknown> {
  return ctx?.error ? { invalid: true, message: `${ctx.error.message} ${ctx.error.remediation}`.trim() } : {};
}

/**
 * Map a FieldSpec to an AgDS component binding. The semantic bag drives the
 * forwarded native attributes; AgDS's own props carry label/hint/required.
 */
export function agdsFieldBinding(field: FieldSpec, ctx?: RenderCtx): AgdsFieldBinding {
  const bag = getControlAttributes(field);
  // AgDS uses React camelCase; the HTML bag uses lowercase attribute names.
  const native: Record<string, unknown> = {
    name: field.name,
    id: field.name, // stable, so the label associates and an agent can find it
    ...(typeof bag.autocomplete === 'string' ? { autoComplete: bag.autocomplete } : {}),
    ...(typeof bag.inputmode === 'string' ? { inputMode: bag.inputmode } : {}),
  };

  if (field.dataType === 'boolean') {
    return {
      component: 'Checkbox',
      // AgDS Checkbox takes its label as children, and has no hint/message of its own.
      props: { children: field.label, required: Boolean(field.required), ...native, ...invalidProps(ctx) },
    };
  }

  if (field.dataType === 'enum') {
    const options = (field.constraints?.enumValues ?? []).map((v) => ({ label: v, value: v }));
    return {
      component: 'Select',
      props: {
        label: field.label, hint: field.description, required: Boolean(field.required),
        options, ...native, ...invalidProps(ctx),
      },
    };
  }

  return {
    component: 'TextInput',
    props: {
      label: field.label, hint: field.description, required: Boolean(field.required),
      ...(typeof bag.type === 'string' ? { type: bag.type } : {}),
      ...native, ...invalidProps(ctx),
    },
  };
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
