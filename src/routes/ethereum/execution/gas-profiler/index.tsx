import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/pages/ethereum/execution/gas-profiler';
import { gasProfilerHomeSearchSchema } from '@/pages/ethereum/execution/gas-profiler/IndexPage.types';

export const Route = createFileRoute('/ethereum/execution/gas-profiler/')({
  component: HomePage,
  validateSearch: gasProfilerHomeSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Gas Profiler | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Analyze transaction gas consumption with call tree visualization, opcode breakdown, and EVM execution profiling',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/gas-profiler` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Gas Profiler | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Analyze transaction gas consumption with call tree visualization, opcode breakdown, and EVM execution profiling',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/gas-profiling.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/gas-profiler` },
      { name: 'twitter:title', content: `Gas Profiler | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Analyze transaction gas consumption with call tree visualization, opcode breakdown, and EVM execution profiling',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/gas-profiling.png`,
      },
    ],
  }),
});
