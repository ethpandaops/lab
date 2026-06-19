import { type JSX, useMemo } from 'react';
import { Card } from '@/components/Layout/Card';
import { StackedBar, type StackedBarSegment } from '@/components/Charts/StackedBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTokenStorageShare, type NormalizedDataPoint } from '../../hooks';

interface TokenStorageShareCardProps {
  /** Daily state-size series from the page, reused as the storage-slot denominator (no re-query). */
  data: NormalizedDataPoint[] | null;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatBillions(value: number): string {
  return `${(value / 1_000_000_000).toFixed(2)}B`;
}

/**
 * Share of total live storage slots owned by ERC20 vs ERC721 contracts (vs everything else),
 * as a horizontal stacked bar.
 *
 * The ERC20/ERC721 counts come from fct_token_contract_storage_state_by_block_daily (cbt). The
 * denominator (total storage slots) is reused from the page's existing state-size series rather
 * than re-queried. The two come from slightly different bases (cbt vs execution_state_size, ~0.3%),
 * so the small difference is absorbed into "Others" and the value is clamped at zero.
 */
export function TokenStorageShareCard({ data }: TokenStorageShareCardProps): JSX.Element {
  const { byDay, isLoading } = useTokenStorageShare();
  const themeColors = useThemeColors();

  const snapshot = useMemo(() => {
    if (!data || data.length === 0 || byDay.size === 0) return null;

    // Latest day present in BOTH the token series and the page's state-size series.
    const storagesByDay = new Map(data.map(point => [isoDay(point.date), point.storages]));
    const commonDays = [...byDay.keys()].filter(day => storagesByDay.has(day)).sort();
    const day = commonDays.at(-1);
    if (!day) return null;

    const token = byDay.get(day);
    const total = storagesByDay.get(day);
    if (!token || !total) return null;

    const others = Math.max(0, total - token.erc20 - token.erc721);
    return { day, total, erc20: token.erc20, erc721: token.erc721, others };
  }, [data, byDay]);

  // Palette matching the gas-profiler "Gas Distribution" chart: brand primary for the headline
  // category, a categorical blue (--color-chart-0) for ERC721, and the muted token for "Others"
  // (same as that chart's "Other" tile). primary/muted come from useThemeColors so they track
  // light/dark/star.
  const segments: StackedBarSegment[] = useMemo(() => {
    if (!snapshot) return [];
    return [
      {
        name: 'ERC20',
        value: snapshot.erc20,
        color: themeColors.primary,
        description: 'Slots owned by ERC20 token contracts',
      },
      {
        name: 'ERC721',
        value: snapshot.erc721,
        color: '#3b82f6',
        description: 'Slots owned by ERC721 token contracts',
      },
      {
        name: 'Others',
        value: snapshot.others,
        color: themeColors.muted,
        description: 'Unknown — storage not attributable to ERC20/ERC721 token contracts',
      },
    ];
  }, [snapshot, themeColors]);

  const subtitle = snapshot
    ? `${new Date(snapshot.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${formatBillions(snapshot.total)} slots`
    : undefined;

  return (
    <Card rounded className="p-4">
      {/* Match the "Historical State Growth" PopoutCard title typography */}
      <div className="mb-3">
        <h3 className="truncate text-lg/7 font-semibold text-foreground">Storage Slots by Token Type</h3>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <StackedBar
        segments={segments}
        total={snapshot?.total}
        height={150}
        labelFontSize={14}
        showLabels
        showPercentages
        showLegend
        emptyMessage={isLoading ? 'Loading token storage data…' : 'No token storage data available'}
      />
    </Card>
  );
}
