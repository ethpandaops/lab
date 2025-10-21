import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/fork-readiness';

export const Route = createFileRoute('/experiments/fork-readiness')({
  component: IndexPage,
});
