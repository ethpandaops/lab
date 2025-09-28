import { createFileRoute } from '@tanstack/react-router';
import XatuDataContributorsList from '@/pages/xatu-data/ContributorsList';

export const Route = createFileRoute('/_layout/xatu-data/contributors/')({
  component: XatuDataContributorsList,
});
