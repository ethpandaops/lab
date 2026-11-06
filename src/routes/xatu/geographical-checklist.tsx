import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Legacy redirect: /xatu/geographical-checklist → the Locations card on /xatu/nodes
 */
export const Route = createFileRoute('/xatu/geographical-checklist')({
  beforeLoad: () => {
    throw redirect({ to: '/xatu/nodes', hash: 'locations' });
  },
});
