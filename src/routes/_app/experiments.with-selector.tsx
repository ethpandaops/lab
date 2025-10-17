import { createFileRoute } from '@tanstack/react-router';
import { WithSelectorPage } from '@/pages/experiments';

export const Route = createFileRoute('/_app/experiments/with-selector')({
  component: WithSelectorPage,
  staticData: {
    showNetworkSelector: true,
  },
});
