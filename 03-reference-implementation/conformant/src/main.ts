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

import { createFixtureServer } from './server.ts';
import { Store } from './store.ts';

const store = new Store();
// Development delegation so the agent path is exercisable locally.
store.addDelegation({
  id: 'DLG-DEV-1',
  principalId: 'P-DEV',
  agentId: 'agent-dev',
  scope: { journeys: ['J1', 'J2', 'J3'], actions: ['CA-1', 'CA-2', 'CA-3a', 'CA-3b'] },
  validFrom: '2026-07-01T00:00:00Z',
  validTo: '2027-07-01T00:00:00Z',
  status: 'active',
});

// The principal's own credential — models their authenticated device/channel.
// The dev agent never receives it, so it can never mint a confirmation (5.3.2).
store.setPrincipalSecret('P-DEV', 'dev-principal-secret');

const port = Number(process.env.PORT ?? 3100);
createFixtureServer(store).listen(port, '127.0.0.1', () => {
  console.log(`Conformant fixture (FICTIONAL, D-009): http://127.0.0.1:${port}/.well-known/guiderails.json`);
});
