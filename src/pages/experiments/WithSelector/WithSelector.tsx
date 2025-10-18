import { type JSX } from 'react';
import { BlockList } from './components/BlockList';

export function WithSelector(): JSX.Element {
  return (
    <div>
      <div className="mb-8 rounded-sm border border-green-700 bg-slate-800 p-8">
        <h1 className="mb-4 text-4xl font-bold text-green-400">With Selector Demo</h1>
        <p className="mb-6 text-slate-400">Navbar + Network Selector Layout</p>
        <div className="flex flex-col gap-4 text-slate-300">
          <p>This route has both the navbar AND the network selector.</p>
          <p>Perfect for experiments that need network context.</p>
        </div>
      </div>

      <BlockList />
    </div>
  );
}
