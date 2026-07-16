# Research dossier

**Status:** v0.5, 16 July 2026. Living document. v0.2 added §2.1 (baseline pattern derivations, S-55–S-62). v0.3 completed the §6 comparator pass (S-63–S-69) and added machine-readable source records under `sources/`. v0.4 registers the Storybook/design-system adapter research (S-70–S-115) that grounds `03-reference-implementation/adapters/DESIGN.md`. v0.5 registers the disability-studies and disability-rights foundations (S-117–S-128, Appendix A) surfaced for the extended thesis and bearing on the standard's design (CRPD GC1 → attribution/contestability) and its co-design governance.

**Verification key:**
- **[VERIFIED]** — primary or official source (standards body, government publication, specification text) accessed on the date in the source register.
- **[SECONDARY]** — reputable secondary reporting or practitioner analysis; acceptable for context, not for normative claims.
- **[VENDOR CLAIM]** — asserted by a party with a commercial interest; use only with attribution and never as a load-bearing fact.
- **[TO VERIFY]** — plausible and noted, but requires a primary-source check before external use.

Method note: this pass was compiled via targeted web research on 9 July 2026. Pass 2 priorities are listed in §8.

---

## 1. The agentic-web standards stack

### 1.1 WebMCP — the direct WCAG analogue for operability

WebMCP (Web Model Context Protocol) is a proposed open web standard that lets a website expose its own functions — JavaScript actions or HTML forms — as structured tools that AI agents discover and call directly in the browser, instead of scraping the DOM or interpreting screenshots [S-01, S-04] **[VERIFIED — spec status via multiple independent explainers; primary spec read is a pass-2 action]**.

Key facts:
- Incubated in the **W3C Web Machine Learning Community Group**; proposed by **Google and Microsoft**. Published as a **Draft Community Group Report** — under incubation, not a ratified W3C Recommendation [S-01, S-03, S-04].
- Specification accepted into the Community Group **September 2025**; publicly announced **10 February 2026** [S-06, S-08].
- Two API surfaces: a **Declarative API** annotating existing HTML forms (agents discover the tool from form markup, no JavaScript required), and an **Imperative API** (`navigator.modelContext`) registering JavaScript tools described with JSON Schema [S-02, S-03, S-05].
- Browser trajectory: experimental support behind a flag in **Chrome 146 Canary**; Google confirmed (19 May 2026) a **public origin trial in Chrome 149**. Microsoft co-authorship signals likely Edge support; Mozilla and Apple uncommitted [S-02, S-06, S-10].
- Security model in the current draft: same-origin enforcement, CSP integration, HTTPS requirement; **human-in-the-loop confirmation for sensitive tool calls**, with read-only tools able to bypass; a **`SubmitEvent.agentInvoked`** flag so services can distinguish, log and differently validate agent-originated submissions [S-05] **[VERIFIED at explainer level; confirm against spec text in pass 2]**.
- Efficiency claims of ~90% token reduction versus scraping are **[VENDOR CLAIM / SECONDARY]** [S-02] — our own harness will generate first-party numbers instead (DECISIONS.md D-008).
- Ecosystem concepts under discussion: `.well-known/webmcp` manifests for tool discovery without page navigation; PWA manifest integration; extension consumption including screen-reader integration [S-04] **[TO VERIFY — proposal-stage, not spec]**.

**Relevance:** WebMCP is the operability substrate for Principle 3. Its declarative mode rewards exactly the clean, labelled, validated HTML forms that WCAG already demands — messy forms must be fixed first for it to work [S-02]. Its `agentInvoked` mechanic is a primitive for Principle 5.

### 1.2 The workflow layer — Arazzo (and where MCP/A2A/NLWeb sit)

**Arazzo** (OpenAPI Initiative, Linux Foundation) is a standard, language-agnostic way to express sequences of API calls and the dependencies between them to achieve an outcome — deterministic, and both human- and machine-readable [S-16, S-17] **[VERIFIED — official OAI sources]**.
- v1.0.0 released **May 2024**; v1.1.0 adds AsyncAPI support so workflows can span synchronous and event-driven APIs [S-16].
- Core constructs: `sourceDescriptions`, `workflows`, `steps`, `successCriteria`, `outputs`, runtime expressions [S-18, S-19].
- Officially stated use cases include **safe, predictable AI agent execution** (agents follow explicit validated workflows with defined inputs, outputs and success criteria) and **automated regulatory compliance checks** [S-16] — both directly on-point for government.
- Roadmap includes **actor-in-the-loop (human or agent) steps** for workflows requiring approval, and MCP/A2A step types [S-16].
- Architectural pattern relevant to us: expose *workflow-level* capabilities rather than raw endpoints, shifting orchestration out of the model's reasoning loop into a deterministic spec; pairs naturally with MCP tools [S-19] **[SECONDARY]**.
- **Claim withdrawn (10 July 2026).** A secondary source asserted that the MCP specification references Arazzo for multi-step workflows [S-48]. Checked against both primary texts: the MCP specification (revision 2025-11-25) does not mention Arazzo [S-63], Arazzo v1.1.0 does not mention MCP [S-18], and a code search across the MCP organisation returns no match. **MCP and Arazzo are independent specifications with no cross-reference in either normative document**; the linkage exists only in third-party commentary proposing that Arazzo workflows *could be surfaced as* MCP tools. S-48 is downgraded to SECONDARY.

**MCP** (Anthropic) standardises backend tool/context access for agents; **A2A** (Google) standardises agent-to-agent interaction; **NLWeb** (Microsoft) provides a natural-language query endpoint returning structured schema.org responses, with instances doubling as MCP servers [S-13] **[SECONDARY]**. These are complements: MCP for service back-ends, WebMCP for the browser surface, Arazzo for the journey contract.

**Relevance:** Arazzo is the closest existing thing to a behaviour-driven interaction specification for multi-step transactions — the machine-readable "Given/When/Then" of a service journey — and is the substrate for Principle 3's journey-level operability and the assurance harness's task definitions.

### 1.3 The discovery layer — llms.txt and relatives

- **llms.txt** (proposed 2024, llmstxt.org): a root-level, LLM-oriented machine-readable summary of a site; `llms-full.txt` variant embeds linked content [S-09, S-12].
- Adoption is genuinely contested and must be represented honestly: a July 2025 analysis found no major model provider parsing it; research published 31 March 2026 found **7.4% of Fortune 500** sites had implemented it; Google states it is not a Search ranking input [S-10, S-09] **[SECONDARY]**.
- Countervailing signal: **Chrome Lighthouse 13.3 (May 2026) added an "Agentic Browsing" audit category** — four audits covering **WebMCP integration, agent accessibility, layout stability, and llms.txt** — framing these as browser-agent readiness rather than SEO; Anthropic recommends llms.txt in its writing-for-agents guidance and OpenAI uses it in its agent ecosystem [S-09, S-10] **[SECONDARY — verify Lighthouse docs directly in pass 2]**.
- Adjacent proposals: `agents.txt` / `agents.json` capability manifests; schema.org (including `GovernmentService`) remains the stable structured-data layer [S-15, S-13].

**Relevance:** discovery is Principle 1. The honest posture: llms.txt is cheap, audited-for by Lighthouse, and harmless; schema.org is mature; `.well-known` service manifests are where the standard should place its normative weight.

### 1.4 Identity, delegation, payments

- **Web Bot Auth** (IETF-direction work, promoted by Cloudflare and others) — cryptographic agent identification [S-13, S-14] **[SECONDARY]**.
- **OAuth protected-resource metadata (RFC 9728)** enables an agent hitting a protected URL to route its human through a proper OAuth grant; Cloudflare Access ships support [S-14] **[SECONDARY — RFC itself VERIFIED as published standard]**.
- **x402** revives HTTP 402 for agent payments [S-14, S-15] — noted, out of scope for a government access standard.
- **NIST**: the Center for AI Standards and Innovation (CAISI) launched an **AI Agent Standards Initiative on 17 February 2026** (interoperability and security standards for agentic AI); NCCoE published a February 2026 concept paper on adapting identity and authorisation frameworks to agents acting on a user's behalf; SP 800-53 control overlays for agentic systems in development [S-11] **[SECONDARY — verify against NIST primary sources in pass 2]**.

**Relevance:** Principle 5's delegation layer should profile these rather than invent. The Australian-specific question — how delegation composes with **myGov** and existing nominee/authorised-representative arrangements — is a Phase 1 legal/technical pass (DECISIONS.md OD-04, OD-05).

### 1.5 Umbrella efforts and audits

- **AgentReady** (agentready.org): an open, vendor-neutral specification of the protocols and conventions a product should implement to be usable by agents — spanning MCP, A2A, x402, llms.txt, Web Bot Auth — with an explicit "emerging" tagging model [S-13] **[SECONDARY]**. Closest thing to a cross-cutting readiness definition; contains no government-grade requirements (delegation to a principal, legal determinability, contestability).
- **Lighthouse agentic-browsing audits** (§1.3) make agent-readiness *auditable infrastructure* — a strong precedent for our assurance approach [S-10].

### 1.6 Threat context

Research on agent-targeting attacks documents prompt injection via page content — including strings addressed to agents inside accessibility markup and hidden DOM [S-49] **[VERIFIED — peer-review preprint]**. This cuts in favour of the standard's core move: declared, schema-bound tools under a delegation regime narrow the attack surface relative to free-form DOM interpretation, and service-side attribution (`agentInvoked`-class flags) creates the audit trail that free-form scraping never leaves. Threat modelling is a standing workstream, not a section that gets written once.

---

## 2. Accessibility standards and the agent connection

- **WCAG 2.2** (W3C, October 2023) is current; Level AA comprises 86 success criteria including nine new since 2.1 [S-27] **[SECONDARY]**. The four POUR principles conclude with **Robust**: content must be reliably interpretable by a wide variety of user agents, including assistive technologies [S-20] **[VERIFIED — AHRC restatement of W3C]**.
- Practitioner analysis converges on the mechanism: browser agents consume the same semantic layer as assistive technology — landmarks, headings, accessible names, roles, input types — and degrade to brittle visual heuristics without it [S-21] **[VENDOR CLAIM — mechanism is sound and widely echoed; commission or cite independent measurement in pass 2]**.
- W3C also maintains ATAG (authoring tools) and UAAG (user agents) alongside WCAG [S-44-adjacent, S-20]. UAAG is a conceptual precedent worth studying: guidance aimed at the *consuming agent* rather than the content. **[Pass-2 item: review UAAG and any W3C AI-agent accessibility activity, including WAI discussions.]**

### 2.1 Prevalence of the failures the baseline replicates (benchmark control derivations)

The benchmark's baseline build is a **scientific control, not a strawman**: every way in which it is worse than the conformant build must be a pattern documented in the wild (`03-reference-implementation/parity/PATTERN-CATALOGUE.md`). This section is the evidence base for those patterns. The catalogue cites only the S-xx identifiers below; the sources are named here and never in fixture materials (D-009).

Two evidence classes, and the distinction matters. Conflating them would be the strawman charge in miniature.

- **Commission** — the service does something documented to exclude people. Prevalence is measurable, and it is measured.
- **Omission** — the service does not do something the standard requires. There is no prevalence to measure because the affirmative feature is essentially absent from public services; the evidence is the feature's demonstrated rarity, and authoritative recommendations that it *ought* to exist. An omission pattern is the default state of the web, which is precisely why it cannot be a contrivance.

**Commission patterns.**

- **Unlabelled form controls.** The WebAIM Million (February 2026, automated analysis of 1,000,000 home pages) found **95.9%** of home pages carried detected WCAG 2 failures, at **56.1** errors per page — a 10.1% worsening year on year. Missing form input labels appeared on **51%** of pages, and **33.1%** of all form inputs were not properly labelled by any of `<label>`, `aria-label`, `aria-labelledby` or `title` [S-55] **[VERIFIED — primary, measured]**.
- **Meaning carried by colour alone.** W3C documents this as failure **F73** of success criterion 1.4.1 (links not visually evident without colour vision), with Understanding 1.4.1 covering colour-only information generally [S-60] **[VERIFIED — normative]**. Adjacent measured signal: low-contrast text on **83.9%** of home pages [S-55]. Note honestly that *colour-only conveyance* is not separately measured at scale; the pattern's warrant is its documentation as a recurring failure, not a prevalence figure.
- **Guidance published as PDF only.** The UK Government Digital Service states PDFs "do not work well with assistive technologies", that PDF "is never fully accessible to every type of assistive technology", and no longer permits PDF publication on GOV.UK without an accessible HTML or open-document equivalent [S-58] **[VERIFIED — UK government primary]**. The Australian Government Style Manual directs authors to create HTML rather than PDF, and to provide an accessible alternative format where PDF is unavoidable [S-59] **[VERIFIED — Australian government primary]**. Both exist because the practice they correct is common.
- **Session timeout with silent data loss, and no resume.** WCAG 2.2.1 (Timing Adjustable, Level A) exists for this. The W3C WAI cognitive-accessibility design pattern *Avoid Data Loss and "Timeouts"* records the user need directly — *"I need time to complete my work. I do not want a session to timeout while I try to find the information needed"* — and warns against losing entered data when a user must pause a long process and return [S-57] **[VERIFIED — W3C]**. Users whose cognitive capacity varies with fatigue are the population most likely to be transacting with the services in scope.
- **Challenge gate with no accessible alternative.** The W3C Group Draft Note *Inaccessibility of CAPTCHA* (16 December 2021) finds that a CAPTCHA "not only separates computers from humans, but also often prevents people with disabilities from performing the requested procedure", amounting to **"a denial of service to these users"**; it further records that reCAPTCHA v2 increasingly declines to provide an audio alternative, excluding deaf and hard-of-hearing users [S-56] **[VERIFIED — W3C]**. This is the criterion 3.3.1 case exactly: a gate an authorised agent and an assistive-technology user both fail.
- **Validation errors not associated with the control in error.** WCAG 3.3.1 (Error Identification, Level A) requires the item in error be identified in text. WebAIM's technique guidance states errors must be associated with their controls (labelling or `aria-describedby`) and that a mechanism should carry the user to the field concerned; without it, screen-reader users cannot determine which field failed [S-62] **[VERIFIED — authoritative practitioner guidance]**.

**Omission patterns.** These are the absences the standard exists to fill.

- **No authoritative rules endpoint.** The Royal Commission into the Robodebt Scheme recommends (**recommendation 17.1**) that departments publish, in plain language, that automated decision-making is used and how it works, and that **business rules and algorithms be made available to enable independent expert scrutiny** [S-61] **[VERIFIED — Royal Commission primary]**. A recommendation to publish rules is direct evidence that rules are not published. Rules-as-Code deployments exist but remain rare and mostly pilot-scale [S-41, S-43, S-44, S-45]. The baseline's prose-and-PDF eligibility guidance is therefore the ordinary case, and its omission of a non-obvious interacting condition is the documented failure mode of Australian service automation.
- **No delegation, confirmation checkpoint, attribution or agent-action record.** The DTA's Agentic AI addendum governs agents *operated by agencies*; nothing in the DXP or the AI policy suite addresses agents operated by or for members of the public arriving at agency services [S-36, S-37, S-38] **[VERIFIED — DTA primary]**. No identified national government has published citizen-side agent-access standards (§6). The affirmative feature does not exist to be measured.
- **No journey-state or declared-tool machine surface.** WebMCP is a Draft Community Group Report under incubation, with experimental browser support only [S-01, S-02, S-06]. The absence of declared tools and machine-readable journey state is the current universal condition, not a degradation invented for the control.
- **Third-party content rendered without provenance marking.** Rendering third-party or user-generated content indistinguishably from the operator's own is ordinary practice. Research documents agent-targeting prompt injection carried in page content, including strings addressed to agents inside accessibility markup and hidden DOM [S-49] **[VERIFIED — peer-review preprint]**.
- **No agent-discovery file or machine-surface link relation.** Research published 31 March 2026 found **7.4%** of Fortune 500 sites had implemented `llms.txt`, and Google states it is not a Search ranking input [S-09, S-10] **[SECONDARY]**. Adoption among government services is lower still. The discovery surface criterion 1.1.4 requires is, at present, almost universally absent.

**Consequence for the benchmark.** Every catalogued pattern now carries a derivation. Under the catalogue's own rule — *patterns still TO VERIFY at round time are removed from the baseline for that round* — none would now be removed.

**Three limitations, recorded rather than rounded up.** Each is the kind of objection a sceptical reviewer raises first, and each is fair.

1. **The prevalence sample is general-web home pages, not government transactional forms.** [S-55] analyses the top one million *home pages*. Government multi-step transactional journeys — the thing this fixture models — are not separately measured there, and are plausibly better than the web mean (they are subject to WCAG 2.2 AA obligations under the DXP and the DDA) or worse (they are older, larger, and form-dense). We do not know which. A government-specific measurement is a tracked research task; until it exists, the commission patterns are evidenced as *widespread web practice that public services are not known to be exempt from*, which is weaker than *measured in public services* and is stated that way.
2. **Colour-only conveyance has no prevalence measurement** [S-60] — only a documented failure technique. Low contrast (83.9%) is adjacent, not the same failure.
3. **Discovery-file adoption data is secondary and not government-specific** [S-09, S-10].

None of the three is grounds to remove a pattern: the baseline degrades only in ways that are documented as real, and for the omission patterns the affirmative feature is demonstrably rare or absent everywhere. But a published round must state these limitations in its threats-to-validity, not bury them.

**Framing consequence:** the standard's Legible principle is not adjacent to WCAG — it is WCAG's Robust principle carried to its next user agent, which is why WCAG 2.2 AA sits inside it as a prerequisite criterion (DECISIONS.md D-006).

---

## 3. Australian Government policy landscape (as at July 2026)

### 3.1 Disability and accessibility law and policy

- **Disability Discrimination Act 1992 (DDA)**: prohibits discrimination in access to goods, services and facilities; applied to digital services since **Maguire v SOCOG (2000)**, the anchor authority [S-30, S-22] **[VERIFIED]**.
- **AHRC Guidelines on Equal Access to Digital Goods and Services (April 2025)**: sets **WCAG 2.2 Level AA** as the benchmark and clarifies that DDA obligations extend to modern technologies including **SaaS platforms, AI tools, IoT and mobile apps** [S-27, S-22] **[VERIFIED — AHRC is primary]**.
- **AS EN 301 549** (adopting EN 301 549) governs ICT accessibility including procurement, with functional performance statements spanning vision, hearing, speech, motor and cognitive needs [S-20, S-29] **[VERIFIED]**.
- Scale: about **5.5 million Australians (roughly 21–22%)** live with disability [S-22, S-30-adjacent] **[VERIFIED — ABS-derived, restated across official sources]**.
- **Open legal question for this project (OD-04):** whether refusal or failure to serve a person's *authorised agent* engages the DDA where the agent functions as that person's assistive technology. Do not assert publicly before formal advice.

### 3.2 The Digital Experience Policy (DXP)

- In effect **1 January 2025**, mandating that government digital services meet four standards: the **Digital Service Standard v2.0** (released December 2023; references the latest WCAG; "know your user", "leave no one behind"), the **Digital Inclusion Standard** (new services from January 2025, existing from July 2025; "embrace diversity", "make it accessible"), the **Digital Access Standard** (discoverability and reuse), and the **Digital Performance Standard** [S-28, S-20, S-29] **[VERIFIED]**.
- The DXP and its standards were updated in 2026 in response to agency feedback [S-47] **[VERIFIED — DTA announcement; detail of changes is a pass-2 read]**.

**Hook:** the Digital Access Standard's discoverability/reuse mandate and the Inclusion Standard's accessibility mandate are the natural policy anchors for Principles 1 and 2 — the standard should be drafted so an agency can treat conformance as *implementing* DXP intent for a new user-agent class, not as a new obligation.

### 3.3 The AI policy suite — and the addendum that defines our gap

- **Policy for the responsible use of AI in government v2.0**, effective **15 December 2025** (v1.1 from 1 September 2024): applies to non-corporate Commonwealth entities (defence and NIC excepted); requires a strategic AI adoption position, an internal register of in-scope use cases with a named accountable owner for each, and **AI impact assessments** before deployment; further mandatory requirements phase in from **15 June 2026** with the remainder by **December 2026**; foundational AI training becomes mandatory APS-wide; supported by transparency and accountability standards and a forthcoming **AI Review Committee** [S-39, S-40, S-36] **[VERIFIED — DTA primary]**.
- **APS AI Plan (2025)** frames whole-of-government adoption; the DTA's **AI technical standard** provides lifecycle guidance, and the **Agentic AI addendum**, published **4 June 2026**, sets expectations for agencies designing and operating agentic systems — autonomy within guardrails, continuous human oversight, and guidance areas spanning fairness, reliability and safety, privacy and security, transparency and explainability, **contestability**, **accountability**, and human-centred values [S-37, S-38, S-36] **[VERIFIED — DTA primary]**.
- Adjacent: myGov onboarding guidance published to digital.gov.au by Services Australia (first external-agency contribution) [S-47] **[VERIFIED]**; GovAI platform with GovAI Chat slated mid-2026 [S-36-adjacent] **[VERIFIED]**.

**The gap, stated for the record:** the addendum governs agents *operated by agencies*. Nothing in the DXP, the AI policy suite, or the addendum addresses the inverse and inevitable case — **agents operated by or for members of the public arriving at government services**. The vocabulary the addendum uses for agency-side systems (oversight, accountability, contestability, human-centred values) is precisely the vocabulary a citizen-side access standard needs, which makes the whole-of-government fit argument straightforward.

### 3.4 Standing context

- OECD **Digital Government Outlook 2026** ranked Australia **2nd** among surveyed countries; the report's theme is moving from foundations to system-level execution [S-46] **[VERIFIED — DTA account of OECD report; read OECD primary in pass 2]**.

### 3.5 Design-system landscape (implementation channel)

- There is **no mandated whole-of-government federal design system**. The DTA's Australian Government Design System (AuDS, released 2018) was decommissioned in **September 2021**; the open-source community forked it as **GOLD** (Government Open Language for Design), now community-maintained [S-51] **[VERIFIED — GOLD site and official community decommission notice; press reporting SECONDARY]**.
- **Agriculture Design System (AgDS)**: DAFF's open-source React design system, audited by Intopia with a published **statement of conformance at WCAG 2.1 AA** (component, template and usability phases, including screen-reader, magnification and neurodivergent participants) [S-52] **[VERIFIED — DAFF primary for the audit]**. Thinkmill's co-development role and Intopia's "exemplary implementation" characterisation appear in Thinkmill's own materials **[VENDOR CLAIM]**.
- **Ripple**: Victoria's design system, maintained by the Single Digital Presence team (Department of Government Services); open source, Apache-2.0; Storybook component workshop; used by 50+ Victorian government sites [S-53] **[VERIFIED — vic.gov.au and dpc-sdp GitHub]**.
- **Storybook's accessibility addon** (`@storybook/addon-a11y`) runs axe-core against every story with a violations panel, and its Playwright-based test runner fails CI on violations [S-54] **[VERIFIED — Storybook documentation]**. This is the architectural precedent for a Guiderails addon: per-story agent-legibility checks that fail the build exactly as a11y regressions do.

**Relevance:** implementation tooling cannot assume a single design system. A design-system-agnostic layer — headless behaviour package, Storybook addon, per-system integrations — turns each existing system (AgDS, GOLD, Ripple) into a distribution channel for the standard rather than betting on one (DECISIONS.md D-013).

---

## 4. Rules as Code — state of play

- **OpenFisca**: open-source (AGPL) rules engine originating with the French government (2011); models legislation as executable parameters/variables served over a JSON web API; governed by the OpenFisca Association; recognised as a Digital Public Good; OECD-endorsed for policy outcomes and service delivery; Edge of Government Innovation Award 2023 [S-43, S-45] **[VERIFIED]**.
- **Australian and NZ deployments**: NSW Fair Trading's live community-gaming permit checker; NSW DPIE Energy Savings Scheme eligibility estimator; New Zealand's Better Rules lineage and GovZero work encoding the Social Security Act 2018 [S-44, S-41, S-43] **[VERIFIED/SECONDARY mix]**.
- **Whole-of-government infrastructure signal:** **GovCMS is adding Rules-as-Code capability**, including an OpenFisca Drupal Webform module [S-41] **[VERIFIED — GovCMS primary]**. This matters: the Commonwealth's shared CMS platform growing a rules-execution layer means Principle 4 has an on-ramp inside existing infrastructure.
- **Community signal:** the **OpenFisca Conference 2026 was held in Canberra, 30–31 March 2026**, with Australian Department of Finance participation including a gov2gov session and a talk on making AI work for Rules as Code; presenters included NSW Government and an Australian Defence (Air Force Cadets eligibility) use case [S-42] **[VERIFIED — conference programme]**.
- Adjacent formalisms for pass 2: Catala (literate legal programming), DataLex, and the interaction between RaC provenance and administrative-law requirements.

**Relevance:** Principle 4 (Determinable) does not ask agencies to invent anything. It asks them to expose, with legal provenance, a capability the ecosystem is already building — and it converts "the agent paraphrased our guidance page wrongly" from an unavoidable hazard into a solved problem.

---

## 5. Domain scan: employment services (candidate exemplar domain)

Recorded because form-heavy, rules-driven, high-stakes services are where the standard bites hardest; this section is domain research, not a client reference (DECISIONS.md D-004).

- **Workforce Australia** (from July 2022, replacing jobactive): digital-first employment services; **Workforce Australia Online** serves job-ready participants self-managing **mutual obligations** (points-based activation system), supported by a Digital Services Contact Centre; provider streams for those needing more support [S-32] **[VERIFIED — DEWR primary]**.
- **Employment services reform is in design now**: government response and reform program following the House Select Committee inquiry; a three-stream future model (online and brief intervention / targeted provider / intensive); **public submissions open 27 May – 31 July 2026**; a Lived Experience Panel and advisory group active; design engagement running through 2026 [S-33] **[VERIFIED — DEWR primary]**.
- **Disability employment**: more than one in five Australians live with disability and experience higher levels of labour-market disadvantage; the specialist disability employment program has been reformed (**Inclusive Employment Australia**, with JobAccess and the **Employment Assistance Fund** — which funds workplace assistive technology including screen-reading software); elements of the Targeted Compliance Framework have been paused by the DEWR Secretary [S-34, S-31, S-80-adjacent] **[VERIFIED — DEWR/DSS primary]**.

**Why this domain matters analytically:** (a) the population served includes a high proportion of people for whom interaction cost is the binding constraint; (b) compliance consequences make silent agent failure genuinely harmful, so the Accountable principle is not decorative; (c) a service system being designed through 2026 could adopt agent-accessibility at design time — a world first rather than a retrofit.

---

## 6. International scan

**Pass 2 completed 10 July 2026** against the sources registered at S-64–S-69. The scan distinguished four things that are routinely conflated: government's *own internal* use of AI; general AI-assurance frameworks; accessibility standards; and **citizen-side agent access** — whether a person's own agent may be authorised to act for them against a government service. Only the last is in scope.

- **No identified national government has published a citizen-side agent-access standard for its services, as at 10 July 2026** [S-64, S-65, S-67, S-68, S-69] **[VERIFIED — negative claim; see limitation below]**. Every candidate examined resolves to internal-use policy, general AI governance, or academic proposal.
- **Closest live public-sector activity:** GOV.UK's AI Studio work on service typologies for agentic AI, which its own text describes as exploratory research and design, scoped to government-provided assistants targeted from 2027 — not a standard, and not about a citizen's own agent [S-64] **[VERIFIED — primary]**.
- **Closest articulated model:** the academic *Authenticated Delegation and Authorized AI Agents* framework, the most developed statement of citizen→agent delegated authority against services, adopted by no government [S-66] **[VERIFIED — preprint]**.
- **US federal activity** is about *governing* agents used by agencies (NIST CAISI, OMB memoranda), mirroring Australia's addendum — the same gap, unfilled [S-11, S-68].
- **EU delegation infrastructure (EUDI wallet).** As at ARF v2.4.0, its representation model covers natural-person-to-natural-person and person-to-organisation representation — guardianship, power of attorney, company signatories — and **does not extend to non-human agents**; the delegation use cases are flagged for future ARF versions [S-65] **[VERIFIED — primary]**. It is therefore a **structural precedent** for Principle 5's delegation layer, not a citizen-side agent-access standard, and must not be cited as though it authorised agent delegation today.

**Limitation on the negative claim.** It is an absence of evidence, established by English-language search. A non-English national instrument cannot be excluded. The claim is dated, and the two likeliest first movers to refute it — the UK (assistants targeted from 2027) and the EU (ARF future versions) — are named above; re-check both before any external use of this claim.

---

## 7. Gaps and next research passes

1. **Primary-source reads:** WebMCP Draft CG Report text; Lighthouse agentic audit documentation; NIST CAISI/NCCoE originals; DXP 2026 update detail. *(MCP spec Arazzo-reference check: done 10 Jul 2026, claim withdrawn — §1.2. OECD DGO 2026: OECD primary now registered at S-67.)*
2. **Legal pass (OD-04):** DDA application to authorised agents; delegation law; myGov nominee/authorised-representative architecture; privacy (APP) analysis of scoped tool calls vs page scraping.
3. **Evidence pass:** independent measurements of agent performance vs semantic quality (WebArena/Mind2Web-class literature); disability-community research on AI assistant use — and primary co-design to generate what literature lacks. **Government-specific accessibility prevalence** for the baseline's commission patterns (§2.1 limitation 1): a measured sample of Australian government transactional forms, not home pages.
4. **Comparator pass:** §6 done 10 Jul 2026 (S-64–S-69). Standing action: re-check GOV.UK/DSIT and the EUDI ARF changelog before any external use of the negative claim.
5. **Benchmark methodology:** task-suite design, agent matrix, statistical protocol, failure taxonomy (feeds /04-assurance).

---

## 8. Source register

All sources accessed 9 July 2026.

| ID | Source | Status |
|---|---|---|
| S-01 | webmcp.md — independent WebMCP explainer | SECONDARY |
| S-02 | searchable.com — "What is WebMCP" | SECONDARY / VENDOR CLAIM (token figures) |
| S-03 | adaptmarketing.com — WebMCP W3C standard explainer | SECONDARY |
| S-04 | sumitagrawal.dev — WebMCP technical explainer | SECONDARY |
| S-05 | zuplo.com — "What is WebMCP" (security model detail) | SECONDARY |
| S-06 | locomotive.agency — WebMCP explainer (timeline) | SECONDARY |
| S-07 | arcade.dev — WebMCP origins interview (MCP-B history) | SECONDARY |
| S-08 | vyomedge.com / scalekit.com — WebMCP guides (announcement date; polyfill) | SECONDARY |
| S-09 | getpassionfruit.com — llms.txt 2026 guidance analysis | SECONDARY |
| S-10 | ppc.land — Lighthouse agentic audits; llms.txt adoption data; Chrome 149 origin trial | SECONDARY |
| S-11 | Cloud Security Alliance research note — NIST CAISI agent standards initiative | SECONDARY |
| S-12 | limy.ai — llms.txt guide | SECONDARY |
| S-13 | agentready.org — AgentReady specification site | SECONDARY (primary for AgentReady itself) |
| S-14 | Cloudflare blog — agent readiness (RFC 9728 flows, x402) | SECONDARY |
| S-15 | agents-txt.com — agents.txt draft spec | SECONDARY |
| S-16 | openapis.org — Arazzo Specification overview (1.1.0) | VERIFIED |
| S-17 | github.com/OAI/Arazzo-Specification | VERIFIED |
| S-18 | spec.openapis.org/arazzo/latest | VERIFIED |
| S-19 | swagger.io / zuplo / jentic / tyk / apiscout — Arazzo analyses | SECONDARY |
| S-20 | humanrights.gov.au — standards & guidelines for digital accessibility chapter | VERIFIED |
| S-21 | minthcm.org — WCAG semantics and agent comprehension | VENDOR CLAIM |
| S-22 | deque.com — Australia accessibility laws | SECONDARY |
| S-23 | everylearnereverywhere.org — AI in assistive technology | SECONDARY |
| S-24 | cmu.edu — AI and the future of accessibility | SECONDARY |
| S-25 | arXiv 2511.22737 — agentic AI framework for disability & neurodivergence | VERIFIED (preprint) |
| S-26 | digitallearninginstitute.com — AI in AT (WHO scale figures) | SECONDARY |
| S-27 | deque.com — three Australian accessibility updates (AHRC Apr 2025; DXP) | SECONDARY |
| S-28 | iconagency.com.au — DXP/DSS practitioner analysis | SECONDARY |
| S-29 | accessibility.org.au (CFA Australia) — Australian policy | SECONDARY |
| S-30 | accordcompliance.org — DDA/Maguire summary | SECONDARY |
| S-31 | dewr.gov.au — supporting staff with disability (EAF scope) | VERIFIED |
| S-32 | dewr.gov.au — Workforce Australia employment services | VERIFIED |
| S-33 | dewr.gov.au — employment services reform (2026 consultation) | VERIFIED |
| S-34 | dss.gov.au — disability employment reforms; IEA | VERIFIED |
| S-35 | dta.gov.au & digital.gov.au accessibility statements (WCAG 2.2 requirement) | VERIFIED |
| S-36 | digital.gov.au/policy/ai — AI policy landing (plan, standard, addendum) | VERIFIED |
| S-37 | dta.gov.au — "Trustworthy AI agents: new technical guidance" (4 Jun 2026) | VERIFIED |
| S-38 | digital.gov.au — Agentic AI addendum page | VERIFIED |
| S-39 | digital.gov.au — Policy for responsible use of AI v2.0 | VERIFIED |
| S-40 | dta.gov.au — AI policy update article (phase-in dates) | VERIFIED |
| S-41 | govcms.gov.au — Rules as Code (OpenFisca Webform module) | VERIFIED |
| S-42 | openfisca.org — 2026 conference programme (Canberra) | VERIFIED |
| S-43 | interoperable-europe.ec.europa.eu — OpenFisca profile | VERIFIED |
| S-44 | salsa.digital — What is OpenFisca (NSW/NZ deployments) | SECONDARY |
| S-45 | opencollective.com/openfisca; DPGA registry entry | VERIFIED |
| S-46 | dta.gov.au — OECD Digital Government Outlook 2026 article | VERIFIED (DTA account; OECD primary pass 2) |
| S-47 | dta.gov.au — media releases index (addendum; myGov guidance; DXP updates) | VERIFIED |
| S-48 | apiscout.dev — Arazzo guide (MCP-references-Arazzo claim) | SECONDARY — claim checked 10 Jul 2026 against primary texts and **not supported**; withdrawn from §1.2 |
| S-49 | arXiv 2510.05159 — backdoors/prompt-injection in agent supply chain | VERIFIED (preprint) |
| S-50 | accessibilitychecker.org — AI agents for web accessibility | SECONDARY |
| S-51 | gold.designsystemau.org; community.digital.gov.au — AuDS decommission notice (Sept 2021) and GOLD fork; itnews.com.au / innovationaus.com reporting | VERIFIED (decommission, fork); reporting SECONDARY |
| S-52 | design-system.agriculture.gov.au — About AgDS; Intopia Statement of Conformance 2024 (PDF, WCAG 2.1 AA); thinkmill.com.au — AgDS case study | VERIFIED (DAFF primary); Thinkmill material VENDOR CLAIM |
| S-53 | ripple.sdp.vic.gov.au; vic.gov.au/ripple-design-system; github.com/dpc-sdp/ripple | VERIFIED |
| S-54 | storybook.js.org — accessibility-testing documentation (@storybook/addon-a11y; test-runner CI failure modes) | VERIFIED |
| S-55 | webaim.org/projects/million — The WebAIM Million, 2026 report (Feb 2026; 1,000,000 home pages; 95.9% with detected WCAG 2 failures; 51% missing form input labels; 33.1% of inputs unlabelled; 83.9% low contrast; 56.1 errors/page) | VERIFIED (primary, measured) |
| S-56 | w3.org/TR/turingtest — W3C, *Inaccessibility of CAPTCHA: Alternatives to Visual Turing Tests on the Web*, Group Draft Note 16 Dec 2021 ("a denial of service to these users") | VERIFIED (W3C) |
| S-57 | w3.org/WAI/WCAG2/supplemental/patterns/o4p09-data-loss — W3C WAI cognitive-accessibility design pattern, *Avoid Data Loss and "Timeouts"* | VERIFIED (W3C) |
| S-58 | gds.blog.gov.uk (16 Jul 2018) — *Why GOV.UK content should be published in HTML and not PDF*; gov.uk/guidance/publishing-accessible-documents | VERIFIED (UK government primary) |
| S-59 | stylemanual.gov.au — Australian Government Style Manual, *PDF (Portable Document Format)* and *Make content accessible* | VERIFIED (Australian government primary) |
| S-60 | w3.org/WAI/WCAG22/Techniques/failures/F73 and Understanding SC 1.4.1 (Use of Color) | VERIFIED (W3C normative technique); prevalence not separately measured |
| S-61 | robodebt.royalcommission.gov.au/publications/report — Royal Commission into the Robodebt Scheme, recommendation 17.1 (publish that ADM is used, how it works, and make business rules and algorithms available for independent expert scrutiny); pmc.gov.au — Government Response, Nov 2023 | VERIFIED (Royal Commission primary) |
| S-62 | webaim.org/techniques/formvalidation — *Usable and Accessible Form Validation and Error Recovery* (errors must be associated with their controls; mechanism to reach the field in error) | VERIFIED (authoritative practitioner guidance) |
| S-63 | modelcontextprotocol.io/specification/2025-11-25 — Model Context Protocol specification | VERIFIED (primary; accessed 10 Jul 2026) |
| S-64 | alphagov.github.io/govuk-ai — GOV.UK AI Studio, service typologies for agentic AI (describes itself as exploratory research and design) | VERIFIED (primary; accessed 10 Jul 2026) |
| S-65 | eudi.dev/2.4.0/architecture-and-reference-framework-main — EUDI Wallet Architecture and Reference Framework v2.4.0 (representation/delegation topic) | VERIFIED (primary; accessed 10 Jul 2026) |
| S-66 | arXiv 2501.09674 — *Authenticated Delegation and Authorized AI Agents* | VERIFIED (preprint; accessed 10 Jul 2026) |
| S-67 | oecd.org — *Governing with Artificial Intelligence* / Digital Government Outlook 2026 | SECONDARY (survey; OECD primary for S-46's account) |
| S-68 | whitehouse.gov — OMB M-25-21, *Accelerating Federal Use of AI* | VERIFIED (primary; accessed 10 Jul 2026; cited as evidence of the internal-use scope, not of citizen-side access) |
| S-69 | tech.gov.sg/technews/ai-agents — Singapore GovTech, AI agents for public officers | VERIFIED (primary; accessed 10 Jul 2026; internal use) |
| S-70 | Storybook Docs — Accessibility tests — https://storybook.js.org/docs/writing-tests/accessibility-testing [Docs CC BY (Storybook code MIT); paraphrased, no verbatim spec text reproduced] | VERIFIED |
| S-71 | @storybook/test-runner — GitHub repo (rendered) — https://github.com/storybookjs/test-runner [MIT] | VERIFIED |
| S-72 | @storybook/test-runner — README (raw, next branch) — https://raw.githubusercontent.com/storybookjs/test-runner/next/README.md [MIT] | VERIFIED |
| S-73 | @storybook/test-runner — package.json (raw, next branch) — https://raw.githubusercontent.com/storybookjs/test-runner/next/package.json [MIT (license field = MIT, version 0.24.0)] | VERIFIED |
| S-74 | Storybook Docs — Write an addon (writing-addons) — https://storybook.js.org/docs/addons/writing-addons [Docs CC BY (Storybook code MIT)] | VERIFIED |
| S-75 | Storybook Docs — Addons API reference — https://storybook.js.org/docs/addons/addons-api [Docs CC BY (Storybook code MIT)] | VERIFIED |
| S-76 | @storybook/addon-a11y — source directory (next branch) — https://github.com/storybookjs/storybook/tree/next/code/addons/a11y [MIT] | VERIFIED |
| S-77 | @storybook/addon-a11y — package.json (raw, next branch) — https://raw.githubusercontent.com/storybookjs/storybook/next/code/addons/a11y/package.json [MIT (license field = MIT, version 10.6.0-alpha.0; dep axe-core ^4.2.0)] | VERIFIED |
| S-78 | AgDS home page (Agriculture Design System) — https://design-system.agriculture.gov.au/ | VERIFIED |
| S-79 | AgDS Foundations — Technical overview (framework, Emotion, single npm package, per-component entrypoints) — https://design-system.agriculture.gov.au/foundations/technical-overview | VERIFIED |
| S-80 | AgDS Guides — Getting started (install, @emotion/cache + @emotion/react, RootStyleRegistry + Core providers, ag-branding theme) — https://design-system.agriculture.gov.au/guides/getting-started | VERIFIED |
| S-81 | About AgDS (owner DAFF, based on GOLD, MIT licence, DDA 1992) — https://design-system.agriculture.gov.au/about | VERIFIED |
| S-82 | Intopia — Statement of Conformance 2024, DAFF design system (WCAG 2.1 A & AA, WCAG-EM 1.0, JAWS/VoiceOver, issued 02/12/2024) — https://design-system.agriculture.gov.au/files/Statement%20of%20Conformance%202024%20-%20AgDS.pdf | VERIFIED |
| S-83 | GitHub — agriculturegovau/agds-next (repo, MIT LICENSE, releases, monorepo workspaces incl. yourgov) — https://github.com/agriculturegovau/agds-next | VERIFIED |
| S-84 | GitHub raw — packages/react/package.json (version 1.35.1, MIT, React 16-19 peer range, @emotion/react ^11.7.0) — https://raw.githubusercontent.com/agriculturegovau/agds-next/main/packages/react/package.json | VERIFIED |
| S-85 | AgDS Beta v1.0.0 release note (2023-01-09 origin/status history) — https://design-system.agriculture.gov.au/updates/2023-01-09-beta | SECONDARY |
| S-86 | Australian Government Architecture (AGA) — Agriculture Design System listing (government reuse/endorsement) — https://architecture.digital.gov.au/design/agriculture-design-system | TO VERIFY |
| S-87 | npm — @ag.ds-next/react package page (blocked HTTP 403 this session; facts sourced from raw package.json instead) — https://www.npmjs.com/package/@ag.ds-next/react | TO VERIFY |
| S-88 | designsystemau/gold-design-system (GitHub repo metadata via gh API: MIT, HTML/SCSS, last push 2021-09-22, no releases/tags) — https://github.com/designsystemau/gold-design-system [MIT] | VERIFIED |
| S-89 | GOLD packages/core & packages/accordion package.json (gh API contents: @gold.au/core@5.0.0, @gold.au/accordion@8.0.0, MIT, React ES5 main, pancake-based) — https://github.com/designsystemau/gold-design-system/tree/main/packages [MIT] | VERIFIED |
| S-90 | GOLD LICENSE file (MIT, Copyright (c) 2021 Design System Au) — https://github.com/designsystemau/gold-design-system/blob/main/LICENSE [MIT] | VERIFIED |
| S-91 | npm registry @gold.au/core, @gold.au/accordion, @gold.au/pancake (dist-tags latest 5.0.0/8.0.0/2.0.0; time.modified 2022-04-05 for all) — https://registry.npmjs.org/@gold.au/core [MIT] | VERIFIED |
| S-92 | designsystemau org repo listing via gh (most-recent push in whole org = gold-design-system-site 2022-09-02; org dormant since) — https://github.com/designsystemau | VERIFIED |
| S-93 | Morpht blog: 'The Australian Government Design System is dead, long live GOLD' (history: DTA retired AuDS Sept 2021; community fork rebranded GOLD = Government Open Language for Design) — https://www.morpht.com/blog/australian-government-design-system-dead-long-live-gold | SECONDARY |
| S-94 | dpc-sdp/ripple (GitHub repo metadata via gh API: Apache-2.0, TypeScript, isArchived=false, last push 2026-07-12; pnpm monorepo) — https://github.com/dpc-sdp/ripple [Apache-2.0] | VERIFIED |
| S-95 | Ripple README.md (Ripple 2.0, complete re-write, maintained by Single Digital Presence, Dept of Government Services Victoria; 50+ gov sites; GitHub Packages only, npm deprecated; non-Vic use unsupported) — https://github.com/dpc-sdp/ripple/blob/main/README.md [Apache-2.0] | VERIFIED |
| S-96 | Ripple packages/ripple-ui-core/package.json (@dpc-sdp/ripple-ui-core@2.53.0, Apache-2.0, peerDep vue ^3.5.38, @nuxt/kit, Vite UMD+ES build rpl-lib.*, focus-trap/mitt/@vueuse) — https://github.com/dpc-sdp/ripple/tree/main/packages/ripple-ui-core [Apache-2.0] | VERIFIED |
| S-97 | Ripple GitHub releases via gh API (ripple-ui-core v2.53.0 2026-07-02, ripple-ui-maps v2.49.2, per-package release-please tags — active release cadence) — https://github.com/dpc-sdp/ripple/releases | VERIFIED |
| S-98 | Ripple docs — Access to GitHub Packages (packages on ghcr under @dpc-sdp; PAT with read:packages scope in user .npmrc required) — https://www.ripple.sdp.vic.gov.au/design-system/develop/usage/access-to-github-packages | VERIFIED |
| S-99 | dpc-sdp/ripple-framework — returns HTTP 404 / GraphQL 'Could not resolve to a Repository' (Ripple 2 canonical repo is now dpc-sdp/ripple; the ripple-framework path in the brief is stale) — https://github.com/dpc-sdp/ripple-framework | VERIFIED |
| S-100 | WebMCP — W3C Web Machine Learning CG (Draft Community Group Report) — https://webmachinelearning.github.io/webmcp/ [W3C Community Contributor License Agreement (CLA)] | VERIFIED |
| S-101 | WebMCP — Chrome for Developers (AI on Chrome docs) — https://developer.chrome.com/docs/ai/webmcp [Google/Chrome docs (CC BY 4.0 per site terms)] | VERIFIED |
| S-102 | Join the WebMCP origin trial — Chrome for Developers blog — https://developer.chrome.com/blog/ai-webmcp-origin-trial [Google/Chrome docs (CC BY 4.0 per site terms)] | VERIFIED |
| S-103 | Model Context Protocol — Server / Tools specification (rev 2025-06-18) — https://modelcontextprotocol.io/specification/2025-06-18/server/tools [MIT (spec repo) / CC-BY docs] | VERIFIED |
| S-104 | The /llms.txt file — llmstxt.org — https://llmstxt.org/ [Apache-2.0 (llms-txt project)] | VERIFIED |
| S-105 | schema.org Actions — potentialAction / EntryPoint / target — https://schema.org/docs/actions.html [CC BY-SA 3.0] | VERIFIED |
| S-106 | Machine Readable Web APIs with Schema.org Action Annotations (arXiv:1805.05479) — https://arxiv.org/abs/1805.05479 [arXiv (author licence)] | SECONDARY |
| S-107 | React Aria — Architecture & getting-started (Adobe): hook-based behaviour/accessibility, no rendering, useButton returns buttonProps you spread — https://react-aria.adobe.com/architecture [Apache-2.0 (Adobe / adobe/react-spectrum)] | VERIFIED |
| S-108 | React Aria — getting-started canonical useButton example (static docs mirror) — https://reactspectrum.blob.core.windows.net/reactspectrum/f38a678556740b9f994854bb46f590a728ebdbad/docs/react-aria/getting-started.html [Apache-2.0] | VERIFIED |
| S-109 | React Aria — mergeProps utility (chains handlers, combines classNames, dedupes ids, merges refs) — https://react-spectrum.adobe.com/react-aria/mergeProps.html [Apache-2.0] | VERIFIED |
| S-110 | Radix Primitives — Introduction (unstyled, compound parts, asChild composition, 'base layer of your design system') — https://www.radix-ui.com/primitives/docs/overview/introduction [MIT (© WorkOS)] | VERIFIED |
| S-111 | Radix Primitives — Accessibility overview (WAI-ARIA APG, tested with AT, focus/keyboard handled internally) — https://www.radix-ui.com/primitives/docs/overview/accessibility [MIT] | VERIFIED |
| S-112 | Radix Primitives — GitHub repo (licence confirmation, 'low-level UI component library') — https://github.com/radix-ui/primitives [MIT (© 2022–present WorkOS)] | VERIFIED |
| S-113 | Headless UI (Tailwind Labs) — completely unstyled, fully accessible components; React + Vue — https://headlessui.com/ [MIT (Tailwind Labs)] | VERIFIED |
| S-114 | Ariakit — unstyled primitives, store-based state, props system + render-prop composition for building design systems — https://ariakit.com/ [MIT] | VERIFIED |
| S-115 | Storybook — Accessibility testing / @storybook/addon-a11y (axe-core per story, test:'error' fails CI, project/component/story-level parameters) — https://storybook.js.org/docs/writing-tests/accessibility-testing [MIT] | VERIFIED |
| S-116 | @ag.ds-next/react — npm registry (v1.35.1, MIT) and repo TypeScript prop types (text-input, select, checkbox) — https://registry.npmjs.org/@ag.ds-next/react/latest ; https://github.com/agriculturegovau/agds-next | VERIFIED (primary; accessed 2026-07-13) |
| S-117 | Gooding, P., Arstein-Kerslake, A. & Flynn, E. (2015), 'Assistive technology as support for the exercise of legal capacity', International Review of Law, Computers & Technology 29(2-3):245-265 — https://doi.org/10.1080/13600869.2015.1055665 | VERIFIED (peer-reviewed; accessed 2026-07-16) |
| S-118 | Committee on the Rights of Persons with Disabilities (2014), General Comment No. 1 (2014): Article 12, Equal recognition before the law, UN Doc CRPD/C/GC/1 (adopted 11 April 2014) — https://docs.un.org/en/CRPD/C/GC/1 | VERIFIED (primary; accessed 2026-07-16) |
| S-119 | Stavert, J. (2021), 'Supported Decision-Making and Paradigm Shifts: Word Play or Real Change?', Frontiers in Psychiatry 11:571005 — https://doi.org/10.3389/fpsyt.2020.571005 | VERIFIED (peer-reviewed; accessed 2026-07-16) |
| S-120 | Freeman, M.C. et al. (2015), 'Reversing hard won victories in the name of human rights: a critique of the General Comment on Article 12 of the UN CRPD', The Lancet Psychiatry 2(9):844-850 — https://doi.org/10.1016/S2215-0366(15)00218-7 | TO VERIFY |
| S-121 | Bahner, J. (2022), 'Nothing About Us Without … Who? Disability Rights Organisations, Representation and Collaborative Governance', International Journal of Disability and Social Justice 2(2):40-64 — https://doi.org/10.13169/intljofdissocjus.2.2.0040 | VERIFIED (peer-reviewed; accessed 2026-07-16) |
| S-122 | Okoroji, C., Mackay, T., Robotham, D., Beckford, D. & Pinfold, V. (2023), 'Epistemic injustice and mental health research: A pragmatic approach to working with lived experience expertise', Frontiers in Psychiatry 14:1114725 — https://doi.org/10.3389/fpsyt.2023.1114725 | VERIFIED (peer-reviewed; accessed 2026-07-16) |
| S-123 | Randal, C. et al. (2026), 'Beyond Tokenism: Making Lived Experience Leadership Visible in Co-Produced Research Authorship', Health Expectations (advance online publication) — https://doi.org/10.1111/hex.70665 | TO VERIFY |
| S-124 | Shakespeare, T. & Watson, N. (2001), 'The social model of disability: an outdated ideology?', Research in Social Science and Disability 2:9-28 — https://disability-studies.leeds.ac.uk/wp-content/uploads/sites/40/library/Shakespeare-social-model-of-disability.pdf | VERIFIED (peer-reviewed; accessed 2026-07-16) |
| S-125 | Bhaskar, R. & Danermark, B. (2006), 'Metatheory, Interdisciplinarity and Disability Research: A Critical Realist Perspective', Scandinavian Journal of Disability Research 8(4):278-297 — https://doi.org/10.1080/15017410600914329 | VERIFIED (peer-reviewed; accessed 2026-07-16) |
| S-126 | Kafer, A. (2013), Feminist, Queer, Crip, Indiana University Press — https://www.jstor.org/stable/j.ctt16gz79x | SECONDARY |
| S-127 | Winance, M. (2006), 'Trying Out the Wheelchair: The Mutual Shaping of People and Devices through Adjustment', Science, Technology, & Human Values 31(1):52-72 — https://doi.org/10.1177/0162243905280023 | VERIFIED (peer-reviewed; accessed 2026-07-16) |
| S-128 | Moser, I. (2006), 'Disability and the promises of technology: Technology, subjectivity and embodiment within an order of the normal', Information, Communication & Society 9(3):373-395 — https://doi.org/10.1080/13691180600751348 | VERIFIED (peer-reviewed; accessed 2026-07-16) |


---

## Appendix A — Disability-studies and disability-rights foundations (S-117–S-128)

**Provenance.** These twelve sources were surfaced by an adversarial deep-research pass on 16 July 2026 (search → fetch → three-vote refutation) to deepen the disability-theory base of the extended thesis (`00-thesis/`, Chapters 2 and 7) and to stress-test it with dissenting scholarship. They also bear on the standard itself: General Comment No. 1 (S-118) states, on the treaty body's own authority, the verify-identity-and-challenge requirement the standard meets through its attribution and contestability criteria, and the co-design critique (S-121–S-123) bears directly on the Lived Experience Design Authority governance (CO-DESIGN-FRAMEWORK; thesis Chapter 7). Reliability flags are recorded honestly; two sources are marked **TO VERIFY** because they were not read in full this round. Codes: **SUPPORTS / COMPLICATES / CHALLENGES** the thesis's claims — dissent is deliberately included.

### A.1 CRPD Article 12 — supported decision-making

- **S-117 · Gooding, P., Arstein-Kerslake, A. & Flynn, E. (2015), 'Assistive technology as support for the exercise of legal capacity', International Review of Law, Computers & Technology 29(2-3):245-265.** https://doi.org/10.1080/13600869.2015.1055665 — *Argues:* AT is itself a form of Article 12 support, and states carry an obligation to provide access to it — the exact move the thesis extends from established AT to the acting agent. **[SUPPORTS]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* Carries the legal-capacity/support point only; the government-services-via-agent inference is the thesis's own step, not these authors'.

- **S-118 · Committee on the Rights of Persons with Disabilities (2014), General Comment No. 1 (2014): Article 12, Equal recognition before the law, UN Doc CRPD/C/GC/1 (adopted 11 April 2014).** https://docs.un.org/en/CRPD/C/GC/1 — *Argues:* Sets the three-part test for prohibited substituted decision-making; at para 29(d) requires any recognised support arrangement to let third parties verify a supporter's identity and challenge actions taken against the person's will and preferences. **[SUPPORTS (with a boundary the standard must meet)]** *Status:* VERIFIED (primary; accessed 2026-07-16). *Caveat:* The para 29(d) requirement is an attribution-and-contestability obligation in treaty-body language; it maps onto criteria 5.2/5.3/5.4 of the standard.

- **S-119 · Stavert, J. (2021), 'Supported Decision-Making and Paradigm Shifts: Word Play or Real Change?', Frontiers in Psychiatry 11:571005.** https://doi.org/10.3389/fpsyt.2020.571005 — *Argues:* Support can be a vector of undue influence, not an automatic safeguard (CRPD Art 12(4)); family/supporter involvement is double-edged. **[COMPLICATES]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* For a software agent the undue influence enters via defaults, design choices and provider incentives — the vendor cannot be folded into the person's will (thesis Ch2 §2.6, Ch8).

- **S-120 · Freeman, M.C. et al. (2015), 'Reversing hard won victories in the name of human rights: a critique of the General Comment on Article 12 of the UN CRPD', The Lancet Psychiatry 2(9):844-850.** https://doi.org/10.1016/S2215-0366(15)00218-7 — *Argues:* GC1's abolition of all substitute decision-making is unworkable and risks harm; the abolitionist reading is contested. **[COMPLICATES]** *Status:* TO VERIFY. *Caveat:* Named in the deep-research caveats but NOT independently fetched this round; confirm full author list and DOI before external use.

### A.2 Lived experience and the politics of co-design

- **S-121 · Bahner, J. (2022), 'Nothing About Us Without … Who? Disability Rights Organisations, Representation and Collaborative Governance', International Journal of Disability and Social Justice 2(2):40-64.** https://doi.org/10.13169/intljofdissocjus.2.2.0040 — *Argues:* The policies constituting governance forums define which organisations may represent disabled people, so legitimacy is fixed by definitional gatekeeping; formal inclusion does not deliver genuine inclusion. **[CHALLENGES]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* Single Swedish case study generalised to a mechanism; cite as illustrative. Directly stress-tests Ch7's chartered lived-experience body.

- **S-122 · Okoroji, C., Mackay, T., Robotham, D., Beckford, D. & Pinfold, V. (2023), 'Epistemic injustice and mental health research: A pragmatic approach to working with lived experience expertise', Frontiers in Psychiatry 14:1114725.** https://doi.org/10.3389/fpsyt.2023.1114725 — *Argues:* Names elite capture, the 'unrepresentative elite subset', and epistemic exploitation (via Fricker, Taiwo, Toole/Berenstain); surface inclusion can be oppressive if social change is not a core aim. **[CHALLENGES / COMPLICATES]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* Grounds Ch7's 'why co-design, not consultation'. Quote exact source wording (some circulated phrasings are paraphrase-in-quotes).

- **S-123 · Randal, C. et al. (2026), 'Beyond Tokenism: Making Lived Experience Leadership Visible in Co-Produced Research Authorship', Health Expectations (advance online publication).** https://doi.org/10.1111/hex.70665 — *Argues:* Introduces 'porous solidarity': political solidarity requires an 'us' while ethical practice requires attention to the differences that 'us' erases; the two cannot be jointly satisfied. **[COMPLICATES]** *Status:* TO VERIFY. *Caveat:* Paywalled; verified via indexed snippets and an open-access mirror, not full in-situ reading. Credit 'porous' as developed via Critchley/Levinas. Obtain full text.

### A.3 The social model and its successors

- **S-124 · Shakespeare, T. & Watson, N. (2001), 'The social model of disability: an outdated ideology?', Research in Social Science and Disability 2:9-28.** https://disability-studies.leeds.ac.uk/wp-content/uploads/sites/40/library/Shakespeare-social-model-of-disability.pdf — *Argues:* The impairment/disability dualism is analytically unsustainable, impairment is itself socially constituted, and 'disabled people' is a plurality, not a single representable identity. **[COMPLICATES]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* Contested by social-model defenders (e.g. Terzi); the thesis uses it in the complicating register. Quote exact wording, not the circulated paraphrase.

- **S-125 · Bhaskar, R. & Danermark, B. (2006), 'Metatheory, Interdisciplinarity and Disability Research: A Critical Realist Perspective', Scandinavian Journal of Disability Research 8(4):278-297.** https://doi.org/10.1080/15017410600914329 — *Argues:* Disability is a 'necessarily laminated system' across seven irreducible levels (physical to normative); each model accentuates one mechanism, and the weight of each is an empirical question. **[COMPLICATES / SUCCEEDS]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* The canonical critical-realist reference; lets the thesis hold impairment-level and social-level mechanisms together without collapsing into either model.

- **S-126 · Kafer, A. (2013), Feminist, Queer, Crip, Indiana University Press.** https://www.jstor.org/stable/j.ctt16gz79x — *Argues:* Advances a 'political/relational model': disability as a contested political category produced through relations and ideology, against both the medical model and the strong social model's mind/body split; fatigue and pain shape lives irrespective of barriers. **[GROUNDS / COMPLICATES]** *Status:* SECONDARY. *Caveat:* Canonical monograph accessed via JSTOR/publisher listing; primary full-text read outstanding (hence SECONDARY). Bridges to the interaction-cost-as-variable-quantity claim.

### A.4 Assistive-technology sociology

- **S-127 · Winance, M. (2006), 'Trying Out the Wheelchair: The Mutual Shaping of People and Devices through Adjustment', Science, Technology, & Human Values 31(1):52-72.** https://doi.org/10.1177/0162243905280023 — *Argues:* Device and user mutually transform through continual 'adjustment'; capability is a relational, emergent effect, and a new device produces new incapacities alongside new capacities. **[COMPLICATES]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* Reframes agent-as-AT as ongoing person-device co-constitution, not one-time delegation (thesis Ch2 §2.7); supports the scoped/revocable design.

- **S-128 · Moser, I. (2006), 'Disability and the promises of technology: Technology, subjectivity and embodiment within an order of the normal', Information, Communication & Society 9(3):373-395.** https://doi.org/10.1080/13691180600751348 — *Argues:* AT's 'logic of compensation' works towards 'an order of the normal', remaking disabled people into 'competent normal subjects' and reproducing the abled/disabled boundary it purports to ease. **[CHALLENGES]** *Status:* VERIFIED (peer-reviewed; accessed 2026-07-16). *Caveat:* The sharpest critique the thesis must answer: an access-conformance standard framed as making a person a competent normal user risks reinscribing the normalising order (thesis Ch2 §2.7, Ch8).

**Not added (honesty note).** The deep-research pass could not verify, this round, a peer-reviewed source for the 'load that varies with fatigue / cumulative cognitive load' (spoon-theory-adjacent) claim, nor an assistive-technology abandonment/non-use source; none was added to the thesis or the register. Ellen Samuels, 'Six Ways of Looking at Crip Time', *Disability Studies Quarterly* 37(3), 2017 (doi:10.18061/dsq.v37i3.5824) is a strong candidate to verify and register next, as it would ground the interaction-cost-as-variable-quantity argument directly.
