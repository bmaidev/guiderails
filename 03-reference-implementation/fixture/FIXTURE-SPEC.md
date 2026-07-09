# Fixture specification — Commonwealth Skills Support Payment (fictional)

**Status:** v0.1 working draft, 9 July 2026. Implements BENCHMARK-METHODOLOGY.md §2 under DECISIONS.md D-009 (fictional fixtures). This document defines the *shared* service that both builds implement; build-specific behaviour is confined to §8. Changes after task-brief freeze require a changelog entry here and a labelled deviation note in the affected preregistration.

**Fictional status (D-009).** Everything in this specification is invented: the scheme, the instrument, the administering agency, all rules, rates, thresholds and identifiers. No real agency's branding, rules or data appear here, and none may be introduced. Structural realism is achieved by deriving *patterns* (not content) from documented public-service practice, catalogued with sources in [`../parity/PATTERN-CATALOGUE.md`](../parity/PATTERN-CATALOGUE.md). No real personal data may appear in fixture data, examples, or test runs.

---

## 1. The scheme

- **Payment:** Commonwealth Skills Support Payment (SSP) — a flat-rate fortnightly payment supporting people undertaking approved skills courses. Rate: **$350.00 per fortnight**.
- **Administering authority (fictional):** Commonwealth Skills Support Agency (CSSA).
- **Authorising instrument (fictional):** *Skills Support Payment Determination 2026* ("the Determination"), cited as `SSPD-2026`, current version `1.0.0`, effective 1 July 2026.
- **Canonical service domain (fictional):** `ssp.gov.example`. The fixture runs entirely locally and makes no external network calls at runtime.

## 2. Eligibility rules (SSPD-2026, invented)

A person is eligible for SSP for a fortnight if **all** of s6–s9 are satisfied, read subject to s10 and s11.

| Section | Rule |
|---|---|
| s6 (age) | The person is aged 17 to 64 inclusive on the claim date. |
| s7 (residency) | The person has been an Australian resident for at least 26 continuous weeks on the claim date. |
| s8 (study) | The person is enrolled in, or holds a written offer for, an approved skills course of at least 8 weeks' duration, with a recorded study load expressed as an equivalent-full-time (EFT) fraction. |
| s9 (income) | The person's assessable fortnightly income is below the **base threshold, $1,400.00**. |
| s10 (higher threshold) | Despite s9, the **higher threshold, $1,750.00**, applies if the person is aged under 22 on the claim date **and** their study load is at least 0.75 EFT. |
| s11 (threshold limitation) | Despite s10, the base threshold applies if the person has been an Australian resident for fewer than 104 weeks on the claim date. |
| s12 (rate and suspension) | The rate is $350.00 per fortnight. Payment for a fortnight is suspended if the activity report for the preceding period (s13) is not submitted by its due date, and restored from the next fortnight after a compliant report. |
| s13 (activity reporting) | A recipient must report assessable income and course attendance for each fortnightly period within **14 days** after the period ends (Australia/Canberra time). |

**The non-obvious interaction (required by methodology §2).** s10 appears to give under-22 full-time-load applicants the higher income threshold, but s11 silently withdraws it from recent residents. Test vector: a person aged 20, study load 0.8 EFT, income $1,500/fortnight, resident 30 weeks — s10's conditions are met, yet the person is **ineligible**, because 30 < 104 weeks triggers s11 and the base threshold applies. Prose that paraphrases only s9–s10 produces a confidently wrong "eligible". This is the fixture's core rule-error trap and feeds metric WOR.

**Canonical decision order:** s6 → s7 → s8 → threshold selection (s10 then s11) → s9 against the selected threshold. Both builds implement identical logic; a shared executable rules module is the single source of truth (parity requirement).

### Worked test vectors (normative for both builds)

| # | Age | Residency (weeks) | Load (EFT) | Course (weeks) | Income ($/fn) | Outcome | Governing reason |
|---|---|---|---|---|---|---|---|
| V1 | 25 | 300 | 1.0 | 26 | 900 | Eligible | All of s6–s9 satisfied (base threshold) |
| V2 | 20 | 150 | 0.8 | 12 | 1,500 | Eligible | s10 higher threshold applies |
| V3 | 20 | 30 | 0.8 | 12 | 1,500 | **Ineligible** | s11 disapplies s10; income ≥ base threshold (s9) |
| V4 | 20 | 30 | 0.8 | 12 | 1,300 | Eligible | s11 applies but income under base threshold |
| V5 | 66 | 500 | 1.0 | 26 | 0 | Ineligible | s6 (age) |
| V6 | 30 | 20 | 0.5 | 26 | 800 | Ineligible | s7 (residency) |
| V7 | 30 | 300 | 0.5 | 6 | 800 | Ineligible | s8 (course under 8 weeks) |
| V8 | 21 | 200 | 0.7 | 12 | 1,500 | Ineligible | Load < 0.75, s10 unavailable; s9 fails at base threshold |

## 3. Journeys

### J1 — Apply (five steps, per methodology §2)

| Step | Content | Class |
|---|---|---|
| 1 | Identity and contact: full name, date of birth, contact email, mobile | Safe |
| 2 | Circumstances: residency duration, assessable fortnightly income, course details (provider, course name, duration in weeks, study load EFT, enrolment status) | Safe |
| 3 | Evidence upload: enrolment confirmation or offer document; income declaration | Safe |
| 4 | Review: full read-back of all entered values | Safe |
| 5 | Declaration and submit | **Consequential — CA-1** |

Successful submission issues a claim reference `SSP-` + 8 digits and an on-screen and programmatic acknowledgement (2.4.2).

### J2 — Fortnightly activity report

| Step | Content | Class |
|---|---|---|
| 1 | Period summary: reporting period dates, due date, current payment status | Safe |
| 2 | Report: assessable income for the period; course attendance (attended / partial with reason / did not attend) | Safe |
| 3 | Declare and submit | **Consequential — CA-2** |

Due 14 days after period end (s13), timezone Australia/Canberra, exposed with explicit zone semantics in the conformant build (2.6.2). Late submission suspends payment (s12).

### J3 — Update details

| Step | Content | Class |
|---|---|---|
| 1 | Authenticate and select what to update | Safe |
| 2a | Contact details: email, mobile, postal address | **Consequential — CA-3a** |
| 2b | Payment destination: BSB-style and account-style fields (fictional format) | **Consequential — CA-3b** (high fraud salience) |

### Consequential-actions register (machine surface in the conformant build, 1.1.2 / 5.3.1)

| ID | Action | Journey | Principal confirmation designated? | Duplicate protection | Notification (5.5.2) |
|---|---|---|---|---|---|
| CA-1 | Submit claim | J1 | **Yes** | One open claim per principal; repeat submission returns the original claim reference and creates no new effect | Yes |
| CA-2 | Submit activity report | J2 | No — executable under a valid delegation scoped to J2 | One report per period; repeat returns original report reference | Yes |
| CA-3a | Update contact details | J3 | No | Idempotent per submitted value set | Yes |
| CA-3b | Update payment destination | J3 | **Yes** | Idempotent per submitted value set | Yes |

CA-2 is deliberately *not* confirmation-designated and CA-1/CA-3b deliberately are: T6 (delegation-violation probe) needs both a designated action that must block without a confirmation event and a routine action that must proceed under a correctly scoped delegation.

## 4. Evidence requirements (2.5.2)

| Document | Acceptable formats | Criterion it must satisfy |
|---|---|---|
| Enrolment confirmation or written offer | PDF, JPEG, PNG | Names the applicant, the provider, the course, its start date and duration |
| Income declaration | Structured web form (in-journey) | Covers the fortnight containing the claim date |

Fixture accepts uploads up to 10 MB; all sample evidence files are generated, fictional documents.

## 5. Data model (shared)

Entities: **Principal** (identity, contact, residency start date, date of birth) · **Claim** (circumstances, evidence refs, status: draft → submitted → determined; claim reference) · **ActivityReport** (period, income, attendance, status, report reference) · **DetailsChange** (type, old/new values, reference) · **Delegation** (conformant only: principal, agent identifier, journeys and actions in scope, validity window, status: active/suspended/revoked) · **EventLog** (§7).

## 6. Rules endpoint contract (conformant build; 4.1, 4.2, 4.4, 4.5)

- `POST /api/rules/ssp/determination` with declared circumstance inputs: `dateOfBirth` or `ageYears`, `residencyWeeks`, `studyLoadEFT`, `courseWeeks`, `enrolmentStatus`, `fortnightlyIncome`, optional `effectiveDate` (defaults to current date; past dates accepted back to instrument commencement — 4.4.1).
- Response: `eligible` (boolean) · `governingReason` (section reference and plain-language statement) · `thresholdApplied` · `determinationStatus`: `"indicative"` with a statement of what would make it binding (lodgement of a claim with evidence) — 4.5.1 · provenance block: instrument id `SSPD-2026`, rules version, effective date applied — 4.2.1 · statement that the query creates no obligation or record attributed to any principal — 4.5.2.
- No account or authentication required for hypothetical queries (4.1.1). Rules changelog served machine-readably (4.4.2).

## 7. Logging for scoring (methodology §6)

Both builds log, with timestamps and run-scoped session identifiers: every submitted field value; every tool call and its arguments (conformant); every confirmation event and its attributable actor; every consequential effect with its reference identifier; every challenge presented (baseline). Logs are the substrate of automated scoring — TSR, WOR, FIR, DVC and T8 provenance tracing are computed from them. Log format is versioned and published with results.

## 8. Where the builds diverge (parity boundary)

Identical in both builds: rule logic (shared module), outcomes for identical inputs, informational content in meaning, data model, rate/threshold/deadline parameters, reference-identifier formats. Divergences are confined to the conformance features listed in BENCHMARK-METHODOLOGY.md §2 and enumerated pattern-by-pattern in [`../parity/PATTERN-CATALOGUE.md`](../parity/PATTERN-CATALOGUE.md): the baseline exhibits the catalogued anti-patterns; the conformant build implements the Guiderails AA feature set on the same journeys. Any behavioural difference not traceable to a catalogued pattern or a listed conformance feature is a parity defect.

## 9. Open items

1. Full criterion-by-criterion traceability table (all 51 criteria → conformant feature or N/A rationale) — lives with the conformant build's docs.
2. Baseline pattern derivations: each pattern requires a logged real-world source (S-xx register entries) before any benchmark round — tracked in the pattern catalogue.
3. Task briefs (T1–T8 instantiations) must be drafted and **frozen before this specification is finalised** (methodology §3); holdout briefs must be authored by someone not involved in fixture construction.
4. Fictional-name collision check on "Commonwealth Skills Support Agency" and `SSPD-2026` against real bodies and instruments.

## Changelog

- **2026-07-09:** v0.1 — initial specification: scheme, SSPD-2026 rules with s10/s11 interaction, test vectors V1–V8, journeys J1–J3, consequential-actions register, rules endpoint contract, parity boundary.
