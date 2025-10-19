import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { WithSelector } from '@/pages/experiments/WithSelector';

export const Route = createFileRoute('/experiments/with-selector')({
  component: WithSelectorPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'With Selector',
    };
  },
});

function WithSelectorPage(): JSX.Element {
  return (
    <Standard fullWidth>
      <WithSelector />
    </Standard>
  );
}
