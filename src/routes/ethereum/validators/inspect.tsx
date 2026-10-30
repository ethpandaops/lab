import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InspectPage } from '@/pages/ethereum/validators';

const validatorsInspectSearchSchema = z.object({
  indices: z.coerce.string().optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
});

export const Route = createFileRoute('/ethereum/validators/inspect')({
  component: InspectPage,
  validateSearch: validatorsInspectSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Inspect', clickable: false }),
  }),
});
