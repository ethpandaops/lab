import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/validators')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Validators',
      getBreadcrumb: () => ({ label: 'Validators' }),
    };
  },
  head: () => ({
    meta: [
      {
        title: `Validators | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content:
          'Analyze Ethereum validator performance including attestation correctness, sync committee participation, and balance history.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/validators` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Validators | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Analyze Ethereum validator performance including attestation correctness, sync committee participation, and balance history.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/validators.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/validators` },
      { name: 'twitter:title', content: `Validators | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Analyze Ethereum validator performance including attestation correctness, sync committee participation, and balance history.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/validators.png`,
      },
    ],
  }),
});
