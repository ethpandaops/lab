import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CallPage } from '@/pages/ethereum/execution/gas-profiler';

const callSearchSchema = z.object({
  block: z.coerce.number(),
});

export const Route = createFileRoute('/ethereum/execution/gas-profiler/tx/$txHash_/call/$callId')({
  validateSearch: callSearchSchema,
  component: CallPage,
  head: () => ({
    meta: [
      { title: `Call Details | ${import.meta.env.VITE_BASE_TITLE}` },
      { name: 'description', content: 'Detailed gas analysis for a specific call' },
    ],
  }),
});
