import { type JSX } from 'react';
import { NavbarLayout } from '@/layouts';
import { NetworkSelector } from '@/components/NetworkSelector';
import { BlockList } from './components/BlockList';

export function WithSelector(): JSX.Element {
  return (
    <NavbarLayout
      rightContent={
        <div className="w-48">
          <NetworkSelector showLabel={false} />
        </div>
      }
    >
      <div>
        <div className="mb-8 rounded-lg border border-green-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-4xl font-bold text-green-400">With Selector Demo</h1>
          <p className="mb-6 text-slate-400">Navbar + Network Selector Layout</p>
          <div className="space-y-4 text-slate-300">
            <p>This route has both the navbar AND the network selector.</p>
            <p>Perfect for experiments that need network context.</p>
          </div>
        </div>

        <BlockList />
      </div>
    </NavbarLayout>
  );
}
