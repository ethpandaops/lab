import { FC, useMemo } from 'react';
import {
  LocallyBuiltSlotBlocks,
  LocallyBuiltBlock,
} from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatEther } from '@/utils/format.ts';

interface BlockValueDistributionProps {
  data: LocallyBuiltSlotBlocks[];
  isLoading: boolean;
}

interface ChartDataItem {
  name: string;
  value: number;
  blockCount: number;
  avgValue: number;
}

// Custom tooltip for PieChart
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataItem;
  }>;
}

const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-surface/90 backdrop-blur-sm border border-subtle shadow-md p-3 rounded text-xs font-mono">
      <p className="font-medium text-primary">{data.name}</p>
      <p className="text-tertiary">Blocks: {data.blockCount}</p>
      <p className="text-tertiary">Total Value: {formatEther(data.value)}</p>
      <p className="text-tertiary">Avg Value: {formatEther(data.value / data.blockCount)}</p>
    </div>
  );
};

// Custom Legend
interface LegendProps {
  payload?: Array<{
    value: string;
    color: string;
    type?: string;
  }>;
}

const CustomLegend: FC<LegendProps> = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
          <span className="text-tertiary truncate">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const BlockValueDistribution: FC<BlockValueDistributionProps> = ({ data, isLoading }) => {
  // Process data for client-based value distribution
  const distributionData = useMemo<ChartDataItem[]>(() => {
    if (isLoading || data.length === 0) return [];

    // Map to track client stats
    const clientValueMap = new Map<string, { value: number; blockCount: number }>();

    // Function to get base client name
    const getClientName = (block: LocallyBuiltBlock): string => {
      const clientName = block.metadata?.metaClientName || 'Unknown';
      // Extract just the main client name (e.g., "Geth" from "Geth v1.10.0")
      const match = clientName.match(/^(\w+)/);
      return match ? match[1] : clientName;
    };

    // Calculate total value and count per client
    data.forEach(slotBlocks => {
      slotBlocks.blocks.forEach(block => {
        const clientName = getClientName(block);
        const execValue = block.executionPayloadValue ? Number(block.executionPayloadValue.toString()) : 0;
        const consValue = block.consensusPayloadValue ? Number(block.consensusPayloadValue.toString()) : 0;
        const totalValue = execValue + consValue;

        const current = clientValueMap.get(clientName) || { value: 0, blockCount: 0 };
        clientValueMap.set(clientName, {
          value: current.value + totalValue,
          blockCount: current.blockCount + 1,
        });
      });
    });

    // Convert to array format for chart
    const chartData = Array.from(clientValueMap.entries())
      .map(([name, { value, blockCount }]) => ({
        name,
        value,
        blockCount,
        avgValue: value / blockCount,
      }))
      .sort((a, b) => b.value - a.value);

    return chartData;
  }, [data, isLoading]);

  // Colors for pie chart
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

  if (isLoading) {
    return (
      <div className="rounded-lg bg-surface/20 p-6">
        <div className="h-6 bg-active/30 rounded w-1/3 mb-6 animate-pulse"></div>
        <div className="animate-pulse flex justify-center">
          <div className="h-48 w-48 rounded-full bg-active/20"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0 || distributionData.length === 0) {
    return (
      <div className="rounded-lg bg-surface/20 border border-subtle p-6">
        <div className="text-center">
          <p className="text-tertiary font-mono">No value distribution data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-sans font-bold text-accent">Block Value Distribution by Client</h4>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              labelLine={false}
            >
              {distributionData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="stroke-base stroke-1 hover:opacity-90 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-subtle">
              <th className="text-left py-2 px-2 text-xs text-tertiary">Client</th>
              <th className="text-right py-2 px-2 text-xs text-tertiary">Block Count</th>
              <th className="text-right py-2 px-2 text-xs text-tertiary">Total Value</th>
              <th className="text-right py-2 px-2 text-xs text-tertiary">Avg. Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle/30">
            {distributionData.map((entry, index) => (
              <tr key={`row-${index}`}>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-primary">{entry.name}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right text-primary">{entry.blockCount}</td>
                <td className="py-1.5 px-2 text-right text-primary">{formatEther(entry.value)}</td>
                <td className="py-1.5 px-2 text-right text-primary">{formatEther(entry.avgValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
