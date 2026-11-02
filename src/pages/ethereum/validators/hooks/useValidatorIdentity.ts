import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dimNodeServiceListOptions, dimValidatorServiceListOptions } from '@/api/@tanstack/react-query.gen';

export interface ValidatorIdentity {
  index: number;
  pubkey: string;
  status: string;
  slashed: boolean;
  balanceEth: number;
  effectiveBalanceEth: number;
  withdrawalCredentials: string;
  credentialType: '0x00' | '0x01' | '0x02';
  /** Execution address for 0x01 / 0x02 credentials */
  withdrawalAddress: string | null;
  activationEligibilityEpoch: number | null;
  activationEpoch: number | null;
  exitEpoch: number | null;
  withdrawableEpoch: number | null;
  entity: string | null;
}

/**
 * Current state, withdrawal credentials and entity for a set of validators.
 */
export function useValidatorIdentity(indices: number[]): {
  identities: Map<number, ValidatorIdentity>;
  isLoading: boolean;
} {
  const enabled = indices.length > 0;

  const validators = useQuery({
    ...dimValidatorServiceListOptions({
      query: { validator_index_in_values: indices.join(','), page_size: 10_000 },
    }),
    enabled,
  });

  const nodes = useQuery({
    ...dimNodeServiceListOptions({
      query: { validator_index_in_values: indices.join(','), page_size: 10_000 },
    }),
    enabled,
  });

  // Memoised so tables fed from this keep their page when the page re-renders
  const identities = useMemo(() => {
    const entityByIndex = new Map(nodes.data?.dim_node?.map(n => [n.validator_index ?? -1, n.source ?? null]));
    const out = new Map<number, ValidatorIdentity>();
    for (const v of validators.data?.dim_validator ?? []) {
      const index = v.validator_index ?? 0;
      const epoch = (e: number | null | undefined): number | null => (e === null || e === undefined ? null : Number(e));
      out.set(index, {
        index,
        pubkey: v.pubkey ?? '',
        status: v.status ?? 'unknown',
        slashed: v.slashed ?? false,
        balanceEth: Number(v.balance ?? 0) / 1e9,
        effectiveBalanceEth: Number(v.effective_balance ?? 0) / 1e9,
        withdrawalCredentials: v.withdrawal_credentials ?? '',
        credentialType: (v.credential_type ?? '0x00') as ValidatorIdentity['credentialType'],
        withdrawalAddress: v.withdrawal_address ?? null,
        activationEligibilityEpoch: epoch(v.activation_eligibility_epoch),
        activationEpoch: epoch(v.activation_epoch),
        exitEpoch: epoch(v.exit_epoch),
        withdrawableEpoch: epoch(v.withdrawable_epoch),
        entity: entityByIndex.get(index) ?? null,
      });
    }
    return out;
  }, [validators.data, nodes.data]);

  return { identities, isLoading: validators.isLoading || nodes.isLoading };
}
