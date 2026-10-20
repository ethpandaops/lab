import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/ethereum/data-availability/partial-columns';
import { partialColumnsSearchSchema } from '@/pages/ethereum/data-availability/partial-columns/IndexPage.types';

export const Route = createFileRoute('/ethereum/data-availability/partial-columns')({
  component: IndexPage,
  validateSearch: partialColumnsSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Partial Columns', clickable: false }),
  }),
  head: () => ({
    meta: [
      { title: `Partial Columns | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content:
          'Gossipsub partial message adoption and how sentry nodes complete PeerDAS data columns: by path, cells from the execution layer, useful cells and timings',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/partial-columns` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Partial Columns | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content:
          'Gossipsub partial message adoption and how sentry nodes complete PeerDAS data columns: by path, cells from the execution layer, useful cells and timings',
      },
      {
        property: 'og:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/data-availability/partial-columns.png`,
      },
      {
        name: 'twitter:url',
        content: `${import.meta.env.VITE_BASE_URL}/ethereum/data-availability/partial-columns`,
      },
      { name: 'twitter:title', content: `Partial Columns | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content:
          'Gossipsub partial message adoption and how sentry nodes complete PeerDAS data columns: by path, cells from the execution layer, useful cells and timings',
      },
      {
        name: 'twitter:image',
        content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/data-availability/partial-columns.png`,
      },
    ],
  }),
});
