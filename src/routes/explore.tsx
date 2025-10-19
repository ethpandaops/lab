import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ExplorePage } from '@/pages/explore';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/explore')({
  component: ExploreWithLayout,
  beforeLoad: () => {
    return {
      getTitle: () => 'Explore',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - Explore` }],
  }),
});

function ExploreWithLayout(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <ExplorePage />
    </Standard>
  );
}
