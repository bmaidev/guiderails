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

## Missing before a real round

Agent adapters for browser/computer-use agents · T5 mechanics (requires the fixture to grow its third-party/injected-content surface — 5.6.3 on conformant, raw on baseline) · n=30 randomised protocol with pinned versions · rubric + dual-adjudication workflow (κ) · preregistration.

T1a–T1c, T2 (induced errors + correction), T3, T4, T6 and T7 (interruption/resume) are implemented across both builds. DVC counts **designated** actions only (CA-1, CA-3b) — an undesignated action executing without confirmation is the register working as designed, not a violation.
