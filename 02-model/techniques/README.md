# Techniques

**Status: v0.1, 10 July 2026.** `techniques.json` is **generated**. Rebuild with `node 02-model/techniques/build.mjs`.

CLAUDE.md's definition of done for a criterion change requires *"techniques mapped or gap noted"*. Nothing checked that, and no techniques directory existed. This makes the mapping machine-readable and the gaps countable.

## What counts as a technique here

Not prose. The strongest technique evidence this repository holds is the conformant build: where the reference implementation cites a criterion in the code or the test that enforces it, **that citation is the technique**. It is demonstrated, it runs in CI on every pull request, and it cannot be asserted without also being shipped. Those mappings are derived from the source, never written by hand — so a technique cannot be claimed for a criterion no code implements.

Everything else is recorded as a gap, with the principle's own candidate techniques attached where MODEL.md publishes them.

## Where the standard stands against itself

| | |
|---|---|
| Criteria | 55 |
| Demonstrated by the reference implementation | 35 |
| Gaps | 20 |

Gaps by principle: **1 —** 1.4.1, 1.4.2, 1.5.1 · **2 —** 2.2.3, 2.3.1, 2.3.2, 2.5.1, 2.5.2 · **3 —** 3.1.2, 3.2.1, 3.3.1, 3.3.2, 3.5.1, 3.5.2 · **4 —** 4.1.2, 4.3.1, 4.4.2, 4.4.3 · **5 —** 5.5.3, 5.6.1

Two observations worth stating plainly rather than burying.

**Principle 1 publishes no `*Techniques:*` line at all.** Principles 2 through 5 each carry one; Discoverable does not. That is a defect in MODEL.md, not in this directory, and it is noted here rather than papered over by inventing techniques.

**The gaps cluster where they should worry us.** 3.3.1 and 3.3.2 (challenge and rate-limit relief for authorised agents) interact with fraud-control obligations and are analysed in the legal issues brief; 4.x carries the determination-explainability criteria; 5.5.3 and 5.6.1 are review-before-execute and equitable service levels. These are not obscure AAA corners. A criterion nothing implements is a criterion nobody has yet had to make true — which is exactly the condition under which six criteria have already turned out to be present in the specification and absent in effect.

A gap is not a failure. It is an unpaid claim, recorded where a reviewer can find it.

## The rules

- **Never hand-edit `techniques.json`.** `07-governance/log-check` regenerates it and compares; a stale file fails CI.
- **Every criterion appears exactly once**, with either at least one demonstration or a stated gap. That is the definition of done, checked.
- To close a gap, implement the criterion and cite it in the code that does. The generator will find it. There is deliberately no way to close a gap by writing prose.
