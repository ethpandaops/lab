import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { BlockProductionFlow } from '@/pages/experiments/BlockProductionFlow';

export const Route = createFileRoute('/experiments/block-production-flow')({
  component: BlockProductionFlowPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Block Production Flow',
    };
  },
});

function BlockProductionFlowPage(): JSX.Element {
  return (
    <Standard showNetworkSelector showNetworkSummary fullWidth>
      <BlockProductionFlow />
    </Standard>
  );
}
