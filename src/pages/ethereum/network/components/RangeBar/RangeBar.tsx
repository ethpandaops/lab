import type { JSX } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { formatDataDate } from '@/pages/ethereum/clients/utils/client-versions';
import { RANGE_OPTIONS, type NetworkRange } from '@/pages/ethereum/network/constants';
import { dayStart } from '@/pages/ethereum/network/utils/network-census';

export interface RangeBarProps {
  range: NetworkRange;
  onChange: (range: NetworkRange) => void;
  /** The range's last full day */
  endDay: string | null;
  /** The range's first day, null when the range holds only its last day */
  startDay: string | null;
}

/**
 * The page's range control, with the days its values come from: counts are of the last day, changes since the first.
 */
export function RangeBar({ range, onChange, endDay, startDay }: RangeBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={onChange} ariaLabel="Time range" />
      {endDay && (
        <p className="text-xs/5 text-muted">
          Counts on {formatDataDate(dayStart(endDay))}
          {startDay && `, changes since ${formatDataDate(dayStart(startDay))}`}
        </p>
      )}
    </div>
  );
}
