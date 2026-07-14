import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  async viteFinal(cfg) {
    // storybook/preview-api and manager-api are Storybook runtime externals,
    // provided at runtime, not bundled. A local (source) addon that imports them
    // must have them externalised or Vite tries to resolve them at build time.
    cfg.build = cfg.build ?? {};
    const externals = ['storybook/preview-api', 'storybook/manager-api', 'storybook/internal/components'];
    const prev = (cfg.build as { rollupOptions?: { external?: unknown } }).rollupOptions?.external;
    (cfg.build as { rollupOptions?: { external?: unknown } }).rollupOptions = {
      ...(cfg.build as { rollupOptions?: Record<string, unknown> }).rollupOptions,
      external: Array.isArray(prev) ? [...prev, ...externals] : externals,
    };
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = { ...(cfg.resolve.alias as Record<string, string> | undefined), 'node:crypto': new URL('../node-crypto-shim.ts', import.meta.url).pathname };
    cfg.optimizeDeps = { ...cfg.optimizeDeps, exclude: [...(cfg.optimizeDeps?.exclude ?? []), ...externals] };
    return cfg;
  },
};
export default config;
