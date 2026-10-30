import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/xatu/nodes';
import { nodesSearchSchema } from '@/pages/xatu/nodes/constants';

export const Route = createFileRoute('/xatu/nodes/')({
  component: IndexPage,
  validateSearch: nodesSearchSchema,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
});
