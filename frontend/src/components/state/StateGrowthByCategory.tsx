import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { PARADIGM_COLORS } from './paradigmColors';

interface CategoryGrowthData {
  category: string;
  top_contracts: ContractGrowthData[];
  net_slots_added: number;
  net_bytes_added: number;
  percentage_of_period: number;
}

interface ContractGrowthData {
  address: string;
  label: string;
  net_slots_added: number;
  net_bytes_added: number;
  percentage_of_category: number;
}

interface CategoryGrowthTimeSeries {
  timestamp: string;
  block_number: number;
  categories: CategoryGrowthData[];
  total_net_slots: number;
  total_net_bytes: number;
}

interface StateGrowthByCategoryResponse {
  time_series: CategoryGrowthTimeSeries[];
  start_block: number;
  end_block: number;
  start_time: string;
  end_time: string;
}

interface StateGrowthByCategoryProps {
  selectedNetwork: string;
  restClient: any;
}

type Granularity = 'daily' | 'monthly' | 'yearly';

const StateGrowthByCategory: React.FC<StateGrowthByCategoryProps> = ({
  selectedNetwork,
  restClient,
}) => {
  const [data, setData] = useState<StateGrowthByCategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  const fetchData = async () => {
    if (!restClient || !selectedNetwork) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`[StateGrowthByCategory] Fetching ${granularity} data for ${selectedNetwork}`);

      const response = await restClient.getStateGrowthByCategory(selectedNetwork, {
        granularity: granularity,
        top_contracts: 100,
        start_block: 0, // Query from genesis
        end_block: 0, // Query to latest
      });

      console.log('[StateGrowthByCategory] Response:', response);
      setData(response);
      setLoading(false);
    } catch (err: any) {
      console.error('[StateGrowthByCategory] Error fetching data:', err);
      setError(err.message || 'Failed to fetch state growth data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedNetwork, restClient, granularity]);

  // Process data for Plotly stacked area chart
  const plotData = useMemo(() => {
    if (!data || !data.time_series || data.time_series.length === 0) {
      return [];
    }

    // Group by category across all time periods
    const categoryMap = new Map<string, { x: string[]; y: number[] }>();

    data.time_series.forEach((timeSeries) => {
      const timestamp = new Date(timeSeries.timestamp).toISOString();

      timeSeries.categories.forEach((cat) => {
        if (!categoryMap.has(cat.category)) {
          categoryMap.set(cat.category, { x: [], y: [] });
        }

        const categoryData = categoryMap.get(cat.category)!;
        categoryData.x.push(timestamp);
        // Convert bytes to MB for better readability
        categoryData.y.push(cat.net_bytes_added / 1024 / 1024);
      });
    });

    // Convert to Plotly traces (stacked area chart)
    const traces: any[] = [];
    let colorIndex = 0;

    categoryMap.forEach((categoryData, categoryName) => {
      traces.push({
        name: categoryName,
        x: categoryData.x,
        y: categoryData.y,
        type: 'bar',
        marker: {
          color: PARADIGM_COLORS[colorIndex % PARADIGM_COLORS.length],
        },
        hovertemplate:
          '<b>%{fullData.name}</b><br>' +
          'Date: %{x|%Y-%m-%d}<br>' +
          'Growth: %{y:.2f} MB<br>' +
          '<extra></extra>',
      });
      colorIndex++;
    });

    return traces;
  }, [data]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!data || !data.time_series || data.time_series.length === 0) {
      return null;
    }

    const totalGrowth = data.time_series.reduce(
      (sum, ts) => sum + ts.total_net_bytes,
      0
    );
    const avgGrowthPerPeriod = totalGrowth / data.time_series.length;
    const maxGrowth = Math.max(...data.time_series.map((ts) => ts.total_net_bytes));

    return {
      totalGrowthMB: (totalGrowth / 1024 / 1024).toFixed(2),
      avgGrowthPerPeriodMB: (avgGrowthPerPeriod / 1024 / 1024).toFixed(2),
      maxGrowthMB: (maxGrowth / 1024 / 1024).toFixed(2),
      periods: data.time_series.length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading categorized state growth data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (!data || plotData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Header with controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Categorized State Growth Over Time</h3>
          <p className="text-sm text-muted-foreground">
            Similar to Paradigm's "How to raise the gas limit" Figures 2 & 3
          </p>
        </div>

        {/* Granularity selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setGranularity('daily')}
            className={`px-4 py-2 rounded ${
              granularity === 'daily'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setGranularity('monthly')}
            className={`px-4 py-2 rounded ${
              granularity === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setGranularity('yearly')}
            className={`px-4 py-2 rounded ${
              granularity === 'yearly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Summary statistics */}
      {summary && data && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Earliest Data</div>
            <div className="text-lg font-bold">
              {data.start_time ? new Date(data.start_time).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Growth</div>
            <div className="text-2xl font-bold">{summary.totalGrowthMB} MB</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Avg per Period</div>
            <div className="text-2xl font-bold">{summary.avgGrowthPerPeriodMB} MB</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Max Growth</div>
            <div className="text-2xl font-bold">{summary.maxGrowthMB} MB</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Periods</div>
            <div className="text-2xl font-bold">{summary.periods}</div>
          </div>
        </div>
      )}

      {/* Stacked area chart */}
      <div className="w-full bg-surface border border-border rounded-lg" style={{ height: '600px' }}>
        <Plot
          data={plotData}
          layout={{
            title: {
              text: `State Growth by Category (${granularity})`,
              font: { color: '#e5e7eb' },
            },
            xaxis: {
              title: 'Time',
              color: '#9ca3af',
              gridcolor: '#374151',
            },
            yaxis: {
              title: 'Net State Growth (MB)',
              color: '#9ca3af',
              gridcolor: '#374151',
            },
            barmode: 'stack',
            hovermode: 'x unified',
            showlegend: true,
            legend: {
              orientation: 'v',
              x: 1.02,
              y: 1,
              font: { color: '#e5e7eb' },
            },
            paper_bgcolor: 'transparent',
            plot_bgcolor: '#1f2937',
            margin: { l: 60, r: 150, t: 60, b: 60 },
          }}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>

      {/* Info note */}
      <div className="text-xs text-muted-foreground">
        Note: Currently all contracts are grouped under "Other" category. Contract categorization
        (ERC-20, DeFi, NFTs, etc.) will be added in a future update.
      </div>
    </div>
  );
};

export default StateGrowthByCategory;
