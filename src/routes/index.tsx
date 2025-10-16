import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { IndexPage } from '@/pages/index/IndexPage';

function IndexComponent(): JSX.Element {
  return <IndexPage />;
}

export const Route = createFileRoute('/')({
  component: IndexComponent,
});
