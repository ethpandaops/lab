import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Legacy redirect: /xatu/locally-built-blocks → /ethereum/execution/locally-built-blocks, keeping the search.
 */
export const Route = createFileRoute('/xatu/locally-built-blocks')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/ethereum/execution/locally-built-blocks', search });
  },
});
