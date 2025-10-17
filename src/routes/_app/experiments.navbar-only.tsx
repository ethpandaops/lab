import { createFileRoute } from '@tanstack/react-router';
import { NavbarOnlyPage } from '@/pages/experiments';

export const Route = createFileRoute('/_app/experiments/navbar-only')({
  component: NavbarOnlyPage,
});
