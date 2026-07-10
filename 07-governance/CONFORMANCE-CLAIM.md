# Conformance-claim format

**Status: PROPOSED, 10 July 2026.** Owner: J. Parfoot. Tracked as `DECISIONS.md` **D-017** and, if decided, closes open question **Q5** (MODEL.md §8).

> **This does not bind anything yet.** No service, including the reference implementation, is required to publish a claim in this format until D-017 reads *Decided*. It is drafted so that Q5 has something concrete to argue with, because the standard already requires an artefact whose format did not exist.

## Why this must exist

MODEL.md §4 says: *"The claim itself is published as a machine surface referenced from the service description (1.1.1)."* The standard therefore obliges a service operator to publish an artefact whose format the standard has never defined. A criterion that cannot be satisfied because its object is undefined is not a criterion; it is a promise.

§4 already fixes the **content**: journeys in scope; level; standard version; audit date; benchmark evidence reference (AA and above, per §7); and the named accountable owner. What follows adds only shape, plus the three things a reader of a claim needs and §4 does not yet say: how to tell a claim apart from an aspiration, what happens when it expires, and how to contest it.

## Shape

A claim is one JSON document, served at a stable URL, referenced from the service description under `conformanceClaim`. Schema: [`conformance-claim.schema.json`](conformance-claim.schema.json).

```json
{
  "standard": "Guiderails",
  "standardVersion": "0.5",
  "claimedLevel": "AA",
  "service": {
    "name": "Commonwealth Skills Support Payment",
    "administeringAuthority": "Commonwealth Skills Support Agency"
  },
  "journeysInScope": [
    { "id": "J1", "title": "Apply", "essential": true, "level": "AA" },
    { "id": "J2", "title": "Fortnightly activity report", "essential": true, "level": "AA" }
  ],
  "auditDate": "2026-07-10",
  "expires": "2027-07-10",
  "accountableOwner": {
    "name": "A. Person",
    "role": "Chief Digital Officer",
    "organisation": "Commonwealth Skills Support Agency"
  },
  "benchmarkEvidence": {
    "required": true,
    "resultsUrl": "https://example.gov.au/guiderails/results-202607-round1.json",
    "preregistration": "https://example.gov.au/guiderails/prereg-202607-round1.md",
    "roundDate": "2026-07-01"
  },
  "contest": "https://example.gov.au/guiderails/contest",
  "exclusions": []
}
```

## Rules the format enforces

**Claims are per journey, never per criterion.** MODEL.md §4 is explicit, and the schema forbids a `criteria` array. A service that could claim criterion-by-criterion would claim the easy ones. Conformance is a property of a journey a person completes, or it is nothing.

**A claim without an accountable owner is not a claim.** One named human, with a role and an organisation. Not a team, not an inbox. This is prime directive 9 applied to the claim itself: one obligation, one obligated party.

**AA and above require benchmark evidence** (§7), so `benchmarkEvidence.resultsUrl` is required whenever `claimedLevel` is `AA` or `AAA`, and the results must reference a preregistration. A claim at AA with no evidence is malformed, not merely unsupported.

**A claim expires.** `expires` is required and must postdate `auditDate`. An unexpiring claim is an assertion about a service that has since changed. WCAG's conformance claims have no expiry and are routinely stale; this is a deliberate departure, and the reason is written down here.

**Exclusions are declared, not implied.** Any journey the operator excludes from scope appears in `exclusions` with a reason. Silence about a journey means it is in scope and conforming — the burden sits with the operator, which is where §4 puts it.

**A claim names where to contest it.** 5.4.2 requires outcomes produced via an agent to be contestable on the same terms as manual ones. A conformance claim that a person cannot challenge is marketing.

## What this proposal does not settle

- **Signature and provenance.** Should a claim be signed, and by whom? Left open deliberately; it interacts with Q10 (agent attestation) and with whatever OD-02 concludes about a standards home.
- **A conformance registry.** Where claims are discovered in aggregate, and who may list them, is a stewardship question (OD-03), not a format question.
- **Machine verification of the claim's truth.** The format makes a claim checkable by a person and parseable by an agent. Nothing here verifies it. That is what the audit and the benchmark are for, and a format that implied otherwise would be worse than none.

## If adopted

D-017 moves to *Decided*; Q5 is struck through in MODEL.md §8 with the resolving decision named; the reference implementation publishes a claim at `/.well-known/guiderails-claim.json`, referenced from its service description; and `07-governance/log-check` validates that claim against the schema on every build, so the repository's own fixture cannot publish a malformed one.

Until then this file is a draft, and the fixture continues to publish only `standardClaimed`.
