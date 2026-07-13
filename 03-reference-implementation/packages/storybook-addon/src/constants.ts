/*
 * Copyright 2026 Black Mountain AI (BMAI). Apache-2.0.
 *
 * Shared ids with NO other imports, so the manager bundle (which needs these
 * constants) does not drag in the preview runtime (checks.ts → agent-surface →
 * node:crypto) that a browser manager cannot bundle.
 */
export const ADDON_ID = 'guiderails';
export const RESULT_EVENT = `${ADDON_ID}/result`;
export const PANEL_ID = `${ADDON_ID}/panel`;
