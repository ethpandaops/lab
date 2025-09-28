import { createFileRoute } from '@tanstack/react-router';
import XatuDataForkReadiness from '@/pages/xatu-data/fork-readiness';

export const Route = createFileRoute('/_layout/xatu-data/fork-readiness')({
  component: XatuDataForkReadiness,
});
