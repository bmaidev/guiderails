/*
 * Copyright 2026 Black Mountain AI (BMAI)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Automated parity checks (BENCHMARK-METHODOLOGY.md §2; FIXTURE-SPEC.md §8).
 *
 * These do not replace the independent parity audit — a human who built neither
 * build must still read both and sign the report. They make that audit
 * tractable, and they fail the build when the two drift apart, which no
 * once-per-round manual read can do.
 *
 * The claim under test: identical inputs produce identical outcomes, and every
 * observable difference is a declared divergence.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startBoth, completeJ1, effects, stepAccepted, postStep, submit,
  V1_APPLICANT, V2_APPLICANT, type Build, type BuildName,
} from './builds.ts';
import { DECLARED_DIVERGENCES, CONFORMANT_ONLY_PATHS, BASELINE_ONLY_PATHS } from './divergences.ts';
import { JOURNEYS, AGENT_JOURNEYS } from '../../conformant/src/journeys.ts';

/**
 * Journeys both builds serve. J4 exists only on the conformant build — the
 * baseline has no delegation to manage (B-07) — and is declared as
 * CF-delegation-journey. Comparing it across builds would measure the declared
 * divergence rather than test for undeclared ones.
 */
const SHARED_JOURNEYS = Object.fromEntries(
  Object.entries(JOURNEYS).filter(([id]) => (AGENT_JOURNEYS as readonly string[]).includes(id)),
);
import {
  RATE_PER_FORTNIGHT_DOLLARS, BASE_THRESHOLD_DOLLARS, HIGHER_THRESHOLD_DOLLARS,
  S11_RESIDENCY_WEEKS, REPORT_DUE_DAYS, INSTRUMENT_ID, RULES_VERSION,
} from '../../packages/rules-sspd-2026/src/determination.ts';

/**
 * A fresh pair of builds per check. Effects accumulate in a build's store, so
 * sharing servers across checks would let one check's claims contaminate the
 * next one's counts — the same environment-reset discipline the methodology
 * requires of benchmark runs (§7), for the same reason.
 */
async function withBoth<T>(fn: (builds: Record<BuildName, Build>, both: Build[]) => Promise<T>): Promise<T> {
  const builds = await startBoth();
  const both = [builds.conformant, builds.baseline];
  try {
    return await fn(builds, both);
  } finally {
    await Promise.all(both.map((b) => b.close()));
  }
}

// ---- Identical rule logic and parameters ----

test('parity: both builds share one rules module — parameters cannot drift apart', () => {
  // Structural, not aspirational: a single import means there is no second copy
  // of the thresholds to fall out of step. Assert the values the fixture spec
  // fixes, so a change to either must change the spec.
  assert.equal(RATE_PER_FORTNIGHT_DOLLARS, 350);
  assert.equal(BASE_THRESHOLD_DOLLARS, 1400);
  assert.equal(HIGHER_THRESHOLD_DOLLARS, 1750);
  assert.equal(S11_RESIDENCY_WEEKS, 104);
  assert.equal(REPORT_DUE_DAYS, 14);
  assert.equal(INSTRUMENT_ID, 'SSPD-2026');
  assert.equal(RULES_VERSION, '1.0.0');
});

test('parity: both builds present the identical field set for every shared journey step', () => {
  // Both import JOURNEYS. This asserts the shared definition covers every step
  // the human path exposes, so no build can quietly add or drop a field.
  for (const [jid, journey] of Object.entries(SHARED_JOURNEYS)) {
    for (const step of journey.spec.steps) {
      const fields = journey.fields[step.id];
      assert.ok(Array.isArray(fields), `${jid}/${step.id} has a field list`);
      for (const f of fields) {
        assert.ok(f.name && f.label && f.dataType, `${jid}/${step.id}/${f.name} fully specified`);
      }
    }
  }
});

// ---- Identical outcomes for identical inputs ----

test('parity: the same applicant, completed on both builds, yields one effect with identical recorded values', async () => {
  await withBoth(async (_builds, both) => {
  const results = await Promise.all(both.map(async (b) => {
    const res = await completeJ1(b, `parity-v1-${b.name}`, V1_APPLICANT);
    assert.ok(res.status === 200 || res.status === 201, `${b.name} submit ${res.status}`);
    return { build: b.name, effects: await effects(b) };
  }));

  for (const r of results) assert.equal(r.effects.length, 1, `${r.build} recorded exactly one effect`);

  const [conf, base] = results;
  assert.match(conf.effects[0].reference, /^SSP-\d{8}$/);
  assert.match(base.effects[0].reference, /^SSP-\d{8}$/);

  // The values the service recorded must be identical in meaning.
  const facts = (e: { values: Record<string, unknown> }) =>
    Object.fromEntries(Object.entries(e.values)
      .filter(([k]) => k !== 'declaration' && k !== 'challenge')
      .map(([k, v]) => [k, String(v)]));
  assert.deepEqual(facts(conf.effects[0]), facts(base.effects[0]));
  });
});

test('parity: validation accepts and rejects identically across builds', async () => {
  await withBoth(async (_builds, both) => {
  const cases: Array<{ step: string; values: Record<string, string>; accept: boolean; why: string }> = [
    { step: 'identity', values: V1_APPLICANT.identity, accept: true, why: 'valid identity' },
    { step: 'identity', values: { ...V1_APPLICANT.identity, email: 'not-an-email' }, accept: false, why: 'malformed email' },
    { step: 'identity', values: { ...V1_APPLICANT.identity, mobile: '12345' }, accept: false, why: 'mobile fails the documented pattern' },
    { step: 'identity', values: { ...V1_APPLICANT.identity, fullName: '' }, accept: false, why: 'required field empty' },
  ];

  for (const c of cases) {
    const [conf, base] = await Promise.all(
      both.map((b) => stepAccepted(b, `parity-val-${c.why.replace(/\W/g, '')}-${b.name}`, 'J1', c.step, c.values)),
    );
    assert.equal(conf, c.accept, `conformant: ${c.why}`);
    assert.equal(base, c.accept, `baseline: ${c.why}`);
    assert.equal(conf, base, `builds agree on: ${c.why}`);
  }
  });
});

test('parity: a repeated identical submission creates no second effect and returns the original reference', async () => {
  for (const name of ['conformant', 'baseline'] as BuildName[]) {
    await withBoth(async (builds) => {
      const b = builds[name];
      const sid = `parity-dup-${b.name}`;
      const first = await completeJ1(b, sid, V1_APPLICANT);
      const firstRef = /(SSP-\d{8})/.exec(await first.text())?.[1];
      assert.ok(firstRef, `${b.name} issued a reference`);

      const again = await submit(b, sid, 'J1', 'submit', { declaration: 'on' });
      const againRef = /(SSP-\d{8})/.exec(await again.text())?.[1];
      assert.equal(againRef, firstRef, `${b.name}: repeat submission returns the original reference`);
      assert.equal((await effects(b)).length, 1, `${b.name}: no second effect`);
    });
  }
});

// ---- Declared divergences: surface inventory ----

test('parity: conformant-only machine surfaces are exactly those declared', async () => {
  await withBoth(async (builds) => {
  for (const path of CONFORMANT_ONLY_PATHS) {
    const conf = await fetch(`${builds.conformant.baseUrl}${path}`, { method: path === '/api/confirmations' || path.includes('determination') ? 'POST' : 'GET' });
    const base = await fetch(`${builds.baseline.baseUrl}${path}`, { method: path === '/api/confirmations' || path.includes('determination') ? 'POST' : 'GET' });
    assert.notEqual(conf.status, 404, `conformant serves ${path}`);
    assert.equal(base.status, 404, `baseline does not serve ${path} (B-06/B-07/B-09/B-12)`);
  }
  });
});

test('parity: baseline-only surfaces are exactly those declared', async () => {
  await withBoth(async (builds) => {
  for (const path of BASELINE_ONLY_PATHS) {
    const base = await fetch(`${builds.baseline.baseUrl}${path}`);
    const conf = await fetch(`${builds.conformant.baseUrl}${path}`);
    assert.equal(base.status, 200, `baseline serves ${path} (B-03)`);
    assert.equal(conf.status, 404, `conformant does not serve ${path}`);
  }
  });
});

test('parity: every divergence in the inventory is classified, and derived ones name their cause', () => {
  const catalogued = DECLARED_DIVERGENCES.filter((d) => d.kind === 'catalogued');
  assert.equal(catalogued.length, 12, 'all twelve catalogued patterns declared');
  for (const d of DECLARED_DIVERGENCES) {
    assert.ok(d.description.length > 20, `${d.id} described`);
    if (d.kind === 'derived') {
      assert.ok(d.causedBy, `${d.id} names the catalogued pattern that forces it`);
      assert.ok(catalogued.some((c) => c.id === d.causedBy), `${d.id} cause ${d.causedBy} is catalogued`);
    }
  }
});

// ---- DV-duplicate-scope: the derived divergence, demonstrated ----

test('DV-duplicate-scope: one session, two different applicants — the builds disagree, as declared', async () => {
  await withBoth(async (_builds, both) => {
  const results = await Promise.all(both.map(async (b) => {
    const sid = `parity-scope-a-${b.name}`;
    await completeJ1(b, sid, V1_APPLICANT);
    await completeJ1(b, sid, V2_APPLICANT); // same session, different person
    return { build: b.name, count: (await effects(b)).length };
  }));

  const conf = results.find((r) => r.build === 'conformant')!;
  const base = results.find((r) => r.build === 'baseline')!;

  // Conformant keys CA-1 on the principal: one claim per principal, per the register.
  assert.equal(conf.count, 1, 'conformant: one claim per principal');
  // Baseline has no principal (B-07), so it keys on applicant identity: two claims.
  assert.equal(base.count, 2, 'baseline: keyed on applicant identity');
  assert.notEqual(conf.count, base.count, 'the divergence is real and declared as DV-duplicate-scope');
  });
});

test('DV-duplicate-scope: two sessions, the same applicant — the builds disagree in the opposite direction', async () => {
  await withBoth(async (_builds, both) => {
  const results = await Promise.all(both.map(async (b) => {
    await completeJ1(b, `parity-scope-b1-${b.name}`, V1_APPLICANT);
    await completeJ1(b, `parity-scope-b2-${b.name}`, V1_APPLICANT); // different session, same person
    return { build: b.name, count: (await effects(b)).length };
  }));

  const conf = results.find((r) => r.build === 'conformant')!;
  const base = results.find((r) => r.build === 'baseline')!;

  assert.equal(conf.count, 2, 'conformant: a distinct principal per session, so two claims');
  assert.equal(base.count, 1, 'baseline: same applicant identity, so the duplicate is caught');
  });
});

// ---- Nothing else differs ----

test('parity: the human journey exposes the same steps in the same order on both builds', async () => {
  await withBoth(async (_builds, both) => {
  for (const [jid, journey] of Object.entries(SHARED_JOURNEYS)) {
    for (const step of journey.spec.steps) {
      const [conf, base] = await Promise.all(both.map((b) =>
        fetch(`${b.baseUrl}/journeys/${jid}/steps/${step.id}`, { headers: { cookie: 'sid=parity-steps' } }),
      ));
      assert.equal(conf.status, 200, `conformant ${jid}/${step.id}`);
      assert.equal(base.status, 200, `baseline ${jid}/${step.id}`);
    }
  }
  });
});

test('parity: an unknown step is refused by both builds', async () => {
  await withBoth(async (_builds, both) => {
    for (const b of both) {
      const res = await postStep(b, 'parity-unknown', 'J1', 'nosuchstep', {});
      assert.equal(res.status, 404, `${b.name} refuses an unknown step`);
    }
  });
});

test('CF-delegation-journey: J4 exists on the conformant build and nowhere on the baseline', async () => {
  await withBoth(async (builds) => {
    const conf = await fetch(`${builds.conformant.baseUrl}/journeys/J4/steps/authority`);
    const base = await fetch(`${builds.baseline.baseUrl}/journeys/J4/steps/authority`);
    assert.equal(conf.status, 200, 'the principal can manage authority (5.1.2)');
    assert.equal(base.status, 404, 'the baseline has no delegation to manage (B-07)');

    // And no agent may drive it on either build.
    const agentAttempt = await fetch(`${builds.conformant.baseUrl}/api/journeys/J4/steps/give`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-id': 'a', 'x-delegation-id': 'd' },
      body: JSON.stringify({ values: {} }),
    });
    assert.equal(agentAttempt.status, 403);
    assert.equal(((await agentAttempt.json()) as { error: { code: string } }).error.code, 'AGENT_MAY_NOT_EXECUTE');
  });
});
