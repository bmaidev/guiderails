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

import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { anthropicDriver } from './providers/anthropic.ts';
import {
  DEFAULT_MODELS,
  LIVE_SMOKE_RUNS,
  ROUND_MODELS,
  SMOKE_MODELS,
  VENDORS,
  liveSmokeRunFor,
  resolveModel,
  supportsAdaptiveThinking,
  tierOf,
} from './models.ts';

test('the default is the cheap tier for every vendor', () => {
  // The point of the whole module. A frontier model on a smoke run buys nothing.
  for (const vendor of VENDORS) {
    strictEqual(DEFAULT_MODELS[vendor], SMOKE_MODELS[vendor]);
    strictEqual(resolveModel(vendor, undefined, {}).tier, 'smoke');
  }
});

test('every vendor has a distinct round model and smoke model', () => {
  for (const vendor of VENDORS) {
    ok(ROUND_MODELS[vendor], `${vendor} has no round model`);
    ok(SMOKE_MODELS[vendor], `${vendor} has no smoke model`);
    ok(ROUND_MODELS[vendor] !== SMOKE_MODELS[vendor], `${vendor}'s tiers must differ`);
  }
});

test('--model beats .env, which beats the default', () => {
  const env = { ANTHROPIC_MODEL: 'from-env' };
  deepStrictEqual(resolveModel('anthropic', 'from-flag', env), {
    model: 'from-flag',
    source: 'flag',
    tier: 'other',
  });
  deepStrictEqual(resolveModel('anthropic', undefined, env), { model: 'from-env', source: 'env', tier: 'other' });
  strictEqual(resolveModel('anthropic', undefined, {}).source, 'default');
});

test('a blank or whitespace override is not an override', () => {
  strictEqual(resolveModel('openai', '   ', { OPENAI_MODEL: '' }).source, 'default');
  strictEqual(resolveModel('openai', '', {}).model, SMOKE_MODELS.openai);
});

test('one vendor\'s model variable does not leak into another', () => {
  strictEqual(resolveModel('google', undefined, { OPENAI_MODEL: 'gpt-5' }).model, SMOKE_MODELS.google);
});

test('the round tier is recognised when explicitly asked for', () => {
  const resolved = resolveModel('anthropic', ROUND_MODELS.anthropic, {});
  strictEqual(resolved.tier, 'round');
  strictEqual(tierOf('google', ROUND_MODELS.google), 'round');
  strictEqual(tierOf('google', 'something-else'), 'other');
});

test('adaptive thinking is claimed only for models that have it', () => {
  // Claude 4.6+ only. The cheap tier predates it and would reject the parameter.
  ok(supportsAdaptiveThinking('claude-opus-4-8'));
  ok(supportsAdaptiveThinking('claude-sonnet-5'));
  ok(!supportsAdaptiveThinking(SMOKE_MODELS.anthropic));
  ok(!supportsAdaptiveThinking('claude-haiku-4-5'));
});

/** Capture the request the driver would put on the wire. */
async function requestFor(model: string): Promise<Record<string, unknown>> {
  let captured: Record<string, unknown> = {};
  const client = {
    messages: {
      create: async (req: Record<string, unknown>) => {
        captured = req;
        return { content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn' };
      },
    },
  };
  const driver = anthropicDriver({ model, client: client as never });
  await driver.begin('system', [], 'hello').next({ kind: 'start' });
  return captured;
}

test('the driver omits thinking on a model that cannot think adaptively', async () => {
  // Regression: sending thinking to the cheap default 400s before the fixture
  // is ever reached, which would read as a wire-shape bug in the driver.
  const smoke = await requestFor(SMOKE_MODELS.anthropic);
  ok(!('thinking' in smoke), 'thinking must not be sent to a pre-4.6 model');

  const round = await requestFor(ROUND_MODELS.anthropic);
  deepStrictEqual(round.thinking, { type: 'adaptive' });
});

test('thinking can be forced off on a model that supports it', async () => {
  let captured: Record<string, unknown> = {};
  const client = {
    messages: {
      create: async (req: Record<string, unknown>) => {
        captured = req;
        return { content: [], stop_reason: 'end_turn' };
      },
    },
  };
  const driver = anthropicDriver({ model: ROUND_MODELS.anthropic, thinking: false, client: client as never });
  await driver.begin('s', [], 'hello').next({ kind: 'start' });
  ok(!('thinking' in captured));
});

test('every live-verified model belongs to the vendor that claims it', () => {
  // A register that can name any string is not evidence of anything.
  for (const vendor of VENDORS) {
    for (const run of LIVE_SMOKE_RUNS[vendor]) {
      ok(run.model.length > 0, `${vendor} has a nameless run`);
      ok(/^\d{4}-\d{2}-\d{2}$/.test(run.date), `${vendor}/${run.model}: date must be ISO`);
      ok(run.correction.length > 0, `${vendor}/${run.model}: say "none" rather than nothing`);
    }
  }
});

test('every default model has now made a live request', () => {
  // It had not, when this register was written: claude-haiku-4-5 was the
  // Anthropic default and had never run. The first default run verified it,
  // and verified the adaptive-thinking gate against the real API rather than
  // a stub. If a future default is added unverified, this fails — as it should.
  for (const vendor of VENDORS) {
    ok(
      liveSmokeRunFor(vendor, SMOKE_MODELS[vendor]),
      `${vendor}'s default model has never made a live request; it cannot be the default`,
    );
  }
});

test('a model with no live run is reported as unverified', () => {
  // gpt-5 and gemini-3-pro are the round models and have never run live. The
  // register must keep saying so until they do: an untested instrument cannot
  // produce evidence, and a round pins the round model.
  strictEqual(liveSmokeRunFor('openai', ROUND_MODELS.openai), undefined);
  strictEqual(liveSmokeRunFor('google', ROUND_MODELS.google), undefined);
  strictEqual(liveSmokeRunFor('anthropic', ROUND_MODELS.anthropic)?.model, ROUND_MODELS.anthropic);
  strictEqual(liveSmokeRunFor('anthropic', 'claude-not-a-model'), undefined);
});
