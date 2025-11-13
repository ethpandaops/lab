import type { JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/live';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
import { useNetwork } from '@/hooks/useNetwork';

function LivePage(): JSX.Element {
  const { currentNetwork } = useNetwork();

  // Force remount when network changes to get fresh data for the new network
  return (
    <SlotPlayerProvider
      key={currentNetwork?.name}
      tables={['fct_block_head', 'fct_block_first_seen_by_node', 'fct_attestation_first_seen_chunked_50ms']}
      initialPlaying={true}
    >
      <IndexPage />
    </SlotPlayerProvider>
  );
}

export const Route = createFileRoute('/ethereum/live')({
  component: LivePage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Live', show: false }), // Opt-out of breadcrumbs
  }),
  head: () => ({
    meta: [
      {
        title: `Live | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Live visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/live` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Live | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Live visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
      {
        property: 'og:image',
        content: '/images/ethereum/live.png',
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/live` },
      { name: 'twitter:title', content: `Live | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Live visualization of Ethereum beacon chain slots with detailed block and attestation data.',
      },
      {
        name: 'twitter:image',
        content: '/images/ethereum/live.png',
      },
    ],
  }),
});
