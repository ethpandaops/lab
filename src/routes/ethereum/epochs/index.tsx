import { createFileRoute } from '@tanstack/react-router';

import { IndexPage } from '@/pages/ethereum/epochs';

export const Route = createFileRoute('/ethereum/epochs/')({
  component: IndexPage,
  head: () => ({
    meta: [
      { title: `Epochs | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Explore Ethereum beacon chain epochs. View recent epoch data and dive into detailed epoch analytics.',
      },
      { property: 'og:image', content: '/images/ethereum/epochs.png' },
      {
        property: 'og:description',
        content: 'Explore Ethereum beacon chain epochs. View recent epoch data and dive into detailed epoch analytics.',
      },
      { name: 'twitter:image', content: '/images/ethereum/epochs.png' },
      {
        name: 'twitter:description',
        content: 'Explore Ethereum beacon chain epochs. View recent epoch data and dive into detailed epoch analytics.',
      },
    ],
  }),
});
