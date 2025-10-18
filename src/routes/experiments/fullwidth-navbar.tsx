import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { FullWidthNavbar } from '@/pages/experiments/FullWidthNavbar';

export const Route = createFileRoute('/experiments/fullwidth-navbar')({
  component: FullWidthNavbarPage,
});

function FullWidthNavbarPage(): JSX.Element {
  return (
    <Standard showHeader fullWidth>
      <FullWidthNavbar />
    </Standard>
  );
}
