import { Outlet, createFileRoute } from '@tanstack/react-router';
import { countryName } from '@/pages/ethereum/network/utils/network-census';

export const Route = createFileRoute('/ethereum/network/countries/$country')({
  component: Outlet,
  beforeLoad: ({ params }) => ({
    getBreadcrumb: () => ({ label: countryName(params.country) }),
    redirectOnNetworkChange: '/ethereum/network/countries',
  }),
});
