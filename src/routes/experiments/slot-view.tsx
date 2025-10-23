import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/experiments/slot-view')({
  beforeLoad: () => {
    throw redirect({ to: '/ethereum/slot-view' });
  },
});
