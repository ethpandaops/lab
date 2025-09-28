import { createFileRoute } from '@tanstack/react-router';
import { SlotLookup } from '@/pages/beacon/slot/index';

export const Route = createFileRoute('/_layout/beacon/slot/')({
  component: SlotLookup,
});
