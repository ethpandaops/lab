import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ContributorDetailPage } from '@/pages/xatu-data/ContributorDetail';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/xatu-data/contributors/$id')({
  component: ContributorDetailWithLayout,
  beforeLoad: () => {
    return {
      getTitle: () => 'Contributor Detail',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - Contributor Detail` }],
  }),
});

function ContributorDetailWithLayout(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <ContributorDetailPage />
    </Standard>
  );
}
