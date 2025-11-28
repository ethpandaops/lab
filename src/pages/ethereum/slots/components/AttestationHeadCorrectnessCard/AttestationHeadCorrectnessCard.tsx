import type { JSX } from 'react';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import type { AttestationHeadCorrectnessCardProps } from './AttestationHeadCorrectnessCard.types';

/**
 * AttestationHeadCorrectnessCard - Displays head correctness for attestations
 *
 * Shows the number of votes for the current block as a compact inline stat with gauge
 */
export function AttestationHeadCorrectnessCard({
  correctnessData,
}: AttestationHeadCorrectnessCardProps): JSX.Element | null {
  if (!correctnessData) {
    return null;
  }

  const { votes_head, votes_max } = correctnessData;
  const headPercentage = votes_max > 0 ? (votes_head / votes_max) * 100 : 0;

  return (
    <MiniStat
      label="Block Votes"
      value={votes_head.toLocaleString()}
      secondaryText={`/ ${votes_max.toLocaleString()} validators`}
      percentage={headPercentage}
    />
  );
}
