import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctPreparedBlockServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { parseClientName } from '../utils';
import { nodeIdOf } from '../utils/block-query';

/** Recent span that every building node shows up in */
const ROSTER_SECONDS = 5 * 60;

export interface NodeRoster {
  /** Node ids, sorted */
  nodes: string[];
  consensusClients: string[];
  executionClients: string[];
}

/**
 * Nodes that built blocks in the last 5 minutes, with their consensus and execution clients, for filter options.
 */
export function useNodeRoster(): NodeRoster {
  const { currentNetwork } = useNetwork();
  const since = useMemo(() => Math.floor(Date.now() / 1000 / 60) * 60 - ROSTER_SECONDS, []);
  const { data } = useQuery({
    ...fctPreparedBlockServiceListOptions({ query: { slot_start_date_time_gte: since, page_size: 1000 } }),
    enabled: !!currentNetwork,
  });

  return useMemo(() => {
    const rows = data?.fct_prepared_block ?? [];
    const unique = (values: Array<string | null | undefined>): string[] =>
      [...new Set(values.filter((value): value is string => !!value))].sort();
    return {
      nodes: unique(rows.map(row => nodeIdOf(row.meta_client_name))),
      consensusClients: unique(rows.map(row => row.meta_consensus_implementation)),
      executionClients: unique(rows.map(row => parseClientName(row.meta_client_name).executionClient)),
    };
  }, [data]);
}
