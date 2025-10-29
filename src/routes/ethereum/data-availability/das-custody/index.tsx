import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/data-availability/das-custody';

export const Route = createFileRoute('/ethereum/data-availability/das-custody/')({
  component: IndexPage,
});
