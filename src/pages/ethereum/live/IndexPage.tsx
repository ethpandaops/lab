import { type JSX } from 'react';
import { SlotViewLayout } from './components/SlotViewLayout';
import { DebugProvider } from './providers/DebugProvider';

export interface IndexPageProps {
  mode?: 'live' | 'static';
}

export function IndexPage({ mode = 'live' }: IndexPageProps = {}): JSX.Element {
  return (
    <DebugProvider>
      <SlotViewLayout mode={mode} />
    </DebugProvider>
  );
}
