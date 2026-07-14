# Guiderails Storybook app

The **browser layer**, wired and running (D-021). It hosts the AgDS design-system stories, renders them through the real `@ag.ds-next/react` components, and runs the Guiderails per-story criterion gate — the same `checkStory` engine the pure packages verify under jsdom — over the *live browser DOM* via the Playwright test-runner. So the panel and the gate the addon packages describe are no longer "verified in CI later": they build and run here.

## What runs

- `npm run build` — builds the Storybook app (manager + preview). Verifies the config, the addon (`storybook-addon`'s panel), and the AgDS stories all compile.
- `npm run storybook` — the dev server, with the **Agent's-eye view** panel and the axe addon.
- `npm run test-storybook:ci` — builds, serves, and runs the **criterion gate** in Chromium: each story's live DOM is checked against the criteria it claims, failing the build on an agent-legibility regression exactly as an axe violation does.

The GitHub Actions job is `.github/workflows/storybook.yml`, separate from the fast per-package matrix because it installs a browser and the full Storybook toolchain.

## What it shows

Full Guiderails journeys rendered as a real (fictional, D-009) Commonwealth service — the AgDS government header and footer, a left-hand step-progress rail, page heading and intro, and the standard Back/Continue actions. The stories cover **J1 Apply** (identity → circumstances → evidence → submit), **J2** fortnightly report, **J3** payment update, **J4** give-authority, an **error state** with accessible associated messages, and an **Every control** page exercising all ten data types: text, email, phone, date (DatePicker), integer, money, decimal, select, radio, textarea, file and checkbox.

## Verified end to end

This isn't scaffolding. On a real Chromium run, **all eight journey-step stories pass** their claimed criteria rendered through live AgDS components, and a deliberately broken story turns the run **red** — the gate catches real regressions in the browser.

**A real finding the gate surfaced.** AgDS `FileInput` (v1.35.1) renders a button plus a hidden file input and does **not** convey `required`/`aria-required` on the control, so a required file field's required-state is not machine-legible to an agent. The `EveryControl` story marks this `test: 'todo'` — the three-state gate reports it as a warning rather than failing the build — and it is recorded as a tested fact in `adapter-agds`. This is exactly what the gate is for: it found a genuine legibility gap in a real government design system, and named it rather than hiding it.

## Layout

```
.storybook/
  main.ts          react-vite framework; externalises Storybook runtime + aliases node:crypto to a Web-Crypto shim
  manager.ts       registers the guiderails "Agent's-eye view" panel
  preview.ts       adds the guiderails decorator + axe (a11y test: error)
  test-runner.ts   the postVisit gate: extracts each story's rendered HTML and runs checkStory
src/
  agds-components.tsx  the React binding — renders a FieldSpec through AgDS TextInput/Select/Checkbox
  agds.stories.tsx     the AgDS stories carrying parameters.guiderails
node-crypto-shim.ts    crypto.randomUUID() for the browser bundle (Storybook runs on a secure localhost context)
```

The React binding lives **here**, not in `@guiderails/adapter-agds` — that package stays the pure, jsdom-verified prop mapping, and this app is where React and AgDS are installed and where the mapping is rendered for real.

## Pinned versions

Storybook 10.5.0 (the released stable, not the 10.6 alpha the design warned against), `@storybook/test-runner` 0.24.4, React 19.2.7, `@ag.ds-next/react` 1.35.1 (S-116). Re-check before bumping.
