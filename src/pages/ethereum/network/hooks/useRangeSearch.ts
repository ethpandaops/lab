import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { DEFAULT_RANGE, type NetworkRange } from '@/pages/ethereum/network/constants';

/** The network page's range from its `t` search param, and a setter that keeps the other params */
export function useRangeSearch(): {
  range: NetworkRange;
  t: NetworkRange | undefined;
  setRange: (range: NetworkRange) => void;
} {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { t?: NetworkRange };
  const setRange = useCallback(
    (t: NetworkRange) => navigate({ to: '.', search: prev => ({ ...prev, t }), replace: true, resetScroll: false }),
    [navigate]
  );
  return { range: search.t ?? DEFAULT_RANGE, t: search.t, setRange };
}
