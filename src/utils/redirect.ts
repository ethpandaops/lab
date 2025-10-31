import { redirect } from '@tanstack/react-router';

/**
 * Creates a redirect route configuration for legacy URL handling.
 *
 * This utility is used to redirect old routes to their new locations,
 * maintaining backward compatibility while keeping the codebase clean.
 *
 * @param to - The new route path to redirect to
 * @returns A route configuration object with beforeLoad that triggers the redirect
 *
 * @example
 * ```tsx
 * // In a route file (e.g., src/routes/experiments/block-production-flow.tsx)
 * import { createFileRoute } from '@tanstack/react-router';
 * import { createRedirect } from '@/utils/redirect';
 *
 * export const Route = createFileRoute('/experiments/block-production-flow')(
 *   createRedirect('/ethereum/live')
 * );
 * ```
 */
export function createRedirect(to: string): {
  beforeLoad: () => never;
} {
  return {
    beforeLoad: () => {
      throw redirect({ to });
    },
  };
}
