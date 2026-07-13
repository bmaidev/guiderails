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
 * The CI gate (DESIGN §2b). A `@storybook/test-runner` `postVisit` hook that
 * fails CI when a story claims a criterion its rendered surface does not carry —
 * so an agent-legibility regression fails the build exactly as an axe violation
 * does. Copy into `.storybook/test-runner.ts`.
 *
 * Design note: the check runs in **Node**, not the page, so `checkStory` keeps
 * its imports. Playwright supplies only the rendered HTML of `#storybook-root`;
 * that HTML is parsed with jsdom and handed to the *same* `checkStory` the pure
 * test suite verifies. So the gate's logic is exactly what `checks.test.ts`
 * covers under jsdom — only the Playwright plumbing around it is browser-only.
 *
 * BROWSER/CI-VERIFIED: runs under the Playwright-backed test-runner, not the
 * pure `npm test` matrix.
 */

import { getStoryContext } from '@storybook/test-runner';
import type { TestRunnerConfig } from '@storybook/test-runner';
import type { Page } from 'playwright';
import { JSDOM } from 'jsdom';
import { checkStory, type DomElement } from './checks.ts';
import type { GuiderailsParameters } from './parameters.ts';

const config: TestRunnerConfig = {
  async postVisit(page: Page, context) {
    const storyContext = await getStoryContext(page, context);
    const params = storyContext.parameters?.guiderails as GuiderailsParameters | undefined;
    if (!params || params.test === 'off') return;

    const html = await page.locator('#storybook-root').innerHTML();
    const root = new JSDOM(`<!doctype html><body>${html}</body>`).window.document.body as unknown as DomElement;
    const report = checkStory(root, params);

    const failures = report.results.filter((r) => r.applicable && !r.pass);
    if (failures.length === 0) return;

    const detail = failures.map((r) => `${r.criterion}: ${r.failures.join('; ')}`).join('\n');
    if ((params.test ?? 'error') === 'error') {
      throw new Error(`Guiderails criterion checks failed for "${context.title} / ${context.name}":\n${detail}`);
    }
    console.warn(`[guiderails:todo] ${context.title} / ${context.name}\n${detail}`);
  },
};

export default config;
