import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Legacy redirect: /xatu/contributors/$id → /xatu/nodes filtered to that contributor
 */
export const Route = createFileRoute('/xatu/contributors/$id')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/xatu/nodes', search: { contributor: params.id } });
  },
});
