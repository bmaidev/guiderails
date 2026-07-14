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
 * The React binding: renders a Guiderails FieldSpec through the real AgDS
 * component the adapter selects — all ten data types. AgDS supplies the
 * government look and the accessible rendering; the adapter supplies the machine
 * meaning. BROWSER-VERIFIED (React + AgDS); the pure mapping is tested under
 * jsdom in `adapter-agds`.
 */

import React from 'react';
import { TextInput } from '@ag.ds-next/react/text-input';
import { Textarea } from '@ag.ds-next/react/textarea';
import { Select } from '@ag.ds-next/react/select';
import { Checkbox } from '@ag.ds-next/react/checkbox';
import { ControlGroup } from '@ag.ds-next/react/control-group';
import { Radio } from '@ag.ds-next/react/radio';
import { DatePicker } from '@ag.ds-next/react/date-picker';
import { FileInput } from '@ag.ds-next/react/file-input';
import type { FieldSpec } from '../../packages/agent-surface/src/index.ts';
import { agdsFieldBinding, type RenderCtxExt } from '../../packages/adapter-agds/src/adapter.ts';

/** Render one Guiderails field through AgDS. AgDS supplies pixels; the adapter supplies the machine meaning. */
export function GuiderailsAgdsField({ field, ctx }: { field: FieldSpec; ctx?: RenderCtxExt }): React.ReactElement {
  const { component, props } = agdsFieldBinding(field, ctx);
  switch (component) {
    case 'Textarea':
      return <Textarea {...(props as React.ComponentProps<typeof Textarea>)} />;
    case 'Select':
      return <Select {...(props as React.ComponentProps<typeof Select>)} />;
    case 'Checkbox':
      return <Checkbox {...(props as React.ComponentProps<typeof Checkbox>)} />;
    case 'DatePicker':
      return <DatePicker {...(props as React.ComponentProps<typeof DatePicker>)} />;
    case 'FileInput':
      return <FileInput {...(props as React.ComponentProps<typeof FileInput>)} />;
    case 'Radio': {
      const { label, hint, required, name, options } = props as {
        label: string; hint?: string; required?: boolean; name: string; options: { label: string; value: string }[];
      };
      return (
        <ControlGroup label={label} hint={hint} required={required} block>
          {options.map((o) => (
            <Radio key={o.value} name={name} value={o.value}>{o.label}</Radio>
          ))}
        </ControlGroup>
      );
    }
    default:
      return <TextInput {...(props as React.ComponentProps<typeof TextInput>)} />;
  }
}

/** Render a step's fields, choosing a radio group for small closed sets so that control is exercised too. */
export function GuiderailsAgdsFields({ fields }: { fields: FieldSpec[] }): React.ReactElement {
  return (
    <>
      {fields.map((f) => {
        const smallEnum = f.dataType === 'enum' && (f.constraints?.enumValues?.length ?? 0) <= 3;
        return <GuiderailsAgdsField key={f.name} field={f} ctx={smallEnum ? { variant: 'radio' } : undefined} />;
      })}
    </>
  );
}
