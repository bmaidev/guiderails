# Guiderails

**An open standard for agent-accessible government services.**

*Working title — see [DECISIONS.md](DECISIONS.md) D-002.*

---

## What this is

Guiderails is a proposed conformance standard — structured deliberately like WCAG — that defines what a government digital service must do so that AI agents acting **on behalf of a person** can discover it, understand it, operate it, compute its rules, and be held accountable for what they do there.

The name is the argument. Guardrails exist to stop things going wrong; guiderails exist to keep a journey on the path its traveller chose. Every lift runs on guide rails — the machinery that made vertical access universal moves safely because its path is engineered, not guessed. This standard is that engineering for digital services: the person sets the destination, the rails hold their agent to it, and the uplift required (unambiguous semantics, structured actions, computable rules, auditable delegation) supports assistive-technology users first and every user as a consequence.

**Agents are assistive technology.** WCAG's own Robust principle has always required that content be reliably interpretable by a wide variety of user agents, including assistive technologies. AI agents are the newest user agent — and the fastest-adopted assistive technology in history. Nobody has yet written the standard that makes government services work for them safely.

## The gap, precisely

Three regimes exist today in Australia. None covers this.

| Regime | Covers | Doesn't cover |
|---|---|---|
| WCAG 2.2 AA / Digital Experience Policy (DTA, in effect 1 Jan 2025) | Human users, including via assistive technology | Autonomous agents acting for a person |
| DTA Agentic AI addendum to the AI technical standard (4 Jun 2026) | Agentic AI systems **operated by agencies** | Citizen-side agents **arriving at** agency services |
| Emerging agentic-web standards (WebMCP, llms.txt, Arazzo, Web Bot Auth) | Generic technical mechanisms | Government-grade requirements: delegation, determinability of law, contestability, audit |

Guiderails is the missing third leg: the **service-side** standard for **citizen-side** agents, composed from the emerging open standards and hardened with the accountability requirements government uniquely needs.

## The five principles

1. **Discoverable** — the service, its purpose, authority and entry points are machine-findable and identifiable.
2. **Legible** — forms, fields, flows and content carry unambiguous programmatic semantics. WCAG 2.2 AA is a prerequisite, not a parallel track.
3. **Operable** — consequential actions are exposed as declared, schema'd, versioned tools — not pixel targets to be guessed at.
4. **Determinable** — eligibility, entitlement and obligation logic is computable via authoritative rules endpoints with legal provenance, not paraphrased from prose.
5. **Accountable** — agents act only under verifiable, scoped, revocable delegation from a principal; agent actions are flagged, logged, confirmable at consequential steps, and contestable.

Principles 4 and 5 are what make this a *government* standard. Nothing in the commercial agentic-web ecosystem provides them.

See [02-model/MODEL.md](02-model/MODEL.md) for the standard in full: principles → guidelines → testable success criteria → conformance levels (A / AA / AAA) → techniques.

## How conformance is proven

Not by assertion — by measurement. The standard ships with a benchmark harness: the same service journey is built in baseline and conformant versions, a matrix of frontier browser agents runs a defined task suite against both, and we publish task success rate, unrecoverable error rate, fabricated-input rate, wrong-outcome rate, steps and tokens. Assurance methodology is defined in [04-assurance/BENCHMARK-METHODOLOGY.md](04-assurance/BENCHMARK-METHODOLOGY.md).

## Repository map

```
CLAUDE.md                        ← operating manual: how work happens here (authoritative)
AGENTS.md                        ← pointer to CLAUDE.md (one source of truth)
README.md · DECISIONS.md · LICENSING.md
00-thesis/THESIS.md              ← the argument: agents as assistive technology
01-research/RESEARCH-DOSSIER.md  ← evidence base with verification status
01-research/LEGAL-ISSUES-BRIEF.md ← legal issues analysis + questions to counsel
01-research/sources/             ← provenance records (not copies) per register ID
02-model/MODEL.md                ← the standard, v0.2: 5 principles, 24 guidelines, 51 criteria
02-model/MODEL-SKELETON.md       ← v0.1 (superseded, retained for history)
02-model/glossary/ · 02-model/techniques/
03-reference-implementation/     ← (Phase 2) fixture/ baseline/ conformant/ parity/
04-assurance/BENCHMARK-METHODOLOGY.md + preregistration/ rubrics/ results/
05-pilot/CO-DESIGN-FRAMEWORK.md + easy-read/ leda/
06                               ← deliberately absent: sponsor/partner material lives in a
                                    private companion repo (DECISIONS.md D-004); do not create
07-governance/                   ← stewardship, standards liaison, conformance-claim format
```

Sponsor-, client- and partner-specific material is deliberately **not** in this repository (see DECISIONS.md D-004).

## Roadmap

| Phase | Window | Output |
|---|---|---|
| 0 — Seed | Jul 2026 | Thesis, research dossier v0.1, model skeleton v0.1 ✅ |
| 1 — Model | Jul–Aug 2026 | Model v0.2 (51 criteria) ✅ · legal issues brief ✅ (counsel engagement pending, OD-04) · co-design framework ✅ (LEDA recruitment pending) · benchmark methodology ✅ |
| 2 — Proof | Aug–Sep 2026 | Reference implementation (realistic multi-step government journey, baseline + conformant); harness; first published numbers |
| 3 — Exposure | Sep–Oct 2026 | Public v0.9 for comment; sector and standards-community engagement |
| 4 — v1.0 | From Oct 2026 | v1.0 release; pilot delivery with partner agency |

## Governance and licensing

- **Steward:** Black Mountain AI (BMAI), Canberra. Stewardship means maintaining the specification, the assurance method, and the contribution process — not owning conformance.
- **Specification text:** CC BY 4.0 (proposed).
- **Reference implementation and tooling:** Apache-2.0 (proposed).
- **Standards posture:** Guiderails composes with, and profiles, the open agentic-web standards (WebMCP, llms.txt, Arazzo, MCP, Web Bot Auth families). It does not fork them. The intent is that the government-grade layers (Determinable, Accountable) are contributed back toward international standardisation once proven.

## Co-design commitment

Nothing about us without us. The standard's success criteria, the reference implementation and any pilot will be co-designed and tested with people with disability and their representative organisations, alongside assistive-technology users, CALD community members, and people with lived experience of the services in scope. This is a design input, not a consultation checkbox, and it is budgeted as such in any delivery program.

## Status

Pre-alpha. v0.1 seed, 9 July 2026. Everything here is a working draft published for critique. Factual claims trace to [01-research/RESEARCH-DOSSIER.md](01-research/RESEARCH-DOSSIER.md), which flags verification status per source.
