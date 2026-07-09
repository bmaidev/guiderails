# Preregistration — round N (TEMPLATE)

**Copy to `YYYYMM-roundN-prereg.md`, complete every field, commit and tag BEFORE the first run.** Files in this directory are write-once (see README.md): once committed, this document is never edited. Corrections are new dated amendment files that reference this one.

A field you cannot complete is a round you cannot start. `TBD` is not a valid value.

---

## 1. Ownership and versions

| Field | Value |
|---|---|
| Result owner (signs the release checklist, methodology §12) | |
| Preregistration date | |
| Fixture version / commit | |
| Task-brief version / tag (`briefs-v1` or later) | |
| Rules module version (SSPD-2026 rules version) | |
| Adjudication rubric version | |
| Harness version / commit | |
| Parity audit reference (must exist and be committed before runs) | |

## 2. Hypotheses

State each as a directional claim about a specific metric and contrast, before seeing any data. Distinguish **confirmatory** hypotheses (tested here) from **exploratory** questions (reported, never claimed).

| # | Hypothesis | Metric | Contrast | Confirmatory or exploratory |
|---|---|---|---|---|
| H1 | | | conformant vs baseline | confirmatory |
| … | | | | |

## 3. Design

| Field | Value |
|---|---|
| Agents (≥3 independent vendors; product/model IDs and access dates pinned) | |
| Builds | baseline, conformant |
| Task classes in scope | |
| Holdout subset (authored independently of fixture construction; withheld until publication) | |
| n per cell | 30 |
| Randomisation of run order | |
| Environment reset between runs | fresh fixture per run |
| Caching disabled | yes |

## 4. Metrics

Operational definitions are BENCHMARK-METHODOLOGY.md §5 and the adjudication rubric named above. Record here **only deviations or additions**, with rationale. None is the expected answer.

## 5. Analysis plan

| Field | Value |
|---|---|
| Proportion estimates | Wilson 95% intervals |
| Primary contrast | |
| Per-agent build contrasts | two-proportion tests |
| Pooled contrast | stratified by agent |
| Effect sizes | percentage-point differences with intervals |
| Multiplicity handling | |
| Adjudication | two independent adjudicators; Cohen's κ per judgement; κ ≥ 0.8 or revise-and-rescore |

**Everything not specified above is exploratory.** Any analysis run after seeing the data is labelled exploratory in the published results, without exception.

## 6. Exclusion rules

Specify in advance, so no run is excluded after its result is known.

- **Environment-coded runs** (fixture or harness fault) are excluded from all rates, logged, fixed, and the affected cells re-run.
- Runs excluded for any other reason: state the rule here, or no such exclusion is permitted.
- Nondeterminism is part of the phenomenon: **no cherry-picking of seeds or retries; every run counts** (§7).

## 7. Stopping and release

- Runs stop at n per cell. No optional stopping, no adding runs after inspecting results.
- **DVC > 0 on the conformant build blocks release** until dispositioned (§12).
- LEDA consent gate C2 (brief and scenario realism) must be recorded before publication (CO-DESIGN-FRAMEWORK §3).
- Release requires the owner's signed checklist: parity audit complete, preregistration matched, κ threshold met, DVC dispositioned, logs redacted.

## 8. Declared deviations

Left empty at preregistration. Deviations discovered during the round are recorded in the results, labelled exploratory, and cross-referenced to an amendment file here — never by editing this document.
