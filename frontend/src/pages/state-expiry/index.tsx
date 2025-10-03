import { useEffect, useState } from 'react';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { IntegratedContextualHeader } from '@/components/layout/IntegratedContextualHeader';
import { ChartWithStats, NivoLineChart, NivoPieChart } from '@/components/charts';
import { getRestApiClient } from '@/api/singleton';

interface StateExpiryData {
  totalEOAAccounts: number;
  totalContractAccounts: number;
  totalStorageSlots: number;
  topContractsBySlots: Array<{ address: string; slots: number }>;
  topContractsByExpiredSlots: Array<{ address: string; expiredSlots: number }>;
  overallExpiryPercentage: number;
  contractAccountsExpiryPercentage: number;
  eoaAccountsExpiryPercentage: number;
  storageSlotsExpiryPercentage: number;
  accountsAccessSeries: Array<{ blockWindow: number; firstAccess: number; lastAccess: number }>;
  storageAccessSeries: Array<{ blockWindow: number; firstAccess: number; lastAccess: number }>;
  expiryBlockWindow: number;
}

// Helper function to generate tick values at appropriate intervals for block numbers
const generateBlockTickValues = (values: number[]) => {
  if (values.length === 0) return [];

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  // Determine appropriate interval based on range
  let interval;
  if (range > 10000000) {
    // For ranges > 10M, use 2M intervals
    interval = 2000000;
  } else if (range > 5000000) {
    // For ranges 5-10M, use 1M intervals
    interval = 1000000;
  } else if (range > 2000000) {
    // For ranges 2-5M, use 500k intervals
    interval = 500000;
  } else {
    // For smaller ranges, use 200k intervals
    interval = 200000;
  }

  const start = Math.floor(minValue / interval) * interval;
  const end = Math.ceil(maxValue / interval) * interval;

  const ticks = [];
  for (let i = start; i <= end; i += interval) {
    if (i >= minValue && i <= maxValue) {
      ticks.push(i);
    }
  }

  // Ensure we don't have too many ticks (max 10)
  while (ticks.length > 10) {
    // Double the interval and regenerate
    interval *= 2;
    const newTicks = [];
    const newStart = Math.floor(minValue / interval) * interval;
    for (let i = newStart; i <= end; i += interval) {
      if (i >= minValue && i <= maxValue) {
        newTicks.push(i);
      }
    }
    ticks.length = 0;
    ticks.push(...newTicks);
  }

  return ticks;
};

// Helper function to get all Y-axis values from access series data
const getAccessValues = (
  data: Array<{ blockWindow: number; firstAccess: number; lastAccess: number }>,
) => {
  const values: number[] = [];
  data.forEach(d => {
    values.push(d.firstAccess, d.lastAccess);
  });
  return values;
};

export default function StateExpiryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StateExpiryData | null>(null);
  const [network] = useState('mainnet');

  useEffect(() => {
    const fetchStateExpiryData = async () => {
      try {
        setLoading(true);
        const restClient = await getRestApiClient();

        // Fetch all required data in parallel
        const [
          accessTotal,
          storageTotal,
          storageTop,
          storageExpiredTop,
          accessHistory,
          storageHistory,
        ] = await Promise.all([
          restClient.getStateExpiryAccessTotal(network),
          restClient.getStateExpiryStorageTotal(network),
          restClient.getStateExpiryStorageTop(network),
          restClient.getStateExpiryStorageExpiredTop(network),
          restClient.getStateExpiryAccessHistory(network),
          restClient.getStateExpiryStorageHistory(network),
        ]);

        // Process the data
        const totalAccounts = Number(accessTotal.item?.total_accounts || 0);
        const totalContractAccounts = Number(accessTotal.item?.total_contracts || 0);
        const expiredAccounts = Number(accessTotal.item?.expired_accounts || 0);
        const expiredContracts = Number(accessTotal.item?.expired_contracts || 0);
        const totalStorageSlots = Number(storageTotal.item?.total_storage_slots || 0);
        const expiredStorageSlots = Number(storageTotal.item?.expired_storage_slots || 0);

        // Calculate derived metrics
        const totalEOAAccounts = totalAccounts - totalContractAccounts;
        const expiredEOAAccounts = expiredAccounts - expiredContracts;

        // Calculate percentages
        const overallExpiryPercentage =
          totalAccounts > 0 ? (expiredAccounts / totalAccounts) * 100 : 0;
        const contractAccountsExpiryPercentage =
          totalContractAccounts > 0 ? (expiredContracts / totalContractAccounts) * 100 : 0;
        const eoaAccountsExpiryPercentage =
          totalEOAAccounts > 0 ? (expiredEOAAccounts / totalEOAAccounts) * 100 : 0;
        const storageSlotsExpiryPercentage =
          totalStorageSlots > 0 ? (expiredStorageSlots / totalStorageSlots) * 100 : 0;

        // Process top contracts data
        const topContractsBySlots = (storageTop.items || []).slice(0, 3).map((item: any) => ({
          address: item.contract_address,
          slots: Number(item.total_storage_slots || 0),
        }));

        const topContractsByExpiredSlots = (storageExpiredTop.items || [])
          .slice(0, 3)
          .map((item: any) => ({
            address: item.contract_address,
            expiredSlots: Number(item.expired_slots || 0),
          }));

        // Aggregate 10k chunks into 100k blocks (0-100k, 100k-200k, etc)
        const aggregateToHundredK = (items: any[], isStorage: boolean = false) => {
          const aggregated: any[] = [];
          const blockSize = 100000; // 100k blocks per group

          // Find the maximum block number to ensure we cover full range
          let maxBlock = 0;
          items.forEach(item => {
            const blockNum = Number(item.chunk_start_block_number || 0);
            if (blockNum > maxBlock) {
              maxBlock = blockNum;
            }
          });

          // Round up to next 100k boundary
          const maxGroupStart = Math.floor(maxBlock / blockSize) * blockSize;

          // Group items by 100k block ranges
          const groups = new Map<number, any[]>();

          // Initialize all groups from 0 to max with empty arrays
          for (let start = 0; start <= maxGroupStart; start += blockSize) {
            groups.set(start, []);
          }

          // Populate groups with actual data
          items.forEach(item => {
            const blockNum = Number(item.chunk_start_block_number || 0);
            const groupStart = Math.floor(blockNum / blockSize) * blockSize;
            groups.get(groupStart)!.push(item);
          });

          // Convert groups to aggregated data
          Array.from(groups.entries())
            .sort((a, b) => a[0] - b[0]) // Sort by block number
            .forEach(([blockStart, groupItems]) => {
              const firstAccessField = isStorage
                ? 'first_accessed_slots'
                : 'first_accessed_accounts';
              const lastAccessField = isStorage ? 'last_accessed_slots' : 'last_accessed_accounts';

              const firstAccess = groupItems.reduce(
                (sum, item) => sum + Number(item[firstAccessField] || 0),
                0,
              );
              const lastAccess = groupItems.reduce(
                (sum, item) => sum + Number(item[lastAccessField] || 0),
                0,
              );

              aggregated.push({
                blockWindow: blockStart,
                firstAccess,
                lastAccess,
              });
            });

          return aggregated;
        };

        // Process and aggregate to 100k blocks
        const accountsAccessSeries = aggregateToHundredK(accessHistory.items || [], false);
        const storageAccessSeries = aggregateToHundredK(storageHistory.items || [], true);

        // Default expiry block window (can be configured or calculated based on your requirements)
        const expiryBlockWindow = 18000000; // Default value, adjust as needed

        const transformedData: StateExpiryData = {
          totalEOAAccounts,
          totalContractAccounts,
          totalStorageSlots,
          topContractsBySlots,
          topContractsByExpiredSlots,
          overallExpiryPercentage,
          contractAccountsExpiryPercentage,
          eoaAccountsExpiryPercentage,
          storageSlotsExpiryPercentage,
          accountsAccessSeries,
          storageAccessSeries,
          expiryBlockWindow,
        };

        setData(transformedData);
      } catch (err) {
        console.error('Error fetching state expiry data:', err);
        setError('Failed to load state expiry data');
      } finally {
        setLoading(false);
      }
    };

    fetchStateExpiryData();
  }, [network]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <ErrorState message="No data available" />;
  }

  return (
    <div className="container mx-auto">
      <IntegratedContextualHeader
        title="State Expiry Analysis"
        description="Comprehensive analysis of Ethereum state expiry metrics including account statistics, storage utilization, and access patterns."
      />

      <div className="space-y-4">
        {/* First Row: Donut Chart Center with 6 Cards in 2 Side Columns */}
        <section className="mb-8">
          <div className="grid grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Account Statistics (3 columns) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col justify-between h-full">
              {/* Total EOA Accounts */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-sans font-bold text-primary mb-3">
                    Total EOA Accounts
                  </h3>
                  <div className="text-4xl font-mono font-bold text-accent">
                    {data.totalEOAAccounts.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Total Contract Accounts */}
              <div className="flex-1 my-4 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-sans font-bold text-primary mb-3">
                    Total Contract Accounts
                  </h3>
                  <div className="text-4xl font-mono font-bold text-accent">
                    {data.totalContractAccounts.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Total Storage Slots */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-sans font-bold text-primary mb-3">
                    Total Storage Slots
                  </h3>
                  <div className="text-4xl font-mono font-bold text-accent">
                    {data.totalStorageSlots.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Center Column: Overall Expiry Donut Chart (6 columns) */}
            <div className="col-span-12 lg:col-span-6 flex flex-col h-full">
              <h3 className="text-3xl font-sans font-bold text-primary mb-6 text-center">
                Overall Expiry
              </h3>
              <div className="flex-1 min-h-[600px] relative">
                <NivoPieChart
                  data={[
                    {
                      id: 'Expired',
                      label: 'Expired',
                      value: data.overallExpiryPercentage,
                      color: '#FF6B35',
                    },
                    {
                      id: 'Active',
                      label: 'Active',
                      value: 100 - data.overallExpiryPercentage,
                      color: '#0088FE',
                    },
                  ]}
                  innerRadius={0.6}
                  padAngle={1}
                  cornerRadius={3}
                  activeOuterRadiusOffset={12}
                  colors={['#FF6B35', '#0088FE']}
                  borderWidth={2}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#FFFFFF"
                  arcLinkLabelsThickness={3}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor="#FFFFFF"
                  valueFormat=".1f"
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  theme={{
                    labels: {
                      text: {
                        fontSize: 16,
                        fontWeight: 'bold',
                      },
                    },
                  }}
                  tooltip={({ datum }: any) => (
                    <div className="bg-surface border border-default rounded-lg p-3 shadow-lg">
                      <div className="text-sm font-mono">
                        <div className="font-bold text-primary">{datum.label}</div>
                        <div className="text-accent">{datum.value.toFixed(2)}%</div>
                      </div>
                    </div>
                  )}
                />
                {/* Center text overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-5xl font-mono font-bold text-warning">
                      {data.overallExpiryPercentage.toFixed(2)}%
                    </div>
                    <div className="text-lg font-mono text-secondary">Expired</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Expiry Percentages (3 columns) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col justify-between h-full">
              {/* EOA Accounts Expiry */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-sans font-bold text-primary mb-3">EOA Expiry</h3>
                  <div className="text-4xl font-mono font-bold text-warning">
                    {data.eoaAccountsExpiryPercentage.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Contract Accounts Expiry */}
              <div className="flex-1 my-4 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-sans font-bold text-primary mb-3">Contract Expiry</h3>
                  <div className="text-4xl font-mono font-bold text-warning">
                    {data.contractAccountsExpiryPercentage.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Storage Slots Expiry */}
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-sans font-bold text-primary mb-3">Storage Expiry</h3>
                  <div className="text-4xl font-mono font-bold text-warning">
                    {data.storageSlotsExpiryPercentage.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Second Row: Top Contracts in 2 Columns */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 3 Contracts by Storage Slots */}
            <div>
              <h3 className="text-xl font-sans font-bold text-primary mb-4">
                Top 3 Contracts by Storage Slots
              </h3>
              <div className="space-y-3">
                {data.topContractsBySlots.map((contract, index) => (
                  <div
                    key={contract.address}
                    className="flex justify-between items-center p-3 bg-surface/50 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-mono text-secondary">#{index + 1}</div>
                      <div
                        className="text-xs font-mono text-tertiary truncate max-w-[300px]"
                        title={contract.address}
                      >
                        {contract.address}
                      </div>
                    </div>
                    <div className="text-lg font-mono font-bold text-accent">
                      {contract.slots.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 Contracts by Expired Storage Slots */}
            <div>
              <h3 className="text-xl font-sans font-bold text-primary mb-4">
                Top 3 Contracts by Expired Slots
              </h3>
              <div className="space-y-3">
                {data.topContractsByExpiredSlots.map((contract, index) => (
                  <div
                    key={contract.address}
                    className="flex justify-between items-center p-3 bg-surface/50 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-mono text-secondary">#{index + 1}</div>
                      <div
                        className="text-xs font-mono text-tertiary truncate max-w-[300px]"
                        title={contract.address}
                      >
                        {contract.address}
                      </div>
                    </div>
                    <div className="text-lg font-mono font-bold text-error">
                      {contract.expiredSlots.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Access Patterns Charts */}
        <section className="mb-16">
          {/* <h2 className="text-2xl font-sans font-bold text-primary mb-6">Access Patterns</h2> */}
          <div className="space-y-8">
            {/* Accounts Access Series Chart */}
            <ChartWithStats
              title="Accounts Access Patterns"
              description={`First and last access patterns for accounts (100k block intervals, ${data.accountsAccessSeries.length} data points)`}
              chart={
                <NivoLineChart
                  data={[
                    {
                      id: 'Last Access',
                      data: data.accountsAccessSeries.map(point => ({
                        x: point.blockWindow,
                        y: point.lastAccess,
                      })),
                    },
                    {
                      id: 'First Access',
                      data: data.accountsAccessSeries.map(point => ({
                        x: point.blockWindow,
                        y: point.firstAccess,
                      })),
                    },
                  ]}
                  axisBottom={{
                    legend: 'Block Number',
                    legendOffset: 36,
                    legendPosition: 'middle',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    format: (value: any) => {
                      const numValue = Number(value);
                      return `${(numValue / 1000000).toFixed(0)}M`;
                    },
                    tickValues: [0, 4000000, 8000000, 12000000, 16000000, 20000000],
                  }}
                  axisLeft={{
                    legend: 'Access Count',
                    legendOffset: -40,
                    legendPosition: 'middle',
                    format: (value: any) => {
                      const numValue = Number(value);
                      if (numValue === 0) return '0';
                      if (numValue >= 1000000) {
                        return `${(numValue / 1000000).toFixed(1)}M`;
                      } else if (numValue >= 1000) {
                        return `${(numValue / 1000).toFixed(0)}k`;
                      }
                      return numValue.toString();
                    },
                  }}
                  colors={['#0088FE', '#FF6B35']}
                  pointSize={0}
                  enableGridX={false}
                  enableGridY={false}
                  enableSlices={'x'}
                  sliceTooltip={({ slice }: any) => {
                    // Points are in the order they were defined in the data array
                    const firstAccessPoint = slice.points[0]; // First Access series
                    const lastAccessPoint = slice.points[1]; // Last Access series
                    return (
                      <div className="bg-surface border border-default rounded-lg p-3 shadow-lg">
                        <div className="text-sm font-mono">
                          <div className="font-bold mb-2 text-primary">
                            Block Interval: {firstAccessPoint.data.x.toLocaleString()} -{' '}
                            {(firstAccessPoint.data.x + 99999).toLocaleString()}
                          </div>
                          <div className="mb-1" style={{ color: '#FF6B35' }}>
                            First Access Count: {firstAccessPoint.data.y.toLocaleString()}
                          </div>
                          <div style={{ color: '#0088FE' }}>
                            Last Access Count: {lastAccessPoint.data.y.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                  markers={[
                    {
                      axis: 'x',
                      value: data.expiryBlockWindow,
                      lineStyle: {
                        stroke: '#FFFFFF',
                        strokeWidth: 2,
                        strokeDasharray: '5 5',
                      },
                      legend: 'expiry threshold',
                      legendOrientation: 'vertical',
                      textStyle: {
                        fill: '#FFFFFF',
                        fontSize: 12,
                      },
                    },
                  ]}
                  legends={[
                    {
                      anchor: 'top-left',
                      direction: 'column',
                      justify: true,
                      translateX: 15,
                      translateY: 0,
                      itemsSpacing: 2,
                      itemDirection: 'left-to-right',
                      itemWidth: 100,
                      itemHeight: 20,
                      symbolSize: 12,
                      symbolShape: 'circle',
                    },
                  ]}
                />
              }
              series={[
                {
                  name: 'First Access',
                  color: '#0088FE',
                  min: Math.min(...data.accountsAccessSeries.map(p => p.firstAccess)),
                  avg: Math.round(
                    data.accountsAccessSeries.reduce((sum, p) => sum + p.firstAccess, 0) /
                      data.accountsAccessSeries.length,
                  ),
                  max: Math.max(...data.accountsAccessSeries.map(p => p.firstAccess)),
                  last:
                    data.accountsAccessSeries[data.accountsAccessSeries.length - 1]?.firstAccess ||
                    0,
                },
                {
                  name: 'Last Access',
                  color: '#FF6B35',
                  min: Math.min(...data.accountsAccessSeries.map(p => p.lastAccess)),
                  avg: Math.round(
                    data.accountsAccessSeries.reduce((sum, p) => sum + p.lastAccess, 0) /
                      data.accountsAccessSeries.length,
                  ),
                  max: Math.max(...data.accountsAccessSeries.map(p => p.lastAccess)),
                  last:
                    data.accountsAccessSeries[data.accountsAccessSeries.length - 1]?.lastAccess ||
                    0,
                },
              ]}
              height={400}
              showSeriesTable={false}
            />

            {/* Storage Access Series Chart */}
            <ChartWithStats
              title="Storage Access Patterns"
              description={`First and last access patterns for storage (100k block intervals, ${data.storageAccessSeries.length} data points)`}
              chart={
                <NivoLineChart
                  data={[
                    {
                      id: 'Last Access',
                      data: data.storageAccessSeries.map(point => ({
                        x: point.blockWindow,
                        y: point.lastAccess,
                      })),
                    },
                    {
                      id: 'First Access',
                      data: data.storageAccessSeries.map(point => ({
                        x: point.blockWindow,
                        y: point.firstAccess,
                      })),
                    },
                  ]}
                  axisBottom={{
                    legend: 'Block Number',
                    legendOffset: 36,
                    legendPosition: 'middle',
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    format: (value: any) => {
                      const numValue = Number(value);
                      return `${(numValue / 1000000).toFixed(0)}M`;
                    },
                    tickValues: [0, 4000000, 8000000, 12000000, 16000000, 20000000],
                  }}
                  axisLeft={{
                    legend: 'Access Count',
                    legendOffset: -40,
                    legendPosition: 'middle',
                    format: (value: any) => {
                      const numValue = Number(value);
                      if (numValue === 0) return '0';
                      if (numValue >= 1000000) {
                        return `${(numValue / 1000000).toFixed(1)}M`;
                      } else if (numValue >= 1000) {
                        return `${(numValue / 1000).toFixed(0)}k`;
                      }
                      return numValue.toString();
                    },
                  }}
                  colors={['#0088FE', '#FF6B35']}
                  pointSize={0}
                  enableGridX={false}
                  enableGridY={false}
                  enableSlices={'x'}
                  sliceTooltip={({ slice }: any) => {
                    const firstAccessPoint = slice.points[0]; // First Access series
                    const lastAccessPoint = slice.points[1]; // Last Access series
                    return (
                      <div className="bg-surface border border-default rounded-lg p-3 shadow-lg">
                        <div className="text-sm font-mono">
                          <div className="font-bold mb-2 text-primary">
                            Block Interval: {firstAccessPoint.data.x.toLocaleString()} -{' '}
                            {(firstAccessPoint.data.x + 99999).toLocaleString()}
                          </div>
                          <div className="mb-1" style={{ color: '#FF6B35' }}>
                            First Access Count: {firstAccessPoint.data.y.toLocaleString()}
                          </div>
                          <div style={{ color: '#0088FE' }}>
                            Last Access Count: {lastAccessPoint.data.y.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                  markers={[
                    {
                      axis: 'x',
                      value: data.expiryBlockWindow,
                      lineStyle: {
                        stroke: '#FFFFFF',
                        strokeWidth: 2,
                        strokeDasharray: '5 5',
                      },
                      legend: 'expiry threshold',
                      legendOrientation: 'vertical',
                      textStyle: {
                        fill: '#FFFFFF',
                        fontSize: 12,
                      },
                    },
                  ]}
                  legends={[
                    {
                      anchor: 'top-left',
                      direction: 'column',
                      justify: true,
                      translateX: 15,
                      translateY: 0,
                      itemsSpacing: 2,
                      itemDirection: 'left-to-right',
                      itemWidth: 100,
                      itemHeight: 20,
                      symbolSize: 12,
                      symbolShape: 'circle',
                    },
                  ]}
                />
              }
              series={[
                {
                  name: 'First Access',
                  color: '#0088FE',
                  min: Math.min(...data.storageAccessSeries.map(p => p.firstAccess)),
                  avg: Math.round(
                    data.storageAccessSeries.reduce((sum, p) => sum + p.firstAccess, 0) /
                      data.storageAccessSeries.length,
                  ),
                  max: Math.max(...data.storageAccessSeries.map(p => p.firstAccess)),
                  last:
                    data.storageAccessSeries[data.storageAccessSeries.length - 1]?.firstAccess || 0,
                },
                {
                  name: 'Last Access',
                  color: '#FF6B35',
                  min: Math.min(...data.storageAccessSeries.map(p => p.lastAccess)),
                  avg: Math.round(
                    data.storageAccessSeries.reduce((sum, p) => sum + p.lastAccess, 0) /
                      data.storageAccessSeries.length,
                  ),
                  max: Math.max(...data.storageAccessSeries.map(p => p.lastAccess)),
                  last:
                    data.storageAccessSeries[data.storageAccessSeries.length - 1]?.lastAccess || 0,
                },
              ]}
              height={400}
              showSeriesTable={false}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
