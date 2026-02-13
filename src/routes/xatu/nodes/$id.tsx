import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { DetailPage } from '@/pages/xatu/nodes';

const nodeDetailSearchSchema = z.object({
  t: z.enum(['24h', '7d', '31d']).optional(),
});

export const Route = createFileRoute('/xatu/nodes/$id')({
  component: DetailPage,
  validateSearch: nodeDetailSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: decodeURIComponent(params.id) }),
  }),
  head: ctx => ({
    meta: [
      {
        title: `${decodeURIComponent(ctx.params.id)} | Nodes | ${import.meta.env.VITE_BASE_TITLE}`,
      },
    ],
  }),
});
