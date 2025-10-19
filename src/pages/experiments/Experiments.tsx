import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';

export function Experiments(): JSX.Element {
  const layoutVariations = [
    {
      path: '/experiments/block-production-flow',
      title: 'Block Production Flow',
      description: 'Block production flow',
      color: 'border-pink-500',
    },
    {
      path: '/experiments/live-slots',
      title: 'Live Slots',
      description: 'Live slots',
      color: 'border-slate-500',
    },
    {
      path: '/experiments/locally-built-blocks',
      title: 'Locally Built Blocks',
      description: 'Locally built blocks',
      color: 'border-green-500',
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-primary">Layout Experiments</h1>
      <p className="mb-8 text-secondary">
        Test different layout configurations - each route opts into different UI features
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {layoutVariations.map(variant => (
          <Link
            key={variant.path}
            to={variant.path}
            className={`card-interactive card-primary block rounded-sm border ${variant.color} p-6`}
          >
            <h2 className="mb-2 text-xl font-semibold text-primary">{variant.title}</h2>
            <p className="text-secondary">{variant.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
