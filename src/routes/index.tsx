import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/home';

export const Route = createFileRoute('/')({
  component: IndexPage,
  head: () => ({
    meta: [
      {
        title: import.meta.env.VITE_BASE_TITLE,
      },
      {
        name: 'description',
        content: 'Platform for exploring Ethereum data and network statistics.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: import.meta.env.VITE_BASE_TITLE },
      {
        property: 'og:description',
        content: 'Platform for exploring Ethereum data and network statistics.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/header.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/` },
      { name: 'twitter:title', content: import.meta.env.VITE_BASE_TITLE },
      {
        name: 'twitter:description',
        content: 'Platform for exploring Ethereum data and network statistics.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/header.png`,
      },
    ],
  }),
});
