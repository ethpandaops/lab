import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IndexPage } from '@/pages/ethereum/validators';

const validatorsOverviewSearchSchema = z.object({
  t: z.enum(['30d', '90d', '1y', '2y', 'all']).optional(),
});

export const Route = createFileRoute('/ethereum/validators/')({
  component: IndexPage,
  validateSearch: validatorsOverviewSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
});
