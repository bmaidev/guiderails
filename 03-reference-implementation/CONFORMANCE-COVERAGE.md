# Conformance coverage — what the reference implementation demonstrates, and how to demonstrate all of it

**Status:** internal working document (reference-implementation planning). Not normative; changes no criterion. **Owner:** J. Parfoot. **Last updated:** 2026-07-15.

## Why this document exists

The Storybook app makes the "distribution channel, not a fork" claim visible: Guiderails journeys rendered through a real Australian government design system, with a per-story criterion gate checking the live DOM. It is persuasive, and it is a small slice of the standard. This document states plainly which of the 56 criteria the reference implementation demonstrates today, on which surface, and what it would take to demonstrate all 56 without overclaiming what any one surface can decide.

The honest one-line summary, tracked live in [`coverage.json`](coverage.json): **the browser Storybook shows 9 criteria; automated evidence of some kind exists for 53; 3 have no automated evidence yet** — and those three (1.5.1, 2.2.3, 5.6.1) are the ones a test cannot decide alone. (At Layer 0 this read 4 / 31 / 25 — the original gap was two problems: missing evidence for 25 criteria, and *fragmented, unclaimed* evidence for the 31 already covered. Layers 1–3 closed both.)

## What the number "56" is

MODEL.md v0.6: **56 criteria — 22 Level A, 28 Level AA, 6 Level AAA.** Level A is safety-only; AA and above require benchmark evidence (MODEL.md §Conformance). Numbering is forever; nothing here renumbers anything.

## Where evidence lives today

Evidence is real but scattered across three places, none of which knows about the others:

| Surface | What it is | Criteria with evidence here | Browser-visible |
| --- | --- | --- | --- |
| **Storybook DOM gate** | `@storybook/test-runner` runs the addon's oracle against each story's rendered DOM, through live AgDS | 2.2.1, 2.2.2, 3.1.1, 3.4.3, 2.4.1, 2.4.2, 5.2.1, 5.6.2, 5.6.3 (**9**) | Yes |
| **Conformant server tests** | `conformant/src/{server,j2-j3}.test.ts` — `node:test` assertions against the running fixture's routes, registers and behaviour | ~30 criteria referenced (see below) | No |
| **Recorded manual a11y pass** | `conformant/src/a11y.test.ts` plus the manual WCAG 2.2 AA audit | 2.1.1 | No |

Since Layer 0, two more places carry evidence: `conformant/src/machine-surface.test.ts` (the Layer-2 validator over the served machine surfaces — glossary, documents, workflow, rate limits, status, determination labelling) and `conformant/src/conformance-behaviour.test.ts` (the Layer-3 behavioural scenarios — prefill, single submission, rule-path, past-date determination, rule-change subscription, principal-only enforcement, review-before-execute). The union is **53 of 56** with automated evidence (9 browser-shown). Only the Storybook row is what a reviewer sees in a browser, which is why "how many are in the Storybook" and "how many are demonstrated" have different answers.

## The four evidence surfaces, and why Storybook is only one

A criterion can only be demonstrated on a surface that can actually decide it. Guiderails is mostly a standard about *machine surfaces and service behaviour over time*, not about rendered controls — so most criteria are not Storybook-shaped, and forcing them there would produce theatre, not evidence.

- **Story** — a rendered DOM oracle decides it from a single story (`#storybook-root` innerHTML). Control-level and step-level rendering: names, types, required-state, error association, the step rail, agent-attribution badges, agent-vs-human parity.
- **Surface** — validate a served machine artifact (service description JSON, registers, schemas, glossary, changelog) against the criterion. Decidable from the artifact; no interaction needed. Browsable if we render/validate the artifact in a Storybook "machine surface" story.
- **Behaviour** — a scripted agent scenario against the running conformant service: submit twice, interrupt and resume, act without a delegation, revoke then act, request a rules determination for a past date. Needs request/response, state, time and side effects — this is `04-assurance` territory.
- **Manual** — a recorded human audit or methodology round: the WCAG 2.2 AA pass (2.1.1), domain/deployment verification (1.5.1), content-authority review (4.1.2), service-level comparison (5.6.1), and the benchmark rounds every AA-and-above claim requires.

Rough target distribution once complete: **~10 Story · ~17 Surface · ~24 Behaviour · ~5 Manual** (a few criteria are demonstrated on two surfaces — e.g. 2.4.2 renders in a story *and* is behaviourally gated).

## Full coverage map (all 56)

Status: ✅ shown live in the browser · 🟩 automated evidence exists (server/manual test) · ⬜ no automated evidence yet. "Primary surface" is where the criterion is best demonstrated.

| Criterion | Level | Primary surface | Status |
| --- | --- | --- | --- |
| 1.1.1 | A | Surface | 🟩 |
| 1.1.2 | AA | Surface | 🟩 |
| 1.1.3 | AA | Surface | 🟩 |
| 1.1.4 | A | Surface | 🟩 |
| 1.2.1 | AA | Surface | 🟩 |
| 1.3.1 | AA | Surface | 🟩 |
| 1.4.1 | AA | Surface | 🟩 |
| 1.4.2 | A | Behaviour | 🟩 |
| 1.5.1 | AA | Manual | ⬜ |
| 2.1.1 | A | Manual | 🟩 |
| 2.2.1 | A | Story | ✅ |
| 2.2.2 | A | Story | ✅ |
| 2.2.3 | AA | Story | ⬜ |
| 2.3.1 | AA | Surface | 🟩 |
| 2.3.2 | AAA | Surface | 🟩 |
| 2.4.1 | AA | Story | ✅ |
| 2.4.2 | A | Story | ✅ |
| 2.5.1 | AA | Surface | 🟩 |
| 2.5.2 | AA | Surface | 🟩 |
| 2.6.1 | A | Surface + Behaviour | 🟩 |
| 2.6.2 | AA | Surface | 🟩 |
| 3.1.1 | AA | Behaviour + Story | ✅ |
| 3.1.2 | AAA | Surface | 🟩 |
| 3.2.1 | AA | Behaviour / Manual | 🟩 |
| 3.3.1 | A | Behaviour | 🟩 |
| 3.3.2 | AA | Behaviour + Surface | 🟩 |
| 3.4.1 | A | Behaviour | 🟩 |
| 3.4.2 | AA | Behaviour | 🟩 |
| 3.4.3 | A | Story + Surface | ✅ |
| 3.5.1 | AA | Behaviour | 🟩 |
| 3.5.2 | AAA | Behaviour | 🟩 |
| 4.1.1 | AA | Behaviour | 🟩 |
| 4.1.2 | A | Surface / Manual | 🟩 |
| 4.2.1 | AA | Behaviour | 🟩 |
| 4.3.1 | AAA | Behaviour | 🟩 |
| 4.4.1 | AA | Behaviour | 🟩 |
| 4.4.2 | AA | Surface | 🟩 |
| 4.4.3 | AAA | Behaviour | 🟩 |
| 4.5.1 | A | Behaviour + Surface | 🟩 |
| 4.5.2 | A | Behaviour | 🟩 |
| 5.1.1 | A | Behaviour | 🟩 |
| 5.1.2 | AA | Behaviour | 🟩 |
| 5.1.3 | A | Behaviour | 🟩 |
| 5.1.4 | AA | Behaviour | 🟩 |
| 5.2.1 | A | Story | ✅ |
| 5.3.1 | A | Behaviour + Story | 🟩 |
| 5.3.2 | A | Behaviour | 🟩 |
| 5.3.3 | A | Behaviour | 🟩 |
| 5.4.1 | AA | Behaviour | 🟩 |
| 5.4.2 | AA | Behaviour / Manual | 🟩 |
| 5.5.1 | A | Behaviour | 🟩 |
| 5.5.2 | AA | Behaviour | 🟩 |
| 5.5.3 | AAA | Behaviour | 🟩 |
| 5.6.1 | AA | Manual / Behaviour | ⬜ |
| 5.6.2 | A | Story (parity oracle) | ✅ |
| 5.6.3 | AA | Story | ✅ |

### The 3 with no automated evidence yet

- **2.2.3 (AA, Story):** meaning not conveyed by position/colour/proximity alone — a rendering criterion for a later Storybook pass.
- **1.5.1 (AA, Manual):** the service description is served from the authority's verified domain and cross-referenced from a government register — a deployment/domain fact, not decidable from the fixture (Layer 4).
- **5.6.1 (AA, Manual):** agent service levels are no less favourable than equivalent human ones — a comparison that needs a methodology round, not a single test (Layer 4).

## How to demonstrate all 56

Not "put everything in Storybook." A four-layer harness, each layer targeting the criteria its surface can decide, unified by a single machine-readable coverage claim.

### Layer 0 — the coverage manifest (built)

[`coverage.json`](coverage.json): one entry per criterion → `{ level, surface, status, evidence: [file references] }`, the single source of truth. Validated in CI by the [`coverage-check`](coverage-check/) package, which fails the build if the manifest drifts from MODEL.md or marks any criterion `covered`/`shown` without naming an evidence file that mentions it — so a criterion cannot be claimed without a named test. JSON, not YAML, to stay parseable under the zero-dependency rule. This is the **dogfooding** artifact CLAUDE.md's Dogfooding section lists as outstanding — the standard's "evidence or silence" directive (D-007) turned on the reference implementation's own self-report. Formalising it as a *required, gating* artifact is proposed as **DECISIONS.md D-022** (not decided here).

### Layer 1 — expand the Storybook DOM gate (4 → 9, built)

Done: added checkers and browser-verified stories (`storybook/src/journey-surfaces.stories.tsx`, `surfaces.tsx`) for 2.4.1 (journey-state exposure — current/remaining/kind/prerequisites), 2.4.2 (post-action receipt with reference and timestamp), 5.2.1 (agent-attribution flag), 5.6.2 (parity oracle — the human affordance and the agent's-eye tool derived from one step, so they cannot contradict), and 5.6.3 (third-party content programmatically distinguished from operator content). Each checker recomputes the expected surface from the spec and checks the DOM's `data-gr-*` markers against it — DOM against spec, never DOM against DOM. Remaining Storybook-shaped candidates for a later pass: 2.2.3 (meaning not by position/colour alone) and 5.3.1 (confirmation-checkpoint render). Ceiling is ~10; do not push past it.

### Layer 2 — machine-surface validation (built)

Added the artifacts the Surface criteria need to the conformant service description — a glossary with legal sources and stable ids (2.3.1, 2.3.2), issued documents and evidence rules (2.5.1, 2.5.2), a per-journey machine-readable workflow (3.1.2), published agent rate limits (3.3.2), a `/api/status` surface announcing planned outages with start/end times (1.4.1), an eligibility-guidance non-authoritative flag (4.1.2), and a binding/indicative disposition on determinations (4.5.1) — plus a `/api/glossary` endpoint so no discovery URL is dead. `conformant/src/machine-surface.test.ts` validates each against the running service, closing twelve gaps (1.1.1, 1.3.1, 1.4.1, 2.3.1, 2.3.2, 2.5.1, 2.5.2, 3.1.2, 3.3.2, 4.1.2, 4.4.2, 4.5.1). A browsable "machine surface" Storybook section that renders these artifacts is a later nicety; the validation itself is the evidence.

### Layer 3 — behavioural conformance suite (built)

`conformant/src/conformance-behaviour.test.ts` closes the nine behavioural gaps with named per-criterion scenarios against the running service, adding the fixture surfaces each needs: tool-contract stability with a deprecation notice period (3.2.1), no challenge-gating of an essential journey (3.3.1), prefill of held information (3.5.1, `/api/journeys/{j}/prefill`), a single structured submission validated against the journey schema (3.5.2, `/api/journeys/{j}/submit`), rule-path-and-inputs enumeration on determinations (4.3.1), a past supplied effective date (4.4.1), rule-change subscription (4.4.3, `/api/rules/ssp/subscribe`), principal-only enforcement against any delegation (5.3.3), and a review-before-execute delegation mode that queues actions for the principal (5.5.3, `/api/review-queue`). The many ✅/🟩 Behaviour rows already covered by `server.test.ts` / `j2-j3.test.ts` (3.4.1, 3.4.2, 5.1.x, 5.3.x, 5.5.x, …) keep their existing evidence. The behavioural suite lives with the conformant fixture rather than `04-assurance/harness` so it exercises the service through the same in-process harness the other fixture tests use; the benchmark harness remains the measurement layer, not the conformance-evidence layer.

### Layer 4 — recorded manual & methodology evidence (~5)

2.1.1 (WCAG 2.2 AA manual pass — exists), 1.5.1 (domain/register verification), 4.1.2 (content-authority review), 5.6.1 (service-level comparison), plus the benchmark rounds every AA-and-above *claim* depends on. These are logged artifacts referenced from the manifest, not automated stories.

## Reading the result honestly

When complete, the claim is not "Storybook proves conformance." It is: *every criterion has a named evidence surface; the manifest says which, and where the test lives; the browser demo shows the ~10 that a render can decide, and links to the artifact validation and behavioural suite for the rest.* That survives the sceptic in each room, because it never claims a surface decided something it cannot.

## Changelog

- **2026-07-14** — Created. Coverage baseline: 4 browser-shown, 31 with automated evidence, 25 gaps. Four-layer demo strategy proposed. Layer 0 built: machine-readable `coverage.json` + the `coverage-check` CI validator; formalisation proposed as DECISIONS.md D-022.
- **2026-07-15** — Layer 1 built: 2.4.1, 2.4.2, 5.2.1, 5.6.2, 5.6.3 lifted into browser-verified stories (9 shown; 32 with automated evidence; 24 gaps).
- **2026-07-15** — Layer 2 built: added the glossary/documents/evidence/workflow/rate-limit/status/determination-label artifacts to the conformant fixture and a machine-surface validator; twelve Surface criteria now covered (9 shown; 44 with automated evidence; 12 gaps).
- **2026-07-15** — Layer 3 built: added prefill, single-submission, rule-subscription and review-before-execute surfaces plus rule-path enumeration, and a behavioural conformance suite; nine behavioural criteria now covered (9 shown; 53 with automated evidence; 3 gaps — 1.5.1, 2.2.3, 5.6.1).
