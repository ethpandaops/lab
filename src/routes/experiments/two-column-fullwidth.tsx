import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sidebar } from '@/layouts/Sidebar';
import { TwoColumnFullWidth } from '@/pages/experiments/TwoColumnFullWidth';

export const Route = createFileRoute('/experiments/two-column-fullwidth')({
  component: TwoColumnFullWidthPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Two Column Fullwidth',
    };
  },
});

function TwoColumnFullWidthPage(): JSX.Element {
  return (
    <Sidebar fullWidth>
      <TwoColumnFullWidth />
    </Sidebar>
  );
}
