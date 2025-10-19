import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ContributorsPage } from '@/pages/xatu-data/Contributors';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/xatu-data/contributors')({
  component: ContributorsWithLayout,
  beforeLoad: () => {
    return {
      getTitle: () => 'Contributors',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - Contributors` }],
  }),
});

function ContributorsWithLayout(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <ContributorsPage />
    </Standard>
  );
}
