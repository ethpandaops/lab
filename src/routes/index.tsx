import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { BlockList } from '@components/BlockList';

export const Route = createFileRoute('/')({
  component: IndexComponent,
});

function IndexComponent(): JSX.Element {
  return <BlockList />;
}
