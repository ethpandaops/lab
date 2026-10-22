import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';

/**
 * NotFound component displays a 404 error page when a route is not found.
 * Shows a friendly message with a link to return to the home page.
 */
export function NotFound(): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Content */}
      <div className="relative flex flex-col items-center">
        <img src="/images/lab.png" className="size-72 object-contain" alt="" />
        <h1 className="mt-8 text-2xl/8 font-semibold tracking-tight text-foreground">Page Not Found</h1>
        <Link
          to="/"
          className="mt-8 inline-flex h-8 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
