import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/execution/slow-blocks';
import { slowBlocksSearchSchema } from '@/pages/ethereum/execution/slow-blocks/IndexPage.types';

export const Route = createFileRoute('/ethereum/execution/slow-blocks/')({
  component: IndexPage,
  validateSearch: slowBlocksSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
  head: () => ({
    meta: [
      { title: `Slow Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Analyze slow engine_newPayload API calls to identify blocks that took abnormally long to validate',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/slow-blocks` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Slow Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Analyze slow engine_newPayload API calls to identify blocks that took abnormally long to validate',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/slow-blocks.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/execution/slow-blocks` },
      { name: 'twitter:title', content: `Slow Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Analyze slow engine_newPayload API calls to identify blocks that took abnormally long to validate',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/execution/slow-blocks.png`,
      },
    ],
  }),
});
