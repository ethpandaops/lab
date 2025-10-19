import { type JSX } from 'react';

export function AboutPage(): JSX.Element {
  return (
    <div className="card-primary p-8">
      <h1 className="mb-6 text-3xl font-bold text-primary">About The Lab</h1>
      <p className="mb-4 text-secondary">This page has a navbar but NO network selector.</p>
      <div className="max-w-none">
        <p className="mb-4 text-secondary">
          The Lab is a demonstration of TanStack Router&apos;s powerful layout composition features.
        </p>
        <p className="mb-4 text-secondary">Different routes can opt into different UI features:</p>
        <ul className="flex list-inside list-disc flex-col gap-2 text-secondary">
          <li>The home page (/) has no navbar - it&apos;s a full hero section</li>
          <li>This page has a navbar but NO network selector</li>
          <li>/experiments has a navbar WITH network selector</li>
          <li>Experiments can have different layouts by their route location</li>
        </ul>
      </div>
    </div>
  );
}
