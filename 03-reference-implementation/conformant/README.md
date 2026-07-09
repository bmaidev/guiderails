# Conformant build — Commonwealth Skills Support Payment (fictional)

**Status:** v0.1 — J1 (Apply) end-to-end. FICTIONAL service (D-009); localhost only; no external network calls; no real personal data.

Both interaction paths run over the same shared modules — `@guiderails/rules-sspd-2026` (rule logic) and `@guiderails/agent-surface` (conformance behaviours) — so the human interface and the machine meaning are projections of one source:

- **Human path:** server-rendered HTML journey at `/journeys/J1/steps/identity` — labelled controls generated from the same FieldSpecs as the tool schemas, error summary with per-control anchors, declared session time limit, redirect flow, confirmation page with claim reference.
- **Discovery (1.1.4):** `/llms.txt` at the root names the service description, the authoritative rules endpoint and every journey's declared-tool schema; every human page carries a `service-desc` link relation in its `<head>` and an RFC 8288 `Link` header. An agent that lands on the human interface can reach the machine surfaces without knowing any path in advance.
- **Agent path:** declared tools at `/api/journeys/J1/steps/{step}` with published schemas (`/api/journeys/J1/schema`), journey-state surface (`/api/journeys/J1/state`), service description (`/.well-known/guiderails.json`), rules endpoint and changelog (`/api/rules/ssp/*`). Consequential submit (CA-1, confirmation-designated) enforces delegation scope, confirmation attribution, duplicate protection and agent attribution.

```sh
npm install
npm test        # 10 end-to-end cases over a live server (node:test + fetch)
npm start       # http://127.0.0.1:3100 — dev delegation DLG-DEV-1 seeded
```

## Criteria exercised by tests

1.1.1/1.1.2/1.1.3/1.1.4/1.2.1/1.3.1 (discovery) · 2.2.1/2.2.2 (semantics, structured errors — includes T2's induced error) · 2.4.1/2.4.2 (state, consequential occurrence) · 2.6.1 (declared time limit) · 3.1.1 (published step schemas) · 3.4.1/3.4.2/3.4.3 (duplicate protection, resumability, safe steps) · 4.1.1/4.2.1/4.5.1/4.5.2 (rules endpoint answers V3 with provenance) · 5.1.1/5.2.1/5.3.1 (legible rejection, attribution, designated confirmation — T6 both directions) · §7 scoring log (field values, tool calls, confirmations, effects, rejections).

## Open items (tracked; the AA claim is not yet made)

| ID | Item |
|---|---|
| OI-1 | Evidence upload is modelled as staged-document selection; real multipart upload handling to follow (FIXTURE-SPEC §4). |
| OI-2 | **Partially closed:** axe-core runs over every J1 page state in CI (jsdom; colour-contrast excluded as jsdom does not render) and violations fail the build. Still open: the recorded manual pass, colour-contrast verification, and a real-browser (Playwright) upgrade — required before any conformance language attaches to this build. |
| OI-3 | WebMCP declarative/imperative surface and `agentInvoked`-class signals — pending primary spec read (RESEARCH-DOSSIER pass 2) and the Storybook addon increment. |
| OI-4 | **Partially closed:** J2 and J3 are implemented on both paths (period surface with timezone semantics per 2.6.2; CA-2 undesignated, CA-3b designated). Still open: delegation issuance/revocation journeys (5.1.2, 5.5.1), audit-record retrieval (5.4.1), notification delivery (5.5.2 — obligation logged, not delivered). |
| OI-5 | Session time limit is declared but not enforced; expiry-warning behaviour to accompany enforcement (2.6.1). |
