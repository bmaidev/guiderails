# @guiderails/storybook-addon

An "agent's-eye view" Storybook panel and **per-story Guiderails criterion checks that fail CI exactly as accessibility regressions do** (D-013, D-021). If a component stops carrying the machine meaning the spec declares, the story that claims that criterion fails the build.

## Two layers, and what is verified

**The check engine is the substance, and it is fully verified.** `checks.ts` is a renderer-agnostic parity oracle: given a rendered DOM root and a story's `parameters.guiderails`, it answers, per claimed criterion, whether the human surface carries the machine meaning the spec derives — comparing **DOM against spec, never DOM against DOM**, so two wrong surfaces agreeing cannot pass. It has no Storybook and no browser dependency, and is tested against the *real HTML the conformant fixture ships*, under jsdom, in the standard `npm test` matrix.

**The Storybook + Playwright wrapper is the delivery vehicle, and is browser/CI-verified.** `manager.tsx` (the panel), `preview.ts` (the decorator), and `test-runner.ts` (the CI gate) depend on the Storybook runtime and Playwright. They are **excluded from the default `npm test`/`typecheck`** — the engine matrix job does not install Storybook — and are exercised only once the `.storybook` app is stood up (`npm run typecheck:storybook` against `tsconfig.storybook.json`, and the test-runner in a browser job).

Crucially, the gate's *logic* is not left unverified: `test-runner.ts` extracts the rendered HTML in Playwright and runs the **same `checkStory` + jsdom path** the pure tests cover — only the Playwright plumbing around it is browser-only. And `fixture.stories.test.ts` runs every fixture story through the engine in Node, reproducing the exact green the browser gate would produce.

| File | Layer | Verified by |
|---|---|---|
| `parameters.ts`, `checks.ts`, `agent-view.ts` | pure engine | `npm test` + `npm run typecheck` (jsdom) ✓ |
| `fixture.stories.ts`, `*.stories.test.ts` | fixture dogfood | `npm test` (jsdom) ✓ |
| `manager.tsx`, `preview.ts`, `test-runner.ts` | Storybook/Playwright wrapper | the browser job, once `.storybook` exists |

## What it checks per story

`2.2.1` (programmatic name, required-state, type), `2.2.2` (structured validation errors — applicable only when an error is rendered), `3.1.1` (the parity oracle: the rendered controls are exactly the declared fields, and the declared tool's `inputSchema` covers them), `3.4.3` (safe/consequential consistency). A story that claims a criterion the engine cannot check **fails** — you may not claim what cannot be verified. Service-level criteria (5.1.x, 5.3.2, 5.4.x, …) are earned by the conformant server tests, not a component panel; the addon advertises this boundary so a design system cannot mistake a green panel for a conforming service.

No axe-core dependency: these are Guiderails-specific structural checks, distinct from the WCAG scan `@storybook/addon-a11y` runs. Use both side by side.

## `parameters.guiderails`

```ts
parameters.guiderails = {
  fields: FieldSpec[],          // the authoritative spec the story renders
  journeyId?, step?, action?,   // for the tool descriptor and 3.4.3
  criteria: string[],           // P.G.C ids this story claims
  test: 'off' | 'todo' | 'error' // three-state gate, mirroring parameters.a11y.test
}
```

## Standing up the browser layer (the remaining engineering task under D-021)

1. Install a pinned released Storybook major + `@storybook/test-runner` + Playwright (see DESIGN §2's version notes; do not use the alpha `next` branch).
2. Register `manager.tsx`; add `withGuiderails` to `.storybook/preview`.
3. Copy `test-runner.ts` to `.storybook/test-runner.ts`.
4. Run `npm playwright install` and add the browser CI job.

This wrapper is committed as source so that step is wiring, not authoring; the engine it wires up already works.
