import { createFileRoute } from '@tanstack/react-router';
import XatuData from '@/pages/xatu-data';

export const Route = createFileRoute('/_layout/xatu-data/')({
  component: XatuData,
});
