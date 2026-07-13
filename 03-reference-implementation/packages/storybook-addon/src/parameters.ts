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
 * The `parameters.guiderails` per-story convention (D-021, DESIGN §2).
 *
 * Parallels `parameters.a11y`: a story declares the authoritative spec it
 * renders and which criteria it claims, and a three-state `test` gate mirroring
 * `parameters.a11y.test` — `'error'` fails CI, `'todo'` warns, `'off'` skips.
 */

import type { FieldSpec, StepSpec, ConsequentialActionSpec } from '../../agent-surface/src/index.ts';

export interface GuiderailsParameters {
  /** The FieldSpecs the story's component renders — the authoritative source of truth. */
  fields: FieldSpec[];
  /** The journey id, for tool naming and the agent's-eye view. */
  journeyId?: string;
  step?: StepSpec;
  action?: ConsequentialActionSpec;
  /** P.G.C ids this story claims to carry, e.g. ['2.2.1','2.2.2','3.1.1']. */
  criteria: string[];
  /** Three-state gate, mirroring parameters.a11y.test. Default 'error'. */
  test?: 'off' | 'todo' | 'error';
}

export const DEFAULT_TEST_MODE: NonNullable<GuiderailsParameters['test']> = 'error';
