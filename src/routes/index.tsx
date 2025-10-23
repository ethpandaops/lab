import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/home';

export const Route = createFileRoute('/')({
  component: IndexPage,
});
