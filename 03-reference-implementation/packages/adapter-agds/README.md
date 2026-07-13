# @guiderails/adapter-agds

The reference design-system adapter (D-021, DESIGN §4): binds Guiderails field and step specs onto **AgDS** — the Australian Government Agriculture Design System, `@ag.ds-next/react` v1.35.1, MIT (S-78, S-83) — proving that a real government design system is a **distribution channel for Guiderails, not a fork of it**.

## The claim, and how it is verified

An AgDS component rendered through this adapter carries the machine meaning the spec declares, so **the human surface and the agent surface cannot diverge** — both derive from one `FieldSpec`. Two things prove it, and neither needs React or AgDS installed:

1. **The mapping is faithful** — `agdsFieldBinding(field)` produces AgDS props carrying `name`, `type`, `required`, `autocomplete`, a stable `id`, and the label/hint AgDS renders. Pure, tested.
2. **The adapted surface is agent-legible** — the DOM AgDS *documents* it renders from those props passes the **same `storybook-addon` check engine the conformant fixture passes** (2.2.1, 2.2.2, 3.1.1). So an AgDS-rendered Guiderails form is legible by the same oracle, on live design-system software.

| File | Layer | Verified by |
|---|---|---|
| `contract.ts`, `adapter.ts` | pure prop mapping | `npm test` + `typecheck` (jsdom) ✓ |
| `components.tsx`, `agds.stories.tsx` | React + AgDS binding | the AgDS/Storybook toolchain, once installed |

The React layer is behind `tsconfig.react.json` and needs `react` + `@ag.ds-next/react`, which the default matrix does not install. The prop mapping it renders is what the pure tests cover; `components.tsx` is the thin `<TextInput {...props} />` on top.

## How the binding works

AgDS is Emotion-styled and **provider-coupled, not headless** (S-79), so the adapter **wraps** AgDS's own components rather than composing primitives: AgDS supplies the label/hint/required/invalid rendering and the label→control association; the adapter supplies the machine semantics (`name`, `type`, `autoComplete`, `inputMode`) as forwarded native attributes plus a stable `id`. A validation error maps to AgDS's `invalid` + `message`; an enum to `Select` with `options`; a boolean to `Checkbox` (whose label is `children`, not a `label` prop — a real AgDS quirk the mapping handles).

## Two governance caveats (D-021), binding

- **AgDS's accessibility claim is not inherited.** Intopia's Statement of Conformance is scoped to sampled design-system pages and makes consumers responsible for their own output (S-82). "Guiderails + AgDS is accessible" needs independent evidence.
- **AgDS is assessed against WCAG 2.1**, while Guiderails is 2.2-shaped (S-82). Never represent an AgDS-built service as 2.2-conformant.

## Standing up the React layer (remaining work)

Install `react` + `@ag.ds-next/react@1.35.1`, run `npm run typecheck:react`, wire `agds.stories.tsx` into the Storybook app from PR 2, and the addon's per-story checks run over live AgDS renders. The prop surface here is verified against the v1.35.1 types; re-check against the pinned version before shipping.
