import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';

export function Experiments(): JSX.Element {
  const layoutVariations = [
    {
      path: '/experiments/hero-demo',
      title: 'Full Width Layout',
      description: 'Full page - NO header, NO network selector',
      color: 'border-pink-500',
    },
    {
      path: '/experiments/navbar-only',
      title: 'Header Only',
      description: 'Has header but NO network selector',
      color: 'border-slate-500',
    },
    {
      path: '/experiments/with-selector',
      title: 'Header + Network Selector',
      description: 'Has header AND network selector + BlockList',
      color: 'border-green-500',
    },
    {
      path: '/experiments/fullwidth-navbar',
      title: 'Full Width + Header',
      description: 'Full width layout with header',
      color: 'border-blue-500',
    },
    {
      path: '/experiments/two-column-basic',
      title: 'Two Column Basic',
      description: 'Two columns - NO header, NO network selector',
      color: 'border-cyan-500',
    },
    {
      path: '/experiments/two-column-fullwidth',
      title: 'Two Column Full Width',
      description: 'Two columns spanning full viewport width',
      color: 'border-orange-500',
    },
    {
      path: '/experiments/two-column-navbar',
      title: 'Two Column + Header',
      description: 'Two columns with header navigation',
      color: 'border-purple-500',
    },
    {
      path: '/experiments/sidebar-right',
      title: 'Sidebar Right',
      description: 'Two columns with sidebar on the RIGHT side',
      color: 'border-indigo-500',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-white">Layout Experiments</h1>
      <p className="mb-8 text-slate-400">
        Test different layout configurations - each route opts into different UI features
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {layoutVariations.map(variant => (
          <Link
            key={variant.path}
            to={variant.path}
            className={`block rounded-sm border ${variant.color} bg-slate-800 p-6 hover:bg-slate-700`}
          >
            <h2 className="mb-2 text-xl font-semibold text-white">{variant.title}</h2>
            <p className="text-slate-400">{variant.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
