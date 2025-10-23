import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/contributors/';

export const Route = createFileRoute('/contributors/$id')({
  component: DetailPage,
});
