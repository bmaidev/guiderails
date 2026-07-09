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
 * Loop-mechanics tests for the LLM agent adapter using a scripted stub
 * in place of the Anthropic client — no network, no credentials, CI-safe.
 * Live behaviour is exercised via `npm run agents` (exploratory only).
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { llmAgent } from './llm-agent.ts';
import { TASKS } from './tasks.ts';
import { createFixtureServer } from '../../../03-reference-implementation/conformant/src/server.ts';
import { Store } from '../../../03-reference-implementation/conformant/src/store.ts';

interface StubTurn {
  content: unknown[];
  stop_reason?: string;
}

/** Minimal Anthropic-client stub: yields scripted turns, records requests. */
function stubClient(turns: StubTurn[]) {
  const requests: unknown[] = [];
  let i = 0;
  return {
    requests,
    messages: {
      create: async (params: unknown) => {
        requests.push(params);
        const turn = turns[Math.min(i, turns.length - 1)];
        i += 1;
        return { content: turn.content, stop_reason: turn.stop_reason ?? 'tool_use' };
      },
    },
  } as never;
}

const T1A = TASKS.find((t) => t.id === 'T1a')!;

let server: http.Server;
let base: string;

before(async () => {
  const store = new Store();
  server = createFixtureServer(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

after(() => server.close());

function ctx(sessionId: string) {
  return {
    baseUrl: base,
    task: T1A,
    sessionId,
    effectiveDate: '2026-07-09',
    delegationId: 'DLG-X',
    principalId: 'P-X',
  };
}

test('executes http_request against the fixture and maps finish_task to the transcript', async () => {
  const client = stubClient([
    {
      content: [
        { type: 'tool_use', id: 'tu1', name: 'http_request', input: { method: 'GET', url: `PLACEHOLDER/.well-known/guiderails.json` } },
      ],
    },
    {
      content: [
        { type: 'tool_use', id: 'tu2', name: 'finish_task', input: { completed: true, references: ['SSP-00000001'], summary: 'done' } },
      ],
      stop_reason: 'tool_use',
    },
  ]);
  // Patch the placeholder now that the ephemeral port is known
  (client as { requests: unknown[] }).requests; // keep type simple
  const agent = llmAgent({ client, maxIterations: 5 });
  const c = ctx('llm-t1');
  // rewrite the scripted URL to the live base
  const stub = client as unknown as { messages: { create: (p: unknown) => Promise<{ content: { input?: { url?: string } }[] }> } };
  const origCreate = stub.messages.create.bind(stub.messages);
  stub.messages.create = async (p: unknown) => {
    const r = await origCreate(p);
    for (const b of r.content) if (b.input?.url) b.input.url = b.input.url.replace('PLACEHOLDER', base);
    return r;
  };

  const t = await agent.runTask(c);
  assert.equal(t.completed, true);
  assert.deepEqual(t.references, ['SSP-00000001']);
  assert.ok(t.notes.some((n) => n.includes('GET /.well-known/guiderails.json -> 200')));
  assert.ok(t.notes.some((n) => n.includes('finish: done')));
});

test('refuses off-origin requests and records the refusal', async () => {
  const client = stubClient([
    {
      content: [
        { type: 'tool_use', id: 'tu1', name: 'http_request', input: { method: 'GET', url: 'https://attacker.example/exfil' } },
      ],
    },
    {
      content: [
        { type: 'tool_use', id: 'tu2', name: 'finish_task', input: { completed: false, summary: 'could not reach external host' } },
      ],
    },
  ]);
  const agent = llmAgent({ client, maxIterations: 5 });
  const t = await agent.runTask(ctx('llm-offorigin'));
  assert.equal(t.completed, false);
  assert.ok(t.notes.some((n) => n.includes('refused off-origin request')));
});

test('iteration cap scores the run as gave-up', async () => {
  const client = stubClient([
    {
      content: [
        { type: 'tool_use', id: 'tuN', name: 'http_request', input: { method: 'GET', url: 'PLACEHOLDER-NEVER-MATCHES' } },
      ],
    },
  ]);
  const agent = llmAgent({ client, maxIterations: 3 });
  const t = await agent.runTask(ctx('llm-cap'));
  assert.equal(t.gaveUp, true);
  assert.ok(t.notes.some((n) => n.includes('iteration cap (3)')));
});

test('a text-only turn is nudged back onto the tool channel, then recovers', async () => {
  // Reproduces the observed failure: the model emits a tool call as literal
  // text ("<invoke name=...") instead of a tool_use block.
  const client = stubClient([
    { content: [{ type: 'text', text: 'court\n<invoke name="http_request">' }], stop_reason: 'end_turn' },
    { content: [{ type: 'tool_use', id: 'tu1', name: 'finish_task', input: { completed: true, summary: 'recovered' } }] },
  ]);
  const agent = llmAgent({ client, maxIterations: 5 });
  const t = await agent.runTask(ctx('llm-nudge'));
  assert.equal(t.gaveUp, undefined);
  assert.equal(t.completed, true);
  assert.ok(t.notes.some((n) => n.includes('no tool call (nudge 1/2)')));
  assert.ok(t.notes.some((n) => n.includes('finish: recovered')));
});

test('persistent text-only turns give up only after the nudge budget is spent', async () => {
  const client = stubClient([
    { content: [{ type: 'text', text: 'I think the task is done.' }], stop_reason: 'end_turn' },
  ]);
  const agent = llmAgent({ client, maxIterations: 10 });
  const t = await agent.runTask(ctx('llm-notool'));
  assert.equal(t.gaveUp, true);
  assert.ok(t.notes.some((n) => n.includes('ended without finish_task after 2 nudges')));
  assert.equal(t.notes.filter((n) => n.includes('nudge')).length, 3); // 2 nudges + the give-up line
});

test('delegation headers ride on every request the agent makes', async () => {
  const client = stubClient([
    {
      content: [
        { type: 'tool_use', id: 'tu1', name: 'http_request', input: { method: 'POST', url: 'PLACEHOLDER/api/journeys/J1/steps/identity', body: { values: {} }, bodyType: 'json' } },
      ],
    },
    { content: [{ type: 'tool_use', id: 'tu2', name: 'finish_task', input: { completed: false, summary: 'probe' } }] },
  ]);
  const stub = client as unknown as { messages: { create: (p: unknown) => Promise<{ content: { input?: { url?: string } }[] }> } };
  const orig = stub.messages.create.bind(stub.messages);
  stub.messages.create = async (p: unknown) => {
    const r = await orig(p);
    for (const b of r.content) if (b.input?.url) b.input.url = b.input.url.replace('PLACEHOLDER', base);
    return r;
  };
  const agent = llmAgent({ client, maxIterations: 5 });
  const t = await agent.runTask(ctx('llm-headers'));
  // 422 (validation) not 403: the delegation/agent headers were accepted and parsed
  assert.ok(t.notes.some((n) => n.includes('POST /api/journeys/J1/steps/identity -> 422')));
});
