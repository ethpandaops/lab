import { createFileRoute } from '@tanstack/react-router';
import { SimulatePage } from '@/pages/ethereum/execution/gas-profiler/SimulatePage';
import { gasProfilerSimulateSearchSchema } from '@/pages/ethereum/execution/gas-profiler/SimulatePage.types';

export const Route = createFileRoute('/ethereum/execution/gas-profiler/simulate')({
  component: SimulatePage,
  validateSearch: gasProfilerSimulateSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Simulate' }),
  }),
  head: () => ({
    meta: [
      { title: `Gas Repricing Simulator | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Simulate how gas repricing would affect historical Ethereum blocks. Test EIP proposals and custom gas schedules.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/gas-profiler/simulate` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Gas Repricing Simulator | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Simulate how gas repricing would affect historical Ethereum blocks. Test EIP proposals and custom gas schedules.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/gas-profiling.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/gas-profiler/simulate` },
      { name: 'twitter:title', content: `Gas Repricing Simulator | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Simulate how gas repricing would affect historical Ethereum blocks. Test EIP proposals and custom gas schedules.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/gas-profiling.png`,
      },
    ],
  }),
});
