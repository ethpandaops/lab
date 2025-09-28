import { createFileRoute } from '@tanstack/react-router';
import XatuDataGeographicalChecklist from '@/pages/xatu-data/geographical-checklist';

export const Route = createFileRoute('/_layout/xatu-data/geographical-checklist')({
  component: XatuDataGeographicalChecklist,
});
