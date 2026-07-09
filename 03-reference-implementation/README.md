# Reference implementation — Phase 2 (Proof)

**Status:** v0.1, 9 July 2026. Phase 2 opening document. Governs the build of the fixture service in two parity-controlled versions and their relationship to the benchmark harness (BENCHMARK-METHODOLOGY.md).

## What gets built

| Directory | Contents |
|---|---|
| `fixture/` | The shared service definition ([FIXTURE-SPEC.md](fixture/FIXTURE-SPEC.md)): the fictional Commonwealth Skills Support Payment, its rules, journeys, data model, and the shared rules module both builds consume |
| `baseline/` | The control build: replicates prevalent current practice, violating only the patterns catalogued in `parity/` |
| `conformant/` | The Guiderails AA build: same journeys, same outcomes, plus the conformance feature set (declared tools, rules endpoint, delegation, confirmation, attribution, resumability) |
| `parity/` | The pattern catalogue with real-world derivations, and the independent parity audit report (committed before any benchmark round) |

## Build order (sequencing is load-bearing)

1. **Fixture specification** (this PR) — scheme, rules, journeys, parity boundary.
2. **Task briefs drafted and frozen** — before fixture finalisation (methodology §3, anti-gaming). Holdout briefs are authored by someone not involved in fixture construction and are not committed to this repository until first results publish.
3. **Shared rules module + test vectors** — the executable single source of truth for SSPD-2026; both builds import it (parity requirement).
4. **Conformant build**, then **baseline build** — baseline features are removed/degraded strictly per catalogued patterns, each with a logged real-world derivation. A pattern without a documented source does not go in.
5. **Parity audit** — by someone who did not build either version; report committed to `parity/`.
6. **Harness + preregistration** — analysis pre-registered (write-once, `04-assurance/preregistration/`) before first runs.
7. **Result round 1** — under the methodology's protocol; result owner assigned in DECISIONS.md (OD-07) before runs begin.

## Independence constraints (who must not do what)

- The **parity auditor** did not build either version (CLAUDE.md engineering standards).
- **Holdout-brief authors** were not involved in fixture construction (methodology §3).
- The **round-1 result owner** signs the release checklist (methodology §12) and is assigned via DECISIONS.md when runs are scheduled.

These constraints require people other than the primary builder; they are flagged as open staffing actions for the steward.

## Engineering standards (inherited from CLAUDE.md)

Conformant build passes WCAG 2.2 AA in CI plus a recorded manual pass; a11y regressions fail the build. Lockfiles committed; no external network calls at runtime; no secrets; no real personal data. Apache-2.0 headers on code. Proposed stack is DECISIONS.md D-013 — code lands only once that entry reads *Decided*.

## Publication posture

The fixture remains private until first results publish (methodology §3, anti-gaming). This constrains when this repository, or at least `03-reference-implementation/`, can be made public — flagged for the steward's Phase 3 planning.
