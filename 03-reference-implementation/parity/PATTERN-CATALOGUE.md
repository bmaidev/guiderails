# Baseline pattern catalogue

**Status:** v0.1 working draft, 9 July 2026. Every behaviour in which the baseline build is worse than the conformant build must be a pattern in this catalogue, and every pattern must carry a logged real-world derivation (a source-register entry, S-xx, in RESEARCH-DOSSIER.md) before any benchmark round. Baseline is a scientific control, not a strawman: **if a pattern isn't documented in the wild, it doesn't go in** (CLAUDE.md engineering standards). The initial pattern list is taken from BENCHMARK-METHODOLOGY.md §2.

## Catalogue

| ID | Pattern (baseline behaviour) | Guiderails criterion it violates | Derivation status |
|---|---|---|---|
| B-01 | Custom div-based controls with placeholder-only labels; no programmatic name, type, required or constraint semantics | 2.2.1 (and WCAG via 2.1.1) | **TO VERIFY** — S-xx pending |
| B-02 | Meaning carried by layout, colour or proximity alone (e.g. threshold table legible only through colour coding) | 2.2.3 | **TO VERIFY** — S-xx pending |
| B-03 | Eligibility guidance published as PDF only, with no structured or accessible equivalent | 2.5.1, 4.1.2 | **TO VERIFY** — S-xx pending |
| B-04 | Session timeout (15 minutes) with no prior declaration, no warning, and loss of entered data | 2.6.1 | **TO VERIFY** — S-xx pending |
| B-05 | Visual challenge gate on submission with no authenticated alternative path | 3.3.1 | **TO VERIFY** — S-xx pending |
| B-06 | No rules endpoint; eligibility answerable only by paraphrasing prose (which omits the s11 interaction) | 4.1.1 | **TO VERIFY** — S-xx pending |
| B-07 | No delegation, confirmation checkpoint, attribution or agent-action record; consequential actions execute for whoever drives the browser | 5.1.1, 5.2.1, 5.3.1 | **TO VERIFY** — S-xx pending |
| B-08 | Validation errors displayed as an unassociated banner; no programmatic association with the failing control, constraint unstated | 2.2.2 | **TO VERIFY** — S-xx pending |
| B-09 | No journey-state exposure: current step, remaining steps and whether a consequential action has occurred are visual-only | 2.4.1, 2.4.2 | **TO VERIFY** — S-xx pending |
| B-10 | Interruption discards the journey; no resume path | 3.4.2 | **TO VERIFY** — S-xx pending |
| B-11 | Third-party or user-generated content rendered inline, programmatically indistinguishable from the service operator's own content | 5.6.3 | **TO VERIFY** — S-xx pending |

## Rules

1. **Derivation before benchmark.** Each pattern's status must move from TO VERIFY to a cited S-xx entry (source, access date, description of the observed pattern — pattern, not content; no real agency is named in fixture materials) before the pattern counts in a published round. Patterns still TO VERIFY at round time are removed from the baseline for that round.
2. **One pattern, one entry.** New baseline degradations require a new row here first, then implementation.
3. **Parity boundary.** Anything not in this catalogue and not a conformance feature listed in FIXTURE-SPEC.md §8 must be identical between builds; the parity audit checks exactly this.

## Open derivation tasks

Eleven tracked tasks: log S-xx register entries for B-01 through B-11, per the research protocol (each TO VERIFY item gets a tracked task; upgrade rather than accumulate).

## Changelog

- **2026-07-09:** v0.1 — initial catalogue B-01–B-10 seeded from BENCHMARK-METHODOLOGY.md §2; all derivations pending.
- **2026-07-09:** v0.2 — B-11 added (unfenced third-party content, 5.6.3) with the T5 adversarial-content surface; derivation pending.
