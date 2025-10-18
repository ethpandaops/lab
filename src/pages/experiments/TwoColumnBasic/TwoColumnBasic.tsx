import { type JSX } from 'react';

export function TwoColumnBasic(): JSX.Element {
  return (
    <>
      {/* Sidebar column (LEFT side) */}
      <aside className="rounded-sm border border-cyan-700 bg-slate-800 p-6">
        <h2 className="mb-4 text-xl font-bold text-cyan-400">Sidebar (Left)</h2>
        <div className="flex flex-col gap-3 text-sm/6 text-slate-300">
          <p>This sidebar is on the LEFT.</p>
          <p>Great for navigation, table of contents, or supplementary information.</p>
        </div>
      </aside>

      {/* Main column (RIGHT side) */}
      <div className="rounded-sm border border-cyan-700 bg-slate-800 p-8">
        <h1 className="mb-4 text-4xl font-bold text-cyan-400">Two Column Basic</h1>
        <p className="mb-6 text-slate-400">Main content area</p>
        <div className="flex flex-col gap-4 text-slate-300">
          <p>This is a basic two-column layout without navbar or network selector.</p>
          <p>The sidebar is on the LEFT, main content on the RIGHT.</p>
          <p>Perfect for clean documentation or focused reading experiences.</p>
        </div>
      </div>
    </>
  );
}
