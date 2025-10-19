import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { NavbarOnly } from '@/pages/experiments/NavbarOnly';

export const Route = createFileRoute('/experiments/navbar-only')({
  component: NavbarOnlyPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Navbar Only',
    };
  },
});

function NavbarOnlyPage(): JSX.Element {
  return (
    <Standard showHeader>
      <NavbarOnly />
    </Standard>
  );
}
