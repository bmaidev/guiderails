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
 * Skills Support Payment Determination 2026 (SSPD-2026) — executable rules.
 *
 * FICTIONAL (DECISIONS.md D-009): the scheme, instrument, sections, rates and
 * thresholds are invented. This module is the single source of truth for
 * eligibility logic; both fixture builds import it (parity requirement,
 * FIXTURE-SPEC.md §2). The canonical decision order is normative:
 * s6 → s7 → s8 → threshold selection (s10 then s11) → s9.
 */

export const INSTRUMENT_ID = 'SSPD-2026';
export const RULES_VERSION = '1.0.0';
export const INSTRUMENT_COMMENCEMENT = '2026-07-01';

export const RATE_PER_FORTNIGHT_DOLLARS = 350;
export const BASE_THRESHOLD_DOLLARS = 1400; // s9
export const HIGHER_THRESHOLD_DOLLARS = 1750; // s10
export const MIN_AGE_YEARS = 17; // s6
export const MAX_AGE_YEARS = 64; // s6
export const MIN_RESIDENCY_WEEKS = 26; // s7
export const S11_RESIDENCY_WEEKS = 104; // s11
export const MIN_COURSE_WEEKS = 8; // s8
export const S10_MIN_STUDY_LOAD_EFT = 0.75; // s10
export const S10_UNDER_AGE_YEARS = 22; // s10: "aged under 22"
export const REPORT_DUE_DAYS = 14; // s13
export const REPORT_TIMEZONE = 'Australia/Canberra'; // s13

export type EnrolmentStatus = 'enrolled' | 'offer' | 'none';

export interface Circumstances {
  /** Age in whole years on the claim date. Provide this or dateOfBirth. */
  ageYears?: number;
  /** ISO 8601 date (YYYY-MM-DD). Provide this or ageYears. */
  dateOfBirth?: string;
  residencyWeeks: number;
  enrolmentStatus: EnrolmentStatus;
  courseWeeks: number;
  studyLoadEFT: number;
  fortnightlyIncome: number;
}

export interface ThresholdApplied {
  name: 'base' | 'higher';
  amountDollars: number;
  /** True when s10's conditions were met but s11 withdrew the higher threshold. */
  s11Disapplied: boolean;
}

export interface Determination {
  eligible: boolean;
  governingReason: { sections: string[]; statement: string };
  /** Null when eligibility failed before the threshold stage (s6–s8). */
  thresholdApplied: ThresholdApplied | null;
  ratePerFortnightDollars: number | null;
  determinationStatus: 'indicative';
  bindingCondition: string;
  provenance: {
    instrumentId: string;
    rulesVersion: string;
    effectiveDateApplied: string;
  };
  /** SSPD fixture contract for Guiderails 4.5.2. */
  obligationStatement: string;
}

export class RulesInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RulesInputError';
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertIsoDate(value: string, label: string): void {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new RulesInputError(`${label} must be an ISO 8601 date (YYYY-MM-DD); got "${value}"`);
  }
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RulesInputError(`${label} must be a finite non-negative number; got ${value}`);
  }
}

/** Whole years between dateOfBirth and onDate (both ISO dates). */
export function ageInYears(dateOfBirth: string, onDate: string): number {
  assertIsoDate(dateOfBirth, 'dateOfBirth');
  assertIsoDate(onDate, 'onDate');
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  const on = new Date(`${onDate}T00:00:00Z`);
  if (on < dob) throw new RulesInputError('onDate precedes dateOfBirth');
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < dob.getUTCMonth() ||
    (on.getUTCMonth() === dob.getUTCMonth() && on.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * s13: activity report due 14 days after the reporting period ends.
 * Date-only calendar arithmetic; the service interprets the due date in
 * Australia/Canberra time (Guiderails 2.6.2 requires explicit zone semantics).
 */
export function reportDueDate(periodEndDate: string): { dueDate: string; timezone: string } {
  assertIsoDate(periodEndDate, 'periodEndDate');
  const d = new Date(`${periodEndDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + REPORT_DUE_DAYS);
  return { dueDate: d.toISOString().slice(0, 10), timezone: REPORT_TIMEZONE };
}

export interface DetermineOptions {
  /** ISO date the rules are applied for (4.4.1). Defaults to the current date. */
  effectiveDate?: string;
}

export function determine(c: Circumstances, opts: DetermineOptions = {}): Determination {
  const effectiveDate = opts.effectiveDate ?? new Date().toISOString().slice(0, 10);
  assertIsoDate(effectiveDate, 'effectiveDate');
  if (effectiveDate < INSTRUMENT_COMMENCEMENT) {
    throw new RulesInputError(
      `effectiveDate ${effectiveDate} precedes instrument commencement ${INSTRUMENT_COMMENCEMENT}; no rules version applies`,
    );
  }

  if (c.ageYears === undefined && c.dateOfBirth === undefined) {
    throw new RulesInputError('provide ageYears or dateOfBirth');
  }
  const age = c.ageYears !== undefined ? c.ageYears : ageInYears(c.dateOfBirth as string, effectiveDate);
  assertFiniteNonNegative(age, 'ageYears');
  if (!Number.isInteger(age)) throw new RulesInputError(`ageYears must be a whole number; got ${age}`);
  assertFiniteNonNegative(c.residencyWeeks, 'residencyWeeks');
  assertFiniteNonNegative(c.courseWeeks, 'courseWeeks');
  assertFiniteNonNegative(c.fortnightlyIncome, 'fortnightlyIncome');
  assertFiniteNonNegative(c.studyLoadEFT, 'studyLoadEFT');
  if (c.studyLoadEFT > 1) throw new RulesInputError(`studyLoadEFT must not exceed 1.0; got ${c.studyLoadEFT}`);
  if (!['enrolled', 'offer', 'none'].includes(c.enrolmentStatus)) {
    throw new RulesInputError(`enrolmentStatus must be "enrolled", "offer" or "none"; got "${c.enrolmentStatus}"`);
  }

  const base = {
    determinationStatus: 'indicative' as const,
    bindingCondition:
      'This determination becomes binding only on lodgement of a claim with the required evidence and its assessment by the agency.',
    provenance: {
      instrumentId: INSTRUMENT_ID,
      rulesVersion: RULES_VERSION,
      effectiveDateApplied: effectiveDate,
    },
    obligationStatement:
      'This hypothetical query creates no obligation for, and no record attributed to, any person.',
  };

  const ineligible = (
    sections: string[],
    statement: string,
    thresholdApplied: ThresholdApplied | null,
  ): Determination => ({
    eligible: false,
    governingReason: { sections, statement },
    thresholdApplied,
    ratePerFortnightDollars: null,
    ...base,
  });

  // s6 — age
  if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) {
    return ineligible(
      ['s6'],
      `Ineligible under s6 (age): the person must be aged ${MIN_AGE_YEARS} to ${MAX_AGE_YEARS} inclusive on the claim date; the person is aged ${age}.`,
      null,
    );
  }

  // s7 — residency
  if (c.residencyWeeks < MIN_RESIDENCY_WEEKS) {
    return ineligible(
      ['s7'],
      `Ineligible under s7 (residency): at least ${MIN_RESIDENCY_WEEKS} continuous weeks of Australian residency are required on the claim date; the person has ${c.residencyWeeks}.`,
      null,
    );
  }

  // s8 — study
  if (c.enrolmentStatus === 'none') {
    return ineligible(
      ['s8'],
      'Ineligible under s8 (study): the person must be enrolled in, or hold a written offer for, an approved skills course.',
      null,
    );
  }
  if (c.courseWeeks < MIN_COURSE_WEEKS) {
    return ineligible(
      ['s8'],
      `Ineligible under s8 (study): the approved skills course must run for at least ${MIN_COURSE_WEEKS} weeks; the course runs for ${c.courseWeeks}.`,
      null,
    );
  }

  // Threshold selection — s10 then s11
  const s10ConditionsMet = age < S10_UNDER_AGE_YEARS && c.studyLoadEFT >= S10_MIN_STUDY_LOAD_EFT;
  const s11Applies = c.residencyWeeks < S11_RESIDENCY_WEEKS;
  const higherApplies = s10ConditionsMet && !s11Applies;
  const threshold: ThresholdApplied = higherApplies
    ? { name: 'higher', amountDollars: HIGHER_THRESHOLD_DOLLARS, s11Disapplied: false }
    : {
        name: 'base',
        amountDollars: BASE_THRESHOLD_DOLLARS,
        s11Disapplied: s10ConditionsMet && s11Applies,
      };

  // s9 — income against the selected threshold
  if (c.fortnightlyIncome >= threshold.amountDollars) {
    if (threshold.s11Disapplied && c.fortnightlyIncome < HIGHER_THRESHOLD_DOLLARS) {
      return ineligible(
        ['s11', 's9'],
        `Ineligible under s9 read with s11: s10's higher income threshold ($${HIGHER_THRESHOLD_DOLLARS}) is disapplied by s11 because the person has been an Australian resident for fewer than ${S11_RESIDENCY_WEEKS} weeks (${c.residencyWeeks}), so the base threshold ($${BASE_THRESHOLD_DOLLARS}) applies and the person's fortnightly income ($${c.fortnightlyIncome}) is not below it.`,
        threshold,
      );
    }
    return ineligible(
      ['s9'],
      `Ineligible under s9 (income): fortnightly income must be below the ${threshold.name} threshold ($${threshold.amountDollars}); the person's income is $${c.fortnightlyIncome}.`,
      threshold,
    );
  }

  return {
    eligible: true,
    governingReason: {
      sections: ['s6', 's7', 's8', 's9'],
      statement: `Eligible: s6 (age), s7 (residency), s8 (study) and s9 (income, against the ${threshold.name} threshold of $${threshold.amountDollars}${higherApplies ? ', applied under s10' : ''}) are all satisfied.`,
    },
    thresholdApplied: threshold,
    ratePerFortnightDollars: RATE_PER_FORTNIGHT_DOLLARS,
    ...base,
  };
}
