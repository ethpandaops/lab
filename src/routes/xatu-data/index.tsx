import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { XatuDataPage } from '@/pages/xatu-data';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/xatu-data/')({
  component: XatuDataWithLayout,
});

function XatuDataWithLayout(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <XatuDataPage />
    </Standard>
  );
}
