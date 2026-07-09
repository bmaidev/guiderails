# Legal issues analysis and instructing brief

**Status:** v0.1, 9 July 2026. This document is an issues analysis prepared to scope and instruct formal legal advice (DECISIONS.md OD-04). **It is not legal advice**, and nothing in it is to be asserted publicly as a legal position until counsel has advised. Statutory references were verified against AustLII / Federal Register of Legislation on 9 July 2026 except where marked.

**Purpose:** map the legal questions the standard raises; record the provisional analysis informing drafting choices in MODEL.md; and pose the precise questions for counsel (§8).

---

## Issue 1 — Does the DDA reach a person's authorised agent?

**Framework.** The Disability Discrimination Act 1992 (Cth) prohibits discrimination in the provision of goods, services and facilities (s 24) and its objects extend to the administration of Commonwealth laws and programs (s 3; see also s 29). Discrimination may be direct (s 5) or indirect (s 6), subject to defences including unjustifiable hardship (s 11). Its application to web accessibility has been settled since *Maguire v Sydney Organising Committee for the Olympic Games* [2000] HREOCA 31 [L-01..L-03].

**The ss 7–9 route — the strongest structural hook.** Section 8(1) provides that the Act applies in relation to having a carer, assistant, assistance animal or **disability aid** in the same way as it applies in relation to having a disability; the s 5(3) example confirms circumstances are not materially different because the person requires adjustments for their carer, assistant or aid [L-01]. Section 9(1) defines a carer or assistant as one who provides assistance or services to the person because of the disability; s 9(3) defines a disability aid by reference to equipment used by the person that alleviates the effect of the disability [L-02, L-04].

Screen readers are uncontroversially within this territory. The live question is whether **agent software used by a person with disability to perceive and operate services** is (a) a "disability aid" (is software "equipment"? does autonomy change the character of the aid?), or (b) analytically closer to an "assistant" (the definitions in s 9(1) contemplate persons — interpreters, readers — which an AI agent is not). Purposive construction, the Act's beneficial character, the Convention on the Rights of Persons with Disabilities as interpretive context, and the AHRC's April 2025 guidance extending DDA analysis to AI-era technologies [L-05] all bear on this. **Provisional view:** arguable but unsettled for the "aid" limb; counsel should test both limbs and the interpretive weight of the AHRC guidance.

**The indirect discrimination route — likely the stronger claim.** Section 6 targets conditions or requirements with which persons with disability are disproportionately unable to comply and which are not reasonable. A service that (i) gates an essential journey behind a challenge designed to defeat automation, or (ii) is completable only through unaided real-time interaction with a complex visual interface, imposes exactly such a condition on people who rely on agent-mediated access as their practicable mode of use. *Maguire* establishes the pattern for digital conditions. **Provisional view:** a blanket refusal to serve a person's authorised agent, where the agent functions as that person's access method, raises a serious indirect-discrimination question; the outcome will turn on reasonableness and s 11.

**Anticipated counter-arguments to brief:** the human channel is adequate service; agent traffic is indistinguishable from hostile automation (answered in part by the standard's authenticated-delegation model — the respondent's own remediation path); unjustifiable hardship; the third-party-operator problem (the aid is run by a commercial vendor, not "used by the person" simpliciter).

**Drafting consequence already taken:** the standard never claims a settled legal entitlement; criterion 3.3.1 is framed as good practice that also mitigates a legal risk, and public materials say no more than that the issue "raises questions under the DDA" pending advice.

## Issue 2 — Attribution and delegation: whose act is the agent's act?

**Electronic Transactions Act 1999 (Cth)** [L-06, L-07]: s 8 (general validity of electronic transactions), s 15 (attribution of electronic communications), and Part 2A for contracts — notably **s 15C**, under which a contract is not invalid, void or unenforceable on the sole ground that no natural person reviewed or intervened in the automated actions that formed it, and **s 15D** (input-error rights in dealings with automated systems). Current compilation C2026C00011 (5 December 2025) [L-07].

**Limits to brief:** Part 2A speaks to *contracts*; most citizen–government interactions are statutory applications, claims, declarations and notifications, where attribution runs through the scheme's own instrument, the ETA's general provisions, and the exemptions in the Electronic Transactions Regulations — which must be checked scheme-by-scheme. Some instruments prescribe personal declarations whose delegability is doubtful.

**Existing delegation rails to map:** statutory nominee arrangements (e.g. correspondence and payment nominees under social security administration law), myGov account and linking arrangements, and the accreditation architecture of the **Digital ID Act 2024 (Cth)** as a potential future rail for verifiable, scoped delegation **[TO VERIFY current scope — the Act accredits identity services; whether and how delegation/authorisation attaches is a counsel question]**.

**Drafting consequence already taken:** criterion 5.3.1 keeps a human confirmation event at designated consequential actions — deliberately preserving a personal act where statutes expect one — and 5.1/5.5 make every delegation scoped, revocable and attributable, so the attribution question is answered by design rather than litigated after the fact. The standard's working assumption, to be tested with counsel: **an agent under a Kerbcut delegation is legally closer to a lodgement channel plus a nominee than to an autonomous decision-maker.**

## Issue 3 — Privacy

Under the Privacy Act 1988 (Cth) APPs: the agent operator's receipt of personal information is a disclosure requiring an authority basis (APP 6) and the delegation consent architecture must be designed to supply it; collection minimisation (APP 3) favours the standard's declared-tools model over page scraping (defined fields under a scoped delegation versus wholesale DOM ingestion); security (APP 11) and access (APP 12) align with 5.4.1; cross-border processing by agent vendors engages APP 8 — a material design and procurement question. Criterion 4.5.2 (hypothetical queries create no attributed record) is drafted to keep eligibility exploration outside collection where possible; counsel to confirm the boundary.

**Live regulatory driver:** privacy reforms commencing **December 2026** will require privacy policies to disclose the use of personal information in substantially automated decisions [L-08] **[SECONDARY — confirm commencement instrument]**. The standard's transparency surfaces give agencies a head start on the same disclosure logic.

## Issue 4 — Administrative law and the ADM reform program

The Royal Commission into the Robodebt Scheme (report presented 7 July 2023; 57 recommendations; all accepted or accepted in principle in the Government response of November 2023) recommended, at **17.1**, a consistent legal framework for automation in government services — including plain-language website disclosure of ADM use and making **business rules and algorithms available for independent expert scrutiny** — and, at **17.2**, a monitoring and audit body for ADM [L-09..L-11]. The Attorney-General's Department consulted in late 2024 and is developing the framework; the Commonwealth Ombudsman's ADM Better Practice Guide was reissued in March 2025 with the OAIC and AGD [L-08, L-12].

**Alignment claim (safe to make publicly, with citations):** Principle 4 operationalises recommendation 17.1's scrutiny requirement on the citizen-facing side — versioned rules endpoints with legal provenance *are* business rules made available for independent scrutiny.

**Cautionary instance (handle per D-011):** in August 2025 the Commonwealth Ombudsman found that an incorrectly coded automated system under the Targeted Compliance Framework unlawfully cancelled income support for 964 jobseekers by bypassing a statutory discretion introduced in 2022 [L-13] **[SECONDARY — obtain the Ombudsman report itself before external use]**. The instructive point for this standard: the documented failure mode of Australian service automation is divergence between deployed rules and authorising law. Versioned, dated, scrutable rules surfaces (4.2.1, 4.4.x) are the countermeasure, and the finding is to be referenced factually and constructively only.

**Distinction to hold clearly in all materials:** agency-side ADM (the subject of the RC, the AGD framework, and the DTA agentic addendum) and citizen-side agents (the subject of this standard) are different legal objects with complementary safeguards. Conflating them invites the objection this project exists to answer.

## Issue 5 — Fraud-control and security obligations versus 3.3

Accountable authorities carry duties under the PGPA Act framework and the Commonwealth Fraud Control Framework; the PSPF governs protective security. The apparent tension with 3.3.1 (no challenge-only gates for authorised agents) dissolves on analysis: an authenticated, scoped, revocable delegation with per-action attribution is a *stronger* control than an anonymous challenge, and 5.6.1's security-necessity carve-out preserves documented, reviewable exceptions. Counsel to confirm the framing and identify any scheme where a challenge is itself statutorily mandated.

## Issue 6 — Liability allocation

Map for advice rather than resolve: principal liability for agent errors within scope of delegation (Issue 2's design answer narrows this); agent-vendor liability including Australian Consumer Law guarantees for agent products; agency liability for misleading machine surfaces (a stale rules endpoint that induces detrimental reliance — supports 4.4's currency criteria and suggests service operators will want the binding/indicative distinction in 4.5.1 for their own protection); and the effect of disclaimers on each.

## 7 — Positions the project may state publicly now

1. Nothing in current Commonwealth policy addresses citizen-side agent access to government services (cited to the dossier).
2. The standard is designed to be consistent with, and to extend the intent of, the DDA's accessibility jurisprudence, Robodebt RC recommendation 17.1, and the DTA's AI guidance vocabulary.
3. Whether refusing service to a person's authorised agent engages the DDA "raises questions" — no stronger formulation until advice.

## 8 — Questions to counsel

1. Is agent software used by a person with disability capable of being a "disability aid" within s 9(3) DDA, and does agent autonomy affect that characterisation?
2. Alternatively, can agent-mediated access ground an indirect-discrimination claim under s 6 where an essential government journey is completable only through unaided real-time interaction or automation-defeating challenges? How does s 11 likely resolve?
3. What weight would the AHRC's April 2025 guidelines carry in either analysis?
4. For non-contractual statutory interactions, what is the attribution analysis for acts of an agent under a scoped delegation, scheme-generically and for (a) social security claims and reporting, (b) statutory declarations?
5. Do existing nominee regimes provide a lawful template for the standard's delegation model, and what would extending them to software agents require?
6. Does the Digital ID Act 2024 architecture accommodate, or could it be extended to accommodate, verifiable scoped delegations to agents?
7. Under the APPs, what consent and notice architecture makes the delegation flow lawful for (a) the agency, (b) the agent vendor, including APP 8 offshore processing?
8. Does criterion 4.5.2's hypothetical-query design succeed in keeping such queries outside "collection", and what design changes would strengthen that?
9. What liability attaches to an agency for erroneous or stale rules-endpoint responses relied upon by agents, and how far does the binding/indicative labelling in 4.5.1 mitigate it?
10. Is there any Commonwealth scheme where an anti-automation challenge is legally mandated such that 3.3.1 needs an express exception?
11. Any Constitutional or legislative-power issues in a whole-of-government instrument mandating this standard?
12. Sequencing advice: which of the above must be resolved before a public v0.9, and which can proceed on stated assumptions?

**Counsel profile:** discrimination law (DDA litigation experience) plus Commonwealth administrative law, with technology-regulation fluency; discrimination and admin-law questions may sensibly go to different counsel.

## 9 — Source table

| ID | Source | Status |
|---|---|---|
| L-01 | DDA s 8 (AustLII); s 5(3) example | VERIFIED |
| L-02 | DDA s 4 definitions; ss 7–9 structure (AustLII; FRL compilation) | VERIFIED |
| L-03 | DDA table of provisions incl. s 24; objects incl. administration of Commonwealth laws and programs | VERIFIED (s 29 text to be pulled in counsel brief) |
| L-04 | Practitioner summaries of s 8/9 scope (aids incl. equipment alleviating disability effects) | SECONDARY |
| L-05 | AHRC Guidelines on Equal Access to Digital Goods and Services (Apr 2025) — via dossier S-27/S-22 | VERIFIED at guideline-existence level; obtain full text |
| L-06 | ETA 1999 (Cth) table of provisions; Part 2A; ss 15, 15C, 15D | VERIFIED |
| L-07 | FRL compilation C2026C00011 (5 Dec 2025); s 15C effect | VERIFIED / SECONDARY (effect wording via commentary) |
| L-08 | Keypoint Law analysis — ADM reform status; Ombudsman/OAIC/AGD Better Practice Guide (Mar 2025); Dec 2026 APP changes | SECONDARY |
| L-09 | Robodebt RC report page — recommendations text (17.1 elements) | VERIFIED |
| L-10 | Government Response (Nov 2023, PM&C) — acceptance | VERIFIED |
| L-11 | OGP commitment AU0024 — rec 17.1 implementation track; AGD role | VERIFIED |
| L-12 | OAIC FOI report on ADM public reporting | VERIFIED |
| L-13 | AusPubLaw (Nov 2025) — Ombudsman TCF finding, 964 jobseekers | SECONDARY — obtain Ombudsman report |
