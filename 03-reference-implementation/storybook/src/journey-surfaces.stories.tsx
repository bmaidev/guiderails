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
 * Layer 1 of the conformance-demo harness: the criteria a rendered DOM can
 * decide beyond the form controls — journey-state exposure (2.4.1), the action
 * receipt (2.4.2), agent attribution (5.2.1), human/agent parity (5.6.2) and the
 * third-party-content distinction (5.6.3) — each verified live by the criterion
 * gate through real AgDS. See CONFORMANCE-COVERAGE.md.
 */

import React from 'react';
import { Core } from '@ag.ds-next/react/core';
import { Box } from '@ag.ds-next/react/box';
import { PageContent } from '@ag.ds-next/react/content';
import { Stack } from '@ag.ds-next/react/stack';
import { H1 } from '@ag.ds-next/react/heading';
import { Text } from '@ag.ds-next/react/text';
import { J2_SPEC } from '../../conformant/src/journeys.ts';
import type { GuiderailsParameters } from '../../packages/storybook-addon/src/parameters.ts';
import { JourneyStateRail, ActionReceipt, AttributionBadge, ParityAffordance, MixedContent, DEMO_RECEIPT } from './surfaces.tsx';

const AUTHORITY = 'Commonwealth Skills Support Agency';

interface Story {
  render: () => React.ReactElement;
  parameters: { guiderails: GuiderailsParameters };
}

function Shell({ heading, intro, children }: { heading: string; intro?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Core>
      <Box palette="dark" background="body" paddingY={1.5}>
        <PageContent>
          <Text color="muted" fontSize="sm">{AUTHORITY} · Skills Support Payment</Text>
        </PageContent>
      </Box>
      <PageContent>
        <Box paddingY={2}>
          <Stack gap={1}>
            <H1>{heading}</H1>
            {intro && <Text as="p" color="muted">{intro}</Text>}
            {children}
          </Stack>
        </Box>
      </PageContent>
    </Core>
  );
}

export default { title: 'Conformance surfaces' };

const declare = J2_SPEC.steps.find((s) => s.id === 'declare')!;
const CA_2 = { id: 'CA-2', journeyId: 'J2', title: 'Lodge fortnightly report', confirmationDesignated: false };
const J2_PROGRESS = { completedSteps: ['period'], consequentialEvents: [] };

// 2.4.1 — journey state exposed programmatically.
export const JourneyState: Story = {
  render: () => (
    <Shell heading="Fortnightly activity report" intro="Where you are in the report, exposed both to you and to an agent acting for you.">
      <JourneyStateRail spec={J2_SPEC} progress={J2_PROGRESS} />
    </Shell>
  ),
  parameters: { guiderails: { fields: [], journeyId: 'J2', journeySpec: J2_SPEC, journeyProgress: J2_PROGRESS, criteria: ['2.4.1'], test: 'error' } },
};

// 2.4.2 — the receipt after a consequential action.
export const ActionReceiptStory: Story = {
  render: () => (
    <Shell heading="Report lodged" intro="After a consequential action, the service states that it occurred, when, and its reference.">
      <ActionReceipt event={DEMO_RECEIPT} authority={AUTHORITY} />
    </Shell>
  ),
  parameters: { guiderails: { fields: [], journeyId: 'J2', receipt: DEMO_RECEIPT, criteria: ['2.4.2'], test: 'error' } },
};

// 5.2.1 — agent-originated submission flagged.
export const AgentAttribution: Story = {
  render: () => (
    <Shell heading="Submission record" intro="A submission made by an agent is flagged as such in the record, without degrading the service.">
      <AttributionBadge agentId="agent-ci-demo" />
    </Shell>
  ),
  parameters: { guiderails: { fields: [], attribution: { agentOriginated: true, agentId: 'agent-ci-demo' }, criteria: ['5.2.1'], test: 'error' } },
};

// 5.6.2 — the human affordance and the agent view agree with the step.
export const HumanAgentParity: Story = {
  render: () => (
    <Shell heading="Declare and submit" intro="The button a person sees and the tool an agent receives derive from one step, so they cannot contradict each other.">
      <ParityAffordance journeyId="J2" step={declare} action={CA_2} />
    </Shell>
  ),
  parameters: { guiderails: { fields: [], journeyId: 'J2', step: declare, action: CA_2, criteria: ['5.6.2'], test: 'error' } },
};

// 5.6.3 — third-party content programmatically distinct from operator content.
export const ThirdPartyContent: Story = {
  render: () => (
    <Shell heading="Your circumstances" intro="Content from a third party is programmatically distinguishable from the service operator's own.">
      <MixedContent />
    </Shell>
  ),
  parameters: { guiderails: { fields: [], thirdPartyContent: true, criteria: ['5.6.3'], test: 'error' } },
};
