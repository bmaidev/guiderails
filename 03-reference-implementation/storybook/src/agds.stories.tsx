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
 * Full Guiderails journeys rendered as a real (fictional, D-009) Commonwealth
 * service through AgDS, each step carrying `parameters.guiderails` so the addon's
 * criterion gate checks the live render. This is the "distribution channel, not
 * fork" claim at journey scale, with the government look and every control
 * exercised.
 */

import React from 'react';
import type { FieldSpec, StepSpec } from '../../packages/agent-surface/src/index.ts';
import { J1_SPEC, J1_FIELDS, J2_SPEC, J2_FIELDS, J3_SPEC, J3_FIELDS, J4_SPEC, J4_FIELDS } from '../../conformant/src/journeys.ts';
import { CA_REGISTER } from '../../conformant/src/j1.ts';
import { GuiderailsAgdsFields, GuiderailsAgdsField } from './agds-components.tsx';
import { GovServicePage, type JourneyStep } from './gov-page.tsx';
import type { GuiderailsParameters } from '../../packages/storybook-addon/src/parameters.ts';

type Fields = Record<string, FieldSpec[]>;
const action = (id?: string) => CA_REGISTER.find((a) => a.id === id);

interface Story {
  render: () => React.ReactElement;
  parameters: { guiderails: GuiderailsParameters };
}

/** A gov-service story for one journey step, with the step-progress rail. */
function stepStory(opts: {
  journeyId: string;
  spec: { steps: StepSpec[] };
  fields: Fields;
  stepId: string;
  heading: string;
  intro?: string;
  criteria?: string[];
  primaryLabel?: string;
}): Story {
  const steps: JourneyStep[] = opts.spec.steps.map((s) => ({ id: s.id, title: s.title }));
  const current = opts.spec.steps.findIndex((s) => s.id === opts.stepId);
  const step = opts.spec.steps.find((s) => s.id === opts.stepId)!;
  const fields = opts.fields[opts.stepId] ?? [];
  const criteria = opts.criteria ?? (fields.length ? ['2.2.1', '3.1.1', '3.4.3'] : ['3.4.3']);
  return {
    render: () => (
      <GovServicePage heading={opts.heading} intro={opts.intro} steps={steps} current={current} primaryLabel={opts.primaryLabel}>
        <GuiderailsAgdsFields fields={fields} />
      </GovServicePage>
    ),
    parameters: { guiderails: { fields, journeyId: opts.journeyId, step, action: action(step.actionId), criteria, test: 'error' } },
  };
}

export default { title: 'Commonwealth Skills Support Payment' };

// ---- J1 Apply: the full journey ----

export const J1_Identity = stepStory({
  journeyId: 'J1', spec: J1_SPEC, fields: J1_FIELDS, stepId: 'identity',
  heading: 'Your identity and contact details',
  intro: 'We use these to identify you and to tell you about your claim.',
  // 2.2.3: names and required-state are programmatic, not conveyed by colour or position alone.
  criteria: ['2.2.1', '2.2.3', '3.1.1', '3.4.3'],
});

export const J1_Circumstances = stepStory({
  journeyId: 'J1', spec: J1_SPEC, fields: J1_FIELDS, stepId: 'circumstances',
  heading: 'Your circumstances',
  intro: 'Tell us about your residency, income and course. These determine whether you are eligible.',
});

export const J1_Evidence = stepStory({
  journeyId: 'J1', spec: J1_SPEC, fields: J1_FIELDS, stepId: 'evidence',
  heading: 'Evidence',
  intro: 'Confirm the documents supporting your claim.',
});

export const J1_Submit = stepStory({
  journeyId: 'J1', spec: J1_SPEC, fields: J1_FIELDS, stepId: 'submit',
  heading: 'Declaration and submit',
  intro: 'Read the declaration before you submit. Submitting lodges your claim.',
  primaryLabel: 'Submit claim',
});

// ---- J2 report, J3 update, J4 manage authority ----

export const J2_Report = stepStory({
  journeyId: 'J2', spec: J2_SPEC, fields: J2_FIELDS, stepId: 'report',
  heading: 'Fortnightly activity report',
  intro: 'Report your income and attendance for this reporting period.',
});

export const J3_Payment = stepStory({
  journeyId: 'J3', spec: J3_SPEC, fields: J3_FIELDS, stepId: 'payment',
  heading: 'Update your payment details',
  intro: 'Change the account your payment is sent to.',
  primaryLabel: 'Save payment details',
});

export const J4_Give = stepStory({
  journeyId: 'J4', spec: J4_SPEC, fields: J4_FIELDS, stepId: 'give',
  heading: 'Give an agent authority to act for you',
  intro: 'Choose the narrowest authority that lets your agent do what you want. Authority must end on a date you choose.',
  primaryLabel: 'Give authority',
});

// ---- Error state: accessible, associated validation errors ----

const identityErrors: Record<string, { message: string; remediation: string }> = {
  email: { message: 'Enter a valid email address.', remediation: 'For example, name@example.com.' },
  mobile: { message: 'Enter an Australian mobile number.', remediation: 'It should start with 04 and be 10 digits.' },
};

export const J1_Identity_WithErrors: Story = {
  render: () => {
    const steps: JourneyStep[] = J1_SPEC.steps.map((s) => ({ id: s.id, title: s.title }));
    return (
      <GovServicePage heading="Your identity and contact details" intro="There is a problem with some of your answers." steps={steps} current={0}>
        {J1_FIELDS.identity.map((f) => (
          <GuiderailsAgdsField key={f.name} field={f} ctx={identityErrors[f.name] ? { error: identityErrors[f.name] } : undefined} />
        ))}
      </GovServicePage>
    );
  },
  parameters: {
    guiderails: {
      fields: J1_FIELDS.identity, journeyId: 'J1',
      step: J1_SPEC.steps.find((s) => s.id === 'identity'),
      criteria: ['2.2.1', '2.2.2', '3.1.1'], test: 'error',
    },
  },
};

// ---- Kitchen sink: every control type, on one page ----

const everyControl: FieldSpec[] = [
  { name: 'fullName', label: 'Full name', dataType: 'text', required: true, autocomplete: 'name' },
  { name: 'email', label: 'Email address', dataType: 'email', required: true, autocomplete: 'email' },
  { name: 'mobile', label: 'Mobile number', dataType: 'tel', required: true, autocomplete: 'tel', description: 'Starts with 04.' },
  { name: 'dateOfBirth', label: 'Date of birth', dataType: 'date', required: true, description: 'For example 14 03 1999.' },
  { name: 'courseWeeks', label: 'Course length in weeks', dataType: 'integer', required: true },
  { name: 'fortnightlyIncome', label: 'Fortnightly income', dataType: 'money', required: true, description: 'Before tax, in dollars.' },
  { name: 'studyLoadEFT', label: 'Study load (EFT)', dataType: 'decimal', required: true, description: 'Between 0 and 1.' },
  { name: 'state', label: 'State or territory', dataType: 'enum', required: true, constraints: { enumValues: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] } },
  { name: 'enrolmentStatus', label: 'Enrolment status', dataType: 'enum', required: true, constraints: { enumValues: ['enrolled', 'offer'] } },
  { name: 'notes', label: 'Anything else we should know', dataType: 'text', required: false, description: 'Optional.' },
  { name: 'evidence', label: 'Enrolment document', dataType: 'file', required: true, description: 'PDF, up to 10 MB.', constraints: { acceptFormats: ['pdf'] } },
  { name: 'declaration', label: 'I declare the information I have given is true and correct', dataType: 'boolean', required: true },
];

export const EveryControl: Story = {
  render: () => (
    <GovServicePage heading="Every control, one page" intro="A single page exercising every Guiderails data type through AgDS: text, email, phone, date, number, money, decimal, select, radio, textarea, file and checkbox.">
      {everyControl.map((f) => {
        const variant = f.dataType === 'enum' && (f.constraints?.enumValues?.length ?? 0) <= 3 ? { variant: 'radio' as const }
          : f.name === 'notes' ? { variant: 'textarea' as const } : undefined;
        return <GuiderailsAgdsField key={f.name} field={f} ctx={variant} />;
      })}
    </GovServicePage>
  ),
  parameters: {
    // 'todo', not 'error', for a real finding the gate surfaced: AgDS FileInput
    // (v1.35.1) renders a button + hidden file input and does NOT convey
    // `required` programmatically on the control, so the file field's
    // required-state is not machine-legible to an agent. The three-state gate
    // reports this as a warning rather than failing the build — a known,
    // documented AgDS gap (see README), not a regression in our code.
    guiderails: { fields: everyControl, journeyId: 'J1', criteria: ['2.2.1', '3.1.1'], test: 'todo' },
  },
};
