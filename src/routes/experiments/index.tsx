import { createFileRoute } from '@tanstack/react-router';
import { Experiments } from '@/pages/experiments';

export const Route = createFileRoute('/experiments/')({
  component: Experiments,
  staticData: {
    showNetworkSelector: true,
  },
});
