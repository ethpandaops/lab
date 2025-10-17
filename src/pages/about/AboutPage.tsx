import { type JSX } from 'react';
import { NavbarLayout } from '@/layouts';

export function AboutPage(): JSX.Element {
  return (
    <NavbarLayout>
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8">
        <h1 className="mb-6 text-3xl font-bold text-white">About The Lab</h1>
        <p className="mb-4 text-slate-400">This page has a navbar but NO network selector.</p>
        <div className="max-w-none">
          <p className="mb-4 text-slate-300">
            The Lab is a demonstration of TanStack Router&apos;s powerful layout composition features.
          </p>
          <p className="mb-4 text-slate-300">Different routes can opt into different UI features:</p>
          <ul className="list-inside list-disc space-y-2 text-slate-300">
            <li>The home page (/) has no navbar - it&apos;s a full hero section</li>
            <li>This page has a navbar but NO network selector</li>
            <li>/experiments has a navbar WITH network selector</li>
            <li>Experiments can have different layouts by their route location</li>
          </ul>
        </div>
      </div>
    </NavbarLayout>
  );
}
