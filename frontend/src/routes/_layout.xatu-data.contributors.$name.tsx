import { createFileRoute } from '@tanstack/react-router';
import XatuDataContributorDetail from '@/pages/xatu-data/ContributorDetail';

export const Route = createFileRoute('/_layout/xatu-data/contributors/$name')({
  component: XatuDataContributorDetail,
});
