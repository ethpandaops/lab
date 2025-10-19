import { type JSX } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Sidebar } from '@/layouts/Sidebar';

export const Route = createFileRoute('/experiments/two-column-fullwidth')({
  component: TwoColumnFullWidthPage,
  beforeLoad: () => {
    return {
      getTitle: () => 'Two Column Fullwidth',
    };
  },
});

function TwoColumnFullWidthPage(): JSX.Element {
  return (
    <Sidebar showHeader={false} fullWidth>
      <Sidebar.Main>
        <div className="border-default-orange-700 rounded-sm border bg-card p-8">
          <h1 className="mb-4 text-4xl font-bold text-orange-400">Two Column Full Width</h1>
          <p className="mb-6 text-muted">Main content area - full viewport width</p>
          <div className="flex flex-col gap-4 text-secondary">
            <p>This layout uses two columns that span the full width of the viewport.</p>
            <p>No navbar, no network selector - just pure content.</p>
            <p>Ideal for immersive reading or content-heavy applications.</p>
          </div>
        </div>
      </Sidebar.Main>

      <Sidebar.Aside>
        <div className="border-default-orange-700 rounded-sm border bg-card p-6">
          <h2 className="mb-4 text-xl font-bold text-orange-400">Sidebar</h2>
          <div className="flex flex-col gap-3 text-sm/6 text-secondary">
            <p>Full-width sidebar area.</p>
            <p>More breathing room for content and navigation.</p>
          </div>
        </div>
      </Sidebar.Aside>
    </Sidebar>
  );
}
