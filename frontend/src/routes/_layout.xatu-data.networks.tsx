import { createFileRoute } from '@tanstack/react-router';
import XatuDataNetworks from '@/pages/xatu-data/networks';

export const Route = createFileRoute('/_layout/xatu-data/networks')({
  component: XatuDataNetworks,
});
