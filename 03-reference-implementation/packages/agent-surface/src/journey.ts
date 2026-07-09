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
 * Journey-state surfaces (Guiderails 2.4.1, 2.4.2) and safe-step
 * declaration (3.4.3). Pure functions over a journey specification and a
 * progress record; the service persists progress, this module derives the
 * machine surface.
 */

export interface StepSpec {
  id: string;
  title: string;
  kind: 'safe' | 'consequential';
  /** Required for consequential steps: the consequential-actions register ID. */
  actionId?: string;
  /** Step IDs that must be complete before this step is available. */
  requires?: string[];
}

export interface JourneySpec {
  id: string;
  title: string;
  steps: StepSpec[];
}

export interface ConsequentialEvent {
  stepId: string;
  actionId: string;
  /** ISO 8601 timestamp. */
  at: string;
  /** The effect's reference identifier (2.4.2). */
  reference: string;
}

export interface JourneyProgress {
  completedSteps: string[];
  consequentialEvents: ConsequentialEvent[];
}

export interface JourneyStateSurface {
  journeyId: string;
  currentStep: string | null;
  remainingSteps: string[];
  prerequisitesUnsatisfied: { step: string; missing: string[] }[];
  consequentialActionOccurred: boolean;
  consequentialEvents: ConsequentialEvent[];
  safeSteps: string[];
}

export class JourneySpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JourneySpecError';
  }
}

export function assertValidJourneySpec(spec: JourneySpec): void {
  const ids = new Set<string>();
  for (const step of spec.steps) {
    if (ids.has(step.id)) throw new JourneySpecError(`duplicate step id "${step.id}" in journey "${spec.id}"`);
    ids.add(step.id);
    if (step.kind === 'consequential' && !step.actionId) {
      throw new JourneySpecError(`consequential step "${step.id}" must name its consequential-actions register entry (actionId)`);
    }
    for (const req of step.requires ?? []) {
      if (!spec.steps.some((s) => s.id === req)) {
        throw new JourneySpecError(`step "${step.id}" requires unknown step "${req}"`);
      }
    }
  }
}

/** Steps declared safe (3.4.3): execution creates no legal or administrative effect. */
export function safeSteps(spec: JourneySpec): string[] {
  return spec.steps.filter((s) => s.kind === 'safe').map((s) => s.id);
}

export function journeyState(spec: JourneySpec, progress: JourneyProgress): JourneyStateSurface {
  assertValidJourneySpec(spec);
  const done = new Set(progress.completedSteps);
  for (const id of done) {
    if (!spec.steps.some((s) => s.id === id)) {
      throw new JourneySpecError(`progress references unknown step "${id}"`);
    }
  }
  const remaining = spec.steps.filter((s) => !done.has(s.id));
  const current = remaining[0] ?? null;
  const unsatisfied = remaining
    .map((s) => ({ step: s.id, missing: (s.requires ?? []).filter((r) => !done.has(r)) }))
    .filter((e) => e.missing.length > 0);
  return {
    journeyId: spec.id,
    currentStep: current ? current.id : null,
    remainingSteps: remaining.map((s) => s.id),
    prerequisitesUnsatisfied: unsatisfied,
    consequentialActionOccurred: progress.consequentialEvents.length > 0,
    consequentialEvents: [...progress.consequentialEvents],
    safeSteps: safeSteps(spec),
  };
}
