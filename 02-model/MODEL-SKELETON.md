# Kerbcut model — v0.1 skeleton

**Status:** working draft, 9 July 2026. This is the load-bearing structure of the standard: architecture, definitions, conformance model, the five principles with draft guidelines, and *exemplar* success criteria showing the intended shape and testability bar. The full criteria set is Phase 1 work.

> *(Project renamed to Guiderails on 9 July 2026 — D-002. Historical text below retains the original working name.)*

---

## 1. Architecture

The standard deliberately reuses WCAG's proven architecture, because it is instantly legible to the accessibility community, to auditors, and to procurement:

```
Principles (5)
  └─ Guidelines (normative intent, numbered P.G)
       └─ Success criteria (testable statements, numbered P.G.C, levelled A / AA / AAA)
            └─ Techniques (informative, versioned separately, mapped to concrete standards)
```

**Documented divergences from WCAG:**

1. **Conformance unit is the service journey, not the page** (DECISIONS.md D-005). A journey is an end-to-end transaction with a defined outcome (e.g. "report fortnightly obligations", "apply for X", "update contact details"). Agent success is journey-level; page-level perfection with a journey-level dead end is a fail.
2. **Conformance is measured, not only inspected.** Alongside criterion-by-criterion audit, conformance claims at AA and above require benchmark evidence (§7).
3. **Two of the five principles (Determinable, Accountable) have no WCAG ancestor.** They exist because the subject is not content perception but *action under delegated authority against legal rules*.

## 2. Normative language

MUST / MUST NOT / SHOULD / MAY as per RFC 2119. Additionally, per the project's drafting discipline: every normative verb has exactly one meaning; every obligation names exactly one obligated party (the **service operator** unless stated); no criterion may smuggle two actors into one verb.

## 3. Definitions (v0.1 — glossary is a controlled artefact)

- **Principal** — the natural person (or their formally authorised human representative) on whose behalf an agent acts.
- **Agent** — software that autonomously or semi-autonomously perceives a service and takes actions on it in pursuit of a principal's goal. An agent is a *user agent* in the WCAG sense.
- **Delegation** — a verifiable, scoped, time-bounded, revocable grant of authority from a principal to an agent, expressed in a form the service can validate.
- **Machine surface** — any interface the service exposes that is designed for programmatic interpretation: declared tools, manifests, rules endpoints, structured data.
- **Service journey** — a defined sequence of interactions culminating in a service outcome; the unit of conformance.
- **Consequential action** — an action that creates, changes or terminates a legal or administrative state for the principal (submissions, declarations, payments, consents, withdrawals). Each service MUST maintain a published register of its consequential actions; the register is itself a machine surface.
- **Essential journey** — a journey without which the principal cannot obtain the service's core outcome. Essentiality is decided by the service operator against a published test, not asserted ad hoc.
- **Determination** — a computed answer about eligibility, entitlement, obligation or amount, produced from declared inputs by versioned rules.

## 4. Conformance model

- **Level A — Safe.** An agent can identify the service, cannot be silently misled by ambiguous semantics on essential journeys, cannot take consequential actions anonymously, and every agent action is attributable. Level A is about *preventing harm*, not enabling convenience.
- **Level AA — Operable.** Essential journeys are completable end-to-end through declared machine surfaces; rules for essential eligibility questions are computable; delegation, confirmation and audit are fully functional. **AA is the intended target for essential government services**, mirroring the WCAG AA convention.
- **Level AAA — Exemplar.** All journeys operable; determinations are explainable to rule-and-input level; journey contracts published as machine-readable workflow descriptions; proactive change-notice to registered agent developers.

**Conformance claims** state: the journeys in scope, the level, the standard version, the benchmark evidence (AA+), the audit date, and the named accountable owner. Partial claims are permitted only per-journey, never per-criterion.

**Prerequisite:** WCAG 2.2 AA conformance for the journey's human interface is a Level A criterion of this standard (2.1.1). No Kerbcut level is achievable without it.

## 5. Principles, guidelines, exemplar success criteria

### Principle 1 — Discoverable

*The service, its purpose, its authority and its machine surfaces can be found and identified programmatically.*

**Guideline 1.1 — Service identity.** The service publishes a machine-readable description of what it is, who operates it, and whom it serves.
- **1.1.1 (A)** A machine-readable service description is available at a well-known location, stating: service name, administering authority, purpose, canonical entry point, and the standard version claimed. *(Techniques: schema.org/GovernmentService; llms.txt; .well-known manifest.)*
- **1.1.2 (AA)** The description enumerates the service's essential journeys and, for each, its entry point and its consequential actions register.

**Guideline 1.2 — Capability discovery.** Available machine surfaces are enumerable without executing journeys.
- **1.2.1 (AA)** All declared tools and rules endpoints for a journey are discoverable from the service description without navigation, authentication, or side effects.

**Guideline 1.3 — Change legibility.** Machine surfaces are versioned and dated.
- **1.3.1 (AA)** Every machine surface carries a version identifier and last-modified date; breaking changes increment the version.

### Principle 2 — Legible

*Content, controls and journey state carry unambiguous programmatic semantics. The human interface and the machine meaning never diverge.*

**Guideline 2.1 — Accessibility baseline.**
- **2.1.1 (A)** The journey's human interface conforms to WCAG 2.2 Level AA. *(Prerequisite criterion — see §4.)*

**Guideline 2.2 — Field semantics.** Every input's meaning, type, constraints and errors are programmatically determinable.
- **2.2.1 (A)** Every form control exposes programmatically: an accessible name; the expected data type and format; whether it is required; and its validation constraints.
- **2.2.2 (A)** Validation errors are programmatically associated with the control concerned and state, in text, which constraint failed and what remediation is accepted.
- **2.2.3 (AA)** No control's meaning depends on visual position, colour, or proximity alone. *(Shared ancestry with WCAG 1.3.x, restated at journey level.)*

**Guideline 2.3 — One term, one concept.** The service uses a single term for each concept across the journey and defines it in a machine-readable glossary.
- **2.3.1 (AA)** Terms with legal or eligibility significance resolve to glossary entries with definitions and legal source references.

**Guideline 2.4 — State legibility.** Where the journey is, what remains, and what has been committed are determinable.
- **2.4.1 (AA)** Multi-step journeys expose programmatically: the current step, the set of remaining steps, prerequisites not yet satisfied, and whether any consequential action has yet occurred.
- **2.4.2 (A)** The interface state after a consequential action states programmatically that it occurred, when, and its reference identifier.

### Principle 3 — Operable

*Actions are performed through declared, schema-bound, stable interfaces — not inferred pixel manipulation.*

**Guideline 3.1 — Declared actions.** Journey actions are exposed as tools with machine-readable contracts.
- **3.1.1 (AA)** Every essential journey is completable end-to-end via declared tool interfaces whose inputs and outputs are described by published schemas, without synthesised pointer or keyboard events. *(Techniques: WebMCP declarative API for form-backed steps; WebMCP imperative API for dynamic steps; MCP for back-end surfaces.)*
- **3.1.2 (AAA)** Each essential journey publishes a machine-readable workflow description declaring step order, dependencies, inputs, outputs and success criteria. *(Technique: Arazzo.)*

**Guideline 3.2 — Contract stability.** Presentation changes do not break declared contracts.
- **3.2.1 (AA)** Declared tool contracts are stable across UI releases within a major version; deprecations carry a published notice period.

**Guideline 3.3 — No dead ends for authorised agents.** Bot mediation never solely blocks an essential journey for an authorised agent or an assistive-technology user.
- **3.3.1 (A)** No essential journey is gated solely by a challenge (visual, audio, behavioural or puzzle-based) that cannot be completed by an authorised agent or by a user of assistive technology; an authenticated alternative path exists and is discoverable under 1.2.1.

### Principle 4 — Determinable

*What the rules say for a person's circumstances is computable from an authoritative source — not paraphrased from prose.*

**Guideline 4.1 — Computable rules.** Eligibility, entitlement and obligation logic is exposed as a queryable rules service.
- **4.1.1 (AA)** For each essential journey with eligibility or entitlement conditions, a rules endpoint accepts declared circumstance inputs and returns a determination, without requiring account creation for hypothetical queries. *(Techniques: OpenFisca-class engines; GovCMS Rules-as-Code capability.)*
- **4.1.2 (A)** Where 4.1.1 is not yet met, the service's prose eligibility content is flagged programmatically as non-authoritative guidance, and the authoritative channel is identified. *(Level A safety net: agents must at least know when they are paraphrasing.)*

**Guideline 4.2 — Legal provenance.** Determinations carry their authority.
- **4.2.1 (AA)** Every determination response identifies the authorising instrument(s), the rules version, and the effective date applied.

**Guideline 4.3 — Explainability.**
- **4.3.1 (AAA)** For any determination, the service can enumerate the rule path and inputs that produced it, in both machine-readable and plain-language forms.

### Principle 5 — Accountable

*Agents act only under verifiable delegation; every agent action is attributable, confirmable, auditable and contestable.*

**Guideline 5.1 — Delegated authority.** Consequential actions require proof of delegation.
- **5.1.1 (A)** The service rejects, safely and with a programmatically legible reason, any consequential action attempted without a valid delegation naming the principal and scoping the action. *(Techniques: OAuth-family delegation with protected-resource metadata (RFC 9728); integration with national identity delegation arrangements — jurisdiction profile required.)*
- **5.1.2 (AA)** Delegations are scoped (which journeys, which consequential actions), time-bounded, and revocable by the principal through a journey that itself conforms at Level A.

**Guideline 5.2 — Attribution.** Agent-originated interactions are distinguishable.
- **5.2.1 (A)** Agent-originated submissions are flagged as such in service records, without degrading the service provided. *(Technique: WebMCP `SubmitEvent.agentInvoked`-class signals; delegation token binding.)*

**Guideline 5.3 — Consequential checkpoints.** Humans confirm what matters.
- **5.3.1 (A)** The service's published consequential-actions register designates, for each action, whether principal confirmation is required; actions so designated are not executable by an agent without a confirmation event attributable to the principal.

**Guideline 5.4 — Audit and contest.**
- **5.4.1 (AA)** The principal can retrieve a complete, plain-language and machine-readable record of actions taken by agents under their delegations, including determinations relied upon.
- **5.4.2 (AA)** Every outcome produced via an agent is contestable through the same review channels, on the same terms, as an outcome produced manually.

## 6. Relationship to existing instruments (mapping table, v0.1)

| Kerbcut element | Composes with | Nature of relationship |
|---|---|---|
| 2.1.1 | WCAG 2.2 AA; DXP Digital Inclusion Standard | Direct incorporation |
| 1.x | schema.org; llms.txt; .well-known conventions; DXP Digital Access Standard | Profiles / implements intent |
| 3.1.x, 5.2.1 | WebMCP (W3C WebML CG draft) | Profiles; feeds requirements upstream |
| 3.1.2 | Arazzo (OpenAPI Initiative) | Adopts as technique |
| 4.x | OpenFisca-class engines; GovCMS RaC | Adopts as technique |
| 5.1.x | OAuth/RFC 9728 family; national digital ID delegation; NIST agent-identity work | Profiles; jurisdiction annexes |
| 5.3, 5.4 | DTA Agentic AI addendum vocabulary (oversight, accountability, contestability) | Deliberate terminological alignment |

## 7. Assurance (sketch — graduates to /04-assurance)

Conformance at AA+ requires benchmark evidence produced under the published methodology:

- **Fixture:** the journey implemented in two builds — *baseline* (current-practice UI) and *conformant* — functionally identical outcomes.
- **Agent matrix:** ≥3 independent frontier browser/computer-use agents, versions pinned and disclosed.
- **Task suite:** journey tasks including happy path, error-recovery, ineligible-applicant, and adversarial-content (prompt-injection) cases.
- **Metrics:** Task Success Rate; Wrong-Outcome Rate (completed but incorrect — the metric that matters most in government); Fabricated-Input Rate; Unrecoverable-Error Rate; Delegation-Violation Count (must be zero on conformant builds); steps, tokens, wall time.
- **Protocol:** fixed n runs per cell; confidence intervals; full failure taxonomy; publication of harness and fixtures (D-008).

## 8. Open questions register (v0.1)

| # | Question | Blocks |
|---|---|---|
| Q1 | Delegation profile for Australia: composition with myGov and existing nominee arrangements | 5.1 techniques; OD-05 |
| Q2 | Legal status of agent access under the DDA (OD-04) | External claims only — not the model |
| Q3 | How 3.3.1 interacts with fraud-control obligations; acceptable authenticated-alternative patterns | 3.3 final wording |
| Q4 | Hypothetical-query privacy analysis for 4.1.1 (APPs) | 4.1 final wording |
| Q5 | Conformance-claim machine format (extend the 1.1.1 description?) | §4 |
| Q6 | Whether Level A should require a minimal declared-tool surface, or purely safety criteria as drafted | §4, P3 |
| Q7 | Versioning and change-notice periods in 3.2.1 (what number?) | 3.2 |
