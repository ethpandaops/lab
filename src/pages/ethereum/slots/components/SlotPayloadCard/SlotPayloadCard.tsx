import type { JSX } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import { Badge } from '@/components/Elements/Badge';
import { useNetwork } from '@/hooks/useNetwork';
import { getForkForSlot, isForkAtOrAfter } from '@/utils/beacon';
import { derivePayloadStatus, isSelfBuiltPayload, formatWeiAsEth, type PayloadStatus } from '@/utils/epbs';
import { useSlotPayloadData } from '../../hooks/useSlotPayloadData';
import type { SlotPayloadCardProps } from './SlotPayloadCard.types';

const STATUS_LABELS: Record<PayloadStatus, string> = {
  payload_present: 'Payload delivered',
  payload_late: 'Payload late',
  payload_withheld: 'Payload withheld',
  pending: 'Awaiting data',
};

const STATUS_COLORS: Record<PayloadStatus, 'green' | 'yellow' | 'red' | 'gray'> = {
  payload_present: 'green',
  payload_late: 'yellow',
  payload_withheld: 'red',
  pending: 'gray',
};

/**
 * SlotPayloadCard - The gloas (ePBS) payload lifecycle for a slot.
 *
 * Shows the winning builder bid committed in the block, when sentries first
 * saw the revealed payload envelope, when it became fully available, and the
 * Payload Timeliness Committee's verdict. Renders nothing before gloas.
 */
export function SlotPayloadCard({ slot, proposerIndex, hasBlock }: SlotPayloadCardProps): JSX.Element | null {
  const { currentNetwork } = useNetwork();
  const fork = getForkForSlot(slot, currentNetwork);
  const isGloas = isForkAtOrAfter(fork, 'gloas');

  const { data, isLoading } = useSlotPayloadData(slot, isGloas);

  if (!isGloas) {
    return null;
  }

  const { bid, payloadFirstSeen, payloadAvailable, ptcVote } = data;
  const { status, firstSeenMs, seenByNodes, presentVotes, ptcVotesSeen } = derivePayloadStatus({
    hasBlock,
    payloadFirstSeen,
    ptcVote,
  });

  const selfBuilt = isSelfBuiltPayload(bid, proposerIndex);
  const bidEth = formatWeiAsEth(bid?.value);
  const firstAvailableMs =
    payloadAvailable.length > 0
      ? Math.min(...payloadAvailable.map(node => node.available_slot_start_diff ?? Number.POSITIVE_INFINITY))
      : undefined;
  const presentPercentage = ptcVotesSeen > 0 ? (presentVotes / ptcVotesSeen) * 100 : undefined;
  const blobVotes = ptcVote?.blob_data_available_votes;

  return (
    <PopoutCard title="Payload" subtitle="ePBS payload lifecycle: bid, reveal, PTC verdict" anchorId="slot-payload">
      {() => (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={STATUS_COLORS[isLoading ? 'pending' : status]}>
              {STATUS_LABELS[isLoading ? 'pending' : status]}
            </Badge>
            {selfBuilt && <Badge color="blue">Self-built</Badge>}
            {bid && !selfBuilt && <Badge color="purple">Builder #{bid.builder_index}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MiniStat
              label="Winning bid"
              value={bidEth !== undefined ? `${bidEth} ETH` : '—'}
              secondaryText={bid?.blob_kzg_commitment_count ? `${bid.blob_kzg_commitment_count} blobs` : undefined}
            />
            <MiniStat
              label="Payload first seen"
              value={firstSeenMs !== undefined && Number.isFinite(firstSeenMs) ? `${firstSeenMs}ms` : '—'}
              secondaryText={seenByNodes > 0 ? `${seenByNodes} nodes` : undefined}
            />
            <MiniStat
              label="Verified available"
              value={
                firstAvailableMs !== undefined && Number.isFinite(firstAvailableMs) ? `${firstAvailableMs}ms` : '—'
              }
              secondaryText={payloadAvailable.length > 0 ? `${payloadAvailable.length} nodes` : undefined}
            />
            <MiniStat
              label="PTC present votes"
              value={ptcVotesSeen > 0 ? presentVotes.toLocaleString() : '—'}
              secondaryText={
                ptcVotesSeen > 0
                  ? `/ ${ptcVotesSeen.toLocaleString()} seen${blobVotes !== undefined ? `, ${blobVotes.toLocaleString()} blob-available` : ''}`
                  : undefined
              }
              percentage={presentPercentage}
            />
          </div>
        </div>
      )}
    </PopoutCard>
  );
}
