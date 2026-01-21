import { createFileRoute } from '@tanstack/react-router';
import { BlockPage } from '@/pages/ethereum/execution/gas-profiler';
import { gasProfilerBlockSearchSchema } from '@/pages/ethereum/execution/gas-profiler/IndexPage.types';
import { formatSlot } from '@/utils';

export const Route = createFileRoute('/ethereum/execution/gas-profiler/block/$blockNumber')({
  component: BlockPage,
  validateSearch: gasProfilerBlockSearchSchema,

  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: `Block ${formatSlot(Number(params.blockNumber))}` }),
    redirectOnNetworkChange: '/ethereum/execution/gas-profiler',
  }),

  head: ({ params }) => ({
    meta: [
      { title: `Block ${params.blockNumber} Gas Analysis | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: `Gas analysis for Ethereum block ${params.blockNumber} - view all transactions and their gas consumption`,
      },
      {
        property: 'og:url',
        content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/gas-profiler/block/${params.blockNumber}`,
      },
      { property: 'og:type', content: 'website' },
      {
        property: 'og:title',
        content: `Block ${params.blockNumber} Gas Analysis | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        property: 'og:description',
        content: `Gas analysis for Ethereum block ${params.blockNumber} - view all transactions and their gas consumption`,
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/gas-profiler.png`,
      },
    ],
  }),
});
