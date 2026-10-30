import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dimNodeServiceListOptions } from '@/api/@tanstack/react-query.gen';

/** PROTOTYPE: read straight from a public beacon node until xatu-cbt exposes withdrawal credentials. */
const BEACON_API = 'https://ethereum-beacon-api.publicnode.com';

const FAR_FUTURE = '18446744073709551615';

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

interface BeaconValidator {
  index: string;
  balance: string;
  status: string;
  validator: {
    pubkey: string;
    withdrawal_credentials: string;
    effective_balance: string;
    slashed: boolean;
    activation_eligibility_epoch: string;
    activation_epoch: string;
    exit_epoch: string;
    withdrawable_epoch: string;
  };
}

const epochOrNull = (v: string): number | null => (v === FAR_FUTURE ? null : Number(v));

/**
 * Current state, withdrawal credentials and entity for a set of validators.
 */
export function useValidatorIdentity(indices: number[]): {
  identities: Map<number, ValidatorIdentity>;
  isLoading: boolean;
} {
  const enabled = indices.length > 0;
  const ids = indices.map(String);

  const beacon = useQuery({
    queryKey: ['prototype-beacon-validators', ids],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<BeaconValidator[]> => {
      const res = await fetch(`${BEACON_API}/eth/v1/beacon/states/head/validators`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`beacon node returned ${res.status}`);
      return ((await res.json()) as { data: BeaconValidator[] }).data;
    },
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
    for (const v of beacon.data ?? []) {
      const creds = v.validator.withdrawal_credentials;
      const type = creds.slice(0, 4) as ValidatorIdentity['credentialType'];
      const index = Number(v.index);
      out.set(index, {
        index,
        pubkey: v.validator.pubkey,
        status: v.status,
        slashed: v.validator.slashed,
        balanceEth: Number(v.balance) / 1e9,
        effectiveBalanceEth: Number(v.validator.effective_balance) / 1e9,
        withdrawalCredentials: creds,
        credentialType: type,
        withdrawalAddress: type === '0x00' ? null : `0x${creds.slice(26)}`,
        activationEligibilityEpoch: epochOrNull(v.validator.activation_eligibility_epoch),
        activationEpoch: epochOrNull(v.validator.activation_epoch),
        exitEpoch: epochOrNull(v.validator.exit_epoch),
        withdrawableEpoch: epochOrNull(v.validator.withdrawable_epoch),
        entity: entityByIndex.get(index) ?? null,
      });
    }
    return out;
  }, [beacon.data, nodes.data]);

  return { identities, isLoading: beacon.isLoading || nodes.isLoading };
}
