import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { renderHook, server, waitFor } from '@/test-utils';
import { useValidatorStatus } from './useValidatorStatus';

// Raw API text: an unset epoch is 2^64 - 1, which JSON.parse rounds up to 2^64
const BODY = `{"dim_validator_status":[{"validator_index":1,"epoch":0,"epoch_start_date_time":1606824023,"status":"active_ongoing","activation_epoch":0,"exit_epoch":18446744073709551615,"withdrawable_epoch":18446744073709551615}]}`;

describe('useValidatorStatus', () => {
  it('reads validators with unset epochs and names only the indices with no status', async () => {
    server.use(http.get('*', () => new HttpResponse(BODY, { headers: { 'Content-Type': 'application/json' } })));

    const { result } = renderHook(() => useValidatorStatus([1, 2600000]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.unknownValidators).toEqual([2600000]);
    expect(result.current.getStatusAtTimestamp(1, 1_700_000_000)).toBe('active_ongoing');
  });
});
