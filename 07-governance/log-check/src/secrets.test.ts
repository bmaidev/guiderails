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
 * "No secrets in the repo, ever" (CLAUDE.md, engineering standards).
 *
 * A rule nothing checks is a hope. These run in CI on every pull request, so a
 * key that reaches a commit fails the build rather than reaching the history,
 * where removing it means rewriting it and rotating the key anyway.
 *
 * The scan is over *tracked* files only. An untracked `.env` is the point of
 * the design, not a violation of it.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

/** Vendor key shapes. Prefix plus enough entropy that prose cannot collide. */
const KEY_SHAPES: Array<{ vendor: string; pattern: RegExp }> = [
  { vendor: 'Anthropic', pattern: /sk-ant-api\d{2}-[A-Za-z0-9_-]{24,}/ },
  { vendor: 'OpenAI (project)', pattern: /sk-proj-[A-Za-z0-9_-]{24,}/ },
  { vendor: 'OpenAI (legacy)', pattern: /\bsk-[A-Za-z0-9]{32,}\b/ },
  { vendor: 'Google', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
];

const TEXT = /\.(md|ts|js|json|ya?ml|txt|html|css|sh|example)$|(^|\/)[^.]+$/;

test('no tracked file contains anything shaped like an API key', () => {
  const files = git('ls-files', '-z').split('\0').filter(Boolean).filter((f) => TEXT.test(f));
  const found: string[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(root + file, 'utf8');
    } catch {
      continue; // binary or unreadable; nothing to scan
    }
    for (const { vendor, pattern } of KEY_SHAPES) {
      // Report the file and the vendor. Never the match.
      if (pattern.test(content)) found.push(`${file} matches the ${vendor} key shape`);
    }
  }
  deepStrictEqual(found, [], 'a credential appears to be committed. Rotate it, then remove it.');
});

test('.env is ignored, and .env.example is not', () => {
  const ignored = (path: string) => {
    try {
      git('check-ignore', '-q', path);
      return true;
    } catch {
      return false;
    }
  };
  strictEqual(ignored('.env'), true, '.env must be gitignored — it is where the keys live');
  strictEqual(ignored('.env.example'), false, '.env.example carries variable names only and must be tracked');
});

test('the example env file is tracked and holds no values', () => {
  const tracked = git('ls-files', '.env.example').trim();
  strictEqual(tracked, '.env.example', '.env.example must be committed so the variable names are discoverable');

  const assignments = readFileSync(root + '.env.example', 'utf8')
    .split('\n')
    .filter((line) => /^[A-Z_]+=/.test(line));
  deepStrictEqual(
    assignments.filter((line) => line.split('=')[1] !== ''),
    [],
    'every variable in .env.example must be assigned nothing at all',
  );
});
