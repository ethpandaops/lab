import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import clsx from 'clsx';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Table } from '@/components/Lists/Table';
import { RangePager } from '@/components/Lists/RangePager';

import { Epoch } from '@/components/Ethereum/Epoch';
import { TopEntitiesChart } from '@/components/Ethereum/TopEntitiesChart';
import { Timestamp } from '@/components/DataDisplay/Timestamp';

import { useEpochsData } from './hooks';
import { EpochsSkeleton } from './components/EpochsSkeleton';
import { OfflineValidatorsTable } from './components/OfflineValidatorsTable';

/**
 * Epochs list page - one page of epochs at a time, newest first, navigable back to the earliest
 * indexed epoch
 *
 * Shows:
 * - Epoch number
 * - Start timestamp
 * - Block counts (canonical/missed)
 * - Attestation participation
 *
 * Allows navigation to epoch detail page
 */
export function IndexPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { from } = useSearch({ from: '/ethereum/epochs/' });
  const { epochs, missedAttestationsByEntity, isLoading, isPlaceholderData, error, currentEpoch, page } =
    useEpochsData(from);

  const goToPage = useCallback(
    (next: number | undefined) => navigate({ to: '/ethereum/epochs', search: prev => ({ ...prev, from: next }) }),
    [navigate]
  );

  const tableData = epochs.map(epoch => {
    const isCurrent = epoch.epoch === currentEpoch;
    // For current epoch, show "-" for missed blocks since it's incomplete
    const missedBlocks = isCurrent ? null : epoch.missedBlockCount;

    return {
      epoch: epoch.epoch,
      timestamp: epoch.epochStartDateTime,
      blocks: `${epoch.canonicalBlockCount}/${epoch.canonicalBlockCount + epoch.missedBlockCount}`,
      missedBlocks,
      participation: `${(epoch.participationRate * 100).toFixed(2)}%`,
      participationValue: epoch.participationRate,
      isCurrent,
    };
  });

  // Handle row click navigation
  const handleRowClick = (row: (typeof tableData)[0]): void => {
    navigate({
      to: '/ethereum/epochs/$epoch',
      params: { epoch: row.epoch.toString() },
    });
  };

  if (isLoading) {
    return (
      <Container>
        <Header title="Epochs" />
        <EpochsSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Epochs" />
        <Alert variant="error" title="Error loading epochs" description={error.message} />
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Epochs" />

      <RangePager page={page} noun="epoch" onNavigate={goToPage} className="mb-4" />

      <div className={clsx('flex flex-col gap-6 transition-opacity', isPlaceholderData && 'opacity-60')}>
        <Table
          variant="nested"
          data={tableData}
          columns={[
            {
              header: 'Epoch',
              accessor: row => (
                <span className={row.isCurrent ? 'font-bold text-primary' : ''}>
                  <Epoch epoch={row.epoch} />
                </span>
              ),
            },
            {
              header: 'Start Time',
              accessor: row => <Timestamp timestamp={row.timestamp} format="short" />,
            },
            {
              header: 'Relative Time',
              accessor: row => <Timestamp timestamp={row.timestamp} format="relative" />,
            },
            {
              header: 'Blocks',
              accessor: 'blocks',
            },
            {
              header: 'Missed Blocks',
              accessor: row => {
                if (row.missedBlocks === null) {
                  return <span className="text-muted">-</span>;
                }
                return <span className={row.missedBlocks > 0 ? 'text-warning' : 'text-muted'}>{row.missedBlocks}</span>;
              },
            },
            {
              header: 'Participation %',
              accessor: row => (
                <span
                  className={
                    row.participationValue < 0.95
                      ? 'text-warning'
                      : row.participationValue >= 0.99
                        ? 'text-success'
                        : 'text-muted'
                  }
                >
                  {row.participation}
                </span>
              ),
            },
          ]}
          onRowClick={handleRowClick}
        />

        <TopEntitiesChart
          data={missedAttestationsByEntity.map(m => ({ x: m.epoch, entity: m.entity, count: m.count }))}
          xAxis={{
            name: 'Epoch',
            min: epochs.length > 0 ? Math.min(...epochs.map(e => e.epoch)) : undefined,
            max: epochs.length > 0 ? Math.max(...epochs.map(e => e.epoch)) : undefined,
          }}
          yAxis={{ name: 'Missed' }}
          title="Offline Validators"
          topN={10}
          anchorId="offline-validators-chart"
          emptyMessage="No offline validators in these epochs"
        />

        <OfflineValidatorsTable data={missedAttestationsByEntity} epochs={epochs.map(e => e.epoch)} />
      </div>
    </Container>
  );
}
