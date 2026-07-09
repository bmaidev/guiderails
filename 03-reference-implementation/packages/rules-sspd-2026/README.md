# @guiderails/rules-sspd-2026

Executable rules for the **fictional** *Skills Support Payment Determination 2026* (DECISIONS.md D-009 — the scheme, instrument, rates and thresholds are invented). This module is the single source of truth for SSPD-2026 eligibility logic: **both fixture builds import it**, which is what makes "identical rule logic" a parity property rather than a hope (FIXTURE-SPEC.md §8).

- `determine(circumstances, { effectiveDate })` — applies the canonical decision order s6 → s7 → s8 → threshold (s10/s11) → s9 and returns a determination with governing reason, threshold applied, indicative/binding labelling (4.5.1), provenance (4.2.1) and the no-obligation statement (4.5.2).
- `reportDueDate(periodEnd)` — s13 due-date arithmetic with declared timezone semantics (2.6.2).
- The normative test vectors V1–V8 from FIXTURE-SPEC.md §2 are the core of the test suite, including the s10/s11 trap (V3).

```sh
npm install
npm test        # node:test — no test-framework dependency
npm run typecheck
```

Runs on Node ≥ 24 (native TypeScript type-stripping; the source is erasable-syntax-only). Dev dependencies only; no runtime dependencies; no network access.
