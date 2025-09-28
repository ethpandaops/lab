import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/beacon/block-production/live')({
  component: BlockProductionLiveRedirect,
});

function BlockProductionLiveRedirect() {
  return <Navigate to="/experiments/block-production-flow" replace />;
}
