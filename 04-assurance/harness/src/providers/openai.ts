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
 * OpenAI driver for the vendor-neutral agent loop — vendor #2 of the ≥3 the
 * methodology requires (§3). Uses Chat Completions function calling.
 *
 * NOT YET EXERCISED AGAINST THE LIVE API. The loop mechanics are covered by
 * stub tests; the wire shape is not. Before this vendor enters any round it
 * must complete a live smoke run, and any correction recorded here. Treat an
 * untested adapter as an untested instrument: it cannot produce evidence.
 */

import OpenAI from 'openai';
import type { ModelDriver, ModelSession, ModelTurn, ToolSpec, TurnInput } from '../agent-loop.ts';

export const DEFAULT_OPENAI_MODEL = 'gpt-5';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface OpenAiDriverOptions {
  model?: string;
  /** Injectable for tests; defaults to env-credential OpenAI(). */
  client?: Pick<OpenAI, 'chat'>;
}

export function openaiDriver(opts: OpenAiDriverOptions = {}): ModelDriver {
  const model = opts.model ?? DEFAULT_OPENAI_MODEL;
  const client = opts.client ?? new OpenAI();

  return {
    vendor: 'openai',
    model,
    begin(system, tools, userMessage): ModelSession {
      const openaiTools = tools.map((t: ToolSpec) => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      const messages: ChatMessage[] = [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ];

      return {
        async next(input: TurnInput): Promise<ModelTurn> {
          if (input.kind === 'toolResults') {
            for (const r of input.results) {
              messages.push({ role: 'tool', tool_call_id: r.id, content: r.content });
            }
          } else if (input.kind === 'message') {
            messages.push({ role: 'user', content: input.text });
          }

          const response = await client.chat.completions.create({
            model,
            messages,
            tools: openaiTools,
            tool_choice: 'auto',
          });
          const choice = response.choices[0]?.message;
          if (!choice) return { toolCalls: [], text: '' };
          messages.push(choice);

          const toolCalls = (choice.tool_calls ?? []).flatMap((tc) => {
            // Only function calls carry a name/arguments pair; ignore any other kind.
            if (tc.type !== 'function') return [];
            let parsed: Record<string, unknown> = {};
            try {
              parsed = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>;
            } catch {
              // Malformed arguments are a failed tool call, not a crash: the loop
              // will nudge, and a persistently malformed agent scores unrecoverable.
              return [];
            }
            return [{ id: tc.id, name: tc.function.name, input: parsed }];
          });

          return { toolCalls, text: choice.content ?? '' };
        },
      };
    },
  };
}
