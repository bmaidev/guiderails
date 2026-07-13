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
 * The "Agent's-eye view" Storybook panel (DESIGN §2a). A thin presenter: it
 * subscribes to the engine's result over the channel and renders the WebMCP
 * tool descriptor, the per-field agent view, and the criterion verdicts.
 *
 * BROWSER-VERIFIED: depends on Storybook's manager runtime and React. The data
 * it shows is produced by `buildAgentView` / `checkStory`, both fully tested
 * under jsdom in `checks.test.ts`.
 */

import React, { useState } from 'react';
import { addons, types } from 'storybook/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import { useChannel } from 'storybook/manager-api';
import type { CheckReport } from './checks.ts';
import type { AgentView } from './agent-view.ts';
import { ADDON_ID, RESULT_EVENT, PANEL_ID } from './constants.ts';


function Panel(props: { active: boolean }) {
  const [state, setState] = useState<{ report: CheckReport; view: AgentView } | null>(null);
  useChannel({ [RESULT_EVENT]: (payload: { report: CheckReport; view: AgentView }) => setState(payload) });

  if (!props.active) return null;
  if (!state) return <div style={{ padding: 12 }}>No <code>parameters.guiderails</code> on this story.</div>;

  const { report, view } = state;
  return (
    <div style={{ padding: 12, fontFamily: 'monospace' }}>
      <h3>Agent&rsquo;s-eye view</h3>
      {view.tool && (
        <section>
          <strong>{view.tool.name}</strong> — {view.tool.title}
          <ul>
            <li>read-only: {String(view.tool.annotations.readOnlyHint)}</li>
            <li>requires confirmation: {String(view.tool.annotations.requiresPrincipalConfirmation)}</li>
            <li>principal-only: {String(view.tool.annotations.principalOnly)}</li>
          </ul>
        </section>
      )}
      <section>
        <h4>Fields an agent sees</h4>
        <ul>
          {view.fields.map((f) => (
            <li key={f.name}>{f.name}: {f.type ?? 'text'}{f.required ? ' (required)' : ''}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Criteria {report.pass ? '✓ pass' : '✗ fail'} ({report.mode})</h4>
        <ul>
          {report.results.map((r) => (
            <li key={r.criterion} style={{ color: !r.applicable ? '#888' : r.pass ? 'green' : 'red' }}>
              {r.criterion}: {!r.applicable ? 'n/a' : r.pass ? 'pass' : r.failures.join('; ')}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: "Agent's-eye view",
    render: ({ active }) => (
      <AddonPanel active={Boolean(active)}>
        <Panel active={Boolean(active)} />
      </AddonPanel>
    ),
  });
});
