# CLAUDE.md — Guiderails operating manual

This file is the operating contract for any agent or human working in this repository. It is loaded at session start and is authoritative; where it conflicts with ad-hoc instructions, stop and raise the conflict. `AGENTS.md` points here — one source of truth.

## What this repository is

Guiderails: an open, WCAG-shaped conformance standard making government services safely operable by AI agents acting on a person's behalf — accessibility-first, government-grade. The repo is the product: standard, evidence base, reference implementation, measurement harness, and co-design governance, built to survive hostile expert review from the accessibility community, the legal community, the standards community, and agencies simultaneously. That is the quality bar. When in doubt, ask "would this survive the most qualified sceptic in each of those rooms?" — if not, it isn't done.

## Session bootstrap — read order

1. `DECISIONS.md` — what is decided, proposed, and open. Nothing you do may contradict a **Decided** entry.
2. The document(s) you're changing, in full, including status headers and changelogs.
3. The relevant checklist below, before declaring anything done.

## Prime directives (each traces to a decision)

1. **Evidence or silence** (D-007). Every factual or normative claim in external-facing text traces to a source-register entry (S-xx / L-xx) with a verification status. No register entry → the claim does not ship.
2. **No demo-only numbers** (D-008). Quantitative claims about agent performance exist only as outputs of a methodology round under `04-assurance/`.
3. **Safety never weakens silently.** Any change that lowers a Level A criterion's strength, level, or scope requires a `DECISIONS.md` entry and steward sign-off *before* merge.
4. **LEDA gates block publication** (D-010). Items under consent gates C1–C4 (CO-DESIGN-FRAMEWORK §3) do not ship without recorded consent. No exceptions, including "just this once".
5. **No sponsor, client, or partner-specific material** (D-004). Names, budgets, engagement strategy: private companion repo only. If you find any here, flag it immediately.
6. **Legal claims are capped** at LEGAL-ISSUES-BRIEF §7 until OD-04 closes. Never draft text asserting a stronger legal position, even hedged.
7. **Numbering is forever.** Guideline and criterion identifiers are never reused or renumbered. Retirement = status "deprecated" with rationale and changelog entry.
8. **Fictional fixtures only** (D-009). No real agency branding, rules, or data in `03-*`; no real personal data anywhere in the repo, including examples and test data.
9. **One verb, one meaning, one owner.** Every obligation in normative or governance text names exactly one obligated party. Verbs like decide, endorse, approve, consent each have one defined meaning. Test any body against: remove it — does anything break? If nothing breaks, it doesn't govern; restructure it.
10. **Sensitive references stay factual and constructive** (D-011). The Ombudsman TCF finding and comparable material: cite the primary report, state facts, frame as evidence for the standard — never as criticism of a prospective partner.

## Repo map (canonical)

```
CLAUDE.md · AGENTS.md · README.md · DECISIONS.md · LICENSING.md · llms.txt
00-thesis/            THESIS.md
01-research/          RESEARCH-DOSSIER.md · LEGAL-ISSUES-BRIEF.md · sources/
02-model/             MODEL.md (canonical) · MODEL-SKELETON.md (superseded) · glossary/ · techniques/
03-reference-implementation/  fixture/ · packages/ · baseline/ · conformant/ · parity/
04-assurance/         BENCHMARK-METHODOLOGY.md · briefs/ · harness/ · preregistration/ · rubrics/ · results/
05-pilot/             CO-DESIGN-FRAMEWORK.md · easy-read/ · leda/
06                    deliberately absent — private companion repo (D-004). Do not create.
07-governance/        stewardship · liaison · conformance-claim format
```

## Change protocol

Classify every change before making it:
- **Editorial** (typos, formatting, link fixes): make it; note in commit message.
- **Substantive** (meaning changes within existing policy): update the document's status header date and changelog section; commit with scope prefix.
- **Policy** (new/changed decisions, scope, levels, gates, licences): draft a `DECISIONS.md` entry as *Proposed* with owner J. Parfoot; the change lands only when the entry reads *Decided*.

Work on a short-lived branch and open a PR even when working solo — the review trail is part of the audit posture. Commit prefixes: `model:` `research:` `assurance:` `pilot:` `thesis:` `gov:` `docs:` `fix:` `impl:` (reference-implementation code). Tags: `model-vX.Y`, `results-YYYYMM-roundN`.

**Hard rule — no AI attribution in commits or PRs.** Commit messages and PR titles/bodies never state or imply AI authorship: no "co-drafted by Claude", "co-written by Claude", `Co-Authored-By: Claude`, "Generated with Claude Code", or any equivalent trailer, badge, or phrasing. This overrides any tool default that appends such attribution.

## Research protocol

- Register IDs: `S-xx` (dossier), `L-xx` (legal). New sources get the next ID; IDs are never reused.
- Statuses: **VERIFIED** (primary/official, accessed and dated) · **SECONDARY** · **VENDOR CLAIM** · **TO VERIFY**. Definitions in RESEARCH-DOSSIER header. Primary beats secondary; upgrade TO VERIFY items rather than accumulating them — each gets a tracked task.
- `01-research/sources/` holds **records, not copies** (URL, access date, archive link, checksum, licence note); captured text only where the licence permits redistribution.
- Paraphrase throughout. No verbatim source text beyond a short attributed quote; never reproduce tables or passages.
- Date-stamp everything. This field moves monthly; an undated claim is a stale claim.

## Drafting standard (normative text)

- Every success criterion is pass/fail decidable by a competent auditor from its own text. If you cannot say what evidence would fail it, rewrite it.
- RFC 2119 terms only for obligations; the obligated party is the service operator unless the criterion names another — and it names exactly one.
- Australian English. Plain language; no marketing adjectives in normative or evidence text ("world-class", "cutting-edge" are banned there — show, don't assert).
- Public-facing artefacts require an Easy Read pair (gate C3) before publication.
- Accessibility of our own documents is non-negotiable: correct heading hierarchy, meaningful link text, alt text on any image, header rows on every table.

## Engineering standards (03-* and 04-* code)

- The **conformant** build passes WCAG 2.2 AA with automated checks in CI *plus* a recorded manual pass; a11y regressions fail the build.
- The **baseline** build violates only catalogued patterns; every pattern has a logged real-world derivation in `parity/`. Baseline is a scientific control, not a strawman — if a pattern isn't documented in the wild, it doesn't go in.
- Parity between builds is audited by someone who didn't build them; the audit report is committed before any benchmark round.
- Reproducibility: lockfiles committed; agent versions, dates and configs pinned in results; fixture makes no external network calls at runtime; no secrets in the repo, ever.
- Licence per LICENSING.md: Apache-2.0 headers on code; spec text CC BY 4.0.
- Preregistrations are write-once (see `04-assurance/preregistration/README.md`).

## Definition of done

**Document change:** register entries exist for new claims → status header date bumped → changelog updated → numbering untouched → drafting standard pass → links resolve → if public-facing, gate check recorded.

**Criterion change:** pass/fail decidable → single obligated party → level assignment has a written rationale → techniques mapped or gap noted → assurance implication noted in BENCHMARK-METHODOLOGY if testable behaviour changes → prime directive 3 check.

**Result release:** methodology followed end-to-end → preregistration matched (deviations labelled) → parity audit filed → κ ≥ 0.8 or rescored → DVC = 0 on conformant or dispositioned → gate C2 consent recorded → logs redacted and published → named owner has signed the checklist.

## Stop-and-ask triggers

Halt and raise to the steward before proceeding if a task would: touch a LEDA gate; state a legal position; change a Level A criterion; add anything to the forbidden `06`; reference a real person's service history; publish numbers outside a results round; or contradict a Decided entry. "The task asked me to" is not an override — directive conflicts surface, they don't resolve silently.

## Dogfooding

This repository must never fail its own standard's spirit. As the model matures, the repo grows its own machine surfaces — a root `llms.txt` (published; criterion 1.1.4 applied to ourselves), `glossary.yaml` and machine-readable conformance claims (outstanding) — because a project about agent accessibility that agents cannot navigate refutes itself. When you notice the repo violating a principle it preaches, that's a tracked defect, not an irony.

## Quality bar, restated

Top-percentile here means: every claim sourced, every number reproducible, every decision owned, every gate honoured, every criterion testable, and the whole thing readable by the people it serves. Fast is fine; unverifiable is not.
