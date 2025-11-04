import { type JSX, useMemo } from 'react';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Table } from '@/components/Lists/Table';
import { Slot } from '@/components/Ethereum/Slot';
import type { FctBlockHead } from '@/api/types.gen';
import type { AttestationVotesBreakdownTableProps, VoteGroup } from './AttestationVotesBreakdownTable.types';

/**
 * Displays a breakdown of attestation votes grouped by target block root.
 * Shows which blocks validators were voting for in this slot.
 */
export function AttestationVotesBreakdownTable({
  attestationData,
  currentSlot,
  votedForBlocks,
  expectedValidatorCount,
  isLoading = false,
}: AttestationVotesBreakdownTableProps): JSX.Element {
  // Create a map of block_root -> block data for quick lookup
  const blockDataMap = useMemo(() => {
    const map = new Map<string, FctBlockHead>();
    votedForBlocks.forEach(block => {
      if (block.block_root) {
        map.set(block.block_root, block);
      }
    });
    return map;
  }, [votedForBlocks]);

  // Group attestations by block_root and count votes
  const voteGroups = useMemo((): VoteGroup[] => {
    const groupMap = new Map<string, VoteGroup>();

    attestationData.forEach(attestation => {
      const blockRoot = attestation.block_root;
      if (!blockRoot) return;

      const existing = groupMap.get(blockRoot);
      if (existing) {
        existing.voteCount++;
      } else {
        const blockData = blockDataMap.get(blockRoot);
        groupMap.set(blockRoot, {
          blockRoot,
          voteCount: 1,
          slot: attestation.slot,
          isCurrentSlot: attestation.slot === currentSlot,
          blockData,
        });
      }
    });

    // Convert to array and sort by vote count (descending)
    return Array.from(groupMap.values()).sort((a, b) => b.voteCount - a.voteCount);
  }, [attestationData, currentSlot, blockDataMap]);

  const totalVotes = voteGroups.reduce((sum, group) => sum + group.voteCount, 0);
  const offlineCount = expectedValidatorCount - totalVotes;

  // Create table data with offline row at the end
  const tableData = useMemo(() => {
    if (offlineCount <= 0) return voteGroups;

    return [
      ...voteGroups,
      {
        blockRoot: 'offline',
        voteCount: offlineCount,
        slot: undefined,
        isCurrentSlot: false,
        blockData: undefined,
      },
    ];
  }, [voteGroups, offlineCount]);

  return (
    <PopoutCard
      title="Attestation Vote Breakdown"
      subtitle={`Total votes: ${totalVotes.toLocaleString()} • Offline: ${offlineCount.toLocaleString()}`}
      modalDescription="Shows which blocks validators voted for as the head of the chain. Each row represents a different block that received attestations."
      noPadding
      modalSize="full"
    >
      {isLoading ? (
        <div className="px-6 py-8 text-center text-sm text-muted">Loading all attestation votes...</div>
      ) : voteGroups.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted">No attestation data available</div>
      ) : (
        <Table
          variant="nested"
          data={tableData}
          columns={[
            {
              header: 'Slot',
              accessor: group => {
                if (group.blockRoot === 'offline') {
                  return <span className="text-muted italic">Offline</span>;
                }
                const slot = group.blockData?.slot ?? group.slot;
                return slot !== undefined ? <Slot slot={slot} /> : <span className="text-muted">Unknown</span>;
              },
              cellClassName: 'w-24',
            },
            {
              header: 'Distance',
              accessor: group => {
                if (group.blockRoot === 'offline') {
                  return <span className="text-muted">-</span>;
                }
                const slot = group.blockData?.slot ?? group.slot;
                if (slot === undefined) return <span className="text-muted">-</span>;
                const distance = currentSlot - slot;
                return (
                  <span className={distance === 0 ? 'font-semibold text-foreground' : 'text-muted'}>
                    {distance === 0 ? 'Current' : `${distance}`}
                  </span>
                );
              },
              cellClassName: 'w-32',
            },
            {
              header: 'Block Root',
              accessor: group => {
                if (group.blockRoot === 'offline') {
                  return <span className="text-muted italic">No vote</span>;
                }
                return (
                  <span className="font-mono text-xs">
                    {group.blockRoot.slice(0, 10)}...{group.blockRoot.slice(-8)}
                  </span>
                );
              },
            },
            {
              header: 'Proposer',
              accessor: group => {
                if (group.blockRoot === 'offline') {
                  return <span className="text-muted">-</span>;
                }
                const proposerIndex = group.blockData?.proposer_index;
                return proposerIndex !== undefined ? (
                  <span className="text-muted">Validator {proposerIndex}</span>
                ) : (
                  <span className="text-muted">Unknown</span>
                );
              },
              cellClassName: 'w-32',
            },
            {
              header: 'Votes',
              accessor: group => <span className="font-semibold">{group.voteCount.toLocaleString()}</span>,
              cellClassName: 'w-24 text-right',
              headerClassName: 'text-right',
            },
            {
              header: '% of Total',
              accessor: group => (
                <span className="text-muted">{((group.voteCount / expectedValidatorCount) * 100).toFixed(1)}%</span>
              ),
              cellClassName: 'w-24 text-right',
              headerClassName: 'text-right',
            },
          ]}
          getRowKey={group => group.blockRoot}
        />
      )}
    </PopoutCard>
  );
}
