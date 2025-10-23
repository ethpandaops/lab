import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/experiments/geographical-checklist')({
  beforeLoad: () => {
    throw redirect({ to: '/xatu/geographical-checklist' });
  },
});
