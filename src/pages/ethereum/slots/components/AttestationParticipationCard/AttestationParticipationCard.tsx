import type { JSX } from 'react';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import type { AttestationParticipationCardProps } from './AttestationParticipationCard.types';

/**
 * AttestationParticipationCard - Displays overall attestation participation for a slot
 *
 * Shows the participation count as a compact inline stat with gauge
 */
export function AttestationParticipationCard({
  correctnessData,
}: AttestationParticipationCardProps): JSX.Element | null {
  if (!correctnessData) {
    return null;
  }

  const { votes_head, votes_max, votes_other } = correctnessData;
  const totalVotes = votes_head + votes_other;
  const participationPercentage = votes_max > 0 ? (totalVotes / votes_max) * 100 : 0;

  return (
    <MiniStat
      label="Participation"
      value={totalVotes.toLocaleString()}
      secondaryText={`/ ${votes_max.toLocaleString()} validators`}
      percentage={participationPercentage}
    />
  );
}
