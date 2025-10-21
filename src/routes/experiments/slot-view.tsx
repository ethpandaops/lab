import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/slot-view';

export const Route = createFileRoute('/experiments/slot-view')({
  component: IndexPage,
});
