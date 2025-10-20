import { type JSX } from 'react';
import { Container } from '@/components/Layout/Container';

export function IndexPage(): JSX.Element {
  return (
    <Container className="max-w-6xl p-6">
      {/* Header with gradient accent */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl/tight font-bold text-foreground">Experiments</h1>
        <p className="text-muted">Explore cutting-edge Ethereum data visualizations and analytics</p>
        <div className="mt-4 h-1 w-24 rounded-full bg-linear-to-r from-primary to-accent"></div>
      </div>

      {/* Coming soon card */}
      <div className="rounded-xl border border-border bg-surface/50 p-12 text-center backdrop-blur-sm">
        <div className="mx-auto max-w-md">
          <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <svg className="size-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl/8 font-bold text-foreground">Coming Soon</h2>
          <p className="text-muted">Experimental features and visualizations are being developed</p>
        </div>
      </div>
    </Container>
  );
}
