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
 * The agent's-eye view of a step, as a WebMCP-shaped tool descriptor.
 *
 * This serialises a step's declared tool (3.1.1) into the `ModelContextTool`
 * shape an agent's runtime would receive — name, title, description, JSON-Schema
 * inputs, and annotations. It is a *visualisation of an existing standard shape*
 * (WebMCP / MCP, S-100, S-103), not a new format; the Storybook addon renders
 * it so a component can be seen as an agent would see it.
 *
 * **Volatility caveat (D-021 / candidate decision).** WebMCP is emerging — a
 * W3C Community Group draft and a Chrome origin trial (S-100, S-102), and its
 * declarative-form path is unspecified. The imperative `ModelContextTool` shape
 * modelled here is pinned to the 2026-07 draft; treat it as a moving target and
 * re-check before any external claim of WebMCP conformance.
 */

import { stepRequestSchema, type FieldSpec, type JsonSchema } from './fields.ts';
import type { StepSpec } from './journey.ts';
import type { ConsequentialActionSpec } from './accountability.ts';

/** The subset of the WebMCP/MCP tool descriptor an agent needs to call a step. */
export interface ModelContextTool {
  name: string;
  title: string;
  description: string;
  /** The request body an agent constructs, as published JSON Schema (3.1.1). */
  inputSchema: JsonSchema;
  /** Behavioural hints an agent honours. Named for the WebMCP/MCP `annotations` object. */
  annotations: {
    /** A safe step creates no legal or administrative effect (3.4.3). */
    readOnlyHint: boolean;
    /** A consequential step changes state; the opposite of read-only. */
    destructiveHint: boolean;
    /** The register designates principal confirmation for this action (5.3.1). */
    requiresPrincipalConfirmation: boolean;
    /** No agent may execute this action, whatever its delegation (5.3.3). */
    principalOnly: boolean;
  };
}

/**
 * Serialise one step to its tool descriptor. `action` is required for a
 * consequential step (it carries the confirmation/executability designations);
 * a safe step has none, and the hints reflect that.
 */
export function toModelContextTool(
  journeyId: string,
  step: StepSpec,
  fields: FieldSpec[],
  action?: ConsequentialActionSpec,
): ModelContextTool {
  const consequential = step.kind === 'consequential';
  return {
    name: `${journeyId.toLowerCase()}.${step.id}`,
    title: step.title,
    description: consequential
      ? `Consequential step of journey ${journeyId}. ${action?.title ?? step.title}.`
      : `Safe step of journey ${journeyId}: ${step.title}. Creates no effect.`,
    inputSchema: stepRequestSchema(`${journeyId.toLowerCase()}-${step.id}`, step.title, fields, {
      actionId: step.actionId,
      confirmationDesignated: action?.confirmationDesignated,
    }),
    annotations: {
      readOnlyHint: !consequential,
      destructiveHint: consequential,
      requiresPrincipalConfirmation: action?.confirmationDesignated ?? false,
      principalOnly: action?.agentExecutable === false,
    },
  };
}
