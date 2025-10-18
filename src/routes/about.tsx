import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AboutPage } from '@/pages/about';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/about')({
  component: AboutWithLayout,
  head: () => ({
    meta: [
      { title: 'Lab - About' },
      { name: 'description', content: 'Learn more about Lab and its features' },
      { property: 'og:title', content: 'Lab - About' },
      { property: 'og:description', content: 'Learn more about Lab and its features' },
      { property: 'og:url', content: 'https://lab.ethpandaops.io/about' },
      { property: 'og:image', content: 'https://lab.ethpandaops.io/og-image.png' },
      { name: 'twitter:title', content: 'Lab - About' },
      { name: 'twitter:description', content: 'Learn more about Lab and its features' },
      { name: 'twitter:image', content: 'https://lab.ethpandaops.io/og-image.png' },
    ],
    links: [{ rel: 'canonical', href: 'https://lab.ethpandaops.io/about' }],
  }),
});

function AboutWithLayout(): JSX.Element {
  return (
    <Standard showHeader>
      <AboutPage />
    </Standard>
  );
}
