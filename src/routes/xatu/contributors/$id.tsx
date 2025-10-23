import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/xatu/contributors/';

export const Route = createFileRoute('/xatu/contributors/$id')({
  component: DetailPage,
});
