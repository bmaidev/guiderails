# @guiderails/agent-surface

The headless behaviour package (DECISIONS.md D-013): framework-free logic for the Guiderails conformance features that components and services wire in. No DOM, no rendering opinions — design-system integrations, the Storybook addon and the fixture's conformant build all consume the same functions.

| Module | Criteria served | What it does |
|---|---|---|
| `fields` | 2.2.1, 2.2.2, 3.1.1 | One `FieldSpec` per control → the declared-tool JSON Schema, the HTML attribute set, and structured validation errors (constraint + accepted remediation). Human interface and machine meaning cannot diverge: both are generated from the same source. |
| `journey` | 2.4.1, 2.4.2, 3.4.3 | Pure state surface over a journey spec and progress record: current step, remaining steps, unsatisfied prerequisites, consequential events with time and reference, declared safe steps. |
| `accountability` | 5.1.1, 5.1.2, 5.2.1, 5.3.1, 5.5.1, 5.5.2 | `authoriseConsequentialAction()` — delegation validity, scope and time-bounds, revocation/suspension, designated-confirmation checkpoints. Every rejection is a stable code plus plain language; every authorisation carries agent attribution and the notification obligation. |
| `idempotency` | 3.4.1 | `DuplicateGuard` — repeat submission creates no additional effect and the response identifies the original. |

```sh
npm install
npm test        # node:test — includes an end-to-end J1 submit integration case
npm run typecheck
```

Runs on Node ≥ 24 (native TypeScript, erasable-syntax-only). No runtime dependencies; no network access. Apache-2.0.
