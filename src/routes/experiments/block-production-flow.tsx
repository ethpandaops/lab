import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/block-production-flow';

export const Route = createFileRoute('/experiments/block-production-flow')({
  component: IndexPage,
});
