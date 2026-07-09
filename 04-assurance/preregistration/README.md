# Preregistrations — write-once policy

**Status:** v0.1, 9 July 2026. Referenced by CLAUDE.md (engineering standards) and BENCHMARK-METHODOLOGY.md §7.

Files in this directory are **write-once**:

1. A preregistration is committed and tagged **before** the first run it governs. It states: hypotheses, design (agents × builds × tasks, n per cell), metrics and their operational definitions, analysis plan, exclusion rules, and the fixture and brief versions it applies to.
2. Once committed, a preregistration is never edited. Corrections and amendments are **new dated files** that reference the original by filename and state what changed and why.
3. Results that deviate from the governing preregistration label each deviation **exploratory** in the published analysis (methodology §7). Undisclosed deviations are a release-blocking defect.
4. Each preregistration names the result owner who signs the release checklist (methodology §12).

Start from [TEMPLATE.md](TEMPLATE.md) — every field must be completed; `TBD` is not a valid value.

Naming: `YYYYMM-roundN-prereg.md`, amendments `YYYYMM-roundN-prereg-amendment-M.md`.
