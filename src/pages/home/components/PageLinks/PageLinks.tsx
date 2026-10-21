import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';

const SECTIONS: { title: string; pages: { name: string; to: string }[] }[] = [
  {
    title: 'Consensus',
    pages: [
      { name: 'Overview', to: '/ethereum/consensus/overview' },
      { name: 'Live', to: '/ethereum/live' },
      { name: 'Slots', to: '/ethereum/slots' },
      { name: 'Epochs', to: '/ethereum/epochs' },
      { name: 'Entities', to: '/ethereum/entities' },
      { name: 'Clients', to: '/ethereum/clients' },
      { name: 'Forks', to: '/ethereum/forks' },
    ],
  },
  {
    title: 'Execution',
    pages: [
      { name: 'Overview', to: '/ethereum/execution/overview' },
      { name: 'Timings', to: '/ethereum/execution/timings' },
      { name: 'Payloads', to: '/ethereum/execution/payloads' },
      { name: 'Gas Profiler', to: '/ethereum/execution/gas-profiler' },
      { name: 'State Growth', to: '/ethereum/execution/state-growth' },
    ],
  },
  {
    title: 'Data availability',
    pages: [
      { name: 'Custody', to: '/ethereum/data-availability/custody' },
      { name: 'Probes', to: '/ethereum/data-availability/probes' },
      { name: 'Partial Columns', to: '/ethereum/data-availability/partial-columns' },
    ],
  },
  {
    title: 'Xatu',
    pages: [
      { name: 'Contributors', to: '/xatu/contributors' },
      { name: 'Geo Checklist', to: '/xatu/geographical-checklist' },
      { name: 'Locally Built Blocks', to: '/xatu/locally-built-blocks' },
      { name: 'Fork Readiness', to: '/xatu/fork-readiness' },
    ],
  },
];

/** The main pages by section, for visitors (and mobile, where the sidebar is closed). */
export function PageLinks(): JSX.Element {
  return (
    <Card title="Pages">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        {SECTIONS.map(section => (
          <nav key={section.title} aria-label={section.title}>
            <h3 className="mb-1.5 text-xs font-medium text-muted">{section.title}</h3>
            <ul className="flex flex-col">
              {section.pages.map(page => (
                <li key={page.to}>
                  <Link
                    to={page.to}
                    className="-mx-1.5 block rounded-xs px-1.5 py-1 text-sm text-foreground transition-colors hover:bg-foreground/5"
                  >
                    {page.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </Card>
  );
}
