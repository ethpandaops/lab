import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/execution/state-expiry';

export const Route = createFileRoute('/ethereum/execution/state-expiry')({
  component: IndexPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'State Expiry', clickable: false }),
  }),
  head: () => ({
    meta: [
      { title: `State Expiry | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Analyze the impact of state expiry policies on Ethereum storage slots, comparing active slot counts and size savings across different inactivity periods',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/state-expiry` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `State Expiry | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Analyze the impact of state expiry policies on Ethereum storage slots, comparing active slot counts and size savings across different inactivity periods',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/state-expiry.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/state-expiry` },
      { name: 'twitter:title', content: `State Expiry | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Analyze the impact of state expiry policies on Ethereum storage slots, comparing active slot counts and size savings across different inactivity periods',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/state-expiry.png`,
      },
    ],
  }),
});
