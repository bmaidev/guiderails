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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  determine,
  ageInYears,
  reportDueDate,
  RulesInputError,
  INSTRUMENT_ID,
  RULES_VERSION,
  type Circumstances,
} from './determination.ts';

const EFFECTIVE = { effectiveDate: '2026-07-09' };

function circumstances(over: Partial<Circumstances>): Circumstances {
  return {
    ageYears: 30,
    residencyWeeks: 300,
    enrolmentStatus: 'enrolled',
    courseWeeks: 26,
    studyLoadEFT: 1.0,
    fortnightlyIncome: 900,
    ...over,
  };
}

// ---- Normative vectors V1–V8 (FIXTURE-SPEC.md §2) ----

test('V1: 25y / 300w / 1.0 EFT / 26w course / $900 → eligible (base threshold)', () => {
  const d = determine(circumstances({ ageYears: 25 }), EFFECTIVE);
  assert.equal(d.eligible, true);
  assert.equal(d.thresholdApplied?.name, 'base');
  assert.equal(d.ratePerFortnightDollars, 350);
});

test('V2: 20y / 150w / 0.8 EFT / 12w course / $1500 → eligible (s10 higher threshold)', () => {
  const d = determine(
    circumstances({ ageYears: 20, residencyWeeks: 150, studyLoadEFT: 0.8, courseWeeks: 12, fortnightlyIncome: 1500 }),
    EFFECTIVE,
  );
  assert.equal(d.eligible, true);
  assert.equal(d.thresholdApplied?.name, 'higher');
});

test('V3 (the trap): 20y / 30w / 0.8 EFT / 12w course / $1500 → INELIGIBLE, s11 governs', () => {
  const d = determine(
    circumstances({ ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, courseWeeks: 12, fortnightlyIncome: 1500 }),
    EFFECTIVE,
  );
  assert.equal(d.eligible, false);
  assert.deepEqual(d.governingReason.sections, ['s11', 's9']);
  assert.equal(d.thresholdApplied?.name, 'base');
  assert.equal(d.thresholdApplied?.s11Disapplied, true);
});

test('V4: as V3 but income $1300 → eligible under base threshold despite s11', () => {
  const d = determine(
    circumstances({ ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, courseWeeks: 12, fortnightlyIncome: 1300 }),
    EFFECTIVE,
  );
  assert.equal(d.eligible, true);
  assert.equal(d.thresholdApplied?.name, 'base');
});

test('V5: age 66 → ineligible under s6', () => {
  const d = determine(circumstances({ ageYears: 66, residencyWeeks: 500, fortnightlyIncome: 0 }), EFFECTIVE);
  assert.equal(d.eligible, false);
  assert.deepEqual(d.governingReason.sections, ['s6']);
  assert.equal(d.thresholdApplied, null);
});

test('V6: residency 20 weeks → ineligible under s7', () => {
  const d = determine(circumstances({ residencyWeeks: 20, studyLoadEFT: 0.5, fortnightlyIncome: 800 }), EFFECTIVE);
  assert.equal(d.eligible, false);
  assert.deepEqual(d.governingReason.sections, ['s7']);
});

test('V7: course 6 weeks → ineligible under s8', () => {
  const d = determine(circumstances({ courseWeeks: 6, studyLoadEFT: 0.5, fortnightlyIncome: 800 }), EFFECTIVE);
  assert.equal(d.eligible, false);
  assert.deepEqual(d.governingReason.sections, ['s8']);
});

test('V8: 21y / 200w / 0.7 EFT / $1500 → ineligible under s9 (s10 unavailable: load < 0.75)', () => {
  const d = determine(
    circumstances({ ageYears: 21, residencyWeeks: 200, studyLoadEFT: 0.7, courseWeeks: 12, fortnightlyIncome: 1500 }),
    EFFECTIVE,
  );
  assert.equal(d.eligible, false);
  assert.deepEqual(d.governingReason.sections, ['s9']);
  assert.equal(d.thresholdApplied?.s11Disapplied, false);
});

// ---- Boundaries ----

test('s6 boundaries: 16 fails, 17 and 64 pass, 65 fails', () => {
  assert.equal(determine(circumstances({ ageYears: 16 }), EFFECTIVE).eligible, false);
  assert.equal(determine(circumstances({ ageYears: 17 }), EFFECTIVE).eligible, true);
  assert.equal(determine(circumstances({ ageYears: 64 }), EFFECTIVE).eligible, true);
  assert.equal(determine(circumstances({ ageYears: 65 }), EFFECTIVE).eligible, false);
});

test('s7 boundary: 25 weeks fails, 26 passes', () => {
  assert.equal(determine(circumstances({ residencyWeeks: 25 }), EFFECTIVE).eligible, false);
  assert.equal(determine(circumstances({ residencyWeeks: 26 }), EFFECTIVE).eligible, true);
});

test('s8 boundaries: 8-week course passes; written offer counts; no enrolment fails', () => {
  assert.equal(determine(circumstances({ courseWeeks: 8 }), EFFECTIVE).eligible, true);
  assert.equal(determine(circumstances({ enrolmentStatus: 'offer' }), EFFECTIVE).eligible, true);
  const none = determine(circumstances({ enrolmentStatus: 'none' }), EFFECTIVE);
  assert.equal(none.eligible, false);
  assert.deepEqual(none.governingReason.sections, ['s8']);
});

test('s9 boundary: income must be strictly below the threshold', () => {
  assert.equal(determine(circumstances({ fortnightlyIncome: 1400 }), EFFECTIVE).eligible, false);
  assert.equal(determine(circumstances({ fortnightlyIncome: 1399.99 }), EFFECTIVE).eligible, true);
});

test('s10 boundaries: load exactly 0.75 qualifies; age 22 does not', () => {
  const load075 = determine(
    circumstances({ ageYears: 21, residencyWeeks: 200, studyLoadEFT: 0.75, fortnightlyIncome: 1500 }),
    EFFECTIVE,
  );
  assert.equal(load075.eligible, true);
  assert.equal(load075.thresholdApplied?.name, 'higher');
  const age22 = determine(
    circumstances({ ageYears: 22, residencyWeeks: 200, studyLoadEFT: 0.8, fortnightlyIncome: 1500 }),
    EFFECTIVE,
  );
  assert.equal(age22.eligible, false);
  assert.deepEqual(age22.governingReason.sections, ['s9']);
});

test('s11 boundary: residency 103 weeks disapplies s10; 104 restores it', () => {
  const w103 = determine(
    circumstances({ ageYears: 20, residencyWeeks: 103, studyLoadEFT: 0.8, fortnightlyIncome: 1500 }),
    EFFECTIVE,
  );
  assert.equal(w103.eligible, false);
  assert.deepEqual(w103.governingReason.sections, ['s11', 's9']);
  const w104 = determine(
    circumstances({ ageYears: 20, residencyWeeks: 104, studyLoadEFT: 0.8, fortnightlyIncome: 1500 }),
    EFFECTIVE,
  );
  assert.equal(w104.eligible, true);
});

test('s11-disapplied income at/above higher threshold reports plain s9, not s11', () => {
  const d = determine(
    circumstances({ ageYears: 20, residencyWeeks: 30, studyLoadEFT: 0.8, fortnightlyIncome: 1800 }),
    EFFECTIVE,
  );
  assert.equal(d.eligible, false);
  assert.deepEqual(d.governingReason.sections, ['s9']);
});

// ---- Contract fields (4.2.1, 4.5.1, 4.5.2) ----

test('every determination carries provenance, indicative status and the no-obligation statement', () => {
  const d = determine(circumstances({}), EFFECTIVE);
  assert.equal(d.provenance.instrumentId, INSTRUMENT_ID);
  assert.equal(d.provenance.rulesVersion, RULES_VERSION);
  assert.equal(d.provenance.effectiveDateApplied, '2026-07-09');
  assert.equal(d.determinationStatus, 'indicative');
  assert.ok(d.bindingCondition.length > 0);
  assert.ok(d.obligationStatement.includes('no obligation'));
});

// ---- Inputs, dates, validation ----

test('dateOfBirth path: age computed at the effective date', () => {
  assert.equal(ageInYears('2000-01-01', '2026-07-09'), 26);
  assert.equal(ageInYears('2004-07-10', '2026-07-09'), 21); // day before 22nd birthday
  const d = determine(circumstances({ ageYears: undefined, dateOfBirth: '2004-07-10', residencyWeeks: 200, studyLoadEFT: 0.8, fortnightlyIncome: 1500 }), EFFECTIVE);
  assert.equal(d.thresholdApplied?.name, 'higher'); // still under 22 on 2026-07-09
});

test('effectiveDate before instrument commencement throws', () => {
  assert.throws(() => determine(circumstances({}), { effectiveDate: '2026-06-30' }), RulesInputError);
});

test('invalid inputs throw RulesInputError', () => {
  assert.throws(() => determine(circumstances({ fortnightlyIncome: -1 }), EFFECTIVE), RulesInputError);
  assert.throws(() => determine(circumstances({ studyLoadEFT: 1.2 }), EFFECTIVE), RulesInputError);
  assert.throws(() => determine(circumstances({ ageYears: 20.5 }), EFFECTIVE), RulesInputError);
  assert.throws(() => determine(circumstances({ ageYears: undefined }), EFFECTIVE), RulesInputError);
  assert.throws(
    () => determine(circumstances({ enrolmentStatus: 'maybe' as never }), EFFECTIVE),
    RulesInputError,
  );
});

test('s13: report due 14 days after period end, Canberra time semantics declared', () => {
  const due = reportDueDate('2026-07-12');
  assert.equal(due.dueDate, '2026-07-26');
  assert.equal(due.timezone, 'Australia/Canberra');
  const monthEnd = reportDueDate('2026-07-25');
  assert.equal(monthEnd.dueDate, '2026-08-08');
});
