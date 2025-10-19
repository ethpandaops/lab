import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';

export function Root(): JSX.Element {
  return (
    <div className="from-bg to-bg flex min-h-dvh items-center justify-center bg-gradient-to-br via-cyber-darker">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">
          Welcome to <span className="text-accent">The Lab</span>
        </h1>
        <p className="mb-8 text-xl text-secondary">Explore experiments and discover possibilities</p>
        <Link to="/experiments" className="btn btn-primary btn-lg rounded-sm px-8 py-3 text-lg/6 font-semibold">
          Get Started
        </Link>
      </div>
    </div>
  );
}
