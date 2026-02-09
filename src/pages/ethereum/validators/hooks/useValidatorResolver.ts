import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { dimValidatorPubkeyServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { DimValidatorPubkey } from '@/api/types.gen';

export interface ValidatorInfo {
  index: number;
  pubkey: string;
}

interface UseValidatorResolverReturn {
  resolvedValidators: ValidatorInfo[];
  resolvedIndices: number[];
  validatorMap: Map<number, string>;
  isResolving: boolean;
  error: Error | null;
  isResolved: boolean;
  unresolvedPubkeys: string[];
}

/**
 * Resolves mixed validator inputs (indices + pubkeys) into unified ValidatorInfo[].
 *
 * Runs two parallel queries via the dimValidatorPubkey API:
 * 1. Pubkeys → indices (when pubkeys are provided)
 * 2. Indices → pubkeys (when indices are provided)
 *
 * Merges results into a deduped Map<index, pubkey>.
 */
export function useValidatorResolver(
  indices: number[],
  pubkeys: string[],
  enabled: boolean
): UseValidatorResolverReturn {
  const hasPubkeys = pubkeys.length > 0;
  const hasIndices = indices.length > 0;

  const results = useQueries({
    queries: [
      {
        ...dimValidatorPubkeyServiceListOptions({
          query: {
            pubkey_in_values: pubkeys.join(','),
            page_size: 10000,
          },
        }),
        enabled: enabled && hasPubkeys,
      },
      {
        ...dimValidatorPubkeyServiceListOptions({
          query: {
            validator_index_in_values: indices.join(','),
            page_size: 10000,
          },
        }),
        enabled: enabled && hasIndices,
      },
    ],
  });

  const [pubkeyQuery, indexQuery] = results;

  // Only pubkey→index resolution is blocking (we need those indices for data fetching).
  // Index→pubkey is non-blocking enrichment that populates the map for display.
  const isResolving = hasPubkeys && pubkeyQuery.isLoading;
  const error = (pubkeyQuery.error ?? null) as Error | null;
  const isResolved = !hasPubkeys || pubkeyQuery.isSuccess;

  const { validatorMap, resolvedValidators, resolvedIndices, unresolvedPubkeys } = useMemo(() => {
    const map = new Map<number, string>();

    const processRecords = (records: DimValidatorPubkey[] | undefined): void => {
      if (!records) return;
      for (const record of records) {
        if (record.validator_index != null && record.pubkey) {
          map.set(record.validator_index, record.pubkey);
        }
      }
    };

    // Merge both query results into the map
    processRecords(pubkeyQuery.data?.dim_validator_pubkey);
    processRecords(indexQuery.data?.dim_validator_pubkey);

    // Build resolvedIndices: input indices + any new indices discovered from pubkey resolution.
    // This does NOT wait for index→pubkey enrichment.
    const indexSet = new Set(indices);
    for (const [index] of map) {
      indexSet.add(index);
    }

    // Ensure all known indices are in the map (with empty pubkey if not yet enriched)
    for (const idx of indexSet) {
      if (!map.has(idx)) {
        map.set(idx, '');
      }
    }

    const validators: ValidatorInfo[] = [];
    for (const [index, pubkey] of map) {
      validators.push({ index, pubkey });
    }
    validators.sort((a, b) => a.index - b.index);

    // Compute unresolved pubkeys: input pubkeys not found in the response
    const resolvedPubkeySet = new Set<string>();
    const pubkeyRecords = pubkeyQuery.data?.dim_validator_pubkey;
    if (pubkeyRecords) {
      for (const record of pubkeyRecords) {
        if (record.pubkey) {
          resolvedPubkeySet.add(record.pubkey.toLowerCase());
        }
      }
    }
    const unresolved = pubkeys.filter(pk => !resolvedPubkeySet.has(pk.toLowerCase()));

    return {
      validatorMap: map,
      resolvedValidators: validators,
      resolvedIndices: [...indexSet].sort((a, b) => a - b),
      unresolvedPubkeys: unresolved,
    };
  }, [pubkeyQuery.data, indexQuery.data, indices, pubkeys]);

  // When not enabled or no inputs, return empty defaults
  if (!enabled || (!hasPubkeys && !hasIndices)) {
    return {
      resolvedValidators: [],
      resolvedIndices: indices,
      validatorMap: new Map(),
      isResolving: false,
      error: null,
      isResolved: !hasPubkeys && !hasIndices,
      unresolvedPubkeys: [],
    };
  }

  return {
    resolvedValidators,
    resolvedIndices,
    validatorMap,
    isResolving,
    error,
    isResolved,
    unresolvedPubkeys,
  };
}
