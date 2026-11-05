import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/locally-built-blocks';
import { locallyBuiltBlocksSearchSchema } from '@/pages/xatu/locally-built-blocks/IndexPage.types';

export const Route = createFileRoute('/xatu/locally-built-blocks')({
  component: IndexPage,
  validateSearch: locallyBuiltBlocksSearchSchema,
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
        content: 'Blocks built locally by ethPandaOps sentry nodes.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/locally-built-blocks` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Blocks built locally by ethPandaOps sentry nodes.',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/locally-built-blocks.png`,
      },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/locally-built-blocks` },
      { name: 'twitter:title', content: `Locally Built Blocks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Blocks built locally by ethPandaOps sentry nodes.',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/xatu/locally-built-blocks.png`,
      },
    ],
  }),
});
