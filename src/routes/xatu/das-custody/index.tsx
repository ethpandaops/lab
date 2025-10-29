import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/das-custody';

export const Route = createFileRoute('/xatu/das-custody/')({
  component: IndexPage,
});
