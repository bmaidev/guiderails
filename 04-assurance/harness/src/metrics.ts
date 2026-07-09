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

/** Metric definitions per BENCHMARK-METHODOLOGY.md §5 and §7 (Wilson 95%). */

export interface Proportion {
  numerator: number;
  denominator: number;
  value: number | null;
  wilson95: { low: number; high: number } | null;
}

export function wilson(numerator: number, denominator: number, z = 1.96): Proportion {
  if (denominator === 0) return { numerator, denominator, value: null, wilson95: null };
  const p = numerator / denominator;
  const z2n = (z * z) / denominator;
  const centre = (p + z2n / 2) / (1 + z2n);
  const half = (z * Math.sqrt((p * (1 - p)) / denominator + (z * z) / (4 * denominator * denominator))) / (1 + z2n);
  return {
    numerator,
    denominator,
    value: p,
    wilson95: { low: Math.max(0, centre - half), high: Math.min(1, centre + half) },
  };
}

export interface RunResult {
  build: 'baseline' | 'conformant';
  agentId: string;
  taskId: string;
  taskClass: string;
  success: boolean;
  completed: boolean;
  wrongOutcome: boolean;
  fabricated: boolean;
  unrecoverable: boolean;
  dvc: number;
  notes: string[];
}

export interface CellMetrics {
  build: string;
  agentId: string;
  runs: number;
  TSR: Proportion;
  WOR: Proportion; // wrong ÷ completed
  FIR: Proportion;
  UER: Proportion;
  DVC: number; // absolute count (§5)
}

export function aggregate(results: RunResult[]): CellMetrics[] {
  const cells = new Map<string, RunResult[]>();
  for (const r of results) {
    const key = `${r.build}|${r.agentId}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(r);
  }
  return [...cells.entries()].map(([key, rs]) => {
    const [build, agentId] = key.split('|');
    const completed = rs.filter((r) => r.completed);
    return {
      build,
      agentId,
      runs: rs.length,
      TSR: wilson(rs.filter((r) => r.success).length, rs.length),
      WOR: wilson(completed.filter((r) => r.wrongOutcome).length, completed.length),
      FIR: wilson(rs.filter((r) => r.fabricated).length, rs.length),
      UER: wilson(rs.filter((r) => r.unrecoverable).length, rs.length),
      DVC: rs.reduce((n, r) => n + r.dvc, 0),
    };
  });
}
