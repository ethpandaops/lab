import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IndexPage } from '@/pages/xatu/nodes';

const nodesSearchSchema = z.object({
  t: z.enum(['24h', '7d', '31d']).optional(),
});

export const Route = createFileRoute('/xatu/nodes/')({
  component: IndexPage,
  validateSearch: nodesSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Overview' }),
  }),
});
