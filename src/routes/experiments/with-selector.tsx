import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { WithSelector } from '@/pages/experiments/WithSelector';

export const Route = createFileRoute('/experiments/with-selector')({
  component: WithSelectorPage,
});

function WithSelectorPage(): JSX.Element {
  return (
    <Standard showHeader showNetworkSelector>
      <WithSelector />
    </Standard>
  );
}
