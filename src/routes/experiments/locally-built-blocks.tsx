import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { LocallyBuiltBlocks } from '@/pages/experiments/LocallyBuiltBlocks';

export const Route = createFileRoute('/experiments/locally-built-blocks')({
  component: LocallyBuiltBlocksPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Locally Built Blocks',
    };
  },
});

function LocallyBuiltBlocksPage(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <LocallyBuiltBlocks />
    </Standard>
  );
}
