import type { JSX } from 'react';
import { useMemo, memo } from 'react';
import clsx from 'clsx';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { SeriesData } from '@/components/Charts/MultiLine/MultiLine.types';
import type { AttestationArrivalsProps } from './AttestationArrivals.types';

/**
 * AttestationArrivals - attestation arrival counts over the slot as a line
 * chart. On gloas networks the PTC payload attestation stream renders as a
 * second series in the same chart, so both vote types share one timeline.
 *
 * Charts only render data up to the current slot time, simulating live progression.
 */
function AttestationArrivalsComponent({
  attestationChartValues,
  payloadAttestationChartValues,
  totalExpected: _totalExpected,
  maxCount: _maxCount,
  className,
}: AttestationArrivalsProps): JSX.Element {
  // Chart values are 241 points at 50ms; plot against seconds so both series
  // share a numeric axis with ticks on whole seconds.
  const series = useMemo<SeriesData[]>(() => {
    const toPoints = (values: (number | null)[]): Array<[number, number | null]> =>
      values.map((value, i) => [(i * 50) / 1000, value]);

    const result: SeriesData[] = [
      {
        name: 'Attestations',
        data: toPoints(attestationChartValues),
        showArea: true,
      },
    ];

    // Only surface the PTC stream once votes actually exist — pre-gloas
    // networks (and the first seconds of a gloas slot) stay single-series.
    const hasPtcVotes = payloadAttestationChartValues?.some(value => (value ?? 0) > 0) ?? false;

    if (payloadAttestationChartValues !== undefined && hasPtcVotes) {
      result.push({
        name: 'PTC payload',
        data: toPoints(payloadAttestationChartValues),
        color: '#a855f7',
        showArea: true,
      });
    }

    return result;
  }, [attestationChartValues, payloadAttestationChartValues]);

  return (
    <div className={clsx('flex h-full flex-col', className)}>
      <div className="flex h-full flex-col bg-surface p-3">
        <div className="mb-2 shrink-0">
          <h3 className="text-sm font-semibold text-foreground uppercase">Attestation Arrivals</h3>
        </div>
        <div className="min-h-0 flex-1">
          <MultiLineChart
            series={series}
            xAxis={{
              type: 'value',
              name: 'Slot Time (s)',
              min: 0,
              max: 12,
              formatter: (value: number | string) => `${Number(value).toFixed(0)}s`,
            }}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: AttestationArrivalsProps, nextProps: AttestationArrivalsProps): boolean => {
  return (
    prevProps.attestationChartValues === nextProps.attestationChartValues &&
    prevProps.payloadAttestationChartValues === nextProps.payloadAttestationChartValues
  );
};

export const AttestationArrivals = memo(AttestationArrivalsComponent, arePropsEqual);
