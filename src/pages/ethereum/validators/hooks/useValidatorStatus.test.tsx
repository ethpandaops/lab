import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { JSX, ReactNode } from 'react';
import { client } from '@/api/client.gen';
import { useValidatorStatus } from './useValidatorStatus';

// Raw API text: an unset epoch is 2^64 - 1, which JSON.parse rounds up to 2^64
const BODY = `{"dim_validator_status":[{"validator_index":1,"epoch":0,"epoch_start_date_time":1606824023,"status":"active_ongoing","activation_epoch":0,"exit_epoch":18446744073709551615,"withdrawable_epoch":18446744073709551615}]}`;

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useValidatorStatus', () => {
  // Node's fetch needs an absolute URL
  beforeAll(() => client.setConfig({ baseUrl: 'http://localhost' }));
  afterEach(() => vi.unstubAllGlobals());

  it('reads validators with unset epochs and names only the indices with no status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(BODY, { status: 200, headers: { 'Content-Type': 'application/json' } }))
    );

    const { result } = renderHook(() => useValidatorStatus([1, 2600000]), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.unknownValidators).toEqual([2600000]);
    expect(result.current.getStatusAtTimestamp(1, 1_700_000_000)).toBe('active_ongoing');
  });
});
