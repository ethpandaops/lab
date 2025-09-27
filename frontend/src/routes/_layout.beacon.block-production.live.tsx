import { createFileRoute } from '@tanstack/react-router';
import BlockProductionLivePage from '@/pages/beacon/block-production/live';

export const Route = createFileRoute('/_layout/beacon/block-production/live')({
  component: BlockProductionLivePage,
});
