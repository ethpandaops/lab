import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/experiments/fork-readiness')({
  beforeLoad: () => {
    throw redirect({ to: '/xatu/fork-readiness' });
  },
});
