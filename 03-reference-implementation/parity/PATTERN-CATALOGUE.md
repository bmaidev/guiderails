# Baseline pattern catalogue

**Status:** v1.0, 9 July 2026. Every behaviour in which the baseline build is worse than the conformant build is a pattern in this catalogue, and every pattern carries a logged real-world derivation (a source-register entry, S-xx, in RESEARCH-DOSSIER.md §2.1). Baseline is a scientific control, not a strawman: **if a pattern isn't documented in the wild, it doesn't go in** (CLAUDE.md engineering standards).

**Sources are named in the dossier, never here.** This file cites S-xx identifiers only, because fixture materials name no real agency (D-009). The dossier is where the evidence lives; this is where it binds to code.

## Evidence classes

A control that treats every difference as the same kind of claim invites exactly the strawman charge it must survive. Two classes, held apart:

- **Commission** — the service does something documented to exclude people. Prevalence is measurable, and has been measured.
- **Omission** — the service does not do something the standard requires. There is nothing to measure, because the affirmative feature is essentially absent from public services. The evidence is its demonstrated rarity plus authoritative recommendations that it ought to exist. **An omission pattern is the default state of the web** — which is precisely why it cannot be a contrivance. The baseline is not made worse than reality by omitting a rules endpoint; reality omits it.

## Catalogue

| ID | Pattern (baseline behaviour) | Criterion violated | Class | Derivation |
|---|---|---|---|---|
| B-01 | Custom div-based controls with placeholder-only labels; no programmatic name, type, required or constraint semantics | 2.2.1 (and WCAG via 2.1.1) | Commission | **S-55** — 51% of 1M home pages carry missing form input labels; 33.1% of all inputs unlabelled (measured, Feb 2026) |
| B-02 | Meaning carried by layout, colour or proximity alone (e.g. threshold table legible only through colour coding) | 2.2.3 | Commission | **S-60** — W3C failure F73 / Understanding SC 1.4.1. Adjacent measured signal: 83.9% low-contrast pages (**S-55**). *Prevalence of colour-only conveyance is not separately measured; the warrant is the documented failure, not a figure.* |
| B-03 | Eligibility guidance published as PDF only, with no structured or accessible equivalent | 2.5.1, 4.1.2 | Commission | **S-58** (UK government primary: PDFs "do not work well with assistive technologies"; PDF-only publication no longer permitted), **S-59** (Australian government primary: create HTML, not PDF) |
| B-04 | Session timeout (15 minutes) with no prior declaration, no warning, and loss of entered data | 2.6.1 | Commission | **S-57** — W3C WAI cognitive-accessibility pattern *Avoid Data Loss and "Timeouts"*; WCAG 2.2.1 (Level A) exists for this failure |
| B-05 | Visual challenge gate on submission with no authenticated alternative path | 3.3.1 | Commission | **S-56** — W3C: a CAPTCHA "often prevents people with disabilities from performing the requested procedure", amounting to "a denial of service to these users"; audio alternatives increasingly withheld |
| B-06 | No rules endpoint; eligibility answerable only by paraphrasing prose (which omits the s11 interaction) | 4.1.1 | Omission | **S-61** — a Commonwealth royal commission recommended that business rules and algorithms be made available for independent expert scrutiny. *A recommendation to publish is evidence they are not published.* Rules-as-Code deployments remain rare and mostly pilot-scale (**S-41, S-43, S-44, S-45**) |
| B-07 | No delegation, confirmation checkpoint, attribution or agent-action record; consequential actions execute for whoever drives the browser | 5.1.1, 5.2.1, 5.3.1, 5.3.2 | Omission | **S-36, S-37, S-38** — national agentic-AI guidance governs agency-*operated* agents; nothing addresses citizen-side agents arriving at services. No identified national government has published a citizen-side agent-access standard (dossier §6) |
| B-08 | Validation errors displayed as an unassociated banner; no programmatic association with the failing control, constraint unstated | 2.2.2 | Commission | **S-62** — errors must be associated with their controls and a mechanism provided to reach the field in error; WCAG 3.3.1 (Level A) |
| B-09 | No journey-state exposure: current step, remaining steps and whether a consequential action has occurred are visual-only | 2.4.1, 2.4.2 | Omission | **S-01, S-02, S-06** — WebMCP is a Draft Community Group Report under incubation with experimental browser support; declared tools and machine-readable journey state are not yet the ordinary condition anywhere |
| B-10 | Interruption discards the journey; no resume path | 3.4.2 | Commission | **S-57** — same W3C pattern: users who must pause a long process and return should not lose entered data |
| B-11 | Third-party or user-generated content rendered inline, programmatically indistinguishable from the service operator's own content | 5.6.3 | Omission | **S-49** — agent-targeting prompt injection carried in page content, including strings addressed to agents inside accessibility markup and hidden DOM. Rendering third-party content without provenance marking is ordinary practice |
| B-12 | No agent-discovery file (`/llms.txt`) and no machine-readable link relation from human-facing pages to a service description | 1.1.4 | Omission | **S-09, S-10** — 7.4% of Fortune 500 sites had implemented `llms.txt` (Mar 2026); adoption among government services is lower still. *Secondary and not government-specific — the weakest derivation here, and marked as such.* |

## Rules

1. **Derivation before benchmark.** Each pattern must carry a cited S-xx entry (source, access date, description of the observed pattern — pattern, not content; no real agency named in fixture materials) before it counts in a published round. Patterns still TO VERIFY at round time are removed from the baseline for that round. **As at v1.0 no pattern would be removed.**
2. **One pattern, one entry.** New baseline degradations require a new row here first, then implementation.
3. **Parity boundary.** Anything not in this catalogue and not a conformance feature listed in FIXTURE-SPEC.md §8 must be identical between builds; the parity audit checks exactly this.
4. **Weak derivations are labelled, not rounded up.** Two are weaker than the rest and say so in the table: B-02 (documented failure technique, no prevalence measurement) and B-12 (secondary source, not government-specific). Strengthening them is a tracked research task, not a blocker.
5. **The prevalence sample is general-web, not government-specific.** The measured commission derivations come from an analysis of one million *home pages*, not government transactional forms. The patterns are therefore evidenced as widespread web practice that public services are not known to be exempt from — which is weaker than *measured in public services*. A published round states this in its threats to validity (dossier §2.1, limitation 1).

## Open derivation tasks

None blocking. Two strengthening tasks carried:

- **All commission patterns** — a measured sample of *government transactional forms* to replace the general-web home-page prevalence (the single most valuable strengthening available; dossier §7, pass-2 evidence task).
- **B-02** — locate a measured prevalence for colour-only conveyance of meaning (as distinct from low contrast), or accept the failure-technique warrant permanently and record that decision.
- **B-12** — locate government-specific discovery-file adoption data to replace the Fortune 500 figure.

## Changelog

- **2026-07-09:** v0.1 — initial catalogue B-01–B-10 seeded from BENCHMARK-METHODOLOGY.md §2; all derivations pending.
- **2026-07-09:** v0.2 — B-11 added (unfenced third-party content, 5.6.3) with the T5 adversarial-content surface; derivation pending.
- **2026-07-09:** v0.3 — B-12 added (no agent-discovery file or link relation, 1.1.4/D-014); derivation pending.
- **2026-07-09:** v1.0 — **all twelve derivations logged** (S-55–S-62 new; S-01/S-02/S-06/S-09/S-10/S-36–S-38/S-41/S-43–S-45/S-49 reused). Commission/omission evidence classes introduced. Two weak derivations labelled rather than overstated. The baseline is now a derived control: no pattern would be removed at round time.
