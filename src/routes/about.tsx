import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AboutPage } from '@/pages/about';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/about')({
  component: AboutWithLayout,
});

function AboutWithLayout(): JSX.Element {
  return (
    <Standard showNavbar>
      <AboutPage />
    </Standard>
  );
}
