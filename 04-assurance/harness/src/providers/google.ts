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
 * Google (Gemini) driver — vendor #3, satisfying methodology §3's requirement
 * of at least three independent frontier agents from different vendors.
 *
 * NOT YET EXERCISED AGAINST THE LIVE API. Loop mechanics are covered by stub
 * tests; the wire shape is not. An untested instrument cannot produce evidence:
 * this vendor must complete a live smoke run before entering any round, and any
 * correction it needs must be recorded here.
 */

import { GoogleGenAI } from '@google/genai';
import type { ModelDriver, ModelSession, ModelTurn, ToolSpec, TurnInput } from '../agent-loop.ts';

import { SMOKE_MODELS } from '../models.ts';

/** The cheap tier. A round pins its model explicitly (models.ts). */
export const DEFAULT_GOOGLE_MODEL = SMOKE_MODELS.google;

/** The subset of the SDK the driver uses; keeps the stub client honest. */
export interface GoogleGenAiLike {
  models: {
    generateContent(req: Record<string, unknown>): Promise<GoogleResponse>;
  };
}

interface GooglePart {
  text?: string;
  functionCall?: { name?: string; args?: Record<string, unknown> };
}

interface GoogleResponse {
  candidates?: Array<{ content?: { parts?: GooglePart[] } }>;
}

export interface GoogleDriverOptions {
  model?: string;
  /** Injectable for tests; defaults to env-credential GoogleGenAI(). */
  client?: GoogleGenAiLike;
}

export function googleDriver(opts: GoogleDriverOptions = {}): ModelDriver {
  const model = opts.model ?? DEFAULT_GOOGLE_MODEL;
  const client: GoogleGenAiLike = opts.client ?? (new GoogleGenAI({}) as unknown as GoogleGenAiLike);

  return {
    vendor: 'google',
    model,
    begin(system, tools, userMessage): ModelSession {
      // Gemini takes one `tools` entry carrying many function declarations.
      const functionDeclarations = tools.map((t: ToolSpec) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));
      const contents: Array<Record<string, unknown>> = [{ role: 'user', parts: [{ text: userMessage }] }];
      // Gemini has no tool-call ids; correlate results to calls by name and order.
      let lastCallNames: string[] = [];

      return {
        async next(input: TurnInput): Promise<ModelTurn> {
          if (input.kind === 'toolResults') {
            contents.push({
              role: 'user',
              parts: input.results.map((r, i) => ({
                functionResponse: {
                  name: lastCallNames[i] ?? 'http_request',
                  response: { output: r.content, ...(r.isError ? { error: true } : {}) },
                },
              })),
            });
          } else if (input.kind === 'message') {
            contents.push({ role: 'user', parts: [{ text: input.text }] });
          }

          const response = await client.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: system,
              tools: [{ functionDeclarations }],
            },
          });

          const parts = response.candidates?.[0]?.content?.parts ?? [];
          contents.push({ role: 'model', parts });

          const calls = parts.filter((p): p is GooglePart & { functionCall: { name?: string; args?: Record<string, unknown> } } => Boolean(p.functionCall));
          lastCallNames = calls.map((p) => p.functionCall.name ?? 'http_request');

          return {
            toolCalls: calls.map((p, i) => ({
              // Synthesise a stable id: the loop needs one, the wire has none.
              id: `${p.functionCall.name ?? 'call'}-${contents.length}-${i}`,
              name: p.functionCall.name ?? '',
              input: p.functionCall.args ?? {},
            })),
            text: parts.map((p) => p.text ?? '').join(' ').trim(),
          };
        },
      };
    },
  };
}
