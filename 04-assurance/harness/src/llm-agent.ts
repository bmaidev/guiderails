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
 * Real-agent adapters. The loop, the tools and the scoring semantics live in
 * agent-loop.ts and are identical across vendors — a difference between the
 * vendors' harnesses would be a confound, not a finding (methodology §3).
 * Adding vendor #3 means adding one driver, not one adapter.
 *
 * D-008: runs made with these adapters are EXPLORATORY until they occur inside
 * a preregistered round (frozen briefs, pinned versions, n=30, parity audit).
 */

import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import { agentFor, type AgentOptions } from './agent-loop.ts';
import { anthropicDriver, DEFAULT_ANTHROPIC_MODEL } from './providers/anthropic.ts';
import { openaiDriver, DEFAULT_OPENAI_MODEL } from './providers/openai.ts';
import { googleDriver, DEFAULT_GOOGLE_MODEL, type GoogleGenAiLike } from './providers/google.ts';
import type { AgentAdapter } from './scripted-probe.ts';

export { agentFor } from './agent-loop.ts';
export { anthropicDriver, DEFAULT_ANTHROPIC_MODEL } from './providers/anthropic.ts';
export { openaiDriver, DEFAULT_OPENAI_MODEL } from './providers/openai.ts';
export { googleDriver, DEFAULT_GOOGLE_MODEL } from './providers/google.ts';

/** Methodology §3: >=3 independent frontier agents from different vendors. */
export type Vendor = 'anthropic' | 'openai' | 'google';

export const VENDORS: Vendor[] = ['anthropic', 'openai', 'google'];

export const DEFAULT_MODELS: Record<Vendor, string> = {
  anthropic: DEFAULT_ANTHROPIC_MODEL,
  openai: DEFAULT_OPENAI_MODEL,
  google: DEFAULT_GOOGLE_MODEL,
};

export interface LlmAgentOptions extends AgentOptions {
  vendor?: Vendor;
  /** Pinned model ID — disclosed with any results (methodology §3). */
  model?: string;
  /** Injectable client for tests; typed per the chosen vendor's SDK. */
  client?: Pick<Anthropic, 'messages'> | Pick<OpenAI, 'chat'> | GoogleGenAiLike;
}

/** Build an adapter for one vendor. Every vendor drives the identical loop. */
export function llmAgent(opts: LlmAgentOptions = {}): AgentAdapter {
  const vendor = opts.vendor ?? 'anthropic';
  const { maxIterations } = opts;

  if (vendor === 'openai') {
    return agentFor(
      openaiDriver({ model: opts.model, client: opts.client as Pick<OpenAI, 'chat'> | undefined }),
      { maxIterations },
    );
  }
  if (vendor === 'google') {
    return agentFor(
      googleDriver({ model: opts.model, client: opts.client as GoogleGenAiLike | undefined }),
      { maxIterations },
    );
  }
  return agentFor(
    anthropicDriver({ model: opts.model, client: opts.client as Pick<Anthropic, 'messages'> | undefined }),
    { maxIterations },
  );
}
