import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IndexPage } from '@/pages/ethereum/validators';

const validatorsSearchSchema = z.object({
  indices: z.string().optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
});

export const Route = createFileRoute('/ethereum/validators/')({
  component: IndexPage,
  validateSearch: validatorsSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
});
