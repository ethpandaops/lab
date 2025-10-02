import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_layout/experiments')({
  component: ExperimentsLayout,
});

function ExperimentsLayout() {
  return <Outlet />;
}
