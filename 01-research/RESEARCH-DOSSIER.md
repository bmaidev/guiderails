# Research dossier

**Status:** v0.1, compiled 9 July 2026. Living document.

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
- Architectural pattern relevant to us: expose *workflow-level* capabilities rather than raw endpoints, shifting orchestration out of the model's reasoning loop into a deterministic spec; pairs naturally with MCP tools [S-19] **[SECONDARY]**. A claim that the MCP specification references Arazzo for multi-step workflows is **[TO VERIFY]** against MCP spec text [S-48].

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

## 6. International scan (thin — pass 2 priority)

- No identified national government has published citizen-side agent-access standards for its services as at this pass **[TO VERIFY — dedicated pass on GDS, US (GSA/OMB/21st Century IDEA lineage), EU (eIDAS 2/EUDI wallet delegation, Single Digital Gateway once-only), Singapore GovTech, Estonia]**.
- US federal activity is presently about *governing* agents (NIST CAISI, OMB memoranda), mirroring Australia's addendum — the same gap, unfilled [S-11].
- EU delegation infrastructure (EUDI wallet) may become the strongest international comparator for Principle 5 **[TO VERIFY]**.

---

## 7. Gaps and next research passes

1. **Primary-source reads:** WebMCP Draft CG Report text; Lighthouse agentic audit documentation; MCP spec (Arazzo reference check); NIST CAISI/NCCoE originals; OECD DGO 2026; DXP 2026 update detail.
2. **Legal pass (OD-04):** DDA application to authorised agents; delegation law; myGov nominee/authorised-representative architecture; privacy (APP) analysis of scoped tool calls vs page scraping.
3. **Evidence pass:** independent measurements of agent performance vs semantic quality (WebArena/Mind2Web-class literature); disability-community research on AI assistant use — and primary co-design to generate what literature lacks.
4. **Comparator pass:** §6 above.
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
| S-48 | apiscout.dev — Arazzo guide (MCP-references-Arazzo claim) | TO VERIFY |
| S-49 | arXiv 2510.05159 — backdoors/prompt-injection in agent supply chain | VERIFIED (preprint) |
| S-50 | accessibilitychecker.org — AI agents for web accessibility | SECONDARY |
