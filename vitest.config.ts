import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest v4 config for Storybook tests
 *
 * The storybookTest plugin MUST be at the root plugins level, and when used,
 * it affects the entire config. Therefore, we need separate configs for unit
 * and storybook tests in Vitest v4.
 *
 * Run via: pnpm test:storybook or pnpm test (default)
 * For unit tests, see vitest.config.unit.ts
 */
export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: path.join(__dirname, '.storybook'),
      tags: {
        exclude: ['test-exclude'], // Exclude stories with test-exclude tag (e.g., Interactive stories with setInterval)
      },
    }),
  ],
  test: {
    name: 'storybook',
    globals: true,
    environment: 'jsdom',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        {
          browser: 'chromium',
        },
      ],
    },
    setupFiles: ['./.storybook/vitest-setup.ts'],
    // Vitest 4: Explicitly configure fake timers to avoid queueMicrotask OOM issues
    // See: https://github.com/vitest-dev/vitest/issues/7288
    fakeTimers: {
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'Date'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@api': path.resolve(__dirname, './src/api'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  optimizeDeps: {
    include: ['react-dom/client', 'zod/mini'],
  },
});
