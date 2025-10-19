import { type JSX } from 'react';

export function FullWidthNavbar(): JSX.Element {
  return (
    <div className="border-default-blue-700 rounded-sm border bg-card p-8">
      <h1 className="mb-4 text-4xl font-bold text-blue-400">Full Width + Navbar Demo</h1>
      <p className="mb-6 text-muted">Full width layout with navbar</p>
      <div className="flex flex-col gap-4 text-secondary">
        <p>This experiment demonstrates a full-width layout with a navbar.</p>
        <p>Content spans the entire viewport width while maintaining the navbar chrome.</p>
        <p>Perfect for dashboards or data visualization pages.</p>
      </div>
    </div>
  );
}
