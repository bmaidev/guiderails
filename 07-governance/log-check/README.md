# Governance log check

Machine checks on the repository's own governance artefacts. D-012: *the repo's own governance must pass the project's governance test.*

```sh
npm ci && npm test
```

## What it checks

| Check | Claim |
|---|---|
| Status form | Every `DECISIONS.md` row reads `**Decided**` or begins `Proposed`. The log's preamble says the verbs mean what they say. |
| Numbering | Decision ids run `D-001` upward, no gap, no reuse (prime directive 7). |
| **No drift** | Every decision cited by `CLAUDE.md` or `MODEL.md` reads *Decided* — or appears in the exemption list *and* states in its own rationale what blocks the decision. |
| Self-reported size | `MODEL.md` states its criterion count in the contents line and in the change-log entry that lands the current version. Both must equal the criteria actually present, by level. |
| Criterion numbering | No criterion number appears twice (prime directive 7). |
| Resolved questions | A struck-through open question in §8 names a decision that exists and is *Decided*. |

## Why it exists

Four decisions once read *Proposed* while the artefacts were built on them, and one — D-008, no demo-only numbers — was enforced in the harness code as though it bound. Code that enforces a proposal is either overreach or a decision the log failed to record. It was the latter, and nothing would have noticed.

There is exactly one lawful exemption: **D-002**, the working name. Use necessarily precedes the decision, because every document must call the project something. The exemption is granted only while the row itself records what blocks it. Adding to that list is a policy act — it says the repository is content to lean on something the owner has not decided.

## What it cannot check

Whether a decision was *right*, whether a criterion is *testable*, whether a rationale is *true*. These check form. Substance is the steward's, and the reviewer's.
