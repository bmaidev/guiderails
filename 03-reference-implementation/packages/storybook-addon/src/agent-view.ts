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
 * The data the "agent's-eye view" panel renders (DESIGN §2a): what an agent
 * would discover about the component under a story. Pure — the panel component
 * (manager.tsx) is a thin presenter of this. Kept out of the panel so it is
 * testable without a browser.
 */

import { getControlAttributes, toModelContextTool, type ModelContextTool } from '../../agent-surface/src/index.ts';
import type { GuiderailsParameters } from './parameters.ts';

export interface AgentFieldView {
  name: string;
  label: string;
  type: string | undefined;
  required: boolean;
  attributes: Record<string, string | boolean | number>;
}

export interface AgentView {
  /** The WebMCP-shaped tool descriptor, or null for a story with no step. */
  tool: ModelContextTool | null;
  fields: AgentFieldView[];
  /** The criteria the story claims to carry. */
  claimedCriteria: string[];
}

export function buildAgentView(params: GuiderailsParameters): AgentView {
  return {
    tool: params.step ? toModelContextTool(params.journeyId ?? 'J', params.step, params.fields, params.action) : null,
    fields: params.fields.map((f) => {
      const bag = getControlAttributes(f);
      return { name: f.name, label: f.label, type: typeof bag.type === 'string' ? bag.type : undefined, required: Boolean(f.required), attributes: bag };
    }),
    claimedCriteria: params.criteria,
  };
}
