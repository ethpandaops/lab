import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sidebar } from '@/layouts/Sidebar';
import { TwoColumnNavbar } from '@/pages/experiments/TwoColumnNavbar';

export const Route = createFileRoute('/experiments/two-column-navbar')({
  component: TwoColumnNavbarPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Two Column Navbar',
    };
  },
});

function TwoColumnNavbarPage(): JSX.Element {
  return (
    <Sidebar showHeader>
      <TwoColumnNavbar />
    </Sidebar>
  );
}
