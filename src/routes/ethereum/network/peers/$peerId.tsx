import { createFileRoute } from '@tanstack/react-router';
import { PeerPage } from '@/pages/ethereum/network';
import { networkSearchSchema } from '@/pages/ethereum/network/constants';
import { shortPeerId } from '@/pages/ethereum/network/utils/network-peers';

const DESCRIPTION =
  'One Ethereum consensus peer each day: its client, where it runs, how it connects and how it keeps up';

export const Route = createFileRoute('/ethereum/network/peers/$peerId')({
  component: PeerPage,
  validateSearch: networkSearchSchema,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: shortPeerId(params.peerId) }),
    redirectOnNetworkChange: '/ethereum/network',
  }),
  head: ctx => {
    const title = `Peer ${shortPeerId(ctx.params.peerId)} | ${import.meta.env.VITE_BASE_TITLE}`;
    const url = `${import.meta.env.VITE_BASE_URL}/ethereum/network/peers/${ctx.params.peerId}`;
    return {
      meta: [
        { title },
        { name: 'description', content: DESCRIPTION },
        { property: 'og:url', content: url },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: DESCRIPTION },
        { name: 'twitter:url', content: url },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: DESCRIPTION },
      ],
    };
  },
});
