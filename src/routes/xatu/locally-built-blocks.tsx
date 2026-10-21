import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IndexPage } from '@/pages/xatu/locally-built-blocks';

/** `from` is the top slot of the page shown; absent means the latest indexed slots. */
const searchSchema = z.object({
  from: z.coerce.number().int().nonnegative().optional(),
});

export const Route = createFileRoute('/xatu/locally-built-blocks')({
  component: IndexPage,
  validateSearch: searchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Locally Built Blocks' }),
  }),
  head: () => ({
    meta: [
      {
        title: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}`,
      },
      {
        name: 'description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/locally-built-blocks` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/locally-built-blocks.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/locally-built-blocks` },
      { name: 'twitter:title', content: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Track and visualize blocks built locally by Contributoor nodes across the Ethereum network.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/locally-built-blocks.png`,
      },
    ],
  }),
});
