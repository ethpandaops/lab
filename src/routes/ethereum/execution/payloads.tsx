import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/ethereum/execution/payloads')({
  component: Outlet,
  beforeLoad: () => {
    return {
      getTitle: () => 'Payloads',
      getBreadcrumb: () => ({ label: 'Payloads' }),
    };
  },
  head: () => ({
    meta: [
      { title: `Payloads | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Analyze engine_newPayload API calls to identify blocks that took abnormally long to validate',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/payloads` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Payloads | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Analyze engine_newPayload API calls to identify blocks that took abnormally long to validate',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/payloads.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/payloads` },
      { name: 'twitter:title', content: `Payloads | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Analyze engine_newPayload API calls to identify blocks that took abnormally long to validate',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/payloads.png`,
      },
    ],
  }),
});
