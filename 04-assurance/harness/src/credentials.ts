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
 * Which credential each vendor needs, and whether it is present.
 *
 * The SDKs read these variables themselves; nothing here reads a key's value,
 * and nothing here may ever print one. The point is only to fail before the
 * first request with a sentence rather than after it with a stack trace.
 *
 * Keys reach the process through `.env` at the repository root, loaded by
 * `node --env-file-if-exists`. `.env` is gitignored. No secrets in the repo,
 * ever (CLAUDE.md, engineering standards).
 */

import type { Vendor } from './llm-agent.ts';

/** Accepted variable names per vendor, in the order the vendor's SDK prefers. */
export const CREDENTIAL_VARIABLES: Record<Vendor, readonly string[]> = {
  anthropic: ['ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  // @google/genai accepts either; GOOGLE_API_KEY is what our docs tell people to set.
  google: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
};

/** An empty or whitespace-only variable is absent, not present-but-blank. */
function present(env: Record<string, string | undefined>, name: string): boolean {
  return (env[name] ?? '').trim().length > 0;
}

/** The variable a vendor's credential was found in, or undefined. */
export function credentialSource(
  vendor: Vendor,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  return CREDENTIAL_VARIABLES[vendor].find((name) => present(env, name));
}

/**
 * Human-readable reason the run cannot proceed, or undefined if it can.
 * Never includes a key, and never reports how long one is.
 */
export function missingCredentialMessage(
  vendor: Vendor,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  if (credentialSource(vendor, env)) return undefined;
  const names = CREDENTIAL_VARIABLES[vendor];
  const wanted = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
  return [
    `No credential for vendor "${vendor}": set ${wanted}.`,
    '',
    'Copy .env.example to .env at the repository root and fill in the keys you have:',
    '',
    '    cp .env.example .env',
    '',
    '.env is gitignored and must stay that way. Nothing writes a key to runs/,',
    'and no key belongs in a commit, a log, or a pasted error message.',
  ].join('\n');
}
