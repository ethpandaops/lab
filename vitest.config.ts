import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { STORYBOOK_TEST_INITIAL_GLOBALS_PROVIDE_KEY } from '@storybook/addon-vitest/constants';
import { msw } from 'msw/vite';
import path from 'path';

const dirname = import.meta.dirname;

// Each theme with the colour scheme the browser reports under it: star is a dark theme.
const THEMES = [
  { theme: 'light', colorScheme: 'light' },
  { theme: 'dark', colorScheme: 'dark' },
  { theme: 'star', colorScheme: 'dark' },
] as const;

// Package scripts raise VITEST_CHROMIUM_GC_DISK_THRESHOLD_GB so Vitest's
// Linux workaround collects Chromium garbage after each file. Playwright
// stores shared memory in /tmp, which consumes RAM when /tmp is a tmpfs.

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  optimizeDeps: {
    // Found mid-run otherwise, which reloads the browser page under a running test.
    include: ['react-dom/client', 'react/jsx-dev-runtime', 'zod/mini'],
  },
  test: {
    // Bound jsdom workers even on machines with many CPU cores.
    maxWorkers: 4,
    // Vitest stubs CSS imports; the token tests read tokens.css as text (?raw).
    css: { include: [/\/src\/styles\/tokens\.css/] },
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/api/**',
        'src/lab-api/**',
        'src/routeTree.gen.ts',
        'src/test-utils/**',
        'src/design-docs/**',
        'src/styles/**',
        'src/**/*.{test,stories}.{ts,tsx}',
        'src/**/*.d.ts',
      ],
    },
    projects: [
      {
        // Component, hook and utility tests in jsdom.
        extends: true,
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test-utils/setup.ts'],
        },
      },
      {
        // Every story is a test: it must render, pass its play function and
        // have no accessibility violations, in headless Chromium, once under
        // each theme (the theme global; see .storybook/preview.tsx).
        extends: true,
        // No index.html fallback: a story asking for a missing file gets a 404, not the app's
        // page, whose entry pulls every route into the run and can reload the page mid-test.
        appType: 'custom',
        plugins: [
          react(),
          tailwindcss(),
          msw({ mode: 'worker-only' }),
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
            storybookScript: 'pnpm storybook',
            // Stories that animate on a timer forever (setInterval) never settle.
            tags: { exclude: ['test-exclude'] },
          }),
        ],
        test: {
          name: 'storybook',
          // Each theme becomes a project: two pages each, six in total.
          maxWorkers: 2,
          // Finish the jsdom project before opening Chromium pages.
          sequence: { groupOrder: 1 },
          setupFiles: ['./.storybook/vitest-setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            instances: THEMES.map(({ theme, colorScheme }) => ({
              browser: 'chromium' as const,
              name: `storybook:${theme}`,
              provide: { [STORYBOOK_TEST_INITIAL_GLOBALS_PROVIDE_KEY]: { theme } },
              provider: playwright({
                contextOptions: { locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', colorScheme },
              }),
            })),
          },
        },
      },
    ],
  },
});
