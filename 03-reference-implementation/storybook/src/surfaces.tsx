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
 * Layer-1 journey surfaces rendered through AgDS with the machine markers the
 * criterion gate reads: the journey-state rail (2.4.1), the action receipt
 * (2.4.2), the agent-attribution flag (5.2.1), the human/agent parity affordance
 * (5.6.2) and the third-party-content distinction (5.6.3). Government look above,
 * `data-gr-*` machine meaning carried on the same DOM — the two cannot diverge.
 */

import React from 'react';
import { journeyState, toModelContextTool } from '../../packages/agent-surface/src/index.ts';
import type { JourneySpec, JourneyProgress, ConsequentialEvent, StepSpec, ConsequentialActionSpec } from '../../packages/agent-surface/src/index.ts';

/** A fixed receipt so the rendered surface and the gate's expected event agree deterministically. */
export const DEMO_RECEIPT: ConsequentialEvent = {
  stepId: 'declare',
  actionId: 'CA-2',
  at: '2026-07-14T02:00:00Z',
  reference: 'SSP-REP-2026-000184',
};

/** 2.4.1 — the step-progress rail, exposing current/remaining/kind/prerequisites programmatically. */
export function JourneyStateRail({ spec, progress }: { spec: JourneySpec; progress: JourneyProgress }): React.ReactElement {
  const state = journeyState(spec, progress);
  const done = new Set(progress.completedSteps);
  const unsatisfied = new Map(state.prerequisitesUnsatisfied.map((e) => [e.step, e.missing]));
  return (
    <nav aria-label="Your progress" data-gr-journey-state data-gr-current={state.currentStep ?? ''}
      style={{ borderLeft: '4px solid #046b99', paddingLeft: '1rem' }}>
      <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>Your progress</h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {spec.steps.map((step) => {
          const status = done.has(step.id) ? 'done' : step.id === state.currentStep ? 'doing' : 'todo';
          const missing = unsatisfied.get(step.id) ?? [];
          return (
            <li key={step.id} data-gr-step={step.id} data-gr-step-status={status} data-gr-step-kind={step.kind}
              data-gr-step-requires={(step.requires ?? []).join(' ')}
              style={{ padding: '0.35rem 0', color: status === 'todo' ? '#61666c' : '#050b13', fontWeight: status === 'doing' ? 700 : 400 }}>
              <span aria-hidden="true">{status === 'done' ? '✓ ' : status === 'doing' ? '▸ ' : '○ '}</span>
              {step.title}
              {step.kind === 'consequential' && <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: '#8f5100' }}>· submits</span>}
              {missing.length > 0 && <span style={{ marginLeft: '0.4rem', fontSize: '0.8rem', color: '#61666c' }}>· needs earlier steps</span>}
              <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                {status === 'done' ? 'Completed' : status === 'doing' ? 'In progress' : 'Not started'}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** 2.4.2 — the receipt stating a consequential action occurred, when, and its reference. */
export function ActionReceipt({ event, authority }: { event: ConsequentialEvent; authority: string }): React.ReactElement {
  return (
    <div role="status" data-gr-receipt data-gr-occurred="true" data-gr-action={event.actionId}
      data-gr-reference={event.reference} data-gr-at={event.at}
      style={{ border: '1px solid #0b7b3e', borderLeft: '6px solid #0b7b3e', background: '#f0faf4', padding: '1rem' }}>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>Your report has been lodged</h2>
      <p style={{ margin: 0 }}>
        {authority} received your fortnightly report on{' '}
        <time dateTime={event.at}>14 July 2026</time>. Your reference number is{' '}
        <strong>{event.reference}</strong>. Keep it for your records.
      </p>
    </div>
  );
}

/** 5.2.1 — the flag that a submission was made by an agent on the principal's behalf. */
export function AttributionBadge({ agentId }: { agentId: string }): React.ReactElement {
  return (
    <p data-gr-attribution="agent" data-gr-agent-id={agentId}
      style={{ display: 'inline-block', background: '#eef4fb', border: '1px solid #046b99', borderRadius: 4, padding: '0.35rem 0.6rem', fontSize: '0.9rem' }}>
      Submitted by an agent ({agentId}) acting under your authority.
    </p>
  );
}

/** 5.6.2 — the primary affordance and the agent's-eye view, both derived from the one step. */
export function ParityAffordance({ journeyId, step, action }: { journeyId: string; step: StepSpec; action?: ConsequentialActionSpec }): React.ReactElement {
  const tool = toModelContextTool(journeyId, step, [], action);
  const effect = tool.annotations.destructiveHint ? 'consequential' : 'safe';
  return (
    <div>
      <button type="submit" data-gr-effect={effect}
        style={{ background: '#046b99', color: '#fff', border: 0, borderRadius: 4, padding: '0.6rem 1.1rem', fontWeight: 700 }}>
        {tool.annotations.destructiveHint ? 'Submit report' : 'Continue'}
      </button>
      <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#61666c' }}>The same step, as an agent receives it:</p>
      <code data-gr-agent-view data-gr-destructive={String(tool.annotations.destructiveHint)}
        data-gr-read-only={String(tool.annotations.readOnlyHint)}
        style={{ display: 'block', whiteSpace: 'pre-wrap', background: '#0b1b2b', color: '#d7e3ee', padding: '0.75rem', borderRadius: 4, fontSize: '0.8rem' }}>
        {JSON.stringify({ name: tool.name, annotations: tool.annotations }, null, 2)}
      </code>
    </div>
  );
}

/** 5.6.3 — operator content and third-party content, programmatically distinguished. */
export function MixedContent(): React.ReactElement {
  return (
    <div>
      <section data-gr-origin="operator" style={{ padding: '0.75rem 0' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>Official guidance</h2>
        <p style={{ margin: 0 }}>To be eligible you must be enrolled in an approved course and meet the residency requirement.</p>
      </section>
      <aside data-gr-origin="third-party" aria-label="Content from your course provider"
        style={{ border: '1px dashed #8f5100', background: '#fdf6ec', padding: '0.75rem', marginTop: '0.5rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#8f5100' }}>From your course provider (not {`the department`}):</p>
        <p style={{ margin: '0.25rem 0 0' }}>Semester 2 classes begin Monday. Contact the campus office to defer.</p>
      </aside>
    </div>
  );
}
