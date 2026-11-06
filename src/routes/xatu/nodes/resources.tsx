import { createFileRoute } from '@tanstack/react-router';
import { ResourcesPage } from '@/pages/xatu/nodes';
import { nodeResourcesSearchSchema } from '@/pages/xatu/nodes/constants';

export const Route = createFileRoute('/xatu/nodes/resources')({
  component: ResourcesPage,
  validateSearch: nodeResourcesSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ label: 'Resources' }),
  }),
  head: () => ({
    meta: [
      { title: `Xatu node resources | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'CPU, memory, disk and network use of Xatu nodes’ client processes around one slot.',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes/resources` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `Xatu node resources | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'CPU, memory, disk and network use of Xatu nodes’ client processes around one slot.',
      },
      { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/nodes/resources` },
      { name: 'twitter:title', content: `Xatu node resources | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'CPU, memory, disk and network use of Xatu nodes’ client processes around one slot.',
      },
      { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/nodes.png` },
    ],
  }),
});
