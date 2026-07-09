# Parity audit

The baseline and conformant builds must be **identical except where declared**. Methodology §2 requires an audit of this before any benchmark round, filed and published with the results, performed by someone who built neither build.

That audit is a person. This directory is the half a machine can do — so the person's attention goes where a machine cannot look.

```sh
npm install
npm test          # 12 checks; fails CI the moment the builds drift apart
npm run report    # markdown report for the auditor to review and sign
```

## What is checked

Shared rules module and its parameters · identical field sets per journey step · identical outcomes and recorded values for the same applicant · identical validation accept/reject (normalising for B-08, since the baseline signals rejection by re-rendering rather than by status code) · duplicate protection returning the original reference · the surface inventory · and that every declared divergence is classified, with each derived one naming the pattern that forces it.

## Three kinds of divergence

1. **Catalogued** — a baseline anti-pattern (B-01…B-12), derived in [PATTERN-CATALOGUE.md](PATTERN-CATALOGUE.md).
2. **Conformance** — a Guiderails feature the conformant build implements.
3. **Derived** — a difference *forced* by (1), not chosen. **These are what an audit misses.** When a catalogued pattern removes a concept, everything keyed on that concept must change with it, and the result looks exactly like a defect because nothing in the catalogue or the feature list names it directly.

The first derived divergence found this way is `DV-duplicate-scope`: B-07 removes the principal from the baseline, so its duplicate-protection keys degrade from principal scope to applicant identity and session. Duplicate protection still works on both builds; the scope of "the same submission" differs, and it is observable in both directions. It is declared in [FIXTURE-SPEC §8](../fixture/FIXTURE-SPEC.md) and demonstrated by two checks here.

## What the machine cannot check

Whether the two builds' informational content is the same *in meaning*; whether a declared divergence is honestly declared rather than a way of making the baseline worse than its derivation warrants; whether some other derived divergence remains undeclared; and whether the baseline is worse than the wild. The report puts these in front of the auditor as §3, and a parity audit filed without them reviewed is a test run, not an audit.
