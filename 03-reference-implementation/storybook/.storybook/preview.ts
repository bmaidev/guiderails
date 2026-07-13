import type { Preview } from '@storybook/react-vite';
import { withGuiderails } from '../../packages/storybook-addon/src/preview.ts';

const preview: Preview = {
  // The guiderails decorator emits the per-story check result for the panel;
  // a11y runs alongside, failing the build on WCAG regressions as before.
  decorators: [withGuiderails],
  parameters: { a11y: { test: 'error' } },
};
export default preview;
