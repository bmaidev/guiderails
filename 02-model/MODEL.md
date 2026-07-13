# Guiderails — the standard

**Version 0.6 — 13 July 2026.** Supersedes the v0.1 skeleton (retained as MODEL-SKELETON.md for history). Numbering from v0.1 is stable; v0.2 added guidelines 1.4, 1.5, 2.5, 2.6, 3.4, 3.5, 4.4, 4.5, 5.5, 5.6 and their criteria; v0.3 added criterion 1.1.4 (D-014); v0.4 added criterion 5.3.2 (D-015); v0.5 added criteria 5.1.3 and 5.3.3 (D-016); v0.6 adds criterion 5.1.4 (D-019).

**Contents:** §1 architecture · §2 normative language · §3 definitions · §4 conformance model · §5 the five principles and 56 success criteria · §6 instrument mapping · §7 assurance · §8 change log and open questions.

---

## 1. Architecture

```
Principles (5)
  └─ Guidelines (normative intent, numbered P.G)
       └─ Success criteria (testable, numbered P.G.C, levelled A / AA / AAA)
            └─ Techniques (informative, versioned separately)
```

Documented divergences from WCAG: (1) the conformance unit is the **service journey**, not the page (D-005); (2) conformance at AA and above requires **benchmark evidence**, not only inspection (§7); (3) Principles 4 and 5 have no WCAG ancestor, because the subject is action under delegated authority against legal rules, not content perception.

## 2. Normative language

MUST / MUST NOT / SHOULD / MAY per RFC 2119. Drafting discipline: every normative verb has exactly one meaning; every obligation names exactly one obligated party — the **service operator** unless a criterion states otherwise. No criterion may bind two actors with one verb.

## 3. Definitions

Terms defined in v0.1 carry forward: **principal**, **agent**, **delegation**, **machine surface**, **service journey**, **consequential action**, **essential journey**, **determination**. Added in v0.2:

- **Agent-facing surface** — any machine surface, plus any content or metadata reasonably expected to be consumed by agents (including accessibility semantics and discovery files).
- **Binding determination** — a determination the service operator will stand behind as its decision or assessment for the supplied circumstances.
- **Indicative determination** — a determination provided for guidance that does not commit the service operator.
- **Duplicate-protected** — implemented such that repeat submission of the same action cannot create an additional legal or administrative effect, and the response identifies the original effect.
- **Safe step** — a journey step whose execution creates no legal or administrative effect and changes no stored state about the principal other than session state.
- **Delegation token** — the verifiable artefact by which an agent proves a delegation to the service.
- **Essentiality test** — the service operator's published criteria for classifying a journey as essential. The classification and the test are both machine surfaces.
- **Agent-driven session** — a session in which an agent presents a delegation, or in which the service otherwise establishes that an agent is operating.
- **Principal-attributable confirmation** — a confirmation the service can attribute to the principal because it was made through a channel under the principal's control which the agent can neither operate nor forge. An interaction within an agent-driven session is never principal-attributable.
- **Confirmation token** — the verifiable artefact by which a principal's confirmation of one designated action is conveyed to the service. Issued by the service to the principal; presented once by the agent; never minted by the agent.

Added in v0.5:

- **Principal-only action** — a consequential action the service executes only on the principal's own request, and never on an agent's, whatever delegation the agent presents. Designation as principal-only is part of the consequential-actions register (5.3.3).
- **Non-delegable authority** — authority that a delegation cannot convey, whatever its terms. Authority over delegations themselves is non-delegable (5.1.3).

Added in v0.6:

- **Authority request** — a message from an agent to a principal asking to be granted authority the agent does not hold. It binds the principal to nothing, changes no state the principal is accountable for, and is not a consequential action; the principal remains free to ignore it. Distinct from a delegation (which conveys authority) and from a consequential action (which creates an effect).

## 4. Conformance model

**Levels.**
- **A — Safe.** Prevents harm: the service is identifiable, its semantics cannot silently mislead on essential journeys, consequential actions cannot occur anonymously or without principal confirmation where designated, actions reserved to the principal cannot be performed by an agent at all, duplicates cannot compound, and every agent action is attributable and revocable.
- **AA — Operable.** Essential journeys are completable end-to-end through declared machine surfaces; essential eligibility questions are computable with legal provenance; delegation, notification, audit and equitable treatment are fully functional. **AA is the intended target for essential government services.**
- **AAA — Exemplar.** All journeys operable; determinations explainable to rule-and-input level; journey contracts published as machine-readable workflow descriptions; structured whole-of-journey submission; review-before-execute delegation; change subscription.

**Prerequisite.** WCAG 2.2 AA conformance of the journey's human interface is Level A criterion 2.1.1. No Guiderails level is achievable without it.

**Claims.** A conformance claim states: journeys in scope; level; standard version; audit date; benchmark evidence reference (AA and above, per §7); and the named accountable owner. Claims are made per journey; per-criterion claims are not recognised. The claim itself is published as a machine surface referenced from the service description (1.1.1).

**Applicability notes.** Guideline 4.1–4.5 criteria apply only to journeys with eligibility, entitlement or obligation conditions. Guideline 5.x criteria concerning delegation apply to all journeys containing consequential actions.

---

## 5. Principles, guidelines and success criteria

### Principle 1 — Discoverable

*The service, its purpose, its authority and its machine surfaces can be found and identified programmatically.*

**Guideline 1.1 — Service identity.**
- **1.1.1 (A)** A machine-readable service description is available at a well-known location and states: service name; administering authority; purpose; canonical entry point; and the version of this standard claimed.
- **1.1.2 (AA)** The service description enumerates the service's essential journeys and, for each: its entry point, its consequential-actions register, and its essentiality-test reference.
- **1.1.3 (AA)** Where multiple discovery surfaces are published (root summary file, well-known manifest, embedded structured data), each identifies the same canonical service description, and their overlapping content does not conflict.
- **1.1.4 (A)** The service description is discoverable without prior knowledge of its location. The service operator publishes a root-level agent-discovery file that identifies the service description, and every human-facing page of an essential journey references the service description through a machine-readable link relation.

**Guideline 1.2 — Capability discovery.**
- **1.2.1 (AA)** All declared tools and rules endpoints for a journey are discoverable from the service description without navigation, authentication, or side effects.

**Guideline 1.3 — Change legibility.**
- **1.3.1 (AA)** Every machine surface carries a version identifier and a last-modified date; breaking changes increment the version.

**Guideline 1.4 — Availability and status.**
- **1.4.1 (AA)** Planned outages and degradations of machine surfaces are announced in a machine-readable status surface with start and end times.
- **1.4.2 (A)** A request to an unavailable or withdrawn machine surface receives a programmatically legible response that distinguishes temporary unavailability from permanent withdrawal and identifies at least one alternative channel.

**Guideline 1.5 — Authenticity.**
- **1.5.1 (AA)** The service description is served from the administering authority's verified domain and, where an authoritative whole-of-government service register exists, references its entry in that register.

*Techniques (informative):* schema.org/GovernmentService; llms.txt (1.1.4's root file); IANA `service-desc` link relation (RFC 8631) and HTTP `Link` headers (RFC 8288); `.well-known` service manifests; sitemaps; government domain policies. *Rationale:* discovery failures are silent — an agent that finds an impersonating or stale surface fails the principal before the journey begins. 1.1.4 exists because a machine surface an agent cannot locate confers nothing: an agent that lands on the human interface and cannot find its way to the service description falls back to interpreting the page, and every downstream guarantee — the consequential-actions register, confirmation designations, rules provenance — becomes unreachable. Discoverability is therefore a Level A (safety) property, not merely an operability one.

### Principle 2 — Legible

*Content, controls and journey state carry unambiguous programmatic semantics. The human interface and the machine meaning never diverge.*

**Guideline 2.1 — Accessibility baseline.**
- **2.1.1 (A)** The journey's human interface conforms to WCAG 2.2 Level AA. *(Prerequisite criterion — §4.)*

**Guideline 2.2 — Field semantics.**
- **2.2.1 (A)** Every form control exposes programmatically: an accessible name; the expected data type and format; whether it is required; and its validation constraints.
- **2.2.2 (A)** Validation errors are programmatically associated with the control concerned and state, in text, which constraint failed and what remediation is accepted.
- **2.2.3 (AA)** No control's meaning depends on visual position, colour, or proximity alone.

**Guideline 2.3 — One term, one concept.**
- **2.3.1 (AA)** Terms with legal or eligibility significance resolve to entries in a machine-readable glossary giving the definition and its legal source reference.
- **2.3.2 (AAA)** Glossary entries carry stable identifiers designed for reuse across services.

**Guideline 2.4 — State legibility.**
- **2.4.1 (AA)** Multi-step journeys expose programmatically: the current step; the set of remaining steps; prerequisites not yet satisfied; and whether any consequential action has yet occurred.
- **2.4.2 (A)** After a consequential action, the journey states programmatically that it occurred, when, and its reference identifier.

**Guideline 2.5 — Documents and evidence.**
- **2.5.1 (AA)** Every document the journey requires the principal to read, or issues to the principal, is available in an accessible, machine-readable format or is accompanied by a structured-data equivalent of its operative content.
- **2.5.2 (AA)** Evidence requirements are enumerated programmatically: which documents, acceptable formats, and the criteria each must satisfy.

**Guideline 2.6 — Time.**
- **2.6.1 (A)** Any session or interaction time limit is declared programmatically before the journey begins; expiry does not discard entered data without prior warning and a recovery path.
- **2.6.2 (AA)** Deadlines carrying consequences for the principal (reporting periods, response windows) are exposed programmatically with explicit timezone semantics.

*Techniques:* HTML semantics and ARIA; `autocomplete` and `inputmode`; structured error objects; tagged PDF with structured sidecars; ISO 8601 with zone offsets. *Rationale:* every criterion here is a WCAG-native idea restated at journey level; this is the principle where "the agent is the newest screen reader" is literal.

### Principle 3 — Operable

*Actions are performed through declared, schema-bound, stable interfaces — not inferred pixel manipulation.*

**Guideline 3.1 — Declared actions.**
- **3.1.1 (AA)** Every essential journey is completable end-to-end via declared tool interfaces whose inputs and outputs are described by published schemas, without synthesised pointer or keyboard events.
- **3.1.2 (AAA)** Every essential journey publishes a machine-readable workflow description declaring step order, dependencies, inputs, outputs and success criteria.

**Guideline 3.2 — Contract stability.**
- **3.2.1 (AA)** Declared tool contracts remain stable across interface releases within a major version; deprecations carry a published notice period of at least 90 days *(number provisional — Q7)*.

**Guideline 3.3 — No dead ends for authorised agents.**
- **3.3.1 (A)** No essential journey is gated solely by a challenge (visual, audio, behavioural or puzzle-based) that cannot be completed by an authorised agent or by a user of assistive technology; an authenticated alternative path exists and is discoverable under 1.2.1.
- **3.3.2 (AA)** Rate limits applied to authorised agents are published, are sufficient to complete each essential journey, and are enforced with standard machine-readable throttle responses carrying retry semantics.

**Guideline 3.4 — Safety of execution.**
- **3.4.1 (A)** Every consequential action is duplicate-protected.
- **3.4.2 (AA)** An interrupted journey can be resumed without loss of entered data for a declared period.
- **3.4.3 (A)** Steps other than consequential actions are safe steps and are declared as such in the journey's machine surfaces.

**Guideline 3.5 — Structured intake and reuse.**
- **3.5.1 (AA)** Where the service operator already holds information supplied by the principal, the journey offers programmatic prefill of that information rather than requiring re-entry.
- **3.5.2 (AAA)** The journey accepts, as an alternative to stepwise completion, a single structured submission validated against the published journey schema.

*Techniques:* WebMCP declarative API for form-backed steps; WebMCP imperative API for dynamic steps; MCP for back-end surfaces; Arazzo for 3.1.2; idempotency keys; HTTP 429 with `Retry-After`. *Rationale:* 3.3 is drafted with fraud-control obligations in view — the criterion removes challenge-only gates for *authorised* agents precisely because authenticated delegation (5.1) gives the operator a stronger control than the challenge did. Legal interaction is analysed in the legal issues brief, Issue 5.

### Principle 4 — Determinable

*What the rules say for a person's circumstances is computable from an authoritative source — not paraphrased from prose.*

**Guideline 4.1 — Computable rules.**
- **4.1.1 (AA)** For each essential journey with eligibility or entitlement conditions, a rules endpoint accepts declared circumstance inputs and returns a determination, without requiring account creation for hypothetical queries.
- **4.1.2 (A)** Where 4.1.1 is not yet met, prose eligibility content is programmatically flagged as non-authoritative guidance and the authoritative channel is identified.

**Guideline 4.2 — Legal provenance.**
- **4.2.1 (AA)** Every determination response identifies the authorising instrument(s), the rules version applied, and the effective date applied.

**Guideline 4.3 — Explainability.**
- **4.3.1 (AAA)** For any determination, the service can enumerate the rule path and inputs that produced it, in machine-readable and plain-language forms.

**Guideline 4.4 — Currency and change.**
- **4.4.1 (AA)** Rules endpoints answer for a supplied effective date, at minimum the current date and, where the underlying scheme permits, past dates.
- **4.4.2 (AA)** Rule changes are published in a machine-readable changelog stating effective dates, in advance of effect wherever the change process allows.
- **4.4.3 (AAA)** A subscription mechanism notifies registered consumers of rule changes.

**Guideline 4.5 — Determination status and hypothetical safety.**
- **4.5.1 (A)** Every determination is programmatically labelled binding or indicative; an indicative determination states what would make it binding.
- **4.5.2 (A)** Hypothetical queries create no obligation for, and no record attributed to, any principal, and the endpoint contract states this.

*Techniques:* OpenFisca-class engines; GovCMS Rules-as-Code capability; legislation identifiers in changelogs. *Rationale:* this principle operationalises, for the citizen side, exactly what Robodebt Royal Commission recommendation 17.1 asked of the government side — rules published for independent scrutiny, in plain language and machine form. Divergence between deployed rules and the authorising law is the documented failure mode of Australian service automation; versioned, scrutable rules endpoints shrink it.

### Principle 5 — Accountable

*Agents act only under verifiable delegation; every agent action is attributable, confirmable, auditable, contestable — and the principal is always in control.*

**Guideline 5.1 — Delegated authority.**
- **5.1.1 (A)** The service rejects, safely and with a programmatically legible reason, any consequential action attempted without a valid delegation naming the principal and scoping the action.
- **5.1.2 (AA)** Delegations are scoped to journeys and consequential actions, time-bounded, and revocable by the principal through a journey that itself conforms at Level A.
- **5.1.3 (A)** Authority over delegations is **non-delegable**. No delegation conveys authority to create, widen, extend the duration of, or reinstate a delegation, nor to suspend or revoke a delegation held by another agent; a delegation purporting to convey any of these does not convey it, and remains valid as to the rest of its scope. The service MAY permit an agent to relinquish a delegation it holds. Nothing in this criterion limits the principal's own control under 5.5.1.
- **5.1.4 (AA)** Where an agent lacks the authority to complete a consequential action on an essential journey, the service provides a machine surface through which the agent may request that authority from the principal, and the principal grants or denies the request through a journey that itself conforms at Level A. An **authority request** creates no legal or administrative effect and is not a consequential action; the service does not treat an unanswered or ignored request as consent, and does not convey through a request any authority that 5.1.3 makes non-delegable.

**Guideline 5.2 — Attribution.**
- **5.2.1 (A)** Agent-originated submissions are flagged as such in service records, without degrading the service provided.

**Guideline 5.3 — Consequential checkpoints.**
- **5.3.1 (A)** The consequential-actions register designates, for each action, whether principal confirmation is required; a designated action is not executable by an agent without a confirmation event attributable to the principal.
- **5.3.2 (A)** For a designated consequential action, the service accepts only a **principal-attributable confirmation**. An interaction within an agent-driven session — a declaration, checkbox, button press, or any artefact the agent can itself produce — is not a confirmation event. Where the service cannot verify that a confirmation is principal-attributable, it does not execute the action. The confirmation channel conforms to 2.1.1.
- **5.3.3 (A)** The consequential-actions register designates, for each action, whether it is a **principal-only action**. The service does not execute a principal-only action on the request of any agent, whatever delegation is presented, and it determines that an action is principal-only before evaluating the delegation. Every principal-only action is performable by the principal through a journey that itself conforms at Level A.

**Guideline 5.4 — Audit and contest.**
- **5.4.1 (AA)** The principal can retrieve a complete, plain-language and machine-readable record of actions taken by agents under their delegations, including the determinations relied upon.
- **5.4.2 (AA)** Every outcome produced via an agent is contestable through the same review channels, on the same terms, as an outcome produced manually.

**Guideline 5.5 — Principal control.**
- **5.5.1 (A)** The principal can suspend or revoke a delegation through an always-available channel, and the service gives effect to the revocation before executing any further consequential action under it.
- **5.5.2 (AA)** The principal is notified, through their nominated channel, of each consequential action executed under a delegation.
- **5.5.3 (AAA)** Delegations support a review-before-execute mode in which every consequential action queues for the principal's approval.

**Guideline 5.6 — Equitable and honest treatment.**
- **5.6.1 (AA)** Service levels for authorised-agent interactions — availability, queueing, and eligibility for outcomes — are no less favourable than for equivalent manual interactions, except where a documented, reviewable security necessity applies.
- **5.6.2 (A)** No agent-facing surface presents instructions or affordances whose effect contradicts the human-facing meaning of the same step.
- **5.6.3 (AA)** Third-party or user-generated content rendered within a journey is programmatically distinguishable from the service operator's own content.

*Techniques:* determination citation at the point of action (the service issues an opaque `determinationId` carrying no principal; the agent presents it with the consequential action, so the audit shows reliance without attributing the query — Q11); OAuth-family delegation with protected-resource metadata (RFC 9728); jurisdiction delegation profiles (for Australia: composition with myGov and statutory nominee arrangements — legal issues brief, Issue 2); WebMCP `agentInvoked`-class signals; single-use confirmation tokens issued to the principal's nominated channel (5.5.2); notification via existing secure inboxes; content provenance marking; a principal-only flag published in the register, evaluated before the delegation is read, so a conformant agent is warned off before it tries and a refusal never leaks whether the delegation would otherwise have sufficed (5.3.3). *Rationale:* 5.6.2 and 5.6.3 are the service-side half of prompt-injection defence: the operator undertakes never to be the injector, and to fence content it does not control. 5.5 encodes supported decision-making — autonomy with an always-reachable off switch.

5.3.2 exists because a confirmation the agent can produce confirms nothing. When a person completes a form themselves, the act and the actor coincide; when an agent acts, they separate, and a tick in the agent's own session records only that the agent ticked. The checkpoint therefore has to live where the agent cannot reach: on the principal's own channel. **Documented limitation.** A service cannot, by inspection, distinguish an *undeclared* agent operating an authenticated human session from the person themselves — no more than the web can distinguish a hijacked session. Guiderails does not claim to. It defends the declared, delegated path; makes that path strictly more capable (3.3.1 and 3.3.2 remove the challenges and rate limits that punish honest agents); makes agent action attributable (5.2.1) and auditable (5.4.1); and, absent a delegation, has no basis to treat the actor as anyone but the account holder, whose acts they then are. Cryptographic agent attestation may narrow this residual (Q10).

5.1.3 and 5.3.3 exist because a control that can authorise its own replacement is not a control. Delegation is the mechanism by which every other Principle 5 criterion is bounded: 5.1.2 scopes and time-bounds it, 5.5.1 revokes it, 5.3.1 and 5.3.2 gate what it can reach. An agent holding authority to issue a delegation can grant itself a new one — unbounded, freshly dated, naming every journey — and each of those criteria will then report itself satisfied, because each is satisfied, of a delegation the agent wrote. An agent able to reinstate a revoked delegation can simply undo 5.5.1. The two criteria close this from both sides: 5.1.3 says the authority cannot be conveyed, so an operator who never thought about it is still protected; 5.3.3 says the register must declare it, so an agent can discover the boundary rather than discover it by refusal. Each alone leaves a hole — 5.1.3 alone is undiscoverable, and 5.3.3 alone could be conformed with by designating nothing. The order in 5.3.3 is normative and not incidental: the service decides principal-only-ness *before* it evaluates the delegation, so that a delegation naming a principal-only action is defective in that respect rather than wider than it appears. Level A because the failure is a safety failure — the person's authority is exceeded, not merely their journey obstructed — and Level A is safety-only (Q6).

---

## 6. Instrument mapping (v0.2)

| Guiderails element | Composes with | Relationship |
|---|---|---|
| 2.1.1 | WCAG 2.2 AA; DXP Digital Inclusion Standard | Direct incorporation |
| 1.x | schema.org; llms.txt; `.well-known`; DXP Digital Access Standard | Profiles / implements intent |
| 3.1.x, 5.2.1 | WebMCP (W3C WebML CG draft) | Profiles; feeds requirements upstream |
| 3.1.2 | Arazzo (OpenAPI Initiative) | Adopts as technique |
| 3.4, 3.5 | HTTP semantics; tell-us-once patterns | Adopts as technique |
| 4.x | OpenFisca-class engines; GovCMS RaC; Robodebt RC rec 17.1 intent | Adopts as technique; policy alignment |
| 5.1, 5.5 | OAuth/RFC 9728; national digital ID and nominee arrangements | Profiles; jurisdiction annexes |
| 5.3, 5.4 | DTA Agentic AI addendum vocabulary; Ombudsman ADM better-practice direction | Terminological and intent alignment |
| 5.6 | Consumer-protection and content-provenance norms | Adopts as technique |

## 7. Assurance

Conformance at AA and above requires benchmark evidence produced under [../04-assurance/BENCHMARK-METHODOLOGY.md](../04-assurance/BENCHMARK-METHODOLOGY.md). Inspection-only audits support Level A claims.

## 8. Change log and open questions

**v0.1 → v0.2:** added guidelines 1.4, 1.5, 2.5, 2.6, 3.4, 3.5, 4.4, 4.5, 5.5, 5.6 (30 new criteria; total 51: 18 A, 27 AA, 6 AAA). Resolved Q6: Level A remains safety-only; the minimal declared-tool surface begins at AA. Q7 provisionally answered (90 days) pending consultation.

**2026-07-09:** project renamed Kerbcut → Guiderails (D-002); no normative changes.

**v0.3 → v0.4 (2026-07-09):** added criterion **5.3.2 (A)** — only a principal-attributable confirmation satisfies a designated consequential action; a service that cannot verify attribution does not execute (D-015). New definitions: agent-driven session, principal-attributable confirmation, confirmation token. Q9 resolved and closed; the undeclared-agent residual is now a documented limitation; Q10 opened (agent attestation). Totals: 53 criteria (20 A, 27 AA, 6 AAA). 5.3.1 is unchanged and unrenumbered; 5.3.2 strengthens it, so prime directive 3 does not apply. Assurance implication: T6 now tests a checkpoint the agent cannot satisfy on any surface — the fixture's confirmation tokens are issued to the principal out-of-band.

**v0.5 → v0.6 (2026-07-13):** added criterion **5.1.4 (AA)** — where an agent lacks authority for a consequential action on an essential journey, the service provides a machine surface through which the agent requests that authority, and the principal grants or denies it through a Level-A-conforming journey; an authority request creates no effect, is not a consequential action, and is never treated as consent (D-019). New definition: authority request. Totals: 56 criteria (22 A, 28 AA, 6 AAA). Nothing renumbered; 5.1.4 is the companion to 5.1.1's refusal — the standard's first criterion about how an agent *obtains* authority rather than how the service refuses it — and it adds an operability path without touching any Level A criterion, so prime directive 3 does not apply. It expressly cannot convey what 5.1.3 makes non-delegable. Assurance implication (BENCHMARK-METHODOLOGY): the conformant build exposes `/api/authority-requests` and a principal-only J4 review step; a scope-refused action now points the agent at the request channel. No current task class scores it; a future round may add a request-and-escalate task.

**v0.4 → v0.5 (2026-07-09):** added criteria **5.1.3 (A)** — authority over delegations is non-delegable — and **5.3.3 (A)** — the consequential-actions register designates principal-only actions, and the service refuses them to any agent before evaluating the delegation presented (D-016). New definitions: principal-only action, non-delegable authority. Q12 resolved and closed; Q11 recorded as an open question, having previously been cited by implementation documents without ever being written down here. Totals: 55 criteria (22 A, 27 AA, 6 AAA). 5.1.2, 5.3.1 and 5.5.1 are unchanged and unrenumbered; the new criteria constrain what a delegation can convey rather than weakening any of them, so prime directive 3 does not apply. Assurance implication: the reference implementation's conformant build marks CA-4a and CA-4b principal-only and publishes J4 as the principal's own journey; a delegation naming either action is refused before it is read, and the baseline has no register at all.

**2026-07-09:** open question Q9 recorded (agent-vs-principal attribution on the human interface); superseded same day by D-015.

**v0.2 → v0.3 (2026-07-09):** added criterion **1.1.4 (A)** — service-description discoverability without prior knowledge of its location (D-014). Totals: 52 criteria (19 A, 27 AA, 6 AAA). No existing criterion changed, renumbered or weakened; prime directive 3 does not apply (the change strengthens Level A). Assurance implication: the reference implementation's conformant build must publish the discovery file and link relation, and the baseline's absence of them is catalogued as a benchmark pattern.

**Carried open questions:** Q1 delegation profile for Australia (legal issues brief, Issue 2); Q2 DDA status of agent access (Issue 1; OD-04); Q3 fraud-control interaction patterns for 3.3 (Issue 5); Q4 privacy analysis of hypothetical queries (Issue 3); Q5 machine format of conformance claims. **New:** Q8 — whether 5.5.2 notification should be A rather than AA for designated high-consequence actions; to be tested in co-design. ~~Q9~~ **resolved** by criterion 5.3.2 (D-015): a confirmation is valid only if made through a channel the agent cannot operate, so an agent driving the human interface has nothing to tick that would count. The undeclared-agent residual is recorded as a documented limitation in the Principle 5 rationale above, not as an open question. **New:** Q10 — whether cryptographic agent attestation (Web Bot Auth family) should become a normative means of detecting undeclared agents in authenticated sessions, and at what level. Watch the standardisation track; revisit before v1.0.

**Q11 — whether citing a determination should be obligatory.** 4.5.2 (A) requires that a hypothetical eligibility query create no record attributed to any principal; 5.4.1 (AA) requires the audit to include the determinations relied upon. Attribute the query and the first is broken; do not, and the second appears unsatisfiable. The reference implementation resolves this in practice by issuing an opaque `determinationId` that carries no principal, which the agent then presents with the consequential action: reliance is attributable, curiosity is not. But nothing *obliges* the agent to cite, so a service can satisfy 5.4.1 with an empty field and no criterion is violated. Closing the gap means writing the standard's first criterion that binds the **agent** rather than the service operator — a structural departure from §2's drafting discipline, and not one to make casually. Recorded here 2026-07-09; previously cited by implementation documents without appearing in this section.

~~Q12~~ **resolved** by criteria 5.1.3 and 5.3.3 (D-016): nothing stopped a delegation conveying the power to delegate, so an agent could grant itself a new, unbounded delegation while 5.1.2, 5.3.1 and 5.5.1 each reported itself satisfied. Authority over delegations is now non-delegable, and the register must say so. Discovered while implementing the delegation journey — the criterion was missing, not merely unimplemented.
