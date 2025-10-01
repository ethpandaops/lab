import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/beacon/slot/$slot')({
  beforeLoad: ({ params }) => {
    // Redirect to live-slots with the slot in query params
    throw redirect({
      to: '/experiments/live-slots',
      search: {
        slot: parseInt(params.slot),
        mode: 'single',
      },
    });
  },
});
