import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Root } from '@/pages/root';
import { Standard } from '@/layouts/Standard';

export const Route = createFileRoute('/')({
  component: RootWithLayout,
});

function RootWithLayout(): JSX.Element {
  return (
    <Standard showBreadcrumbs={false} showNavLinks={false}>
      <Root />
    </Standard>
  );
}
