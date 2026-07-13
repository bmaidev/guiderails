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
 * Composition layer — the seam a design-system adapter binds to (D-013, D-021).
 *
 * A single `FieldSpec` already derives the machine schema, the DOM/ARIA bag
 * (`htmlControl`) and the validator. This module names that seam so an adapter
 * can merge Guiderails' machine meaning onto a design system's own component
 * props without the core ever importing the design system: semantics below,
 * styling above. Modelled on React Aria's `mergeProps` (S-107, S-109).
 *
 * Zero-DOM, zero-framework, zero-runtime-dependency, like the rest of the
 * package. It returns plain attribute bags; a React or Vue adapter spreads them.
 */

import { htmlControl, type FieldSpec } from './fields.ts';
import type { StepSpec } from './journey.ts';
import type { ConsequentialActionSpec } from './accountability.ts';

/** A flat, framework-neutral attribute bag an adapter spreads onto its element. */
export type AttrBag = Record<string, string | boolean | number>;

/**
 * The accessibility/semantic attributes a control must carry for an agent to
 * read it (2.2.1). The generalised `htmlControl`: an adapter merges this onto
 * whatever element its design system renders, so the human and agent surfaces
 * provably cannot diverge — both derive from the one FieldSpec.
 */
export function getControlAttributes(field: FieldSpec): AttrBag {
  return htmlControl(field).attributes;
}

/**
 * Merge a design system's own props with the Guiderails attribute bag. The bag
 * wins on the semantic attributes it owns (name, type, aria-*, autocomplete),
 * because those carry the machine meaning the standard is about; everything
 * else (className, styling, event handlers) is the design system's. Event
 * handlers present on both are chained, design-system-first, so neither is lost.
 */
export function mergeAgentProps<T extends Record<string, unknown>>(designSystemProps: T, agentBag: AttrBag): T & AttrBag {
  const out: Record<string, unknown> = { ...designSystemProps };
  for (const [key, value] of Object.entries(agentBag)) {
    const existing = out[key];
    if (typeof existing === 'function' && typeof value === 'function') {
      // Not expected for the attribute bag (it is data), but keep the invariant
      // that a merge never silently drops a handler.
      out[key] = (...args: unknown[]) => {
        (existing as (...a: unknown[]) => void)(...args);
        (value as (...a: unknown[]) => void)(...args);
      };
    } else {
      out[key] = value;
    }
  }
  return out as T & AttrBag;
}

/** Whether a step is safe or consequential, plus the confirmation/delegation obligations an agent must satisfy (3.4.3, 5.3.1). */
export interface StepObligations {
  stepId: string;
  kind: StepSpec['kind'];
  actionId?: string;
  /** True when the register designates principal confirmation for this action (5.3.1). */
  confirmationDesignated: boolean;
  /** False when no agent may execute this action, whatever its delegation (5.3.3). */
  agentExecutable: boolean;
}

export function getStepObligations(step: StepSpec, action?: ConsequentialActionSpec): StepObligations {
  return {
    stepId: step.id,
    kind: step.kind,
    actionId: step.actionId,
    confirmationDesignated: action?.confirmationDesignated ?? false,
    agentExecutable: action?.agentExecutable !== false,
  };
}
