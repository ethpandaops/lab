import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { BlockList } from '@/components/BlockList';

function IndexComponent(): JSX.Element {
  return (
    <div className="space-y-12">
      <BlockList />
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: IndexComponent,
});
