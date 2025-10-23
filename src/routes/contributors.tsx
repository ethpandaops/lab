import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/contributors')({
  beforeLoad: () => {
    throw redirect({ to: '/xatu/contributors' });
  },
});
