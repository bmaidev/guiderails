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
 * Which model each vendor runs, and which tier that model belongs to.
 *
 * Two tiers, because the harness is asked to do two different jobs:
 *
 *  - **smoke** — does the driver speak its vendor's wire protocol? Any competent
 *    model answers that. This is the default, because it is the common case and
 *    because a frontier model on a smoke run buys nothing and costs real money.
 *  - **round** — the frontier models methodology §3 requires: >=3 independent
 *    frontier agents, versions pinned and disclosed. A round must select these
 *    explicitly. A benchmark number produced by the smoke tier is not a
 *    benchmark number, and the run record must make that unambiguous.
 *
 * Nothing here decides which tier a *round* uses — the preregistration does,
 * and it names the model. This only decides what you get if you say nothing,
 * and the answer is: the cheap one.
 */

/** Methodology §3: >=3 independent frontier agents from different vendors. */
export type Vendor = 'anthropic' | 'openai' | 'google';

export const VENDORS: Vendor[] = ['anthropic', 'openai', 'google'];

/** Frontier tier. Pinned and disclosed with any published result. */
export const ROUND_MODELS: Record<Vendor, string> = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-5',
  google: 'gemini-3-pro',
};

/**
 * Cheap tier, and the default. Verified model IDs, not guesses: a nonexistent
 * ID fails with a 404 that is indistinguishable, on the very run meant to find
 * wire-shape bugs, from a wire-shape bug.
 */
export const SMOKE_MODELS: Record<Vendor, string> = {
  anthropic: 'claude-haiku-4-5',
  openai: 'gpt-5-mini',
  google: 'gemini-3.5-flash',
};

export const DEFAULT_MODELS = SMOKE_MODELS;

/** Per-vendor override, read from `.env` at the repository root. */
export const MODEL_VARIABLES: Record<Vendor, string> = {
  anthropic: 'ANTHROPIC_MODEL',
  openai: 'OPENAI_MODEL',
  google: 'GOOGLE_MODEL',
};

export type ModelTier = 'smoke' | 'round' | 'other';
export type ModelSource = 'flag' | 'env' | 'default';

export interface ResolvedModel {
  model: string;
  /** Where the choice came from. Recorded in the run file: a model set from an
   *  untracked `.env` is otherwise invisible to anyone reading the results. */
  source: ModelSource;
  tier: ModelTier;
}

export function tierOf(vendor: Vendor, model: string): ModelTier {
  if (model === ROUND_MODELS[vendor]) return 'round';
  if (model === SMOKE_MODELS[vendor]) return 'smoke';
  return 'other';
}

/** Precedence: an explicit `--model` beats `.env`, which beats the cheap default. */
export function resolveModel(
  vendor: Vendor,
  flagModel?: string,
  env: Record<string, string | undefined> = process.env,
): ResolvedModel {
  const fromEnv = (env[MODEL_VARIABLES[vendor]] ?? '').trim();
  const model = flagModel?.trim() || fromEnv || DEFAULT_MODELS[vendor];
  const source: ModelSource = flagModel?.trim() ? 'flag' : fromEnv ? 'env' : 'default';
  return { model, source, tier: tierOf(vendor, model) };
}

/**
 * Adaptive thinking exists on Claude 4.6 and later. Earlier models reject it,
 * and the cheap tier is one of them — so the tier and the thinking parameter
 * have to move together, or the default run 400s before it reaches the fixture.
 */
export function supportsAdaptiveThinking(model: string): boolean {
  return /^claude-(opus-4-[6-9]|sonnet-(4-6|5)|fable-5|mythos-5)/.test(model);
}
