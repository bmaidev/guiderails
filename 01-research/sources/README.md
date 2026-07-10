# Source records

**Status: v0.1, 10 July 2026.**

`sources.json` holds one record per source-register ID — 82 of them, `S-01`–`S-69` and `L-01`–`L-13`. It is machine-readable because a project about agent-navigable evidence whose own evidence is only readable by people would refute itself (CLAUDE.md, Dogfooding).

**Records, not copies.** The research protocol permits captured text only where the licence allows redistribution. Nothing is captured here. A record locates a source and states what is known about it; it does not reproduce it.

## The schema, and what `null` means

`null` means **not captured**. It never means *not applicable*.

| Field | Meaning |
|---|---|
| `id` | Register ID. Never reused (prime directive 7). |
| `description` | The register's own Source cell, verbatim and unsplit. |
| `status` | The register's status. Must match the register exactly; a test enforces it. |
| `citedIn` | Which register the ID belongs to. |
| `url` | Canonical locator. **`null` where the register names no path.** A source you cannot open is not a source. |
| `host` | The publisher host, where that is all the register recorded. |
| `accessed` | ISO date the source was opened. |
| `archive` | Web-archive capture. `null` everywhere. |
| `checksum` | SHA-256 of the captured artefact. `null` everywhere: nothing is captured. |
| `licence` | Redistribution terms. `null` means **unknown**, not permissive. |
| `note` | Anything a later reader needs, including known discrepancies. |

## What these records reveal

Writing them down was the point. The register was a table of prose; the records make the gaps countable.

- **82 sources. 20 carry a URL.** The remaining 62 name a publisher, or nothing at all.
- **50 sources read VERIFIED. 31 of those have no URL.** The dossier's own verification key defines VERIFIED as *"primary or official source … accessed on the date in the source register"* — and the register records no per-source access dates, and mostly no locators. Every `accessed` field here defaults to the compilation-pass date because that is the only date that was ever recorded.
- **Nothing is archived, and nothing is checksummed.** The protocol asks for both.

None of this makes the underlying research wrong. It means a reader cannot check it, which under prime directive 1 — *evidence or silence* — is the same problem wearing a better suit.

## The ratchet

`07-governance/log-check` fails the build if:

1. a register ID has no record, or a record has no register ID;
2. a record's `status` disagrees with the register's;
3. the count of **VERIFIED sources without a URL** rises above the number recorded in that test.

That third check is a **ratchet**: the number may only ever go down. It is currently 31. Lowering it means opening the source, recording the locator and the access date, and — where the licence permits — capturing and checksumming it. Nobody has to fix 31 sources today; nobody may add a 32nd.

## Priority order for repayment

Fix the load-bearing ones first. A source is load-bearing if a normative or external-facing claim rests on it:

1. `L-01`–`L-13` — every legal claim, and the §7 cap depends on them.
2. `S-55`–`S-62` — the twelve baseline anti-pattern derivations. These already carry the strongest descriptions; they need locators and dates.
3. `S-35`–`S-47` — the Australian government policy surface.
4. Everything cited in `00-thesis/THESIS.md` or `02-model/MODEL.md`.

Sources whose only role is background colour (`S-01`–`S-15`, the WebMCP explainers, all SECONDARY) can stay as they are. They should never have been the basis of anything, and a test in `log-check` now stops a VERIFIED claim from resting on a source nobody can open.
