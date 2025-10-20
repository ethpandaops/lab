import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/networks';

export const Route = createFileRoute('/experiments/networks')({
  component: IndexPage,
});
