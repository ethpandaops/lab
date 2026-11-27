import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { fireEvent, render, screen, server } from '@/test-utils';
import { ClientVersionBreakdown } from './ClientVersionBreakdown';

const OLD = '26.11-develop-25390b5';
const NEW = '26.11-develop-9c39ff7';

const OBSERVATIONS = [
  {
    meta_client_name: 'ethpandaops/mainnet/utility-mainnet-prysm-besu-tysm-7870-001',
    meta_execution_version: OLD,
    status: 'VALID',
    duration_ms: 38,
  },
  {
    meta_client_name: 'ethpandaops/mainnet/sigma-mainnet-prysm-besu-tysm-7870-001',
    meta_execution_version: NEW,
    status: 'VALID',
    duration_ms: 60,
  },
];

describe('ClientVersionBreakdown', () => {
  it('lists only the nodes that ran a version when that version is expanded', async () => {
    server.use(
      http.get('*', ({ request }) => {
        const version = new URL(request.url).searchParams.get('meta_execution_version_eq');
        return HttpResponse.json({
          int_engine_new_payload: OBSERVATIONS.filter(o => !version || o.meta_execution_version === version),
        });
      })
    );

    render(
      <ClientVersionBreakdown
        data={OBSERVATIONS.map(o => ({
          meta_execution_implementation: 'Besu',
          meta_execution_version: o.meta_execution_version,
          observation_count: 1,
          avg_duration_ms: o.duration_ms,
          min_duration_ms: o.duration_ms,
          max_duration_ms: o.duration_ms,
          status: o.status,
        }))}
        noCard
        hideObservations
        hideRange
        expandable
        slot={15743593}
        durationStatusFilter="VALID"
      />
    );

    fireEvent.click(screen.getByText('2 versions'));
    fireEvent.click(screen.getByText(NEW));

    expect(await screen.findByText('sigma/prysm-besu-tysm-7870-001')).toBeInTheDocument();
    expect(screen.queryByText('utility/prysm-besu-tysm-7870-001')).not.toBeInTheDocument();
  });
});
