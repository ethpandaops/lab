import { createFileRoute } from '@tanstack/react-router';
import { Root } from '@/pages/root';

export const Route = createFileRoute('/')({
  component: Root,
  head: () => ({
    meta: [
      { title: 'Lab - Home' },
      { name: 'description', content: 'Welcome to Lab - Ethereum experimentation playground' },
      { property: 'og:title', content: 'Lab - Home' },
      { property: 'og:description', content: 'Welcome to Lab - Ethereum experimentation playground' },
      { property: 'og:url', content: 'https://lab.ethpandaops.io/' },
      { property: 'og:image', content: 'https://lab.ethpandaops.io/og-image.png' },
      { name: 'twitter:title', content: 'Lab - Home' },
      { name: 'twitter:description', content: 'Welcome to Lab - Ethereum experimentation playground' },
      { name: 'twitter:image', content: 'https://lab.ethpandaops.io/og-image.png' },
    ],
    links: [{ rel: 'canonical', href: 'https://lab.ethpandaops.io/' }],
  }),
});
