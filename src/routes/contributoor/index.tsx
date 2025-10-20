import { createFileRoute } from '@tanstack/react-router';
import { Standard } from '@/layouts/Standard';
import { ContributoorsPage } from '@/pages/contributoor/ContributoorsPage';

export const Route = createFileRoute('/contributoor/')({
  component: () => (
    <Standard showHeader>
      <ContributoorsPage />
    </Standard>
  ),
});
