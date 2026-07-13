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
 * The design-system adapter contract (DESIGN §3, D-021). An adapter maps a
 * Guiderails spec onto a design system's component props, merging the
 * agent-surface semantic bag in — semantics below, styling above, both from the
 * one FieldSpec, so the human and agent surfaces provably cannot diverge. The
 * core never imports a design system; an adapter is a distribution channel.
 *
 * `Props` is the target's own prop type (AgDS's here). Framework-neutral: a Vue
 * adapter implements the same shape returning Vue props.
 */

import type { FieldSpec, ConsequentialActionSpec } from '../../agent-surface/src/index.ts';

export interface RenderCtx {
  /** A validation error to surface for this field, if any. */
  error?: { message: string; remediation: string };
  /** The current value, for controlled components. */
  value?: unknown;
}

export interface GuiderailsAdapter<Props extends Record<string, unknown>> {
  system: string;
  /** Map a field to the design system's field-component props, with the agent-surface bag merged in. */
  fieldProps(field: FieldSpec, ctx?: RenderCtx): Props;
  /** The Accountable pattern components' props. */
  confirmationCheckpointProps(action: ConsequentialActionSpec, obtained: boolean): Props;
  attributionBadgeProps(attribution: { agentOriginated: boolean; agentId?: string }): Props;
}
