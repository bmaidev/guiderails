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
 * Confirmation tokens (Guiderails 5.3.2, D-015).
 *
 * A confirmation is only attributable to the principal if the agent could
 * neither mint nor forge it. The service issues a token to the principal
 * through a channel the agent does not control; the agent may present it
 * once, for one action. An interaction inside an agent-driven session — a
 * checkbox, a button — is not a confirmation and can never become one.
 *
 * The token is deliberately opaque and single-use: replay is the obvious
 * attack, and a confirmation that can be replayed confirms nothing.
 */

import { randomUUID } from 'node:crypto';

export interface IssuedConfirmation {
  token: string;
  principalId: string;
  actionId: string;
  /** ISO 8601. */
  issuedAt: string;
  /** ISO 8601; set when redeemed. */
  redeemedAt?: string;
}

export type RedeemFailure =
  | 'CONFIRMATION_UNKNOWN'
  | 'CONFIRMATION_ALREADY_USED'
  | 'CONFIRMATION_EXPIRED'
  | 'CONFIRMATION_ACTION_MISMATCH'
  | 'CONFIRMATION_PRINCIPAL_MISMATCH';

export type RedeemResult = { ok: true } | { ok: false; reason: RedeemFailure };

/** How a confirmation reached the service. Only `principal-channel` counts (5.3.2). */
export type ConfirmationChannel = 'principal-channel' | 'in-session';

export interface RedeemRequest {
  token: string;
  actionId: string;
  principalId: string;
  /** ISO 8601 timestamp of the attempted redemption. */
  at: string;
}

export class ConfirmationTokenStore {
  private readonly issued = new Map<string, IssuedConfirmation>();
  private readonly ttlMs: number;

  constructor(ttlMinutes = 15) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Issue a confirmation to the principal. Callers MUST establish that the
   * requester is the principal — an agent must never reach this.
   */
  issue(principalId: string, actionId: string, at: string): IssuedConfirmation {
    const record: IssuedConfirmation = { token: randomUUID(), principalId, actionId, issuedAt: at };
    this.issued.set(record.token, record);
    return record;
  }

  redeem(req: RedeemRequest): RedeemResult {
    const record = this.issued.get(req.token);
    if (!record) return { ok: false, reason: 'CONFIRMATION_UNKNOWN' };
    if (record.redeemedAt) return { ok: false, reason: 'CONFIRMATION_ALREADY_USED' };
    if (record.actionId !== req.actionId) return { ok: false, reason: 'CONFIRMATION_ACTION_MISMATCH' };
    if (record.principalId !== req.principalId) return { ok: false, reason: 'CONFIRMATION_PRINCIPAL_MISMATCH' };
    if (Date.parse(req.at) - Date.parse(record.issuedAt) > this.ttlMs) {
      return { ok: false, reason: 'CONFIRMATION_EXPIRED' };
    }
    record.redeemedAt = req.at;
    return { ok: true };
  }

  lookup(token: string): IssuedConfirmation | undefined {
    return this.issued.get(token);
  }
}
