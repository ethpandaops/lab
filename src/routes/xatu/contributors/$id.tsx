import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/xatu/contributors/';
import { nodesSearchSchema } from '@/pages/xatu/nodes/constants';

export const Route = createFileRoute('/xatu/contributors/$id')({
  component: DetailPage,
  validateSearch: nodesSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: params.id }),
  }),
  head: ctx => ({
    meta: [
      { title: `${ctx.params.id} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: 'Block, head, attestation and data column arrival over time for each of a contributor’s nodes',
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors/${ctx.params.id}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${ctx.params.id} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: 'Block, head, attestation and data column arrival over time for each of a contributor’s nodes',
      },
      { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/contributors.png` },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/xatu/contributors/${ctx.params.id}` },
      { name: 'twitter:title', content: `${ctx.params.id} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: 'Block, head, attestation and data column arrival over time for each of a contributor’s nodes',
      },
      { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/xatu/contributors.png` },
    ],
  }),
});
