import { type JSX, useMemo } from 'react';
import { Header } from '@/components/Layout/Header';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { useStateSizeData } from './hooks';
import { StateSizeSkeleton } from './components';

/**
 * Format bytes to a human-readable string (GB/TB)
 */
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(2)} GB`;
}

/**
 * State Size page - Shows Ethereum execution layer state growth over time
 */
export function IndexPage(): JSX.Element {
  const { data, latestData, isLoading, error } = useStateSizeData();

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const labels = data.map(item => item.dateLabel);
    const bytesToGB = (bytes: number): number => bytes / (1024 * 1024 * 1024);

    return {
      labels,
      series: [
        {
          name: 'Total State',
          data: data.map(item => bytesToGB(item.total_bytes)),
          showArea: true,
        },
        {
          name: 'Account Data',
          data: data.map(item => bytesToGB(item.account_bytes)),
        },
        {
          name: 'Account Trie Nodes',
          data: data.map(item => bytesToGB(item.account_trienode_bytes)),
        },
        {
          name: 'Storage Data',
          data: data.map(item => bytesToGB(item.storage_bytes)),
        },
        {
          name: 'Storage Trie Nodes',
          data: data.map(item => bytesToGB(item.storage_trienode_bytes)),
        },
        {
          name: 'Contract Code',
          data: data.map(item => bytesToGB(item.contract_code_bytes)),
        },
      ],
    };
  }, [data]);

  return (
    <Container>
      <Header
        title="State Size"
        description="Ethereum execution layer state size growth over time, showing accounts, storage, and contract code"
      />

      {isLoading && <StateSizeSkeleton />}

      {error && (
        <Card className="p-6">
          <p className="text-danger">Failed to load state size data: {error.message}</p>
        </Card>
      )}

      {(chartData || latestData) && (
        <div className="space-y-6">
          {/* Summary stats */}
          {latestData && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs text-muted">Total State Size</p>
                <p className="text-2xl font-bold text-foreground">{formatBytes(latestData.total_bytes)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted">Total Accounts</p>
                <p className="text-2xl font-bold text-foreground">{latestData.accounts.toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted">Storage Slots</p>
                <p className="text-2xl font-bold text-foreground">{latestData.storages.toLocaleString()}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted">Contract Codes</p>
                <p className="text-2xl font-bold text-foreground">{latestData.contract_codes.toLocaleString()}</p>
              </Card>
            </div>
          )}

          {/* Main chart */}
          {chartData && (
            <Card className="p-6">
              <MultiLineChart
                title="State Size Over Time"
                subtitle="Daily snapshot of Ethereum state components"
                series={chartData.series}
                xAxis={{
                  type: 'category',
                  labels: chartData.labels,
                  name: 'Date',
                }}
                yAxis={{
                  name: 'Size (GB)',
                  min: 0,
                  valueDecimals: 2,
                }}
                height={500}
                showLegend={true}
                enableDataZoom={true}
              />
            </Card>
          )}
        </div>
      )}
    </Container>
  );
}
