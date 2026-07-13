# Implementation layer — Storybook addon and design-system adapters

**Status: DESIGN, 13 July 2026.** Owner: J. Parfoot. Implements the architecture mandated by **D-013** (design-system-agnostic headless package + Storybook addon + per-system integrations). This document is a *plan*, not a built package; it is written to be handed to technical implementers, and every factual claim about an external tool traces to a source-register entry (S-70–S-115). Several choices it surfaces are steward decisions, listed in §7 and **not** taken here.

This document supersedes the raw workflow draft it was synthesised from; it corrects four things a review of that draft caught (the 5.2.1 scoping, the GOLD status claim, unregistered citations, and the parity-oracle specification), noted inline.

## 0. Ground truth — what already exists in-repo

- `@guiderails/agent-surface` is a **pure-TypeScript, zero-DOM, zero-framework, zero-runtime-dependency** package. It exports `fields`, `journey`, `confirmation`, `accountability`, `idempotency`. A single `FieldSpec` already derives the machine schema (`fieldJsonSchema`/`formJsonSchema`/`stepRequestSchema`), the DOM/ARIA attribute bag (`htmlControl`), and the structured validator (`validateValues`). This is exactly the "one description → many surfaces" convergence the headless-package literature describes (React Aria [S-107], Radix [S-110]).
- The conformant fixture **already consumes** it (`html.ts` → `htmlControl`; `server.ts`/`store.ts` → `authoriseConsequentialAction`, `ConfirmationTokenStore`, `DuplicateGuard`).
- Accessibility is checked today by **jsdom + axe in `node:test`** (`a11y.test.ts`). D-013 names "Playwright + axe-core" — that transition is a decision, not a fait accompli (§7.3).

The headless package D-013 mandates is therefore **not a greenfield build**; it exists, and the work is to add a thin machine/composition layer and the tooling above it.

## 1. The headless package additions

Purely additive to `agent-surface`; existing exports and the fixture's imports are untouched.

- `surface.ts` — `getControlAttributes(field)` (generalises `htmlControl`), `getConfirmationAttributes`, `getJourneyStateAttributes`, and `mergeAgentProps(designSystemProps, agentBag)` — the merge seam adapters use, modelled on React Aria's `mergeProps` (chains handlers, combines ids/classes) [S-109].
- `machine-surface.ts` — `toModelContextTool(step)`: serialise a step's declared tool to the WebMCP/MCP `ModelContextTool` shape (name, title, description, `inputSchema`, annotations) [S-100, S-103]. This is a **visualisation of an existing shape**, not a new format.

## 2. The Storybook addon — `@guiderails/storybook-addon`

Modelled directly on `@storybook/addon-a11y` and `@storybook/test-runner`, the precedents D-013 already cites [S-70, S-76]. **Renderer-agnostic**: it operates on rendered DOM in `#storybook-root` plus a per-story parameter, so it works identically for the fixture's HTML-string stories, AgDS React stories, and (later) Ripple Vue stories. That is what makes "design-system-agnostic" real rather than React-only.

**Per-story config** — a `parameters.guiderails` convention paralleling `parameters.a11y` [S-74, S-75]:

```
parameters.guiderails = {
  fields:   FieldSpec[],
  step?:    StepSpec,
  action?:  ConsequentialActionSpec,
  criteria: string[],                 // P.G.C ids this story claims
  test:     'off' | 'todo' | 'error'  // three-state gate, mirroring parameters.a11y.test
}
```

**(a) The "agent's-eye view" panel.** A `types.PANEL` addon [S-74, S-75]. A preview-side decorator runs after each render, reads `parameters.guiderails`, computes the *expected* agent surface from the core (`toModelContextTool`, `getControlAttributes` per field), extracts the *actual* DOM semantics from `#storybook-root`, and emits a result over the channel. The panel renders the derived `ModelContextTool` descriptor (the JSON Schema an agent would receive), the per-field accessible name / type / constraints / ARIA actually present, and the safe-vs-consequential classification with its confirmation/delegation obligations.

**(b) Per-story criterion checks that fail CI exactly as a11y regressions do.** The same decorator runs the criterion assertions; CI failure comes through `@storybook/test-runner`'s `postVisit` hook, which reads `storyContext.parameters.guiderails` and, when `test === 'error'`, asserts zero parity failures — a failed assertion → non-zero exit → CI failure, byte-for-byte how an axe violation fails today [S-70, S-71]. The `.storybook/test-runner.ts` copies the canonical `axe-playwright` recipe but swaps `checkA11y` for Guiderails criterion assertions keyed to P.G.C ids.

**The parity oracle, specified precisely** (the review found the draft under-specified this). For a story, the check passes iff, for every field in `parameters.guiderails.fields`:
1. the DOM control's resolved **accessible name** (computed per the ARIA accname algorithm from the rendered `#storybook-root`) equals `getControlAttributes(field)`'s expected label;
2. the DOM control's **type/role and required-state** match the attribute bag (`aria-required`, resolved input type / `role`);
3. for a field with constraints, the DOM carries the corresponding constraint attributes (`pattern`, `min`/`max`, `maxlength`) or an equivalent `aria-describedby` statement;
and, once per story, the story's rendered submit contract matches `stepRequestSchema(step)`. Any mismatch is an **agent-legibility regression** and fails the story. The comparison is DOM-vs-spec, not DOM-vs-DOM, so it cannot pass by two wrong surfaces agreeing.

**Which criteria are checkable per component, and which are not** (corrected from the draft):

| Checkable per story (component / declarative) | How the addon checks it |
|---|---|
| 2.2.1 programmatic name/semantics | label bound by `for`/`id`; `aria-required`; resolved type present |
| 2.2.2 structured validation errors | error story: `aria-invalid`, `aria-describedby` → error node, remediation text present (matches `validateValues`) |
| 3.1.1 declared tool inputs | `toModelContextTool().inputSchema` present and consistent with the rendered fields |
| 3.4.3 safe-step declaration | safe/consequential marker matches `step.kind` |

**Service-level — NOT per-story; earned via the conformant server tests, never a component panel:** 5.1.x delegation authorisation, 5.1.4 authority requests, 5.2.1 agent-origination flagging *(its obligated surface is the service's own records, not a UI component — the draft wrongly listed it as component-checkable; corrected here)*, 5.3.2 token issue/redeem, 5.3.3 principal-only refusal, 3.4.1 duplicate protection, 4.x rules provenance, 5.4.x audit, 5.5.2 notification, 1.1.4 discovery.

The addon **advertises this boundary** so a design system cannot over-claim: a green component panel means "this component carries its share of Legible / declarative-Operable", never "this service conforms". The claim is still earned per journey (MODEL.md §4).

**Licence note:** axe-core is MPL-2.0, distinct from the MIT Storybook packages. It is already a devDependency, but *bundling it inside a published addon* is a different act — record it in LICENSING.md before shipping (§7.6).

## 3. The design-system adapter interface

The seam D-013 and the headless literature both describe: **semantics/behaviour below (agent-surface), styling/branding above (the design system).** An adapter is a thin binding, not a fork — it maps a Guiderails spec onto a design system's component props and merges the agent-surface bag in via `mergeAgentProps`. Framework-neutral, so React and Vue are peers:

```
interface GuiderailsAdapter<Props> {
  system: string;
  fieldProps(field: FieldSpec, ctx: RenderCtx): Props;
  confirmationCheckpointProps(action, state): Props;
  delegationStatusProps(surface): Props;
  attributionBadgeProps(attribution): Props;
}
```

The core never imports a design system; adapters are **distribution channels, not dependencies of the core**.

## 4. Recommended first adapter — AgDS

Pick **AgDS** (`@guiderails/adapter-agds`) first, on the evidence:

1. **Right framework and licence.** React + TypeScript, MIT — clean against the Apache-2.0 code posture [S-81, S-83].
2. **Live government context.** Owned by an Australian government department (DAFF), based on GOLD, actively released [S-81, S-85] — exactly Guiderails' deployment context.
3. **A fictional testbed exists.** AgDS ships a `yourgov` example government-service app, usable without touching real agency data (D-009-aligned) [S-79].
4. **A documented human-accessibility baseline.** The independent Intopia Statement of Conformance gives a reference point to build agent-operability *parity* against [S-82].
5. **Storybook is already there** [S-78].

**Architecture constraint:** AgDS is Emotion-styled and provider-coupled (not headless) [S-79, S-80], so the adapter *wraps* AgDS's already-styled components and injects semantics via `mergeAgentProps` onto the element AgDS renders; it cannot compose AgDS as unstyled primitives. Verify the Emotion cache shim before assuming React-19/RSC support [S-80].

**Two governance-load-bearing caveats** (prime directive 1):
- **Do not inherit AgDS's accessibility claim.** Intopia's statement is scoped to sampled design-system pages and makes *consumers* responsible for their own output [S-82]; any "Guiderails + AgDS is accessible" claim needs independent evidence.
- **AgDS is assessed against WCAG 2.1**, while Guiderails is 2.2-shaped [S-82]. There is no published AgDS 2.2 statement; never represent it as 2.2-conformant.

**Second adapter: Ripple** (Victoria's Single Digital Presence), which proves the Vue/framework-neutral claim and is a live real-world target [S-94, S-95]. Constraints to design around: its packages are on GitHub Packages behind a token, npm copies are deprecated, and non-Victorian use is explicitly unsupported [S-96, S-97] — so a Ripple adapter **vendors patterns**, never depends on the published packages at runtime, with Apache-2.0 NOTICE obligations recorded.

**GOLD** is a viable *inert reference* adapter, not a maintained target. The register carries GOLD as the community fork of the retired AuDS (S-51, VERIFIED). This pass adds primary repository evidence — MIT licence [S-90], packages [S-89, S-91], and a most-recent-push observation [S-88, S-92] — indicating **no recent releases**; a secondary source characterises it as dormant [S-93]. Per the research protocol this *upgrades* S-51 with dated primary evidence rather than overriding it; treat GOLD as stable-and-inert, useful precisely because it proves the interface works with no upstream to coordinate. Do not describe GOLD as actively maintained, and do not describe it as dead without the dated primary check on record.

## 5. Layout and dogfooding

```
packages/
  agent-surface/     (EXISTS) + surface.ts, machine-surface.ts
  rules-sspd-2026/   (EXISTS) shared rules — both builds consume (D-013)
  storybook-addon/   (NEW) panel + criterion runner + P.G.C check catalogue
  adapter-agds/      (NEW, first) React binding + stories
  adapter-gold/      (LATER) inert reference adapter
  adapter-ripple/    (LATER) Vue binding, vendored patterns
.storybook/          (NEW) pinned Storybook major; guiderails + a11y addons
```

**The demo and the product are the same artefact.** The fixture already consumes `agent-surface`; the new getters are the same functions generalised, so it keeps consuming the core it did. The fixture's own `html.ts` output mounts as Storybook `html`-renderer stories carrying each step's `FieldSpec[]`/`StepSpec` as `parameters.guiderails`, so the addon runs the *same* parity checks over the *same* HTML the conformant server ships — the fixture dogfoods the addon **without adopting React**. The AgDS adapter then demonstrates the same specs through a real government design system. Baseline untouched; its absence of these surfaces is already catalogued in `parity/`.

## 6. In-repo vs external implementer, and the first PRs

**In-repo (dogfooded by the fixture):** the `agent-surface` additions; the addon; the `.storybook` config and CI job; the fixture's HTML stories; and one reference adapter (AgDS) as existence proof.

**An external implementer builds:** their own `@guiderails/adapter-<system>` against the contract; their component stories carrying `parameters.guiderails`; the wiring of the addon into their Storybook; and — critically — the **service-level conformance the library cannot supply** (rules provenance, delegation authorisation, out-of-band confirmation, duplicate protection, notification). They consume `agent-surface` + `storybook-addon` as published npm packages; they do not fork.

**First three PRs** (short-lived branches, `impl:` prefix, no self-merge):
1. `impl: agent-surface machine + composition layer` — `surface.ts`, `machine-surface.ts`, package build/exports so it is externally installable. Additive; no baseline change.
2. `impl: guiderails Storybook addon + fixture stories` — scaffold the addon against a pinned released Storybook major; `.storybook` config; mount the fixture's HTML as stories; the Playwright test-runner CI job. LICENSING.md: axe-core MPL-2.0 note.
3. `impl: AgDS reference adapter` — `FieldSpec` → AgDS props with `mergeAgentProps`; the three Accountable pattern components; React stories; the two AgDS caveats in the adapter README.

## 7. Open decisions for the steward (candidate DECISIONS entries)

None is settleable by the drafter; each warrants its own entry before the corresponding PR lands.

1. **The `parameters.guiderails.*` convention and per-story P.G.C check semantics** — a design commitment, not upstream Storybook behaviour.
2. **First adapter = AgDS**, with the two caveats (no inherited AA claim; WCAG 2.1 not 2.2) written into the record.
3. **Toolchain transition** from jsdom + axe (`node:test`) to a pinned Storybook major + Playwright test-runner — affects CI, lockfiles, reproducibility. Define the coexistence and retirement of the jsdom harness.
4. **Does the fixture adopt a component framework, or stay HTML-string + `html`-renderer stories?** §5 recommends the latter (dogfood without React); this shapes what "the fixture consumes the packages" means.
5. **Packaging/publication** of `agent-surface` and the addon as built npm packages — the precondition for any external implementer, and it interacts with the fixture's "private until first results" posture and OD-02 (where the standard lives).
6. **Licence hygiene** — axe-core MPL-2.0 bundled in a distributed addon, and vendored Ripple Apache-2.0 patterns, both carry NOTICE obligations distinct from the current devDependency use.
7. **WebMCP as the machine-surface target shape** — an *emerging* standard (W3C Community Group draft + Chrome origin trial [S-100, S-102]), pinned to the 2026-07 draft, with a stated volatility caveat and the declarative-form path still unspecified.

## Sources

Storybook a11y/addon/test-runner: S-70–S-77. AgDS: S-78–S-87. GOLD: S-88–S-93 (with S-51). Ripple: S-94–S-99. WebMCP/MCP/llms.txt/schema.org: S-100–S-106. Headless-package precedents (React Aria, Radix, Headless UI, Ariakit): S-107–S-115. All accessed 2026-07-13; see `../../01-research/RESEARCH-DOSSIER.md` and `../../01-research/sources/sources.json`.
