import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';

export function Root(): JSX.Element {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-white">
          Welcome to <span className="text-purple-400">The Lab</span>
        </h1>
        <p className="mb-8 text-xl text-slate-300">Explore experiments and discover possibilities</p>
        <Link
          to="/experiments"
          className="rounded-sm bg-purple-600 px-8 py-3 text-lg/6 font-semibold text-white hover:bg-purple-700"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
