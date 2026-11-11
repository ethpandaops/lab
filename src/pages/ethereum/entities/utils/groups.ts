import { ENTITY_GROUPS, entityGroupOf, entityLabel, isEntityGroup } from '@/pages/ethereum/clients/utils/client-share';

import type { EntityStake } from '../hooks/useEntityStake';
import { addCounts, EMPTY_COUNTS, type PerformanceCounts } from './performance';

export { entityGroupOf, entityLabel, isEntityGroup };

/** A group's short name ("Lido" for "*lido"); undefined for an entity */
export function groupName(entity: string): string | undefined {
  return isEntityGroup(entity) ? ENTITY_GROUPS.find(({ id }) => id === entity.slice(1))?.name : undefined;
}

/** The group's id as the group tables key it ("lido" for "*lido") */
export const groupId = (group: string): string => group.slice(1);

/**
 * Entities with each group's members merged into one row named by the group value. Stake, validators and change
 * add up exactly, since every row covers the same two days. Largest stake first.
 */
export function groupStakes(entities: EntityStake[]): EntityStake[] {
  const merged = new Map<string, EntityStake>();
  const rest: EntityStake[] = [];
  for (const e of entities) {
    const group = entityGroupOf(e.entity);
    if (!group) {
      rest.push(e);
      continue;
    }
    const row = merged.get(group);
    merged.set(
      group,
      row
        ? {
            entity: group,
            validators: row.validators + e.validators,
            stakeEth: row.stakeEth + e.stakeEth,
            compoundingEth: row.compoundingEth + e.compoundingEth,
            series: row.series.map((v, i) =>
              v === null && e.series[i] === null ? null : (v ?? 0) + (e.series[i] ?? 0)
            ),
            startEth: row.startEth + e.startEth,
            changeEth: row.changeEth + e.changeEth,
          }
        : { ...e, entity: group }
    );
  }
  return [...rest, ...merged.values()].sort((a, b) => b.stakeEth - a.stakeEth);
}

/** Each group's member entities, largest stake first, keyed by the group value */
export function groupMembers(entities: EntityStake[]): Map<string, EntityStake[]> {
  const out = new Map<string, EntityStake[]>();
  for (const e of entities) {
    const group = entityGroupOf(e.entity);
    if (group) out.set(group, [...(out.get(group) ?? []), e]);
  }
  for (const list of out.values()) list.sort((a, b) => b.stakeEth - a.stakeEth);
  return out;
}

/** Counts with each group's members summed into one entry named by the group value; members are dropped */
export function groupCounts(counts: Map<string, PerformanceCounts>): Map<string, PerformanceCounts> {
  const out = new Map<string, PerformanceCounts>();
  for (const [entity, c] of counts) {
    const key = entityGroupOf(entity) ?? entity;
    out.set(key, addCounts(out.get(key) ?? EMPTY_COUNTS, c));
  }
  return out;
}

/** The counts of one entity, or the sum of a group's members; undefined when it has none */
export function countsOf(counts: Map<string, PerformanceCounts>, entity: string): PerformanceCounts | undefined {
  if (!isEntityGroup(entity)) return counts.get(entity);
  let sum: PerformanceCounts | undefined;
  for (const [member, c] of counts) {
    if (entityGroupOf(member) === entity) sum = addCounts(sum ?? EMPTY_COUNTS, c);
  }
  return sum;
}
