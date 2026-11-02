import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { CLIENT_WINDOW_OPTIONS } from '../../constants';
import { useGraffitiBlocks } from '../../hooks';
import { EntityTable } from '../EntityTable';
import { GraffitiBlocksTable } from '../GraffitiBlocksTable';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * Who proposes blocks with the client: entities by blocks and their current version, and the latest blocks.
 */
export function ProposersTab({
  client,
  layer,
  blocks,
  blocksLoading,
  since,
  window,
  onWindowChange,
}: ClientTabProps): JSX.Element {
  const recent = useGraffitiBlocks({
    since,
    ...(layer === 'consensus' ? { consensusClient: client } : { executionClient: client }),
  });

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl options={CLIENT_WINDOW_OPTIONS} value={window} onChange={onWindowChange} ariaLabel="Window" />
      <Card rounded title="Entities" subtitle="By blocks proposed with this client">
        {blocksLoading ? (
          <LoadingContainer className="h-64 rounded-sm" />
        ) : (
          <EntityTable client={client} blocks={blocks} />
        )}
      </Card>
      <GraffitiBlocksTable
        blocks={recent.blocks}
        isLoading={recent.isLoading}
        error={recent.error}
        hasNextPage={recent.hasNextPage}
        isFetchingNextPage={recent.isFetchingNextPage}
        onLoadMore={recent.fetchNextPage}
      />
    </div>
  );
}
