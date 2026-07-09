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

import { match, ok, strictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { credentialSource, missingCredentialMessage } from './credentials.ts';

test('a vendor with its key set reports the variable it came from', () => {
  strictEqual(credentialSource('anthropic', { ANTHROPIC_API_KEY: 'x' }), 'ANTHROPIC_API_KEY');
  strictEqual(missingCredentialMessage('anthropic', { ANTHROPIC_API_KEY: 'x' }), undefined);
});

test('google accepts either variable, preferring the one the docs name', () => {
  strictEqual(credentialSource('google', { GEMINI_API_KEY: 'x' }), 'GEMINI_API_KEY');
  strictEqual(credentialSource('google', { GOOGLE_API_KEY: 'x', GEMINI_API_KEY: 'y' }), 'GOOGLE_API_KEY');
});

test('an empty or whitespace variable is absent, not present-but-blank', () => {
  // `cp .env.example .env` leaves every key empty. That must read as "not set",
  // or the SDK receives "" and fails somewhere far from the cause.
  strictEqual(credentialSource('openai', { OPENAI_API_KEY: '' }), undefined);
  strictEqual(credentialSource('openai', { OPENAI_API_KEY: '   ' }), undefined);
  ok(missingCredentialMessage('openai', { OPENAI_API_KEY: '' }));
});

test('one vendor\'s key does not satisfy another', () => {
  ok(missingCredentialMessage('openai', { ANTHROPIC_API_KEY: 'x' }));
});

test('the failure message names the variable and the remedy', () => {
  const message = missingCredentialMessage('google', {})!;
  match(message, /GOOGLE_API_KEY or GEMINI_API_KEY/);
  match(message, /cp \.env\.example \.env/);
});

test('no message ever contains a key', () => {
  const secret = 'sk-ant-not-a-real-key-0123456789';
  for (const env of [{}, { ANTHROPIC_API_KEY: secret }]) {
    const message = missingCredentialMessage('anthropic', env) ?? '';
    ok(!message.includes(secret), 'the credential leaked into the failure message');
  }
});
