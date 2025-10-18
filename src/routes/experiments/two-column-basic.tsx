import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sidebar } from '@/layouts/Sidebar';
import { TwoColumnBasic } from '@/pages/experiments/TwoColumnBasic';

export const Route = createFileRoute('/experiments/two-column-basic')({
  component: TwoColumnBasicPage,
});

function TwoColumnBasicPage(): JSX.Element {
  return (
    <Sidebar sidebarPosition="left">
      <TwoColumnBasic />
    </Sidebar>
  );
}
