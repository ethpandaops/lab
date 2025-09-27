import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import BlockProductionSlotPage from '@/pages/beacon/block-production/slot';

const searchSchema = z.object({
  time: z.string().optional(),
  t: z.string().optional(),
});

export const Route = createFileRoute('/_layout/beacon/block-production/$slot')({
  validateSearch: searchSchema,
  component: BlockProductionSlotPage,
});