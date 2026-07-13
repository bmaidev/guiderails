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
 * Storybook preview-side wrapper (DESIGN §2). A thin decorator that, after each
 * story renders, feeds the story root (`#storybook-root`) and its
 * `parameters.guiderails` to the pure engine and emits the verdict + the
 * agent's-eye view over the channel for the panel to render.
 *
 * BROWSER/CI-VERIFIED, not covered by the pure `npm test` matrix: it depends on
 * Storybook's preview runtime. The substance it calls — `checkStory`,
 * `buildAgentView` — is fully tested in `checks.test.ts` under jsdom.
 */

import { addons } from 'storybook/preview-api';
import { checkStory, type DomElement } from './checks.ts';
import { buildAgentView } from './agent-view.ts';
import type { GuiderailsParameters } from './parameters.ts';

export const ADDON_ID = 'guiderails';
export const RESULT_EVENT = `${ADDON_ID}/result`;

/** A Storybook decorator: run the checks after render, emit for the panel. */
export function withGuiderails(storyFn: () => unknown, context: { parameters: { guiderails?: GuiderailsParameters } }): unknown {
  const rendered = storyFn();
  const params = context.parameters.guiderails;
  if (params) {
    // Defer to next tick so the DOM is present.
    queueMicrotask(() => {
      const root = document.querySelector('#storybook-root') as unknown as DomElement | null;
      if (!root) return;
      const report = checkStory(root, params);
      const view = buildAgentView(params);
      addons.getChannel().emit(RESULT_EVENT, { report, view });
    });
  }
  return rendered;
}

export const decorators = [withGuiderails];
