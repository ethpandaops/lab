import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/experiments/geographical-checklist';

export const Route = createFileRoute('/experiments/geographical-checklist')({
  component: IndexPage,
});
