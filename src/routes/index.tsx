import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/index/IndexPage';

function IndexComponent(): JSX.Element {
  return (
    <div className="space-y-12">
      <IndexPage />
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: IndexComponent,
});
