import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useRef, useEffect, useMemo } from 'react';
import colors from 'tailwindcss/colors';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { HeatmapChart } from '@/components/Charts/Heatmap';
import { ButtonGroup } from '@/components/Elements/ButtonGroup';
import { Button } from '@/components/Elements/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot } from '@/utils';
import { ValidatorHeatmap } from './ValidatorHeatmap';
import type { HeatmapMetric } from './ValidatorHeatmap';
import type { AttestationDailyDataPoint } from '../../hooks/useValidatorsData.types';

/** Generate mock daily attestation data */
function generateMockDailyData(validatorIndices: number[], from: number, to: number): AttestationDailyDataPoint[] {
  const points: AttestationDailyDataPoint[] = [];
  const startDate = new Date(from * 1000);
  startDate.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(to * 1000);
  endDate.setUTCHours(0, 0, 0, 0);

  const current = new Date(startDate);
  while (current <= endDate) {
    const timestamp = Math.floor(current.getTime() / 1000);
    for (const validatorIndex of validatorIndices) {
      points.push({
        timestamp,
        validatorIndex,
        inclusionRate: 95 + Math.random() * 5,
        headCorrectRate: 90 + Math.random() * 10,
        targetCorrectRate: 95 + Math.random() * 5,
        sourceCorrectRate: 98 + Math.random() * 2,
        avgInclusionDistance: 1 + Math.random() * 0.5,
      });
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return points;
}

const VALIDATORS_3 = [2196918, 2198641, 2199291];
const VALIDATORS_6 = [2196918, 2198641, 2199291, 2199861, 2200912, 2202208];
const VALIDATORS_12 = [
  2196918, 2198641, 2199291, 2199861, 2200912, 2202208, 2203000, 2204000, 2205000, 2206000, 2207000, 2208000,
];

const FROM = 1769990400; // Feb 2, 2026
const TO = 1770595200; // Feb 9, 2026

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const NO_DATA = -1;

const GRID_HORIZONTAL_PADDING = 150;
const LABEL_WIDTH_HOURLY = 44;
const NICE_HOURLY_STEPS = [1, 2, 3, 4, 6, 8, 12, 24];

function computeHourlyInterval(gridWidth: number): number {
  const maxLabels = Math.max(1, Math.floor(gridWidth / LABEL_WIDTH_HOURLY));
  for (const step of NICE_HOURLY_STEPS) {
    if (Math.ceil(24 / step) <= maxLabels) return step - 1;
  }
  return 23;
}

/** Generate mock hourly heatmap grid data */
function generateMockHourlyGrid(validatorIndices: number[]): {
  data: [number, number, number][];
  yLabels: string[];
} {
  const yLabels = validatorIndices.map(v => formatSlot(v));
  const data: [number, number, number][] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let v = 0; v < validatorIndices.length; v++) {
      data.push([hour, v, 90 + Math.random() * 10]);
    }
  }
  // Sprinkle a few NO_DATA cells
  for (let v = 0; v < validatorIndices.length; v++) {
    const missingHour = Math.floor(Math.random() * 24);
    const idx = data.findIndex(([h, vi]) => h === missingHour && vi === v);
    if (idx !== -1) data[idx] = [missingHour, v, NO_DATA];
  }
  return { data, yLabels };
}

// ---------------------------------------------------------------------------
// HeatmapSkeleton — standalone preview of the drill-down loading skeleton
// ---------------------------------------------------------------------------

/** Props for the skeleton preview wrapper */
interface SkeletonPreviewProps {
  /** Number of validator rows */
  rows: number;
  /** Total height in pixels */
  height: number;
  /** Show the drill-down card chrome (back button, metric toggle) */
  showChrome: boolean;
  /** Toggle between skeleton (true) and loaded heatmap (false) */
  loading: boolean;
}

/** Standalone preview of the HeatmapSkeleton used during drill-down loading */
function SkeletonPreview({ rows, height, showChrome, loading }: SkeletonPreviewProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const gridWidth = Math.max(0, containerWidth - GRID_HORIZONTAL_PADDING);
  const hourlyXAxisInterval = useMemo(() => {
    if (gridWidth <= 0) return 0;
    return computeHourlyInterval(gridWidth);
  }, [gridWidth]);

  const validatorIndices = VALIDATORS_12.slice(0, rows);
  const hourlyGrid = generateMockHourlyGrid(validatorIndices);

  const skeleton = (
    <div className="relative" style={{ height }}>
      <div className="absolute flex flex-col justify-evenly" style={{ top: 16, bottom: 50, left: 8, width: 48 }}>
        {Array.from({ length: rows }, (_, i) => (
          <LoadingContainer key={i} className="h-3 w-full rounded-xs" shimmer={false} />
        ))}
      </div>
      <div className="absolute flex flex-col justify-evenly gap-1" style={{ top: 16, right: 90, bottom: 50, left: 60 }}>
        {Array.from({ length: rows }, (_, i) => (
          <LoadingContainer key={i} className="h-5 w-full rounded-xs" />
        ))}
      </div>
      <div className="absolute" style={{ left: 60, right: 90, bottom: 24 }}>
        <LoadingContainer className="h-2 w-full rounded-xs" shimmer={false} />
      </div>
      <div className="absolute" style={{ right: 24, top: '25%', bottom: '25%', width: 16 }}>
        <LoadingContainer className="h-full w-full rounded-xs" shimmer={false} />
      </div>
    </div>
  );

  const loadedChart = (
    <HeatmapChart
      data={hourlyGrid.data}
      xLabels={HOUR_LABELS}
      yLabels={hourlyGrid.yLabels}
      height={height}
      min={0}
      max={100}
      colorGradient={[colors.red[600], colors.orange[500], colors.yellow[400], colors.lime[400], colors.green[500]]}
      formatValue={(v: number) => `${v.toFixed(1)}%`}
      visualMapText={['100%', '0%']}
      xAxisTitle="Hour (UTC)"
      yAxisTitle="Validator"
      showCellBorders
      emphasisDisabled={false}
      xAxisInterval={hourlyXAxisInterval}
      xAxisLabelRotate={0}
      emptyColor={themeColors.border}
    />
  );

  const content = loading ? skeleton : loadedChart;

  if (!showChrome) return <div ref={containerRef}>{content}</div>;

  return (
    <Card className="p-4">
      <div ref={containerRef}>
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeftIcon className="size-4" />
            Back to daily view
          </button>
          <span className="text-sm text-muted">Sunday, Feb 8, 2026</span>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-muted">Metric:</span>
          <ButtonGroup rounded>
            <Button variant="primary" size="xs">
              Inclusion
            </Button>
            <Button variant="secondary" size="xs">
              Head
            </Button>
            <Button variant="secondary" size="xs">
              Target
            </Button>
            <Button variant="secondary" size="xs">
              Source
            </Button>
            <Button variant="secondary" size="xs">
              Delay
            </Button>
          </ButtonGroup>
        </div>
        {content}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Storybook meta
// ---------------------------------------------------------------------------

const meta = {
  title: 'Pages/Ethereum/Validators/ValidatorHeatmap',
  component: SkeletonPreview,
  decorators: [
    (Story: React.ComponentType) => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    rows: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    height: { control: { type: 'range', min: 200, max: 800, step: 20 } },
    showChrome: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
} satisfies Meta<typeof SkeletonPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Skeleton stories — drill-down loading state
// ---------------------------------------------------------------------------

/** Skeleton with 6 validators — toggle loading knob to compare skeleton vs loaded heatmap */
export const DrillDownSkeleton: Story = {
  args: {
    rows: 6,
    height: 340,
    showChrome: true,
    loading: true,
  },
};

/** Skeleton with 3 validators */
export const DrillDownSkeleton3Validators: Story = {
  args: {
    rows: 3,
    height: 220,
    showChrome: true,
    loading: true,
  },
};

/** Skeleton with 12 validators */
export const DrillDownSkeleton12Validators: Story = {
  args: {
    rows: 12,
    height: 580,
    showChrome: true,
    loading: true,
  },
};

/** Bare skeleton without the card/header chrome */
export const DrillDownSkeletonBare: Story = {
  args: {
    rows: 6,
    height: 340,
    showChrome: false,
    loading: true,
  },
};

/** Single validator — minimum case */
export const DrillDownSkeletonSingle: Story = {
  args: {
    rows: 1,
    height: 200,
    showChrome: true,
    loading: true,
  },
};

// ---------------------------------------------------------------------------
// Full ValidatorHeatmap stories (daily view only — drill-down needs live API)
// ---------------------------------------------------------------------------

/** Daily view with 6 validators and realistic mock data */
export const DailyView: Story = {
  render: () => {
    const [metric, setMetric] = useState<HeatmapMetric>('inclusion');
    return (
      <ValidatorHeatmap
        data={generateMockDailyData(VALIDATORS_6, FROM, TO)}
        metric={metric}
        onMetricChange={setMetric}
        from={FROM}
        to={TO}
        validatorIndices={VALIDATORS_6}
      />
    );
  },
};

/** Initial loading state — shows the card-level pulse skeleton */
export const DailyLoading: Story = {
  render: () => (
    <ValidatorHeatmap
      data={[]}
      metric="inclusion"
      onMetricChange={() => {}}
      from={FROM}
      to={TO}
      isLoading
      validatorIndices={VALIDATORS_6}
    />
  ),
};

/** Empty state — no data available */
export const DailyEmpty: Story = {
  render: () => (
    <ValidatorHeatmap
      data={[]}
      metric="inclusion"
      onMetricChange={() => {}}
      from={FROM}
      to={TO}
      validatorIndices={VALIDATORS_6}
    />
  ),
};

/** Daily view with 3 validators */
export const DailyView3Validators: Story = {
  render: () => {
    const [metric, setMetric] = useState<HeatmapMetric>('head');
    return (
      <ValidatorHeatmap
        data={generateMockDailyData(VALIDATORS_3, FROM, TO)}
        metric={metric}
        onMetricChange={setMetric}
        from={FROM}
        to={TO}
        validatorIndices={VALIDATORS_3}
      />
    );
  },
};

/** Daily view with 12 validators */
export const DailyView12Validators: Story = {
  render: () => {
    const [metric, setMetric] = useState<HeatmapMetric>('target');
    return (
      <ValidatorHeatmap
        data={generateMockDailyData(VALIDATORS_12, FROM, TO)}
        metric={metric}
        onMetricChange={setMetric}
        from={FROM}
        to={TO}
        validatorIndices={VALIDATORS_12}
      />
    );
  },
};

/** Delay metric view */
export const DailyViewDelay: Story = {
  render: () => {
    const [metric, setMetric] = useState<HeatmapMetric>('delay');
    return (
      <ValidatorHeatmap
        data={generateMockDailyData(VALIDATORS_6, FROM, TO)}
        metric={metric}
        onMetricChange={setMetric}
        from={FROM}
        to={TO}
        validatorIndices={VALIDATORS_6}
      />
    );
  },
};
