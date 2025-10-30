import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';

/**
 * NotFound component displays a 404 error page when a route is not found.
 * Shows a friendly message with a link to return to the home page.
 */
export function NotFound(): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
        <div className="absolute inset-0 bg-linear-to-br from-warning/5 via-transparent to-warning/10"></div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 animate-pulse rounded-full bg-warning/20 blur-3xl"></div>
          <img src="/images/lab.png" className="relative size-72 object-contain" alt="Lab Logo" />
        </div>
        <h1 className="mt-8 text-2xl font-bold text-foreground">Page Not Found</h1>
        <p className="mt-2 max-w-md text-center text-sm text-muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-95"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
