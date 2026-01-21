import { createFileRoute } from '@tanstack/react-router';
import { TransactionPage } from '@/pages/ethereum/execution/gas-profiler';
import { gasProfilerTxSearchSchema } from '@/pages/ethereum/execution/gas-profiler/IndexPage.types';

export const Route = createFileRoute('/ethereum/execution/gas-profiler/tx/$txHash')({
  component: TransactionPage,
  validateSearch: gasProfilerTxSearchSchema,

  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: `${params.txHash.slice(0, 10)}...` }),
    redirectOnNetworkChange: '/ethereum/execution/gas-profiler',
  }),

  head: ({ params }) => ({
    meta: [
      { title: `TX ${params.txHash.slice(0, 10)}... Gas Analysis | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: `Detailed gas analysis for Ethereum transaction ${params.txHash} - call tree, opcode breakdown, and gas flow visualization`,
      },
      {
        property: 'og:url',
        content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/gas-profiler/tx/${params.txHash}`,
      },
      { property: 'og:type', content: 'website' },
      {
        property: 'og:title',
        content: `TX ${params.txHash.slice(0, 10)}... Gas Analysis | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        property: 'og:description',
        content: `Detailed gas analysis for Ethereum transaction ${params.txHash} - call tree, opcode breakdown, and gas flow visualization`,
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/gas-profiler.png`,
      },
    ],
  }),
});
