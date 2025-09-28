import { createFileRoute, Outlet } from '@tanstack/react-router';
import Layout from '@/components/layout/Layout';

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
});

function LayoutComponent() {
  return <Layout />;
}
