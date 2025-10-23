import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/contributors';

export const Route = createFileRoute('/contributors/')({
  component: IndexPage,
});
