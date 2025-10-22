import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest config for Storybook tests
 *
 * This is the original working config restored. The storybookTest plugin MUST be
 * at the root plugins level, not nested inside test.projects (known Storybook limitation).
 *
 * For unit tests, see vitest.config.unit.ts
 * Both configs are orchestrated via vitest.workspace.ts
 */
export default defineConfig({
  plugins: [
    react(),
    storybookTest({
      configDir: path.join(__dirname, '.storybook'),
    }),
  ],
  test: {
    name: 'storybook',
    globals: true,
    environment: 'jsdom',
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        {
          browser: 'chromium',
        },
      ],
    },
    setupFiles: ['./.storybook/vitest-setup.ts'],
    // Vitest 3: Explicitly configure fake timers to avoid queueMicrotask OOM issues
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
