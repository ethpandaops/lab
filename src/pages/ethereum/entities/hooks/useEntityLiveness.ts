import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fctAttestationLivenessByEntityHeadServiceListOptions,
  fctValidatorCountByCredentialTypeDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  fctAttestationLivenessByEntityHeadServiceList,
  fctValidatorStakeByEntityDailyServiceList,
} from '@/api/sdk.gen';
import type { FctAttestationLivenessByEntityHead, FctValidatorStakeByEntityDaily } from '@/api/types.gen';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useNetwork } from '@/hooks/useNetwork';
import { fetchAllPages } from '@/utils/api-pagination';
import { epochToTimestamp, getEpochSlotRange, timestampToEpoch } from '@/utils/beacon';

import { LIVENESS_FULL_EPOCHS, LIVENESS_SAMPLE_EPOCHS } from '../constants';
import { dayOf } from '../utils/overview';

/** Requests in flight at once */
const CONCURRENCY = 8;
/** Epochs per request when reading every epoch */
const EPOCHS_PER_REQUEST = 32;
/** Entities per validator count request, to keep the URL short */
const ENTITY_CHUNK = 100;

export interface UseEntityLivenessResult {
  /** Epochs the figures come from, oldest first: every epoch in short ranges, evenly spaced in long ones */
  epochs: number[];
  /** First epoch with liveness data when it falls inside the range, otherwise null */
  dataStartEpoch: number | null;
  /** Missed attestations per entity, keyed by epoch; entities with none are absent */
  missedByEpoch: Map<number, Map<string, number>>;
  /** Missed attestations per entity across every epoch */
  missedByEntity: Map<string, number>;
  /** Attestations due per entity with a miss across every epoch: its active validators on each epoch's day */
  dueByEntity: Map<string, number>;
  /** Attestations due network-wide across every epoch */
  totalDue: number;
  isLoading: boolean;
  error: Error | null;
}

/** Every epoch from `first` to `last` when there are at most `full`, otherwise `count` evenly spaced ones */
function pickEpochs(first: number, last: number, full: number, count: number): number[] {
  if (last - first + 1 <= full) return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  return [...new Set(Array.from({ length: count }, (_, i) => first + Math.round(((last - first) * i) / (count - 1))))];
}

/** Runs of consecutive epochs, at most `size` long, so contiguous epochs share a request */
function toRuns(epochs: number[], size: number): [number, number][] {
  const runs: [number, number][] = [];
  for (const e of epochs) {
    const run = runs[runs.length - 1];
    if (run && e === run[1] + 1 && e - run[0] < size) run[1] = e;
    else runs.push([e, e]);
  }
  return runs;
}

/**
 * Missed attestations per entity across the range from `fromTime` (Unix seconds, or genesis when null) to two epochs
 * back, so every attestation has had time to land. Liveness is stored per slot, so ranges over
 * {@link LIVENESS_FULL_EPOCHS} epochs read {@link LIVENESS_SAMPLE_EPOCHS} epochs spread evenly across the range.
 */
export function useEntityLiveness(fromTime: number | null): UseEntityLivenessResult {
  const { currentNetwork } = useNetwork();
  const { epoch } = useBeaconClock();
  // Fixed at first render per network, so the figures don't reload under the reader every epoch
  const [anchor, setAnchor] = useState<{ network?: string; epoch: number }>({ epoch: 0 });
  if (epoch > 0 && (anchor.epoch === 0 || anchor.network !== currentNetwork?.name)) {
    setAnchor({ network: currentNetwork?.name, epoch });
  }

  const earliest = useQuery({
    ...fctAttestationLivenessByEntityHeadServiceListOptions({
      query: { slot_gte: 0, order_by: 'slot asc', page_size: 1 },
    }),
    enabled: !!currentNetwork,
  });
  const firstSlot = earliest.data?.fct_attestation_liveness_by_entity_head?.[0]?.slot;
  const dataStart = firstSlot === undefined ? undefined : Math.floor(firstSlot / 32) + 1;

  const lastEpoch = Math.max(0, anchor.epoch - 2);
  const rangeStart =
    fromTime === null || !currentNetwork ? 0 : Math.max(0, timestampToEpoch(fromTime, currentNetwork.genesis_time));
  const firstEpoch = dataStart === undefined ? rangeStart : Math.min(lastEpoch, Math.max(rangeStart, dataStart));
  const epochs = useMemo(
    () =>
      dataStart === undefined || anchor.epoch === 0
        ? []
        : pickEpochs(firstEpoch, lastEpoch, LIVENESS_FULL_EPOCHS, LIVENESS_SAMPLE_EPOCHS),
    [dataStart, anchor.epoch, firstEpoch, lastEpoch]
  );

  const query = useQuery({
    queryKey: ['entities', 'missed', currentNetwork?.name, epochs.join(',')],
    queryFn: async ({ signal }) => {
      const rows: FctAttestationLivenessByEntityHead[] = [];
      const runs = toRuns(epochs, EPOCHS_PER_REQUEST);
      for (let i = 0; i < runs.length; i += CONCURRENCY) {
        const batch = await Promise.all(
          runs.slice(i, i + CONCURRENCY).map(([from, to]) =>
            fetchAllPages<FctAttestationLivenessByEntityHead>(
              fctAttestationLivenessByEntityHeadServiceList,
              {
                query: {
                  slot_gte: getEpochSlotRange(from).firstSlot,
                  slot_lte: getEpochSlotRange(to).lastSlot,
                  missed_count_gt: 0,
                  page_size: 10_000,
                },
              },
              'fct_attestation_liveness_by_entity_head',
              signal
            )
          )
        );
        rows.push(...batch.flat());
      }
      return rows;
    },
    enabled: epochs.length > 0,
  });

  // Memoised so consumers get stable references between renders
  const { missedByEpoch, missedByEntity } = useMemo(() => {
    const missedByEpoch = new Map<number, Map<string, number>>();
    const missedByEntity = new Map<string, number>();
    for (const row of query.data ?? []) {
      const entity = row.entity || 'unknown';
      const rowEpoch = row.epoch ?? Math.floor((row.slot ?? 0) / 32);
      const count = row.missed_count ?? 0;
      const byEntity = missedByEpoch.get(rowEpoch) ?? new Map<string, number>();
      byEntity.set(entity, (byEntity.get(entity) ?? 0) + count);
      missedByEpoch.set(rowEpoch, byEntity);
      missedByEntity.set(entity, (missedByEntity.get(entity) ?? 0) + count);
    }
    return { missedByEpoch, missedByEntity };
  }, [query.data]);

  // Validators on each epoch's day, so long ranges divide by the validators each entity had at the time
  const genesisTime = currentNetwork?.genesis_time;
  const epochDays = useMemo(
    () => (genesisTime === undefined ? [] : epochs.map(e => dayOf(epochToTimestamp(e, genesisTime)))),
    [epochs, genesisTime]
  );
  const dayValues = [...new Set(epochDays)].join(',');
  const missedEntities = [...missedByEntity.keys()].sort();
  const counts = useQuery({
    queryKey: ['entities', 'liveness-validators', currentNetwork?.name, dayValues, missedEntities.join(',')],
    queryFn: async ({ signal }) => {
      const chunks: string[][] = [];
      for (let i = 0; i < missedEntities.length; i += ENTITY_CHUNK)
        chunks.push(missedEntities.slice(i, i + ENTITY_CHUNK));
      const rows = await Promise.all(
        chunks.map(chunk =>
          fetchAllPages<FctValidatorStakeByEntityDaily>(
            fctValidatorStakeByEntityDailyServiceList,
            { query: { day_start_date_in_values: dayValues, entity_in_values: chunk.join(','), page_size: 10_000 } },
            'fct_validator_stake_by_entity_daily',
            signal
          )
        )
      );
      return rows.flat();
    },
    enabled: !!dayValues && missedEntities.length > 0,
  });
  const totals = useQuery({
    ...fctValidatorCountByCredentialTypeDailyServiceListOptions({
      query: { day_start_date_in_values: dayValues, page_size: 10_000 },
    }),
    enabled: !!dayValues,
  });

  const { dueByEntity, totalDue } = useMemo(() => {
    const byDay = new Map<string, Map<string, number>>();
    for (const row of counts.data ?? []) {
      const day = row.day_start_date ?? '';
      const entities = byDay.get(day) ?? new Map<string, number>();
      const entity = row.entity || 'unknown';
      entities.set(entity, (entities.get(entity) ?? 0) + (row.active_validator_count ?? 0));
      byDay.set(day, entities);
    }
    const totalByDay = new Map<string, number>();
    for (const row of totals.data?.fct_validator_count_by_credential_type_daily ?? []) {
      const day = row.day_start_date ?? '';
      totalByDay.set(day, (totalByDay.get(day) ?? 0) + (row.active_validator_count ?? 0));
    }
    const dueByEntity = new Map<string, number>();
    let totalDue = 0;
    for (const day of epochDays) {
      totalDue += totalByDay.get(day) ?? 0;
      for (const [entity, validators] of byDay.get(day) ?? []) {
        dueByEntity.set(entity, (dueByEntity.get(entity) ?? 0) + validators);
      }
    }
    return { dueByEntity, totalDue };
  }, [counts.data, totals.data, epochDays]);

  return {
    epochs,
    dataStartEpoch: dataStart !== undefined && dataStart > rangeStart ? dataStart : null,
    missedByEpoch,
    missedByEntity,
    dueByEntity,
    totalDue,
    isLoading: earliest.isLoading || query.isLoading || counts.isLoading || totals.isLoading || epochs.length === 0,
    error: (earliest.error ?? query.error ?? counts.error ?? totals.error ?? null) as Error | null,
  };
}
