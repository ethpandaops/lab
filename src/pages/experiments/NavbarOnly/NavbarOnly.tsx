import { type JSX } from 'react';

export function NavbarOnly(): JSX.Element {
  return (
    <div className="rounded-sm border border-slate-700 bg-slate-800 p-8">
      <h1 className="mb-4 text-4xl font-bold text-white">Navbar Only Demo</h1>
      <p className="mb-6 text-slate-400">Navbar Layout - Has navbar but NO network selector</p>
      <div className="flex flex-col gap-4 text-slate-300">
        <p>This route demonstrates a clean navbar without the network selector.</p>
        <p>Perfect for pages that don&apos;t need network switching functionality.</p>
      </div>
    </div>
  );
}
