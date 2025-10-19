import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AboutPage } from '@/pages/about';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/about')({
  component: AboutWithLayout,
  beforeLoad: () => {
    return {
      getTitle: () => 'About',
    };
  },
  head: () => ({
    meta: [{ title: `${import.meta.env.VITE_BASE_TITLE} - About` }],
  }),
});

function AboutWithLayout(): JSX.Element {
  return (
    <Standard showHeader>
      <AboutPage />
    </Standard>
  );
}
