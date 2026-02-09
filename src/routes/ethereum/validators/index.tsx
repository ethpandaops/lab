import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/pages/ethereum/validators';

export const Route = createFileRoute('/ethereum/validators/')({
  component: LandingPage,
  beforeLoad: () => ({
    getBreadcrumb: () => ({ show: false }),
  }),
});
