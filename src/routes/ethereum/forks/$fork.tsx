import { createFileRoute } from '@tanstack/react-router';
import { DetailPage } from '@/pages/ethereum/forks';

/**
 * Format a fork slug for display in breadcrumbs.
 * Handles both regular forks (pectra -> Pectra) and BPOs (bpo1 -> BPO 1)
 */
function formatForkLabel(slug: string): string {
  // Handle BPO slugs (bpo1, bpo2, etc.)
  const bpoMatch = slug.match(/^bpo(\d+)$/i);
  if (bpoMatch) {
    return `BPO ${bpoMatch[1]}`;
  }
  // Regular fork: capitalize first letter
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export const Route = createFileRoute('/ethereum/forks/$fork')({
  component: DetailPage,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: formatForkLabel(params.fork) }),
    redirectOnNetworkChange: '/ethereum/forks',
  }),
  head: ctx => ({
    meta: [
      { title: `${ctx.params.fork} | Forks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: `Detailed information about the ${ctx.params.fork} Ethereum network upgrade including activation epoch, timeline, and related blob schedule changes.`,
      },
      { property: 'og:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/forks/${ctx.params.fork}` },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${ctx.params.fork} | Forks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        property: 'og:description',
        content: `Detailed information about the ${ctx.params.fork} Ethereum network upgrade including activation epoch, timeline, and related blob schedule changes.`,
      },
      { property: 'og:image', content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/forks.png` },
      { name: 'twitter:url', content: `${import.meta.env.VITE_BASE_URL}/ethereum/forks/${ctx.params.fork}` },
      { name: 'twitter:title', content: `${ctx.params.fork} | Forks | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'twitter:description',
        content: `Detailed information about the ${ctx.params.fork} Ethereum network upgrade including activation epoch, timeline, and related blob schedule changes.`,
      },
      { name: 'twitter:image', content: `${import.meta.env.VITE_BASE_URL}/images/ethereum/forks.png` },
    ],
  }),
});
