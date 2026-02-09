import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IndexPage } from '@/pages/ethereum/validators';

const validatorsSearchSchema = z.object({
  indices: z.string().optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
});

export const Route = createFileRoute('/ethereum/validators/report')({
  component: IndexPage,
  validateSearch: validatorsSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Report' }),
  }),
  head: () => ({
    meta: [
      {
        title: `Validator Report | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content:
          'Analyze Ethereum validator performance including attestation correctness, sync committee participation, and balance history.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/validators/report` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Validator Report | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Analyze Ethereum validator performance including attestation correctness, sync committee participation, and balance history.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/validators.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/validators/report` },
      { name: 'twitter:title', content: `Validator Report | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Analyze Ethereum validator performance including attestation correctness, sync committee participation, and balance history.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/validators.png`,
      },
    ],
  }),
});
