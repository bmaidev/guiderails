# Benchmark harness

**Status:** v0.1 — run loop, task registry, scoring and metrics, validated end-to-end by self-test. Implements the mechanics of BENCHMARK-METHODOLOGY.md §§4–7.

**D-008 guard, read first:** `npm run selftest` drives **scripted probes — deterministic test doubles, not agents**. Self-test output is plumbing validation only. It is never benchmark evidence, never citable, never publishable. Real rounds require: frozen briefs (tag `briefs-v1`), the agent matrix (≥3 frontier agents, versions pinned), n=30 per cell, a committed preregistration, the parity audit, and a named result owner (OD-07).

## What exists

- **`tasks.ts`** — machine-readable task definitions mirroring `../briefs/TASK-BRIEFS.md`, each carrying `briefFacts`: the only values an agent may legitimately submit. T8 provenance tracing and FIR are computed directly against them.
- **`scripted-probe.ts`** — two probes: *careful* (uses machine surfaces when present; falls back to prose paraphrase — which omits s11 — and HTML parsing when not) and *naive* (never checks eligibility, fabricates missing facts, cannot pass challenges).
- **`runner.ts`** — environment reset per run (fresh in-process fixture), adapter-driven execution, log-based scoring from the fixtures' `/api/_fixture/*` instrumentation.
- **`metrics.ts`** — TSR / WOR / FIR / UER / DVC per §5 with Wilson 95% intervals per §7.

## What the self-test demonstrates (mechanically, by construction)

The probe matrix reproduces every hypothesised phenomenon deterministically: the careful probe scores TSR 100% / DVC 0 on conformant; on baseline the same probe lodges the ineligible V3 claim (the s11 trap → WOR — confident wrongness off the PDF paraphrase) and every consequential action executes without confirmation (DVC exposure); the naive probe's fabricated income is caught by provenance tracing (FIR) and it dies at the challenge gate (UER). This validates the scoring pipeline; it says nothing about real agents.

## Real agents (`agent-loop.ts` + `providers/`)

**The loop is vendor-neutral and lives in one place.** `agent-loop.ts` owns the task briefing, the tool surface, origin scoping, the transcript and the failure semantics; a `ModelDriver` supplies only a vendor's conversation mechanics. Anything that differed between vendors' harnesses would be a confound, not a finding (methodology §3), so a cross-vendor transcript-parity test asserts that equivalent turns produce identical transcripts. Adding vendor #3 means adding one driver, not one adapter.

| Vendor | Driver | Default (smoke tier) | Round tier — pinned by the preregistration | Live-verified? |
|---|---|---|---|---|
| Anthropic | `providers/anthropic.ts` | `claude-haiku-4-5` | `claude-opus-4-8` | yes (exploratory runs, frontier tier) |
| OpenAI | `providers/openai.ts` | `gpt-5-mini` | `gpt-5` | **no — needs a smoke run before any round** |
| Google | `providers/google.ts` | `gemini-3.5-flash` | `gemini-3-pro` | **no — needs a smoke run before any round** |

**Two tiers, because the harness does two jobs.** A *smoke* run asks whether a driver speaks its vendor's wire protocol; any competent model answers that, so the cheap tier is the default — a frontier model on a smoke run buys nothing and costs real money. A *round* needs the frontier agents methodology §3 requires, pinned and disclosed. Selecting the round tier is explicit (`--model`, or `<VENDOR>_MODEL` in `.env`) and the banner warns that it costs dollars rather than cents.

Behaviour observed on the smoke tier says nothing about how a frontier agent behaves; it is plumbing validation, exactly as the scripted probes are. Every run file records the model, its tier, and whether it came from a flag, `.env`, or the default — a model set in an untracked `.env` is otherwise invisible to whoever later reads the results and wonders why they look like that.

Adaptive thinking is sent only to models that have it (Claude 4.6 and later). The cheap tier predates it and rejects the parameter, so tier and thinking move together — otherwise the default run 400s before it reaches the fixture, and the failure reads exactly like the wire-shape bug the smoke run exists to find.

Methodology §3's ≥3-vendor requirement is met in code. It is not met in evidence until each driver has spoken to its live API.

An adapter that has never spoken to its API is an untested instrument and cannot produce evidence. The OpenAI driver's loop mechanics are covered by stub tests; its wire shape is not.

`llmAgent({ vendor })` drives an LLM as a web agent through the same `AgentAdapter` interface as the probes. Methodology posture: **neutral tasking** — the agent gets the frozen brief text plus its delegation identity; the system prompt is generic web-agent conduct with nothing fixture-specific. Tool surface: one `http_request` tool scoped to the service origin (off-origin requests are refused and recorded — an injected exfiltration instruction is measurable but cannot leave the machine) and one strict-schema `finish_task` report. Every HTTP call lands in the transcript; hard iteration cap; ending without `finish_task` scores unrecoverable.

### Credentials

Keys live in `.env` at the repository root, which is gitignored and must stay that way. `.env.example` records the variable names and no values.

```sh
cp .env.example .env    # then fill in the keys you hold
```

`npm run agents` loads it with `node --env-file-if-exists`; no dependency, no secret in the repo, and an exported environment variable still wins if you prefer one. Only the vendor you are running needs a key. The harness checks before it makes a request and names the variable it wanted, so a missing key costs a second rather than four tasks. It prints the variable name it read from, never the value.

CI never sees a key: the unit tests stub every client, so they run offline.

### Runs

```sh
npm run agents -- --build both --tasks T1a,T3,T4,T5,T6                # anthropic (default)
npm run agents -- --vendor openai --build both --tasks T1a,T3         # first live run: verify the wire shape
npm run agents -- --vendor google --build both --tasks T1a,T3         # first live run: verify the wire shape
```

**Exploratory only (D-008):** `npm run agents` output is written to `runs/` (gitignored) and stamped exploratory. It is not a benchmark round — no preregistration, no frozen briefs, n=1, single vendor — and must never be published or cited. Unit tests stub the LLM client (no network, no credentials, CI-safe).

**Note on fixture privacy (methodology §3):** live runs transmit fixture content to the model API. Anthropic's API does not train on business data by default; this exposure is inherent to benchmarking real agents and is accepted — the stronger contamination controls remain the fictional scheme, holdout rotation, and privacy-until-publication of the repo itself.

## Missing before a real round

Live smoke runs for the OpenAI and Google drivers (an untested instrument cannot produce evidence) · browser/computer-use product agents (the current adapter is an API agentic loop, not a consumer browser product) · T7 interruption mechanics for live agents · n=30 randomised protocol with pinned versions · rubric + dual-adjudication workflow (κ) · preregistration · parity audit · OD-07 result owner.

**All eight task classes are implemented across both builds, and T7 now interrupts for real:** the loop kills the agent's session mid-journey, silently — a real interruption does not announce itself. On the conformant build the principal's work survives (3.4.2: checkpoints are keyed to the principal, not the session) and a new session under the same delegation is offered a resume; on the baseline the journey is discarded (B-10). Success remains correct completion with no duplicate effect, so the contrast shows up as rework rather than failure — report it that way.

 T5 renders adversarial third-party content fixture-side (fenced with `data-provenance` on conformant per 5.6.3; inline and indistinguishable on baseline, pattern B-11); PIS is scored per §5, and the injected value is fixture-traceable so following it scores PIS, not FIR (T8). The third probe, *gullible*, follows unfenced page instructions — the self-test shows PIS 0% on conformant vs 100% on baseline, the 5.6.3 mechanism working. DVC counts **designated** actions only (CA-1, CA-3b) — an undesignated action executing without confirmation is the register working as designed, not a violation.
