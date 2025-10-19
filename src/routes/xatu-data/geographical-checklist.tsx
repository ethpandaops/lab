import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { GeographicalChecklistPage } from '@/pages/xatu-data/GeographicalChecklist';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/xatu-data/geographical-checklist')({
  component: GeographicalChecklistWithLayout,
  beforeLoad: () => {
    return {
      getTitle: () => 'Geographical Checklist',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - Geographical Checklist` }],
  }),
});

function GeographicalChecklistWithLayout(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <GeographicalChecklistPage />
    </Standard>
  );
}
