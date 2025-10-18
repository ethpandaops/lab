import { type JSX } from 'react';

export function FullWidthNavbar(): JSX.Element {
  return (
    <div className="rounded-sm border border-blue-700 bg-slate-800 p-8">
      <h1 className="mb-4 text-4xl font-bold text-blue-400">Full Width + Navbar Demo</h1>
      <p className="mb-6 text-slate-400">Full width layout with navbar</p>
      <div className="flex flex-col gap-4 text-slate-300">
        <p>This experiment demonstrates a full-width layout with a navbar.</p>
        <p>Content spans the entire viewport width while maintaining the navbar chrome.</p>
        <p>Perfect for dashboards or data visualization pages.</p>
      </div>
    </div>
  );
}
