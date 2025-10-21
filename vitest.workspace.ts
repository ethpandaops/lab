import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace for unit tests + Storybook tests
 *
 * NOTE: Workspace files are deprecated in Vitest 3.x, but test.projects has known
 * compatibility issues with @storybook/addon-vitest (see GitHub issue #31689).
 * Using workspace is currently the most reliable approach for running both test types.
 *
 * Run tests:
 * - pnpm test:unit → Only unit tests
 * - pnpm test:storybook → Only Storybook tests
 * - pnpm test → All tests
 */
export default defineWorkspace([
  // Unit tests configuration
  './vitest.config.unit.ts',
  // Storybook tests configuration
  './vitest.config.ts',
]);
