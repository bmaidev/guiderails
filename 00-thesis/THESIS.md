# Thesis: Agents are assistive technology

**Status:** v0.1 working draft, 9 July 2026. Claims trace to [RESEARCH-DOSSIER.md](../01-research/RESEARCH-DOSSIER.md) (source register references in square brackets, e.g. [S-04]).

---

## 1. The claim

AI agents that read, navigate and complete online services on a person's behalf are assistive technology — functionally, and increasingly in how people with disability actually use them. Government services are not designed for them. A conformance standard that makes government services reliably operable by a person's authorised agent is therefore an accessibility standard, and the highest-leverage accessibility investment available this decade.

## 2. The new user agent

WCAG has four principles; the fourth, Robust, requires that content be interpretable by a wide variety of user agents, including assistive technologies [S-20]. That principle has always been forward-looking: it anticipated user agents that did not exist yet.

They exist now. Browser-operating AI agents interact with pages the way assistive-technology power users do: they traverse landmarks and headings, read accessible names and labels, inspect ARIA roles and input types to determine what a control does. Where those semantics are missing or ambiguous, agents fall back on visual heuristics and guesswork — which is slow, brittle, and error-prone [S-21, S-05]. The empirical pattern is the one accessibility practitioners have argued for decades: structured, semantically rich interfaces are more reliably machine-operable. The agent is, in a precise sense, the newest screen reader — one that can also act.

The ecosystem has begun formalising this. WebMCP — a proposed W3C-incubated web standard from Google and Microsoft — lets a site expose its forms and functions as declared, schema'd tools that agents call directly instead of guessing at the UI [S-01..S-08]. Chrome now ships experimental support and audits "agentic browsing" readiness in Lighthouse alongside accessibility [S-09, S-10]. None of this work carries the requirements government needs. That is the gap this project fills.

## 3. Who benefits first

About 5.5 million Australians — more than one in five — live with disability [S-22, S-30]. For many, the binding constraint on digital government is not motivation but interaction cost:

- **Cognitive disability, psychosocial disability, acquired brain injury:** long multi-step forms, working-memory load, ambiguous instructions, time-outs.
- **Blind and low-vision users:** journeys that are technically screen-reader-passable but practically exhausting at 40 fields.
- **Motor and dexterity impairment:** pointer-heavy interfaces, drag interactions, repeated data entry.
- **Chronic illness and fatigue conditions:** the same journey costs more, on worse days.
- **Low literacy and CALD communities:** dense prose gating essential services.

A reliable, accountable agent collapses interaction cost for all of these groups at once. This is not hypothetical adoption: general-purpose AI assistants are already being used as ad-hoc access tools, and the assistive-technology framing is established in the literature and in practice [S-23..S-26]. Australian policy already treats software of this class as fundable assistive technology — the Employment Assistance Fund explicitly funds assistive technology such as screen-reading software for employment participation [S-31]. Agents are the next entry on that continuum.

The kerb-cut effect then does the rest. Every uplift the standard requires is dual-benefit by construction:

| Uplift required by the standard | Assistive-technology benefit | Agent benefit |
|---|---|---|
| Programmatic labels, types, constraints on every field | Screen readers, voice control | Correct field mapping, no fabricated inputs |
| Plain-language content, one term per concept | Cognitive accessibility | Reduced misinterpretation |
| Declared, schema'd actions (WebMCP-class) | Voice and switch access to complex widgets | Deterministic operation, no pixel-guessing |
| Computable rules with legal provenance | Consistent, explainable answers for everyone | No hallucinated eligibility advice |
| Delegation, confirmation, audit | Safe supported decision-making | Safe autonomy with accountability |

## 4. The invisible failure mode

Today, when a general-purpose agent attempts a government journey, it guesses. It infers field meanings from visual layout, paraphrases eligibility rules from prose guidance, and synthesises clicks. When it fails, it fails silently — a wrong answer about entitlement, a misfiled form, an abandoned journey — with no service-side record that an agent was ever involved.

The error cost is asymmetric. The people most likely to rely on an agent are those for whom the manual journey is hardest; in high-stakes systems — income support, employment services with mutual obligations and compliance frameworks — the cost of a wrong or missed interaction is borne by the person, not the platform [S-32..S-34]. Unmanaged agent traffic is therefore simultaneously an accessibility failure, a service-quality failure, and a program-integrity risk. Agencies cannot see it, cannot audit it, and cannot design for it — because nothing tells them what "designed for it" means.

## 5. The policy gap, precisely

Australia's current settings form two of three legs:

1. **Human accessibility** is governed: the DDA (with Maguire v SOCOG as anchor authority), AHRC's 2025 guidance setting WCAG 2.2 AA as the benchmark and extending obligations to AI-era technologies, and the DTA's Digital Experience Policy with its four standards, in effect since 1 January 2025 [S-27..S-30, S-35].
2. **Government-operated agents** are governed: the DTA's Policy for the responsible use of AI in government v2.0 (effective 15 December 2025, with further requirements landing through 2026) and the Agentic AI addendum to the AI technical standard, published 4 June 2026, which sets lifecycle expectations — human oversight, accountability, contestability — for agentic systems that *agencies run* [S-36..S-40].
3. **Citizen-side agents arriving at government services** are governed by nothing. No DTA standard, no DXP criterion, no international equivalent tells an agency what its service must expose so that a person's authorised agent can act safely and reliably on their behalf.

The third leg is this standard. It is deliberately structured so an agency can adopt it as a natural extension of obligations it already carries: WCAG 2.2 AA is a prerequisite criterion, the accountability principle speaks the same language as the DTA's AI guidance (transparency, contestability, accountability, human-centred values), and the rules layer plugs into infrastructure the Australian ecosystem is already building — GovCMS's Rules-as-Code capability and the OpenFisca community that convened in Canberra in March 2026 with Department of Finance participation [S-41..S-45].

## 6. Why now

- **The standards window is open.** WebMCP was publicly announced in February 2026 and reaches a Chrome origin trial in Chrome 149; Lighthouse added agentic-browsing audits in May 2026; NIST launched an AI Agent Standards Initiative in February 2026 covering agent identity and authorisation [S-01..S-11]. The primitives are arriving; the government-grade profile of them does not exist anywhere. First movers set the vocabulary — as GDS did for digital service standards.
- **Australia is positioned to lead.** The OECD's inaugural Digital Government Outlook (2026) ranked Australia second globally [S-46]. The DTA has already shown it will move fast on agentic guidance for the government side; the citizen side is the natural next move.
- **A generational service redesign is in flight.** Employment services reform is being designed through 2026, with public submissions open until 31 July 2026 and a three-stream model led by an online stream [S-33]. A new service system can be born agent-accessible instead of retrofitted — the first in the world.

## 7. What good looks like

A service conformant with this standard can answer five questions, programmatically and safely:

1. *What are you?* (Discoverable)
2. *What does this field, step and document mean?* (Legible)
3. *What actions can be taken here, and how exactly?* (Operable)
4. *What do the rules say for this person's circumstances, and on what legal authority?* (Determinable)
5. *Who authorised this agent, what may it do, what did it do, and how is that contested?* (Accountable)

## 8. Objections, answered

**"Agents are a bot-defence problem, not a user class."** Unmanaged, yes. The standard's answer is authenticated, scoped delegation with attributable actions — which gives agencies *more* visibility and control than today's CAPTCHA arms race, and removes the incentive for agents to masquerade as humans. Challenge-only gates on essential journeys already sit uneasily with accessibility obligations; delegation is the durable fix.

**"This smells like automating decisions — Robodebt taught us better."** Inverted. Robodebt was unlawful automation *inside* government against people. This standard governs tools acting *for* people, and its Determinable and Accountable principles impose exactly what that history demands: rules with legal provenance, explainable determinations, flagged and logged agent actions, human confirmation at consequential steps, contestability throughout. Determinability is an integrity uplift, not a risk.

**"Wait for the W3C."** The W3C incubation is the reason to move now, not later: the mechanisms are being set, and nobody in those rooms is writing the delegation, rules-provenance or contestability layers government needs. Profile the emerging standards, prove the government-grade layers, contribute them back.

**"Better models will make this unnecessary."** Capability does not substitute for contract. A more capable agent guessing at an ambiguous form is still guessing; and accountability — delegation, attribution, audit — is orthogonal to model quality. Aviation did not respond to better pilots by removing instrument landing systems.

**"Privacy?"** The standard reduces incidental data exposure: declared tools transmit defined fields under a scoped delegation, versus screen-scraping agents ingesting entire pages. Privacy analysis is a Phase 1 workstream with the legal pass (see DECISIONS.md OD-04).

## 9. Evidence status

This thesis is deliberately conservative: no claim about agent adoption rates by people with disability is made beyond what sources support, and the strongest empirical plank — measured agent task-success uplift on conformant vs baseline services — is one we will generate ourselves, reproducibly, in Phase 2. Where the dossier marks a source [VENDOR CLAIM] or [TO VERIFY], nothing sponsor-facing relies on it.
