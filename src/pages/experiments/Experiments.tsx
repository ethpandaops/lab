import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { NavbarLayout } from '@/layouts';
import { getAllExperiments } from '@/routes/experiments/-experiments.config';

export function Experiments(): JSX.Element {
  const layoutVariations = getAllExperiments().map(experiment => ({
    path: `/experiments/${experiment.id}`,
    title: experiment.title,
    description: experiment.description,
    color: experiment.color,
  }));

  return (
    <NavbarLayout>
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
              className={`block rounded-lg border ${variant.color} bg-slate-800 p-6 hover:bg-slate-700`}
            >
              <h2 className="mb-2 text-xl font-semibold text-white">{variant.title}</h2>
              <p className="text-slate-400">{variant.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </NavbarLayout>
  );
}
