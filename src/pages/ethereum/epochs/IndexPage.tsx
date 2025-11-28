import { useNavigate } from '@tanstack/react-router';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Table } from '@/components/Lists/Table';

import { Epoch } from '@/components/Ethereum/Epoch';
import { TopEntitiesChart } from '@/components/Ethereum/TopEntitiesChart';
import { Timestamp } from '@/components/DataDisplay/Timestamp';

import { useEpochsData } from './hooks';
import { EpochsSkeleton } from './components/EpochsSkeleton';

/**
 * Epochs list page - displays the last 5 recent epochs
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
  const { epochs, missedAttestationsByEntity, isLoading, error, currentEpoch } = useEpochsData();

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
        <Header title="Epochs" description="Explore Ethereum beacon chain epochs and their attestation data" />
        <EpochsSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Epochs" description="Explore Ethereum beacon chain epochs and their attestation data" />
        <Alert variant="error" title="Error loading epochs" description={error.message} />
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Epochs" description="Explore Ethereum beacon chain epochs and their attestation data" />

      <div className="mt-6">
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

        <div className="mt-4 text-sm text-muted">
          <p>Click on an epoch to view detailed analytics including slot-by-slot data.</p>
        </div>
      </div>

      <div id="metrics" className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Metrics</h2>
        <TopEntitiesChart
          data={missedAttestationsByEntity.map(m => ({ x: m.epoch, entity: m.entity, count: m.count }))}
          xAxis={{
            name: 'Epoch',
            min: epochs.length > 0 ? Math.min(...epochs.map(e => e.epoch)) : undefined,
            max: epochs.length > 0 ? Math.max(...epochs.map(e => e.epoch)) : undefined,
          }}
          yAxis={{ name: 'Missed' }}
          title="Offline Validators"
          topN={Infinity}
          anchorId="offline-validators-chart"
          emptyMessage="No offline validators detected in these epochs"
        />
      </div>
    </Container>
  );
}
