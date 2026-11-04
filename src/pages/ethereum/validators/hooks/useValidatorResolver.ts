import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dimValidatorPubkeyServiceListOptions } from '@/api/@tanstack/react-query.gen';

interface UseValidatorResolverReturn {
  /** Input indices plus the indices of input pubkeys that resolved */
  resolvedIndices: number[];
  isResolving: boolean;
  error: Error | null;
  isResolved: boolean;
  unresolvedPubkeys: string[];
}

/**
 * Resolves mixed validator inputs (indices + pubkeys) into validator indices. Pubkeys are looked up in
 * `dim_validator_pubkey`, whose primary key is the pubkey; an index's pubkey comes from `dim_validator`.
 */
export function useValidatorResolver(
  indices: number[],
  pubkeys: string[],
  enabled: boolean
): UseValidatorResolverReturn {
  const hasPubkeys = pubkeys.length > 0;

  const pubkeyQuery = useQuery({
    ...dimValidatorPubkeyServiceListOptions({
      query: {
        pubkey_in_values: pubkeys.join(','),
        page_size: 10000,
      },
    }),
    enabled: enabled && hasPubkeys,
  });

  const { resolvedIndices, unresolvedPubkeys } = useMemo(() => {
    const records = pubkeyQuery.data?.dim_validator_pubkey ?? [];
    const indexSet = new Set(indices);
    const found = new Set<string>();
    for (const record of records) {
      if (record.validator_index == null || !record.pubkey) continue;
      indexSet.add(record.validator_index);
      found.add(record.pubkey.toLowerCase());
    }
    return {
      resolvedIndices: [...indexSet].sort((a, b) => a - b),
      unresolvedPubkeys: pubkeys.filter(pk => !found.has(pk.toLowerCase())),
    };
  }, [pubkeyQuery.data, indices, pubkeys]);

  if (!enabled || !hasPubkeys) {
    return { resolvedIndices: indices, isResolving: false, error: null, isResolved: true, unresolvedPubkeys: [] };
  }

  return {
    resolvedIndices,
    isResolving: pubkeyQuery.isLoading,
    error: (pubkeyQuery.error ?? null) as Error | null,
    isResolved: pubkeyQuery.isSuccess,
    unresolvedPubkeys: pubkeyQuery.isSuccess ? unresolvedPubkeys : [],
  };
}
