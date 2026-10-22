import type { JSX } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import clsx from 'clsx';
import { Alert } from '@/components/Feedback/Alert';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { RangePager } from '@/components/Lists/RangePager';
import { EpochSlotsTable } from '@/pages/ethereum/epochs/components';
import { useEntityProposalsPage } from '../../hooks/useEntityProposalsPage';

export interface EntityProposalsProps {
  entity: string;
}

/** Every block the entity proposed, newest first, paged back through the full history. */
export function EntityProposals({ entity }: EntityProposalsProps): JSX.Element {
  const { blocksFrom } = useSearch({ from: '/ethereum/entities/$entity' });
  const navigate = useNavigate({ from: '/ethereum/entities/$entity' });
  const { slots, page, isLoading, isPlaceholderData, error, resolveNewer } = useEntityProposalsPage(entity, blocksFrom);

  const goTo = (from: number | undefined): void => {
    navigate({ search: prev => ({ ...prev, blocksFrom: from }), replace: false, resetScroll: false });
  };

  if (error) return <Alert variant="error" title="Error loading proposals" description={error.message} />;
  if (isLoading) return <LoadingContainer className="h-96" />;

  return (
    <div className="flex flex-col gap-4">
      <RangePager page={page} noun="slot" onNavigate={goTo} onNewer={async () => goTo(await resolveNewer())} />
      {slots.length === 0 ? (
        <p className="text-sm text-muted">No proposals at or before this slot.</p>
      ) : (
        <div className={clsx('transition-opacity', isPlaceholderData && 'opacity-60')}>
          <EpochSlotsTable slots={slots} showSlotInEpoch={false} enableRealtimeHighlighting={false} sortOrder="desc" />
        </div>
      )}
    </div>
  );
}
