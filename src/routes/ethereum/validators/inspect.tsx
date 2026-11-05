import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { InspectPage } from '@/pages/ethereum/validators';

const validatorsInspectSearchSchema = z.object({
  // A single index stays a number so the URL keeps `indices=1` rather than the JSON string `indices="1"`
  indices: z
    .union([z.number(), z.string()])
    .transform(v => (/^\d+$/.test(String(v)) ? Number(v) : String(v)))
    .optional(),
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
