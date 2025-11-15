import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/xatu/contributors/';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';

/**
 * Wrapper component to provide SlotPlayer context for contributor detail page.
 * Fetches slot bounds from all three username-enabled tables used by the live metrics charts.
 */
function DetailPageWithSlotPlayer(): JSX.Element {
  return (
    <SlotPlayerProvider
      tables={['fct_block_first_seen_by_node', 'fct_block_blob_first_seen_by_node', 'int_attestation_first_seen']}
      initialMode="continuous"
      initialPlaying={true}
      playbackSpeed={1}
    >
      <DetailPage />
    </SlotPlayerProvider>
  );
}

export const Route = createFileRoute('/xatu/contributors/$id')({
  component: DetailPageWithSlotPlayer,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.id }),
  }),
  head: ctx => ({
    meta: [
      { title: `${ctx.params.id} | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'description', content: 'Detailed contribution metrics and live network performance data' },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors/${ctx.params.id}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${ctx.params.id} | ${import.meta.env.VITE_BASE_TITLE}` },
      { property: 'og:description', content: 'Detailed contribution metrics and live network performance data' },
      { property: 'og:image', content: '/images/xatu/contributors.png' },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors/${ctx.params.id}` },
      { name: 'twitter:title', content: `${ctx.params.id} | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'twitter:description', content: 'Detailed contribution metrics and live network performance data' },
      { name: 'twitter:image', content: '/images/xatu/contributors.png' },
    ],
  }),
});
