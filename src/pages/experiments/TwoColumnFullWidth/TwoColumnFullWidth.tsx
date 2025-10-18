import { type JSX } from 'react';
import { Sidebar } from '@/layouts/Sidebar';

export function TwoColumnFullWidth(): JSX.Element {
  return (
    <>
      {/* Main column - semantic slot auto-wraps with <main> */}
      <Sidebar.Main>
        <div className="rounded-sm border border-orange-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-4xl font-bold text-orange-400">Two Column Full Width</h1>
          <p className="mb-6 text-slate-400">Main content area - full viewport width</p>
          <div className="flex flex-col gap-4 text-slate-300">
            <p>This layout uses two columns that span the full width of the viewport.</p>
            <p>No navbar, no network selector - just pure content.</p>
            <p>Ideal for immersive reading or content-heavy applications.</p>
          </div>
        </div>
      </Sidebar.Main>

      {/* Sidebar column - semantic slot auto-wraps with <aside> */}
      <Sidebar.Aside>
        <div className="rounded-sm border border-orange-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-bold text-orange-400">Sidebar</h2>
          <div className="flex flex-col gap-3 text-sm/6 text-slate-300">
            <p>Full-width sidebar area.</p>
            <p>More breathing room for content and navigation.</p>
          </div>
        </div>
      </Sidebar.Aside>
    </>
  );
}
