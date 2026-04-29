import { type JSX } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { useNetwork } from '@/hooks/useNetwork';
import {
  fctNodeCpuUtilizationHourlyServiceListOptions,
  fctNodeCpuUtilizationDailyServiceListOptions,
  fctNodeMemoryUsageHourlyServiceListOptions,
  fctNodeMemoryUsageDailyServiceListOptions,
  fctNodeDiskIoHourlyServiceListOptions,
  fctNodeDiskIoDailyServiceListOptions,
  fctNodeNetworkIoHourlyServiceListOptions,
  fctNodeNetworkIoDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { TIME_PERIOD_OPTIONS, TIME_RANGE_CONFIG } from './constants';
import type { TimePeriod } from './constants';
import { getTimeRange } from './utils';
import { NodeTable } from './components/NodeTable';
import { NodeCpuChart } from './components/NodeCpuChart';
import { NodeMemoryChart } from './components/NodeMemoryChart';
import { NodeDiskIoChart } from './components/NodeDiskIoChart';
import { NodeNetworkIoChart } from './components/NodeNetworkIoChart';

export function IndexPage(): JSX.Element {
  const search = useSearch({ from: '/xatu/nodes/' });
  const navigate = useNavigate({ from: '/xatu/nodes/' });
  const { currentNetwork } = useNetwork();

  const timePeriod: TimePeriod = search.t ?? '24h';
  const networkName = currentNetwork?.name ?? 'mainnet';
  const config = TIME_RANGE_CONFIG[timePeriod];
  const range = getTimeRange(config.days, config.dataType);

  const isHourly = config.dataType === 'hourly';

  // CPU data
  const cpuHourlyQuery = useQuery({
    ...fctNodeCpuUtilizationHourlyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        hour_start_date_time_gte: range.gte as number,
        hour_start_date_time_lte: range.lte as number,
        page_size: config.pageSize,
        order_by: 'hour_start_date_time ASC',
      },
    }),
    enabled: isHourly,
  });

  const cpuDailyQuery = useQuery({
    ...fctNodeCpuUtilizationDailyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        page_size: config.pageSize,
        order_by: 'day_start_date ASC',
      },
    }),
    enabled: !isHourly,
  });

  // Memory data
  const memoryHourlyQuery = useQuery({
    ...fctNodeMemoryUsageHourlyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        hour_start_date_time_gte: range.gte as number,
        hour_start_date_time_lte: range.lte as number,
        page_size: config.pageSize,
        order_by: 'hour_start_date_time ASC',
      },
    }),
    enabled: isHourly,
  });

  const memoryDailyQuery = useQuery({
    ...fctNodeMemoryUsageDailyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        page_size: config.pageSize,
        order_by: 'day_start_date ASC',
      },
    }),
    enabled: !isHourly,
  });

  // Disk I/O data
  const diskHourlyQuery = useQuery({
    ...fctNodeDiskIoHourlyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        hour_start_date_time_gte: range.gte as number,
        hour_start_date_time_lte: range.lte as number,
        page_size: config.pageSize,
        order_by: 'hour_start_date_time ASC',
      },
    }),
    enabled: isHourly,
  });

  const diskDailyQuery = useQuery({
    ...fctNodeDiskIoDailyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        page_size: config.pageSize,
        order_by: 'day_start_date ASC',
      },
    }),
    enabled: !isHourly,
  });

  // Network I/O data
  const networkHourlyQuery = useQuery({
    ...fctNodeNetworkIoHourlyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        hour_start_date_time_gte: range.gte as number,
        hour_start_date_time_lte: range.lte as number,
        page_size: config.pageSize,
        order_by: 'hour_start_date_time ASC',
      },
    }),
    enabled: isHourly,
  });

  const networkDailyQuery = useQuery({
    ...fctNodeNetworkIoDailyServiceListOptions({
      query: {
        meta_network_name_eq: networkName,
        page_size: config.pageSize,
        order_by: 'day_start_date ASC',
      },
    }),
    enabled: !isHourly,
  });

  const cpuData = isHourly
    ? (cpuHourlyQuery.data?.fct_node_cpu_utilization_hourly ?? [])
    : (cpuDailyQuery.data?.fct_node_cpu_utilization_daily ?? []);
  const memoryData = isHourly
    ? (memoryHourlyQuery.data?.fct_node_memory_usage_hourly ?? [])
    : (memoryDailyQuery.data?.fct_node_memory_usage_daily ?? []);
  const diskData = isHourly
    ? (diskHourlyQuery.data?.fct_node_disk_io_hourly ?? [])
    : (diskDailyQuery.data?.fct_node_disk_io_daily ?? []);
  const networkData = isHourly
    ? (networkHourlyQuery.data?.fct_node_network_io_hourly ?? [])
    : (networkDailyQuery.data?.fct_node_network_io_daily ?? []);

  const isLoading = isHourly
    ? cpuHourlyQuery.isLoading ||
      memoryHourlyQuery.isLoading ||
      diskHourlyQuery.isLoading ||
      networkHourlyQuery.isLoading
    : cpuDailyQuery.isLoading || memoryDailyQuery.isLoading || diskDailyQuery.isLoading || networkDailyQuery.isLoading;

  return (
    <Container>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Header title="Nodes" description="Monitor Xatu node hardware specs and resource utilization." />

        <div className="flex flex-wrap items-center gap-1.5">
          {TIME_PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => navigate({ search: prev => ({ ...prev, t: value }), replace: true })}
              className={clsx(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                timePeriod === value
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface text-muted ring-1 ring-border hover:bg-primary/10 hover:ring-primary/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-sm bg-surface" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-sm bg-surface" />
            <div className="h-80 animate-pulse rounded-sm bg-surface" />
            <div className="h-80 animate-pulse rounded-sm bg-surface" />
            <div className="h-80 animate-pulse rounded-sm bg-surface" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Node table - only for hourly data (has hourly-typed fields) */}
          {isHourly && (
            <NodeTable
              cpuData={cpuData as import('@/api/types.gen').FctNodeCpuUtilizationHourly[]}
              memoryData={memoryData as import('@/api/types.gen').FctNodeMemoryUsageHourly[]}
            />
          )}

          {/* Charts grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <NodeCpuChart data={cpuData} timePeriod={timePeriod} />
            <NodeMemoryChart data={memoryData} timePeriod={timePeriod} />
            <NodeDiskIoChart data={diskData} timePeriod={timePeriod} />
            <NodeNetworkIoChart data={networkData} timePeriod={timePeriod} />
          </div>
        </div>
      )}
    </Container>
  );
}
