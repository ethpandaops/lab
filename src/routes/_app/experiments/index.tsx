import { createFileRoute } from '@tanstack/react-router';
import { ExperimentsPage } from '@/pages/experiments';

export const Route = createFileRoute('/_app/experiments/')({
  component: ExperimentsPage,
  staticData: {
    showNetworkSelector: true,
  },
});
