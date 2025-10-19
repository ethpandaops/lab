import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { NetworksPage } from '@/pages/xatu-data/Networks';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/xatu-data/networks')({
  component: NetworksWithLayout,
  beforeLoad: () => {
    return {
      getTitle: () => 'Networks',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - Networks` }],
  }),
});

function NetworksWithLayout(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <NetworksPage />
    </Standard>
  );
}
