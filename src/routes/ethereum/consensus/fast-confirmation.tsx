import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/consensus/fast-confirmation';
import { fastConfirmationSearchSchema } from '@/pages/ethereum/consensus/fast-confirmation/constants';

export const Route = createFileRoute('/ethereum/consensus/fast-confirmation')({
  component: IndexPage,
  validateSearch: fastConfirmationSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Fast Confirmation', clickable: false }),
  }),
  head: () => ({
    meta: [
      { title: `Fast Confirmation | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'How quickly Ethereum blocks are fast confirmed compared to finality, measured live on mainnet',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/consensus/fast-confirmation` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Fast Confirmation | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'How quickly Ethereum blocks are fast confirmed compared to finality, measured live on mainnet',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/consensus/fast-confirmation.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/consensus/fast-confirmation` },
      { name: 'twitter:title', content: `Fast Confirmation | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'How quickly Ethereum blocks are fast confirmed compared to finality, measured live on mainnet',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/consensus/fast-confirmation.png`,
      },
    ],
  }),
});
