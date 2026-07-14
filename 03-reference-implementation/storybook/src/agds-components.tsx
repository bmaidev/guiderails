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
 * The React binding: renders a FieldSpec through the real AgDS component the
 * adapter selects. BROWSER-VERIFIED — depends on react and @ag.ds-next/react,
 * which are not installed in the default matrix (see tsconfig.react.json). The
 * prop mapping it uses (`agdsFieldBinding`) is fully tested under jsdom in
 * `adapter.test.ts`; this file is the thin render on top.
 */

import React from 'react';
import { TextInput } from '@ag.ds-next/react/text-input';
import { Select } from '@ag.ds-next/react/select';
import { Checkbox } from '@ag.ds-next/react/checkbox';
import type { FieldSpec } from '../../packages/agent-surface/src/index.ts';
import { agdsFieldBinding } from '../../packages/adapter-agds/src/adapter.ts';
import type { RenderCtx } from '../../packages/adapter-agds/src/contract.ts';

/** Render one Guiderails field through AgDS. AgDS supplies pixels; the adapter supplies the machine meaning. */
export function GuiderailsAgdsField({ field, ctx }: { field: FieldSpec; ctx?: RenderCtx }): React.ReactElement {
  const { component, props } = agdsFieldBinding(field, ctx);
  switch (component) {
    case 'Select':
      return <Select {...(props as React.ComponentProps<typeof Select>)} />;
    case 'Checkbox':
      return <Checkbox {...(props as React.ComponentProps<typeof Checkbox>)} />;
    default:
      return <TextInput {...(props as React.ComponentProps<typeof TextInput>)} />;
  }
}

/** Render a whole step's fields — the adapter as a distribution channel for a journey. */
export function GuiderailsAgdsFields({ fields }: { fields: FieldSpec[] }): React.ReactElement {
  return (
    <>
      {fields.map((f) => (
        <GuiderailsAgdsField key={f.name} field={f} />
      ))}
    </>
  );
}
