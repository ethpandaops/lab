import { createFileRoute } from '@tanstack/react-router';
import { About } from '@/pages/About';

export const Route = createFileRoute('/_layout/about')({
  component: About,
});
