# @guiderails/coverage-check

Machine check on the reference implementation's conformance-coverage manifest, [`../coverage.json`](../coverage.json). The manifest is the single source of truth for which of MODEL.md's 56 criteria the reference implementation demonstrates, on which evidence surface, and where the evidence lives; the narrative is in [`../CONFORMANCE-COVERAGE.md`](../CONFORMANCE-COVERAGE.md).

## What it enforces

- The manifest covers **exactly** MODEL.md's criteria — once each, with the level MODEL.md assigns.
- The level tally is 22 A / 28 AA / 6 AAA (guards against a criterion being dropped or duplicated).
- Every entry uses a known `surface` and `status`; a `shown` entry is a Storybook story; a `gap` carries no evidence and a non-gap carries some.
- **The load-bearing rule:** every `covered` or `shown` criterion names an evidence file that exists **and** mentions the criterion id. The manifest therefore cannot claim coverage a test does not carry — this is the dogfood of the standard's own "evidence or silence" directive (D-007), applied to the reference implementation's self-report.

## Run

```
npm ci && npm run typecheck && npm test
```

Zero runtime dependencies; JSON (not YAML) keeps the manifest parseable without one. Runs in CI as a package in the `ci.yml` matrix.

Dogfooding — [DECISIONS.md](../../DECISIONS.md) D-022.
