import { type JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { ContractTop100List } from '@/pages/ethereum/execution/state-expiry/components';

/**
 * Contracts index page - Shows the top 100 Ethereum contracts by storage size.
 */
export function IndexPage(): JSX.Element {
  return (
    <Container>
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-foreground">Contracts</h1>
        <p className="mt-0.5 text-sm text-muted">Top 100 contracts by storage size with state expiry analysis</p>
      </div>

      <ContractTop100List variant="full" />
    </Container>
  );
}
