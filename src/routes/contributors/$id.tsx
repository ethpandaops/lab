import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/contributors/$id')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/xatu/contributors/$id', params: { id: params.id } });
  },
});
