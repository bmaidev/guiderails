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
 * The fixture dogfoods the addon (DESIGN §5): the conformant build's own HTML,
 * mounted as `html`-renderer stories carrying `parameters.guiderails`, so the
 * addon runs its parity checks over the same surface the server ships — without
 * the fixture adopting React.
 *
 * This is a Storybook `html`-renderer story module; it is consumed by Storybook,
 * not by the pure `npm test` matrix. The engine that checks these stories is
 * fully tested in `checks.test.ts`.
 */

import { form } from '../../../conformant/src/html.ts';
import { J1_FIELDS, J1_SPEC } from '../../../conformant/src/journeys.ts';
import { CA_REGISTER } from '../../../conformant/src/j1.ts';
import type { GuiderailsParameters } from './parameters.ts';

const identityStep = J1_SPEC.steps.find((s) => s.id === 'identity')!;
const submitStep = J1_SPEC.steps.find((s) => s.id === 'submit')!;

interface HtmlStory {
  render: () => string;
  parameters: { guiderails: GuiderailsParameters };
}

export default { title: 'Fixture/J1 Apply' };

export const Identity: HtmlStory = {
  render: () => form('/api/journeys/J1/steps/identity', J1_FIELDS.identity, {}, [], 'Continue'),
  parameters: {
    guiderails: { fields: J1_FIELDS.identity, journeyId: 'J1', step: identityStep, criteria: ['2.2.1', '3.1.1', '3.4.3'], test: 'error' },
  },
};

export const IdentityWithError: HtmlStory = {
  render: () => form('/api/journeys/J1/steps/identity', J1_FIELDS.identity, {}, [
    { field: 'email', constraint: 'format', message: 'Enter a valid email.', remediation: 'e.g. name@example.com' },
  ], 'Continue'),
  parameters: {
    guiderails: { fields: J1_FIELDS.identity, journeyId: 'J1', step: identityStep, criteria: ['2.2.1', '2.2.2', '3.1.1'], test: 'error' },
  },
};

export const Submit: HtmlStory = {
  render: () => form('/api/journeys/J1/steps/submit', J1_FIELDS.submit, {}, [], 'Submit'),
  parameters: {
    guiderails: {
      fields: J1_FIELDS.submit, journeyId: 'J1', step: submitStep,
      action: CA_REGISTER.find((a) => a.id === 'CA-1'),
      criteria: ['2.2.1', '3.1.1', '3.4.3'], test: 'error',
    },
  },
};
