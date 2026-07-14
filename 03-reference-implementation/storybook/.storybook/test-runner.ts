/*
 * Copyright 2026 Black Mountain AI (BMAI). Apache-2.0.
 *
 * The CI gate, wired: runs the Guiderails check engine over each story's real
 * rendered DOM in Playwright, failing the build when a story claims a criterion
 * its surface does not carry. The engine (checkStory) is imported from the
 * addon and is the same one verified under jsdom in the pure test suite.
 */
import { getStoryContext } from '@storybook/test-runner';
import type { TestRunnerConfig } from '@storybook/test-runner';
import { JSDOM } from 'jsdom';
import { checkStory, type DomElement } from '../../packages/storybook-addon/src/checks.ts';
import type { GuiderailsParameters } from '../../packages/storybook-addon/src/parameters.ts';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
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
