import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/contributors';

export const Route = createFileRoute('/xatu/contributors/')({
  component: IndexPage,
});
