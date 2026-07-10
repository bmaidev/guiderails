/*
 * Copyright 2026 Black Mountain AI (BMAI)
 * Licensed under the Apache License, Version 2.0.
 *
 * Generates glossary.yaml from the definitions in MODEL.md §3 and, for the
 * eight terms MODEL.md carries forward by name, MODEL-SKELETON.md §3.
 *
 * The glossary is GENERATED, never hand-edited. A hand-maintained copy of a
 * normative definition is a second source of truth, and the one that drifts is
 * always the copy. `npm test` in 07-governance/log-check regenerates and
 * compares, so a definition changed in MODEL.md without rebuilding fails CI.
 *
 *     node 02-model/glossary/build.mjs          # writes glossary.yaml
 *     node 02-model/glossary/build.mjs --check  # prints it; writes nothing
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** `- **Term** — definition.` — the one shape both documents use. */
function definitions(markdown) {
  const out = new Map();
  for (const m of markdown.matchAll(/^- \*\*(.+?)\*\* — (.+)$/gm)) {
    out.set(m[1].trim(), m[2].trim());
  }
  return out;
}

const model = readFileSync(root + '02-model/MODEL.md', 'utf8');
const skeleton = readFileSync(root + '02-model/MODEL-SKELETON.md', 'utf8');

// §3 only: a criterion's bolded lead-in is not a definition.
const section3 = model.slice(model.indexOf('\n## 3. Definitions'), model.indexOf('\n## 4.'));
const modelDefs = definitions(section3);
const skeletonDefs = definitions(skeleton);

/** MODEL.md §3: "Terms defined in v0.1 carry forward: **x**, **y**, ..." */
const carried = [...(/carry forward: (.+?)\. Added in/s.exec(section3)?.[1] ?? '').matchAll(/\*\*(.+?)\*\*/g)].map(
  (m) => m[1],
);

const terms = [];
for (const term of carried) {
  // Definitions live in the superseded skeleton, capitalised there.
  const key = [...skeletonDefs.keys()].find((k) => k.toLowerCase() === term.toLowerCase());
  if (!key) throw new Error(`MODEL.md carries forward "${term}" but MODEL-SKELETON.md does not define it`);
  terms.push({ term: key, definition: skeletonDefs.get(key), source: 'MODEL-SKELETON.md §3 (carried forward)' });
}
for (const [term, definition] of modelDefs) {
  terms.push({ term, definition, source: 'MODEL.md §3' });
}
terms.sort((a, b) => a.term.localeCompare(b.term));

const esc = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const version = /^\*\*Version ([\d.]+) —/m.exec(model)[1];

const yaml = [
  '# Guiderails glossary — GENERATED, do not edit.',
  '#',
  '# Source of truth: 02-model/MODEL.md §3 (and MODEL-SKELETON.md §3 for the',
  '# eight terms MODEL.md carries forward by name). Rebuild with:',
  '#     node 02-model/glossary/build.mjs',
  '#',
  '# Criterion 2.3 asks services to publish the vocabulary they make people use.',
  '# This is the standard applying that to itself (CLAUDE.md, Dogfooding).',
  '',
  `modelVersion: ${esc(version)}`,
  `termCount: ${terms.length}`,
  'terms:',
  ...terms.flatMap((t) => [
    `  - term: ${esc(t.term)}`,
    `    definition: ${esc(t.definition)}`,
    `    source: ${esc(t.source)}`,
  ]),
  '',
].join('\n');

if (process.argv.includes('--check')) process.stdout.write(yaml);
else {
  writeFileSync(root + '02-model/glossary/glossary.yaml', yaml);
  console.error(`glossary.yaml: ${terms.length} terms, model v${version}`);
}
