import { createFileRoute } from '@tanstack/react-router';
import { ContractPage } from '@/pages/ethereum/contracts';

export const Route = createFileRoute('/ethereum/contracts/$address')({
  component: ContractPage,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: `${params.address.slice(0, 10)}...` }),
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Contract ${params.address} | ${import.meta.env.VITE_BASE_TITLE}` },
      {
        name: 'description',
        content: `Storage analysis for Ethereum contract ${params.address}`,
      },
    ],
  }),
});
