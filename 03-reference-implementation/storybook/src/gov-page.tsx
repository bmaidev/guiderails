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
 * The government-service page shell, in real AgDS: the Core theme provider, the
 * AgDS header/footer chrome, a step progress indicator, a page heading and
 * intro, the form, and the standard Back/Continue action buttons. This is what
 * makes a story look like a Commonwealth service (fictional — D-009), not a bare
 * form. The fields inside are rendered by the adapter and checked by the addon.
 */

import React from 'react';
import { Core } from '@ag.ds-next/react/core';
import { Box, Flex } from '@ag.ds-next/react/box';
import { PageContent } from '@ag.ds-next/react/content';
import { Stack } from '@ag.ds-next/react/stack';
import { H1, H2 } from '@ag.ds-next/react/heading';
import { Text } from '@ag.ds-next/react/text';
import { FormStack } from '@ag.ds-next/react/form-stack';
import { ButtonGroup, Button } from '@ag.ds-next/react/button';
import { ProgressIndicator } from '@ag.ds-next/react/progress-indicator';

const AUTHORITY = 'Commonwealth Skills Support Agency';
const SERVICE = 'Skills Support Payment';

export interface JourneyStep {
  id: string;
  title: string;
}

/** The dark AgDS masthead — the government service header. */
function GovHeader(): React.ReactElement {
  return (
    <React.Fragment>
      <Box palette="dark" background="body" paddingY={1.5}>
        <PageContent>
          <Stack gap={0.25} borderLeft borderColor="accent" paddingLeft={1}>
            <H2 fontSize="lg">{AUTHORITY}</H2>
            <Text color="muted">{SERVICE}</Text>
          </Stack>
        </PageContent>
      </Box>
      <Box height="0.5rem" background="shadeAlt" css={{ backgroundColor: 'var(--agds-accent, #61daff)' }} />
    </React.Fragment>
  );
}

/** The step-progress rail — the "step 3 of 5" pattern people expect from a gov form. */
function StepProgress({ steps, current }: { steps: JourneyStep[]; current: number }): React.ReactElement {
  const items = steps.map((s, i) => ({
    label: s.title,
    href: `#${s.id}`,
    status: (i < current ? 'done' : i === current ? 'doing' : 'todo') as 'done' | 'doing' | 'todo',
  }));
  return <ProgressIndicator items={items} activePath={`#${steps[current]?.id ?? ''}`} />;
}

/** A full government service page hosting a journey step. */
export function GovServicePage(props: {
  heading: string;
  intro?: string;
  steps?: JourneyStep[];
  current?: number;
  children: React.ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
}): React.ReactElement {
  const showRail = props.steps && props.steps.length > 0;
  return (
    <Core>
      <GovHeader />
      <PageContent>
        <Box paddingY={2}>
          <Flex gap={2} flexDirection={{ xs: 'column', lg: 'row' }} alignItems="flex-start">
            {showRail && (
              <Box flexShrink={0} width={{ lg: '18rem' }} css={{ width: '100%' }}>
                <StepProgress steps={props.steps!} current={props.current ?? 0} />
              </Box>
            )}
            <Box css={{ flex: '1 1 auto', minWidth: 0, maxWidth: '42rem' }}>
              <Stack gap={1.5}>
                <Stack gap={0.5}>
                  <H1>{props.heading}</H1>
                  {props.intro && <Text as="p" fontSize="md" color="muted">{props.intro}</Text>}
                </Stack>
                <FormStack>{props.children}</FormStack>
                <ButtonGroup>
                  <Button type="submit">{props.primaryLabel ?? 'Continue'}</Button>
                  {props.secondaryLabel && <Button variant="secondary">{props.secondaryLabel}</Button>}
                </ButtonGroup>
              </Stack>
            </Box>
          </Flex>
        </Box>
      </PageContent>
      <Box palette="dark" background="body" paddingY={2}>
        <PageContent>
          <Text color="muted" fontSize="sm">{AUTHORITY} — a fictional service for standards testing (D-009).</Text>
        </PageContent>
      </Box>
    </Core>
  );
}
