import { Outlet, createFileRoute } from '@tanstack/react-router';
import { formatClientName } from '@/utils/graffiti';

export const Route = createFileRoute('/ethereum/clients/$client')({
  component: Outlet,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: formatClientName(params.client) }),
  }),
});
