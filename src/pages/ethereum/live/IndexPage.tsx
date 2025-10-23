import { type JSX } from 'react';
import { SlotViewLayout } from './components/SlotViewLayout';

export interface IndexPageProps {
  mode?: 'live' | 'static';
}

export function IndexPage({ mode = 'live' }: IndexPageProps = {}): JSX.Element {
  return <SlotViewLayout mode={mode} />;
}
