import { useEffect, useRef } from 'react';
import { useRouter, useNavigate } from '@tanstack/react-router';

/**
 * Hook that automatically redirects to a specified path when the network search parameter changes.
 *
 * This is useful for detail pages (slots, epochs, entities) where the route parameter
 * (e.g., slot number) becomes meaningless when switching networks. For example, mainnet
 * slot 9876543 is not the same as holesky slot 9876543.
 *
 * @param redirectPath - The path to redirect to when network changes. If undefined, no redirect occurs.
 *
 * @example
 * ```tsx
 * // In a detail page component
 * export function SlotDetailPage() {
 *   const context = Route.useRouteContext();
 *   useNetworkChangeRedirect(context.redirectOnNetworkChange);
 *   // ... rest of component
 * }
 * ```
 */
export function useNetworkChangeRedirect(redirectPath?: string): void {
  const router = useRouter();
  const navigate = useNavigate({ from: '/' });
  const previousNetworkRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Early return if not opted in
    if (!redirectPath) {
      return;
    }

    // Subscribe to router navigation events to detect network changes
    const unsubscribe = router.subscribe('onBeforeLoad', event => {
      // Extract network param from the location we're navigating to
      const currentNetwork = (event.toLocation.search as Record<string, unknown>)?.network as string | undefined;

      // Check if network changed (including undefined → defined or defined → undefined)
      if (currentNetwork !== previousNetworkRef.current) {
        // Update ref for next comparison
        const previousNetwork = previousNetworkRef.current;
        previousNetworkRef.current = currentNetwork;

        // Only redirect if we had a previous network (skip initial mount)
        if (previousNetwork !== undefined) {
          // Navigate to parent path, preserving the new network param
          navigate({
            to: redirectPath,
            search: { network: currentNetwork },
            replace: true, // Use replace to prevent back button issues
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router, navigate, redirectPath]);
}
