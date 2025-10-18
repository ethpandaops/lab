import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Experiments } from '@/pages/experiments';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/experiments/')({
  component: ExperimentsWithLayout,
});

function ExperimentsWithLayout(): JSX.Element {
  return (
    <Standard showHeader showNetworkSelector>
      <Experiments />
    </Standard>
  );
}
