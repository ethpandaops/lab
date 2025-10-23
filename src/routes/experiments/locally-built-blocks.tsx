import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/experiments/locally-built-blocks')({
  beforeLoad: () => {
    throw redirect({ to: '/xatu/locally-built-blocks' });
  },
});
