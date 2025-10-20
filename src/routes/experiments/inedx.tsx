import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments';

export const Route = createFileRoute('/experiments/inedx')({
  component: IndexPage,
});
