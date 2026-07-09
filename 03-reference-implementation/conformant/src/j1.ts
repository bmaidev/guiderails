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
 * J1 (Apply) journey definition per FIXTURE-SPEC.md §3, expressed as
 * agent-surface specs. FICTIONAL service (D-009).
 */

import type { FieldSpec, JourneySpec, ConsequentialActionSpec } from '../../packages/agent-surface/src/index.ts';

export const J1_SPEC: JourneySpec = {
  id: 'J1',
  title: 'Apply for the Commonwealth Skills Support Payment',
  steps: [
    { id: 'identity', title: 'Identity and contact', kind: 'safe' },
    { id: 'circumstances', title: 'Your circumstances', kind: 'safe', requires: ['identity'] },
    { id: 'evidence', title: 'Evidence', kind: 'safe', requires: ['circumstances'] },
    { id: 'review', title: 'Review your application', kind: 'safe', requires: ['evidence'] },
    { id: 'submit', title: 'Declaration and submit', kind: 'consequential', actionId: 'CA-1', requires: ['review'] },
  ],
};

export const CA_REGISTER: ConsequentialActionSpec[] = [
  { id: 'CA-1', journeyId: 'J1', title: 'Submit claim', confirmationDesignated: true },
  { id: 'CA-2', journeyId: 'J2', title: 'Submit activity report', confirmationDesignated: false },
  { id: 'CA-3a', journeyId: 'J3', title: 'Update contact details', confirmationDesignated: false },
  { id: 'CA-3b', journeyId: 'J3', title: 'Update payment destination', confirmationDesignated: true },
  // Principal-only. An agent that could issue a delegation could grant itself a
  // new, unbounded one, and 5.1.2's scoping and time-bounding would be decorative.
  { id: 'CA-4a', journeyId: 'J4', title: 'Give an agent authority', confirmationDesignated: true, agentExecutable: false },
  { id: 'CA-4b', journeyId: 'J4', title: 'Suspend, revoke or reinstate an agent\'s authority', confirmationDesignated: true, agentExecutable: false },
];

export const J1_FIELDS: Record<string, FieldSpec[]> = {
  identity: [
    { name: 'fullName', label: 'Full name', dataType: 'text', required: true, autocomplete: 'name', constraints: { maxLength: 200 } },
    { name: 'dateOfBirth', label: 'Date of birth', dataType: 'date', required: true, autocomplete: 'bday' },
    { name: 'email', label: 'Email address', dataType: 'email', required: true, autocomplete: 'email' },
    {
      name: 'mobile', label: 'Mobile number', dataType: 'tel', required: true, autocomplete: 'tel',
      description: 'An Australian mobile number starting with 04, 10 digits, no spaces.',
      constraints: { pattern: '04\\d{8}' },
    },
  ],
  circumstances: [
    { name: 'residentSince', label: 'Date you became an Australian resident', dataType: 'date', required: true },
    {
      name: 'fortnightlyIncome', label: 'Assessable fortnightly income', dataType: 'money', required: true,
      description: 'Your assessable income for the fortnight, in dollars, numbers only.',
    },
    { name: 'courseProvider', label: 'Course provider', dataType: 'text', required: true, constraints: { maxLength: 200 } },
    { name: 'courseName', label: 'Course name', dataType: 'text', required: true, constraints: { maxLength: 200 } },
    { name: 'courseWeeks', label: 'Course length in weeks', dataType: 'integer', required: true, constraints: { minimum: 1, maximum: 520 } },
    {
      name: 'studyLoadEFT', label: 'Study load (equivalent full-time fraction)', dataType: 'decimal', required: true,
      description: 'A fraction between 0 and 1; full-time study is 1.0.',
      constraints: { minimum: 0, maximum: 1 },
    },
    {
      name: 'enrolmentStatus', label: 'Enrolment status', dataType: 'enum', required: true,
      constraints: { enumValues: ['enrolled', 'offer'] },
      description: '"enrolled" if you are enrolled now; "offer" if you hold a written offer.',
    },
  ],
  evidence: [
    {
      name: 'enrolmentDocument', label: 'Enrolment confirmation or written offer', dataType: 'enum', required: true,
      description: 'Select the staged evidence document for this application. (Fixture v0.1 stages documents rather than accepting uploads — open item OI-1.)',
      constraints: { enumValues: ['enrolment-confirmation.pdf', 'written-offer.pdf'] },
    },
    {
      name: 'incomeDeclared', label: 'I declare the income stated is complete and correct', dataType: 'boolean', required: true,
    },
  ],
  review: [],
  submit: [
    { name: 'declaration', label: 'I declare the information in this application is true and correct', dataType: 'boolean', required: true },
  ],
};
