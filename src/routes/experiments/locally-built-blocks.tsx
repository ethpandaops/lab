import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/locally-built-blocks';

export const Route = createFileRoute('/experiments/locally-built-blocks')({
  component: IndexPage,
});
