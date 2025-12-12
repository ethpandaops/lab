import type { JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { StateExpirySkeleton } from './components';

export function IndexPage(): JSX.Element {
  const isLoading = false;
  const error = null;

  return (
    <Container>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl/tight font-bold text-foreground">State Expiry</h1>
          <p className="mt-1 text-muted">Track Ethereum execution layer state expiry metrics</p>
        </div>
      </div>

      {isLoading && <StateExpirySkeleton />}

      {error && (
        <Card rounded className="p-6">
          <p className="text-danger">Failed to load state expiry data</p>
        </Card>
      )}

      {/* Main content placeholder */}
      <Card rounded className="p-6">
        <p className="text-muted">State expiry visualization coming soon...</p>
      </Card>
    </Container>
  );
}
