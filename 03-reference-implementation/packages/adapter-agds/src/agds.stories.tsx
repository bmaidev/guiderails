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
 * AgDS stories carrying `parameters.guiderails`, so the Storybook addon runs
 * its criterion checks over the SAME specs rendered through a real government
 * design system — proving "distribution channel, not fork" on live software
 * (DESIGN §5). BROWSER-VERIFIED: React + AgDS + Storybook. The equivalent
 * check, on the modelled AgDS DOM, is run in Node in `adapter.test.ts`.
 */

import React from 'react';
import { J1_FIELDS, J1_SPEC } from '../../../conformant/src/journeys.ts';
import { CA_REGISTER } from '../../../conformant/src/j1.ts';
import { GuiderailsAgdsFields } from './components.tsx';
import type { GuiderailsParameters } from '../../storybook-addon/src/parameters.ts';

const identityStep = J1_SPEC.steps.find((s) => s.id === 'identity')!;
const submitStep = J1_SPEC.steps.find((s) => s.id === 'submit')!;

interface AgdsStory {
  render: () => React.ReactElement;
  parameters: { guiderails: GuiderailsParameters };
}

export default { title: 'AgDS/J1 Apply' };

export const Identity: AgdsStory = {
  render: () => <GuiderailsAgdsFields fields={J1_FIELDS.identity} />,
  parameters: {
    guiderails: { fields: J1_FIELDS.identity, journeyId: 'J1', step: identityStep, criteria: ['2.2.1', '3.1.1', '3.4.3'], test: 'error' },
  },
};

export const Submit: AgdsStory = {
  render: () => <GuiderailsAgdsFields fields={J1_FIELDS.submit} />,
  parameters: {
    guiderails: {
      fields: J1_FIELDS.submit, journeyId: 'J1', step: submitStep,
      action: CA_REGISTER.find((a) => a.id === 'CA-1'),
      criteria: ['2.2.1', '3.1.1', '3.4.3'], test: 'error',
    },
  },
};
