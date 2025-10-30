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
        content: 'Experimental platform for exploring Ethereum data and network statistics.',
      },
      {
        property: 'og:image',
        content: '/images/header.png',
      },
      {
        property: 'og:description',
        content: 'Experimental platform for exploring Ethereum data and network statistics.',
      },
      {
        name: 'twitter:image',
        content: '/images/header.png',
      },
      {
        name: 'twitter:description',
        content: 'Experimental platform for exploring Ethereum data and network statistics.',
      },
    ],
  }),
});
