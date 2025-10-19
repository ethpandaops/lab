import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ForkReadinessPage } from '@/pages/xatu-data/ForkReadiness';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/xatu-data/fork-readiness')({
  component: ForkReadinessWithLayout,
  beforeLoad: () => {
    return {
      getTitle: () => 'Fork Readiness',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - Fork Readiness` }],
  }),
});

function ForkReadinessWithLayout(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <ForkReadinessPage />
    </Standard>
  );
}
