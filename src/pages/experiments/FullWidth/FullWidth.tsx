import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';

export function FullWidth(): JSX.Element {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-white">
          <span className="text-pink-400">Full Width Demo</span>
        </h1>
        <p className="mb-8 text-xl text-slate-300">Full Width Layout - No navbar, no network selector</p>
        <Link
          to="/experiments"
          className="rounded-sm bg-pink-600 px-8 py-3 text-lg/6 font-semibold text-white hover:bg-pink-700"
        >
          Back to Experiments
        </Link>
      </div>
    </div>
  );
}
