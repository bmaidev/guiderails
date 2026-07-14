/*
 * Copyright 2026 Black Mountain AI (BMAI). Apache-2.0.
 *
 * Browser shim for the one `node:crypto` symbol agent-surface uses. Storybook
 * runs on localhost (a secure context), where Web Crypto's crypto.randomUUID()
 * is available — so the same confirmation code runs unchanged in the browser.
 */
export function randomUUID(): string {
  return crypto.randomUUID();
}
