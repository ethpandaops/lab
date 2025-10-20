import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { ContributoorDetailPage } from '@/pages/contributoor/ContributoorDetailPage';

export const Route = createFileRoute('/contributoor/$id')({
  component: () => (
    <Standard>
      <ContributoorDetailPage />
    </Standard>
  ),
});
