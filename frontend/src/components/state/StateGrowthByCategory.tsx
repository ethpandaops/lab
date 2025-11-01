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

const StateGrowthByCategory: React.FC<StateGrowthByCategoryProps> = ({
  selectedNetwork,
  restClient,
}) => {
  const [data, setData] = useState<StateGrowthByCategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!restClient || !selectedNetwork) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`[StateGrowthByCategory] Fetching latest daily data for ${selectedNetwork}`);

      // Query only the latest day's data
      const response = await restClient.getStateGrowthByCategory(selectedNetwork, {
        granularity: 'daily',
        top_contracts: 100,
        start_block: 0, // Will be set to latest day by backend
        end_block: 0, // Latest block
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
  }, [selectedNetwork, restClient]);

  // Process data for Plotly bar chart (category on X axis)
  const plotData = useMemo(() => {
    if (!data || !data.time_series || data.time_series.length === 0) {
      return [];
    }

    // Get the latest day's data (should only be one entry)
    const latestDay = data.time_series[data.time_series.length - 1];

    if (!latestDay || !latestDay.categories || latestDay.categories.length === 0) {
      return [];
    }

    // Define all possible categories
    const allCategories = [
      'DeFi',
      'NFT',
      'ERC20',
      'Gaming',
      'Bridge',
      'Oracle',
      'DAO',
      'Identity',
      'Other'
    ];

    // Create a map of category -> value from the response
    const categoryValues = new Map<string, number>();
    latestDay.categories.forEach((cat) => {
      categoryValues.set(cat.category, cat.net_bytes_added / 1024 / 1024);
    });

    // Create arrays with all categories, filling in 0 for missing ones
    const categories: string[] = [];
    const values: number[] = [];
    const colors: string[] = [];

    allCategories.forEach((category, index) => {
      categories.push(category);
      values.push(categoryValues.get(category) || 0);
      colors.push(PARADIGM_COLORS[index % PARADIGM_COLORS.length]);
    });

    return [{
      type: 'bar',
      x: categories,
      y: values,
      marker: {
        color: colors,
      },
      hovertemplate:
        '<b>%{x}</b><br>' +
        'State Growth: %{y:.2f} MB<br>' +
        '<extra></extra>',
    }];
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
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Latest Day State Growth by Contract</h3>
        <p className="text-sm text-muted-foreground">
          Showing state growth for the most recent day in the database
        </p>
      </div>

      {/* Summary statistics */}
      {summary && data && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Latest Date</div>
            <div className="text-lg font-bold">
              {data.end_time ? new Date(data.end_time).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Growth</div>
            <div className="text-2xl font-bold">{summary.totalGrowthMB} MB</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Max Growth</div>
            <div className="text-2xl font-bold">{summary.maxGrowthMB} MB</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Unique Contracts</div>
            <div className="text-2xl font-bold">{summary.periods}</div>
          </div>
        </div>
      )}

      {/* Bar chart by category */}
      <div className="w-full bg-surface border border-border rounded-lg" style={{ height: '600px' }}>
        <Plot
          data={plotData}
          layout={{
            title: {
              text: 'State Growth by Category (Latest Day)',
              font: { color: '#e5e7eb' },
            },
            xaxis: {
              title: 'Category',
              color: '#9ca3af',
              gridcolor: '#374151',
            },
            yaxis: {
              title: 'Net State Growth (MB)',
              color: '#9ca3af',
              gridcolor: '#374151',
            },
            hovermode: 'closest',
            showlegend: false,
            paper_bgcolor: 'transparent',
            plot_bgcolor: '#1f2937',
            margin: { l: 60, r: 60, t: 60, b: 60 },
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
