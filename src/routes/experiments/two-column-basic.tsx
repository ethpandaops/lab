import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sidebar } from '@/layouts/Sidebar';

export const Route = createFileRoute('/experiments/two-column-basic')({
  component: TwoColumnBasicPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Two Column Basic',
    };
  },
});

function TwoColumnBasicPage(): JSX.Element {
  return (
    <Sidebar showHeader={false} sidebarPosition="left">
      <Sidebar.Aside>
        <div className="rounded-sm border border-cyan-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-bold text-cyan-400">Sidebar (Left)</h2>
          <div className="flex flex-col gap-3 text-sm/6 text-slate-300">
            <p>This sidebar is on the LEFT.</p>
            <p>Great for navigation, table of contents, or supplementary information.</p>
          </div>
        </div>
      </Sidebar.Aside>

      <Sidebar.Main>
        <div className="rounded-sm border border-cyan-700 bg-slate-800 p-8">
          <h1 className="mb-4 text-4xl font-bold text-cyan-400">Two Column Basic</h1>
          <p className="mb-6 text-slate-400">Main content area</p>
          <div className="flex flex-col gap-4 text-slate-300">
            <p>This is a basic two-column layout without navbar or network selector.</p>
            <p>The sidebar is on the LEFT, main content on the RIGHT.</p>
            <p>Perfect for clean documentation or focused reading experiences.</p>
            <p className="mt-4 rounded-sm border border-cyan-800 bg-slate-900 p-3 text-sm text-cyan-300">
              Now using compound components pattern with Sidebar.Main and Sidebar.Aside slots!
            </p>
          </div>
        </div>
      </Sidebar.Main>
    </Sidebar>
  );
}
