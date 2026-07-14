# Manual conformance evidence

**Status:** internal working document (reference-implementation planning). Not normative. **Owner:** J. Parfoot. **Last updated:** 2026-07-15.

Some criteria cannot be decided by a test against the fixture: they are properties of the *deployment* or of a *methodology round*, not of the served code. These are recorded here and referenced from [`coverage.json`](coverage.json) with status `recorded` — evidence exists, but it is a human/deployment record, not an automated check. Recording them as `recorded` rather than `covered` keeps the manifest honest: it never claims a test decided something a test cannot.

This is the honest counterpart to Layers 1–3: the demo automates every criterion it can, and says plainly which it cannot.

## 1.5.1 (AA) — served from the authority's verified domain, cross-referenced from a register

**Why not automated.** 1.5.1 asks that the service description be served from the administering authority's *verified domain* and, where a whole-of-government service register exists, be cross-referenced from it. Both are facts about where the service is deployed and how a register lists it — neither is a property of the fixture, which is fictional (D-009) and serves from `127.0.0.1` under test. A test asserting a domain here would assert a fiction.

**What the fixture does carry.** The service description names its administering authority (`service.administeringAuthority`) and marks itself fictional. In a real deployment the verification is:

- the description is served over TLS from the authority's registered domain (e.g. `*.gov.au`), with a certificate naming that domain;
- the authority's entry in the whole-of-government service register links to the same canonical description URL, and the description links back;
- the discovery surfaces (1.1.3) all resolve to that one canonical URL on that domain.

**Evidence at deployment.** A recorded check by the accountable owner that the certificate, the register entry, and the canonical URL agree, filed with the conformance claim. Until the standard is deployed against a real domain this is a documented procedure, not a result — recorded here so the criterion is neither silently skipped nor falsely marked machine-verified.

## 5.6.1 (AA) — agent service levels no less favourable than equivalent human ones

**Why not automated.** 5.6.1 asks that service levels for authorised-agent interactions — availability, queueing, and eligibility for outcomes — be no less favourable than for equivalent human interactions. That is a *comparison over load and over outcomes*, established by a measurement round, not by a single request against the fixture. A unit test can show an endpoint answers; it cannot show a queueing policy is no worse than the human counter's over a representative period.

**Methodology.** Established in a benchmark round under [`../04-assurance/`](../04-assurance/): for each essential journey, measure agent-path and human-path availability, queue position and time, and eligibility for the same outcomes, under matched load; 5.6.1 holds when the agent path is no worse on each. The fixture supports this by exposing the same journeys on both surfaces and publishing agent rate limits (3.3.2) stated to be sufficient to complete each journey.

**Evidence.** A results round comparing the two paths, filed under `04-assurance/results/` with the round's methodology and matched to a preregistration. Recorded here as the pending methodology; the number itself is a demo-only number until a round produces it (D-008), so none is asserted.

## Changelog

- **2026-07-15** — Created for Layer 4. Records 1.5.1 (domain/register verification) and 5.6.1 (agent service-level parity) as `recorded` manual/methodology evidence, the two criteria the demo harness cannot decide from the fixture.
