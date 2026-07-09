# Decision log

One decision, one owner, one status. Verbs mean what they say: **decide** = the owner has chosen and the choice binds this repository; **propose** = a recommendation awaiting the owner's decision.

| ID | Date | Decision | Owner | Status | Rationale |
|---|---|---|---|---|---|
| D-001 | 2026-07-09 | IP posture: open standard. Specification text CC BY 4.0; reference implementation and tooling Apache-2.0. BMAI is steward. | J. Parfoot | **Decided** | A standard nobody can adopt is a whitepaper. Openness drives adoption and credibility; stewardship, assurance capability and delivery expertise are the commercial layer. You cannot procure a standard — you procure its authors. |
| D-002 | 2026-07-09 | Working name: **Kerbcut**. Trademark, domain and collision check required before any public use. | J. Parfoot | Proposed | The kerb-cut effect is the thesis in one word: accessibility investment that ends up serving every user. Alternatives to be workshopped before Phase 3 public exposure. |
| D-003 | 2026-07-09 | Lead frame: **agents as assistive technology**. Accessibility-first; efficiency and service-cost benefits are co-benefits, never the headline. | J. Parfoot | **Decided** | Matches the standard's genuine primary beneficiaries, the funding context of accessibility-innovation programs, and differentiates from generic AI pitches. |
| D-004 | 2026-07-09 | Sponsor-, client- and partner-specific material (names, budgets, engagement strategy) is excluded from this repository and maintained in a private companion repository. | J. Parfoot | **Decided** | This repo is designed to become public. Probity, confidentiality and clean separation of the open standard from business development. |
| D-005 | 2026-07-09 | Conformance unit is the **service journey** (an end-to-end transaction), not the page. | J. Parfoot | Proposed | Agent success or failure is journey-level. Page-level conformance can be perfect while the journey remains uncompletable. Divergence from WCAG's page-oriented conformance model is deliberate and must be documented in the model. |
| D-006 | 2026-07-09 | WCAG 2.2 AA conformance is a **Level A prerequisite success criterion** of this standard (under Principle 2, Legible). | J. Parfoot | Proposed | Prevents the standard being read as an alternative to human accessibility. There is no agent-accessible service that is not human-accessible. Also aligns with the Digital Experience Policy baseline already binding on agencies. |
| D-007 | 2026-07-09 | Evidence discipline: every normative or factual claim in external-facing material must trace to an entry in the research dossier's source register, carrying a verification status. | J. Parfoot | **Decided** | The credibility of an accessibility standard aimed at government dies on its first unsourced claim. |
| D-008 | 2026-07-09 | Benchmark integrity: reference-implementation results are published with methodology, agent versions, run counts and failure taxonomies. No demo-only numbers. | J. Parfoot | Proposed | The proof mechanic is the product. Unreproducible numbers would be a reputational own-goal in this community. |

| D-009 | 2026-07-09 | Benchmark fixtures are fictional: an invented scheme with no real agency's branding, rules or data, structurally derived from documented real-service patterns. | J. Parfoot | **Decided** | Realism without appropriation: avoids implying agency endorsement, avoids publishing a critique of any named service, and prevents training-data contamination of results. |
| D-010 | 2026-07-09 | The Lived Experience Design Authority (LEDA) holds consent-gate authority over gates C1–C4 as defined in CO-DESIGN-FRAMEWORK.md §3. The steward MUST NOT publish over a withheld gate. | J. Parfoot | **Decided** | A lived-experience body that only advises fails this project's own governance test. Consent gates make removal of the body visibly break the pipeline. |
| D-011 | 2026-07-09 | The August 2025 Commonwealth Ombudsman TCF finding is referenced in external materials factually, with citation to the Ombudsman's report, and constructively only — as evidence for determinability and audit, never as criticism of a prospective partner. | J. Parfoot | **Decided** | Accuracy and probity; the project's posture toward agencies is "lead the fix", and the primary report must be obtained before any external use (see LEGAL-ISSUES-BRIEF L-13). |
| D-012 | 2026-07-09 | Repository layout is canonicalised per README.md; the `06` position is deliberately absent (sponsor material — see D-004). CLAUDE.md is the authoritative operating manual for all agents and contributors; AGENTS.md points to it. Directives in CLAUDE.md trace to entries in this log. | J. Parfoot | **Decided** | One source of truth for how work happens here; the repo's own governance must pass the project's governance test. |

## Open decisions (not yet proposed)

| ID | Question | Needed by |
|---|---|---|
| OD-01 | Final name and mark | Phase 3 (public exposure) |
| OD-02 | Standards liaison path: W3C Community Group vs contribution into existing groups vs Standards Australia engagement | Phase 3 |
| OD-03 | Governance of contributions once public (CLA/DCO, versioning cadence, editorship) | Phase 3 |
| OD-04 | Legal advice per LEGAL-ISSUES-BRIEF.md §8 (12 questions drafted; counsel profile identified). **Progressed 2026-07-09: brief ready; engagement of counsel is the open action.** | Phase 1 close |
| OD-05 | Treatment of authenticated (myGov-mediated) journeys in the reference implementation and benchmark | Phase 2 |
| OD-06 | Whether human-participant benchmark arms intended for research publication require HREC review (default posture: yes, if published as research) | Phase 2 |
| OD-07 | Round-1 benchmark result owner (BENCHMARK-METHODOLOGY.md §12) | Phase 2 open |
