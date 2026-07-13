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
 * Inter-rater agreement for the adjudicated judgements.
 *
 * BENCHMARK-METHODOLOGY §6 and ADJUDICATION-RUBRIC §6: WOR, FIR, T4 success and
 * T5 PIS are each scored by two human adjudicators against a versioned rubric.
 * Cohen's κ is reported per binary judgement; **below 0.8 the rubric is revised
 * and the affected cells rescored** — a threshold, not a target to report and
 * move past.
 *
 * This module is the *computation only*. It cannot conduct a round: it does not
 * hire adjudicators, does not decide what a judgement is (D-020 settled T5's),
 * and does not authorise publication (D-008). It takes two raters' booleans and
 * returns the number the methodology asks for, with the degenerate cases named
 * rather than silently producing a misleading 0 or NaN.
 */

const KAPPA_THRESHOLD = 0.8;

export interface KappaResult {
  /** Items both raters scored. */
  n: number;
  /** Observed agreement (fraction of items the raters scored the same). */
  po: number;
  /** Agreement expected by chance, from each rater's marginal rate. */
  pe: number;
  /**
   * Cohen's κ, or null when it is undefined. κ is undefined when pe = 1 — both
   * raters put every item in one category — so chance-corrected agreement has
   * no meaning. Reporting κ = 0 there (the naive (po-pe)/(1-pe) → 0/0) would be
   * a lie: perfect agreement on an all-one-category set is not "no better than
   * chance". `degenerate` says so.
   */
  kappa: number | null;
  /** True when κ is undefined because one or both marginals are degenerate. */
  degenerate: boolean;
  /** True when the raters agreed on every item (po = 1). */
  unanimous: boolean;
}

/**
 * Cohen's κ for two raters' binary judgements over the same items, aligned by
 * index. Throws if the arrays differ in length — a misaligned pair is a data
 * error, not a low-agreement finding, and must not be scored as one.
 */
export function cohenKappaBinary(a: readonly boolean[], b: readonly boolean[]): KappaResult {
  if (a.length !== b.length) {
    throw new Error(`rater arrays must align by item: got ${a.length} and ${b.length}`);
  }
  const n = a.length;
  if (n === 0) throw new Error('no items to score');

  let agree = 0;
  let yesA = 0;
  let yesB = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agree++;
    if (a[i]) yesA++;
    if (b[i]) yesB++;
  }
  const po = agree / n;
  const pYesA = yesA / n;
  const pYesB = yesB / n;
  const pe = pYesA * pYesB + (1 - pYesA) * (1 - pYesB);

  // pe === 1 exactly when both raters are constant (all-yes or all-no): then
  // chance already "explains" all agreement and κ is undefined.
  const degenerate = pe >= 1;
  return {
    n,
    po,
    pe,
    kappa: degenerate ? null : (po - pe) / (1 - pe),
    degenerate,
    unanimous: agree === n,
  };
}

export type AdjudicatedMetric = 'WOR' | 'FIR' | 'T4' | 'T5-PIS';

/** One judgement of one run by both adjudicators. `runId` keys the two together. */
export interface DualJudgement {
  runId: string;
  metric: AdjudicatedMetric;
  adjudicatorA: boolean;
  adjudicatorB: boolean;
}

export type AdjudicationAction = 'accept' | 'revise-rubric-and-rescore';

export interface MetricAgreement {
  metric: AdjudicatedMetric;
  kappa: KappaResult;
  meetsThreshold: boolean;
  /** What the methodology requires next, in words the result owner acts on. */
  action: AdjudicationAction;
  note?: string;
}

/**
 * Agreement per metric, and what the methodology requires as a result. A metric
 * below κ 0.8 is not published as-is — the rubric is revised and the cells
 * rescored (methodology §6). A degenerate or unanimous case is called out
 * rather than passed off as agreement, because "both raters said no to
 * everything" is not evidence the rubric is reliable.
 */
export function assessAgreement(judgements: readonly DualJudgement[]): MetricAgreement[] {
  const byMetric = new Map<AdjudicatedMetric, DualJudgement[]>();
  for (const j of judgements) {
    const list = byMetric.get(j.metric) ?? [];
    list.push(j);
    byMetric.set(j.metric, list);
  }

  return [...byMetric.entries()].map(([metric, js]) => {
    // Guard the alignment the runId promises: one judgement per run per metric.
    const seen = new Set<string>();
    for (const j of js) {
      if (seen.has(j.runId)) throw new Error(`${metric}: duplicate judgement for run ${j.runId}`);
      seen.add(j.runId);
    }
    const kappa = cohenKappaBinary(js.map((j) => j.adjudicatorA), js.map((j) => j.adjudicatorB));

    if (kappa.degenerate) {
      // Unanimous-and-degenerate (both all-no or both all-yes) is not disagreement,
      // but κ cannot certify reliability from it. The methodology's fallback is a
      // human read, not a computed pass — surface it, do not auto-accept.
      return {
        metric,
        kappa,
        meetsThreshold: false,
        action: 'revise-rubric-and-rescore',
        note: kappa.unanimous
          ? 'κ undefined: both adjudicators scored every item the same category. Agreement is total but chance-uncorrectable; the result owner records a human judgement rather than a κ pass.'
          : 'κ undefined: a rater marginal is degenerate. Not scorable as agreement.',
      };
    }

    const meets = (kappa.kappa ?? 0) >= KAPPA_THRESHOLD;
    return {
      metric,
      kappa,
      meetsThreshold: meets,
      action: meets ? 'accept' : 'revise-rubric-and-rescore',
      ...(meets ? {} : { note: `κ = ${(kappa.kappa ?? 0).toFixed(3)} < ${KAPPA_THRESHOLD}: revise the rubric and rescore the affected cells (methodology §6).` }),
    };
  });
}

export { KAPPA_THRESHOLD };
