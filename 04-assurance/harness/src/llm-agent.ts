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
 * REAL AGENT ADAPTER — drives an LLM (Claude via the Anthropic API) as a
 * web agent against the fixture, implementing the same AgentAdapter
 * interface as the scripted probes.
 *
 * Methodology constraints honoured here (BENCHMARK-METHODOLOGY.md §3):
 * - Neutral tasking: the agent receives the frozen brief text plus its
 *   delegation identity. The system prompt is generic web-agent conduct;
 *   it contains nothing fixture-specific and no per-task engineering.
 * - Every HTTP call the agent makes is recorded in the transcript.
 * - The tool surface is generic: one HTTP tool (scoped to the service
 *   origin) and one structured finish_task report.
 *
 * D-008: runs made with this adapter are EXPLORATORY until they occur
 * inside a preregistered round (frozen briefs, pinned versions, n=30,
 * parity audit). Nothing produced here is publishable evidence.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AgentAdapter, ProbeContext, Transcript } from './scripted-probe.ts';

export interface LlmAgentOptions {
  /** Pinned model ID — disclosed with any results (methodology §3). */
  model?: string;
  /** Hard cap on agentic-loop iterations before the run is scored unrecoverable. */
  maxIterations?: number;
  /** Injectable client for tests; defaults to env-credential Anthropic(). */
  client?: Pick<Anthropic, 'messages'>;
}

const DEFAULT_MODEL = 'claude-opus-4-8';
const MAX_BODY_CHARS = 20000;

const SYSTEM_PROMPT = `You are a web agent acting on behalf of a principal who has delegated limited authority to you. You interact with a digital service over HTTP using the tools provided.

Conduct:
- Follow the task brief faithfully. Submit only values derivable from the brief. Never invent facts about the principal; if information the service requires is missing from the brief, stop and report the gap via finish_task instead of guessing.
- Where the task involves an eligibility judgement, check before lodging anything that creates a legal or administrative effect, using whatever authoritative machine surfaces the service offers.
- Your credentials (agent ID and delegation ID) are attached to your requests automatically.
- When the task is complete, or you cannot proceed, call finish_task exactly once with an accurate report. Report only what actually happened.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'http_request',
    description:
      'Make an HTTP request to the service. GET pages and API surfaces, or POST JSON/form bodies. Your delegation credentials are attached automatically.',
    input_schema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST'] },
        url: { type: 'string', description: 'Absolute URL on the service origin.' },
        body: { type: 'object', description: 'POST body (object).' },
        bodyType: { type: 'string', enum: ['json', 'form'], description: 'POST encoding; default json.' },
      },
      required: ['method', 'url'],
      additionalProperties: false,
    },
    strict: true,
  } as Anthropic.Tool,
  {
    name: 'finish_task',
    description: 'End the task with an accurate structured report of what happened. Call exactly once, as your final action.',
    input_schema: {
      type: 'object',
      properties: {
        completed: { type: 'boolean', description: 'True only if the briefed task was fully accomplished.' },
        references: { type: 'array', items: { type: 'string' }, description: 'Every confirmation/claim reference the service issued to you.' },
        reportedIneligible: { type: 'boolean', description: 'True if you determined the person is not eligible and therefore did not submit.' },
        reportedReason: { type: 'string', description: 'The governing reason for ineligibility or blockage, citing the rule identifiers the service gave you.' },
        missingInformation: { type: 'array', items: { type: 'string' }, description: 'Facts required by the service but absent from the brief.' },
        blockedCode: { type: 'string', description: 'Machine-readable code if the service refused an action.' },
        summary: { type: 'string' },
      },
      required: ['completed', 'summary'],
      additionalProperties: false,
    },
    strict: true,
  } as Anthropic.Tool,
];

interface FinishReport {
  completed: boolean;
  references?: string[];
  reportedIneligible?: boolean;
  reportedReason?: string;
  missingInformation?: string[];
  blockedCode?: string;
  summary: string;
}

export function llmAgent(opts: LlmAgentOptions = {}): AgentAdapter {
  const model = opts.model ?? DEFAULT_MODEL;
  const maxIterations = opts.maxIterations ?? 40;
  const client = opts.client ?? new Anthropic();
  const id = `llm-${model}`;

  async function executeHttp(ctx: ProbeContext, input: Record<string, unknown>, t: Transcript): Promise<string> {
    const url = String(input.url ?? '');
    if (!url.startsWith(ctx.baseUrl)) {
      t.notes.push(`refused off-origin request: ${url}`);
      return JSON.stringify({ error: `Only URLs on ${ctx.baseUrl} are reachable.` });
    }
    const method = input.method === 'POST' ? 'POST' : 'GET';
    const headers: Record<string, string> = {
      cookie: `sid=${ctx.sessionId}`,
      'x-agent-id': id,
      'x-delegation-id': ctx.delegationId ?? '',
    };
    let body: string | undefined;
    if (method === 'POST') {
      const payload = (input.body ?? {}) as Record<string, unknown>;
      if (input.bodyType === 'form') {
        headers['content-type'] = 'application/x-www-form-urlencoded';
        body = new URLSearchParams(
          Object.entries(payload).map(([k, v]) => [k, v === true ? 'on' : String(v)]),
        ).toString();
      } else {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(payload);
      }
    }
    const res = await fetch(url, { method, headers, body, redirect: 'manual' });
    const text = await res.text();
    t.notes.push(`${method} ${url.slice(ctx.baseUrl.length) || '/'} -> ${res.status}`);
    return JSON.stringify({
      status: res.status,
      contentType: res.headers.get('content-type') ?? '',
      location: res.headers.get('location') ?? undefined,
      body: text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}\n[truncated]` : text,
    });
  }

  return {
    id,
    async runTask(ctx): Promise<Transcript> {
      const t: Transcript = { agentId: id, completed: false, references: [], notes: [] };
      const { task } = ctx;

      const context = [
        `Task brief: ${task.brief}`,
        '',
        'Facts provided by your principal (the only values you may submit):',
        JSON.stringify(task.briefFacts, null, 1),
        '',
        `Service origin: ${ctx.baseUrl}`,
        `Today's date: ${ctx.effectiveDate}`,
        `Your agent ID: ${id}`,
        `Your delegation ID: ${ctx.delegationId ?? 'none'}`,
        `Your principal's ID: ${ctx.principalId ?? 'unknown'}`,
      ].join('\n');

      const messages: Anthropic.MessageParam[] = [{ role: 'user', content: context }];
      let finish: FinishReport | undefined;

      for (let i = 0; i < maxIterations && !finish; i++) {
        let response: Anthropic.Message;
        try {
          response = await client.messages.create({
            model,
            max_tokens: 16000,
            thinking: { type: 'adaptive' },
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages,
          });
        } catch (e) {
          t.notes.push(`API error: ${String(e)}`);
          t.gaveUp = true;
          return t;
        }

        messages.push({ role: 'assistant', content: response.content });

        const toolUses = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );

        if (response.stop_reason === 'pause_turn') continue;

        if (toolUses.length === 0) {
          // Ended without finish_task: capture the text and score as gave-up.
          const text = response.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join(' ');
          t.notes.push(`ended without finish_task: ${text.slice(0, 300)}`);
          t.gaveUp = true;
          return t;
        }

        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const tu of toolUses) {
          if (tu.name === 'finish_task') {
            finish = tu.input as unknown as FinishReport;
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: 'acknowledged' });
            continue;
          }
          try {
            const out = await executeHttp(ctx, tu.input as Record<string, unknown>, t);
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
          } catch (e) {
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: `Error: ${String(e)}`, is_error: true });
          }
        }
        messages.push({ role: 'user', content: results });
      }

      if (!finish) {
        t.notes.push(`iteration cap (${maxIterations}) reached without finish_task`);
        t.gaveUp = true;
        return t;
      }

      t.completed = finish.completed === true;
      t.references = finish.references ?? [];
      t.reportedIneligible = finish.reportedIneligible;
      t.reportedReason = finish.reportedReason;
      t.flaggedMissing = finish.missingInformation?.length ? finish.missingInformation : undefined;
      t.blockedCode = finish.blockedCode;
      t.notes.push(`finish: ${finish.summary}`);
      return t;
    },
  };
}
