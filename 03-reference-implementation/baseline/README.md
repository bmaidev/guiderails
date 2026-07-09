# Baseline build — scientific control (fictional)

**Status:** v0.1 — J1 (Apply). FICTIONAL service (D-009); localhost only. This build is the control arm of the benchmark: same journey, same field set, same validation logic and same outcomes for identical inputs as the conformant build, degraded **only** per the catalogued patterns in [`../parity/PATTERN-CATALOGUE.md`](../parity/PATTERN-CATALOGUE.md) (B-01–B-10, each requiring an S-xx real-world derivation before any benchmark round).

```sh
npm install
npm test        # 8 cases: each anti-pattern present + parity properties hold
npm start       # http://127.0.0.1:3101
```

## Parity mechanics

- Field specs and validation rules are **imported from the conformant module** (`../conformant/src/j1.ts` + `@guiderails/agent-surface` validation) — identical rule logic is structural, not aspirational. Moving these into a shared `fixture-def` package is a tracked refactor (RF-1).
- Duplicate protection is retained (not catalogued as a baseline deficiency), keyed on applicant identity.
- Presentation and machine surfaces are where the catalogue bites: no labels (B-01), colour-borne meaning (B-02), PDF-only guidance whose prose omits s11 (B-03/B-06), silent 15-minute expiry with no resume (B-04/B-10), challenge-gated submission (B-05), no delegation/confirmation/attribution (B-07), generic error banner (B-08), no state surface (B-09).

The parity audit (by someone who did not build either version) is required before any benchmark round — see `../README.md` independence constraints.
