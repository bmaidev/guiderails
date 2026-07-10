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

/** Anthropic (Claude) driver for the vendor-neutral agent loop. */

import Anthropic from '@anthropic-ai/sdk';
import type { ModelDriver, ModelSession, ModelTurn, ToolSpec, TurnInput } from '../agent-loop.ts';
import { SMOKE_MODELS, supportsAdaptiveThinking } from '../models.ts';

/** The cheap tier. A round pins its model explicitly (models.ts). */
export const DEFAULT_ANTHROPIC_MODEL = SMOKE_MODELS.anthropic;

export interface AnthropicDriverOptions {
  model?: string;
  /** Injectable for tests; defaults to env-credential Anthropic(). */
  client?: Pick<Anthropic, 'messages'>;
  maxTokens?: number;
  /** Force thinking off. Ignored where the model cannot think adaptively anyway. */
  thinking?: boolean;
}

export function anthropicDriver(opts: AnthropicDriverOptions = {}): ModelDriver {
  const model = opts.model ?? DEFAULT_ANTHROPIC_MODEL;
  const client = opts.client ?? new Anthropic();
  const maxTokens = opts.maxTokens ?? 16000;
  // Sending `thinking` to a model that predates adaptive thinking is a 400.
  const thinking = (opts.thinking ?? true) && supportsAdaptiveThinking(model);

  return {
    vendor: 'anthropic',
    model,
    begin(system, tools, userMessage): ModelSession {
      const anthropicTools: Anthropic.Tool[] = tools.map((t: ToolSpec) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      }));
      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }];

      return {
        async next(input: TurnInput): Promise<ModelTurn> {
          if (input.kind === 'toolResults') {
            messages.push({
              role: 'user',
              content: input.results.map((r) => ({
                type: 'tool_result' as const,
                tool_use_id: r.id,
                content: r.content,
                ...(r.isError ? { is_error: true } : {}),
              })),
            });
          } else if (input.kind === 'message') {
            messages.push({ role: 'user', content: input.text });
          }

          // A server-side pause is not a turn; resume rather than surfacing it.
          for (;;) {
            const response = await client.messages.create({
              model,
              max_tokens: maxTokens,
              ...(thinking ? { thinking: { type: 'adaptive' as const } } : {}),
              system,
              tools: anthropicTools,
              messages,
            });
            messages.push({ role: 'assistant', content: response.content });
            if (response.stop_reason === 'pause_turn') continue;

            return {
              toolCalls: response.content
                .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
                .map((b) => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> })),
              text: response.content
                .filter((b): b is Anthropic.TextBlock => b.type === 'text')
                .map((b) => b.text)
                .join(' '),
            };
          }
        },
      };
    },
  };
}
