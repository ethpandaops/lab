import { type JSX } from 'react';

export function TwoColumnNavbar(): JSX.Element {
  return (
    <>
      {/* Main column */}
      <div className="rounded-sm border border-purple-700 bg-slate-800 p-8">
        <h1 className="mb-4 text-4xl font-bold text-purple-400">Two Column + Navbar</h1>
        <p className="mb-6 text-slate-400">Main content with navbar navigation</p>
        <div className="flex flex-col gap-4 text-slate-300">
          <p>This layout combines two columns with a top navbar.</p>
          <p>The navbar provides global navigation while columns organize content.</p>
          <p>Perfect for applications with both global and local navigation needs.</p>
        </div>
      </div>

      {/* Sidebar column */}
      <aside className="rounded-sm border border-purple-700 bg-slate-800 p-6">
        <h2 className="mb-4 text-xl font-bold text-purple-400">Sidebar</h2>
        <div className="flex flex-col gap-3 text-sm/6 text-slate-300">
          <p>Sidebar with navbar above.</p>
          <p>Great for app-style layouts with multiple navigation levels.</p>
        </div>
      </aside>
    </>
  );
}
