import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/live-slots';

export const Route = createFileRoute('/experiments/live-slots')({
  component: IndexPage,
});
