import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sidebar } from '@/layouts/Sidebar';

export const Route = createFileRoute('/experiments/sidebar-right')({
  component: SidebarRightPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Sidebar Right',
    };
  },
});

function SidebarRightPage(): JSX.Element {
  return (
    <Sidebar showHeader={false} sidebarPosition="right" fullWidth>
      <Sidebar.Main>
        <div className="rounded-sm border border-indigo-700 bg-card p-8">
          <h1 className="mb-4 text-4xl font-bold text-indigo-400">Sidebar Right Example</h1>
          <p className="mb-6 text-muted">Main content area</p>
          <div className="flex flex-col gap-4 text-secondary">
            <p>This is a two-column layout with the sidebar positioned on the RIGHT.</p>
            <p>The main content is on the LEFT, sidebar on the RIGHT.</p>
            <p>
              This pattern works well for supplementary content, metadata, or contextual information that supports the
              main content.
            </p>
            <div className="mt-4 rounded-sm border border-indigo-800 bg-surface p-4">
              <h3 className="mb-2 font-semibold text-indigo-300">Example Use Cases</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted">
                <li>Article with table of contents on the right</li>
                <li>Dashboard with metrics/stats sidebar</li>
                <li>Documentation with related links panel</li>
                <li>Form with help text and tips</li>
              </ul>
            </div>
          </div>
        </div>
      </Sidebar.Main>

      <Sidebar.Aside>
        <div className="rounded-sm border border-indigo-700 bg-card p-6">
          <h2 className="mb-4 text-xl font-bold text-indigo-400">Sidebar (Right)</h2>
          <div className="flex flex-col gap-3 text-sm/6 text-secondary">
            <p>This sidebar is on the RIGHT.</p>
            <p>Great for supplementary content, metadata, or contextual information.</p>
            <div className="mt-4 rounded-sm border border-indigo-800 bg-surface p-3">
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-indigo-400 uppercase">Quick Stats</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Layout Type:</span>
                  <span className="text-white">Sidebar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Position:</span>
                  <span className="text-white">Right</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Width:</span>
                  <span className="text-white">300px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Sidebar.Aside>
    </Sidebar>
  );
}
