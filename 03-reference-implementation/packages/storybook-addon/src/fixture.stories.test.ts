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
 * Verify the fixture stories the way the browser CI job would — run each
 * story's rendered output through the engine under jsdom. So the green the
 * Storybook + Playwright gate would produce is reproduced here in Node: if a
 * story claims a criterion, its surface carries it.
 */

import { ok } from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import * as stories from './fixture.stories.ts';
import { checkStory, type DomElement } from './checks.ts';
import type { GuiderailsParameters } from './parameters.ts';

interface HtmlStory {
  render: () => string;
  parameters: { guiderails: GuiderailsParameters };
}

const exported = Object.entries(stories).filter(
  ([name, v]) => name !== 'default' && v && typeof (v as HtmlStory).render === 'function',
) as Array<[string, HtmlStory]>;

test('every fixture story exports something to check', () => {
  ok(exported.length >= 3, `expected the J1 stories, found ${exported.length}`);
});

for (const [name, story] of exported) {
  test(`fixture story "${name}" passes the criteria it claims`, () => {
    const root = new JSDOM(`<!doctype html><body>${story.render()}</body>`).window.document.body as unknown as DomElement;
    const report = checkStory(root, story.parameters.guiderails);
    ok(
      report.pass,
      `${name} claims ${story.parameters.guiderails.criteria.join(', ')} but fails: ${JSON.stringify(
        report.results.filter((r) => r.applicable && !r.pass),
      )}`,
    );
  });
}
