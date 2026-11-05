import { dateCategoryTicks, describe, it, expect } from 'vitest';
import { createBandSeries, createStatisticSeries, dateCategoryTicks, timeAxisTicks } from './MultiLine.utils';

describe('createBandSeries', () => {
  const lowerValues = [10, 20, 30];
  const upperValues = [15, 25, 35];
  const config = { color: '#ff0000', opacity: 0.5, group: 'TestGroup' };

  it('returns an array of 2 series', () => {
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, config);
    expect(result).toHaveLength(2);
  });

  it('creates base series with underscore-prefixed name and visible: false', () => {
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, config);
    const baseSeries = result[0];

    expect(baseSeries.name).toBe('_test-stack_base');
    expect(baseSeries.visible).toBe(false);
    expect(baseSeries.data).toEqual(lowerValues);
    expect(baseSeries.stack).toBe('test-stack');
  });

  it('creates width series with correct name and calculated width values', () => {
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, config);
    const widthSeries = result[1];

    expect(widthSeries.name).toBe('Test');
    expect(widthSeries.data).toEqual([5, 5, 5]); // upper - lower
    expect(widthSeries.stack).toBe('test-stack');
  });

  it('clamps negative widths to 0', () => {
    const lowerVals = [20, 30, 40];
    const upperVals = [15, 25, 35]; // All lower than lowerVals
    const result = createBandSeries('Test', 'test-stack', lowerVals, upperVals, config);
    const widthSeries = result[1];

    expect(widthSeries.data).toEqual([0, 0, 0]);
  });

  it('applies config correctly to both series', () => {
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, config);
    const [baseSeries, widthSeries] = result;

    // Both should have color
    expect(baseSeries.color).toBe('#ff0000');
    expect(widthSeries.color).toBe('#ff0000');

    // Width series should have opacity and group
    expect(widthSeries.areaOpacity).toBe(0.5);
    expect(widthSeries.group).toBe('TestGroup');

    // Base series should have 0 opacity
    expect(baseSeries.areaOpacity).toBe(0);
  });

  it('sets correct area and line properties', () => {
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, config);
    const [baseSeries, widthSeries] = result;

    // Both should show area
    expect(baseSeries.showArea).toBe(true);
    expect(widthSeries.showArea).toBe(true);

    // Both should have no line
    expect(baseSeries.lineWidth).toBe(0);
    expect(widthSeries.lineWidth).toBe(0);
  });

  it('handles empty arrays', () => {
    const result = createBandSeries('Test', 'test-stack', [], [], config);
    const [baseSeries, widthSeries] = result;

    expect(baseSeries.data).toEqual([]);
    expect(widthSeries.data).toEqual([]);
  });

  it('works without optional group in config', () => {
    const configWithoutGroup = { color: '#ff0000', opacity: 0.5 };
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, configWithoutGroup);
    const widthSeries = result[1];

    expect(widthSeries.group).toBeUndefined();
  });

  it('passes initiallyVisible to width series when provided', () => {
    const configWithInitiallyVisible = { color: '#ff0000', opacity: 0.5, initiallyVisible: false };
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, configWithInitiallyVisible);
    const widthSeries = result[1];

    expect(widthSeries.initiallyVisible).toBe(false);
  });

  it('leaves initiallyVisible undefined when not provided', () => {
    const result = createBandSeries('Test', 'test-stack', lowerValues, upperValues, config);
    const widthSeries = result[1];

    expect(widthSeries.initiallyVisible).toBeUndefined();
  });
});

describe('createStatisticSeries', () => {
  const values = [10, 20, 30, null, 50];
  const config = { color: '#3b82f6', group: 'Statistics' };

  it('creates a series with correct name and data', () => {
    const result = createStatisticSeries('Mean', values, config);

    expect(result.name).toBe('Mean');
    expect(result.data).toEqual(values);
  });

  it('applies color from config', () => {
    const result = createStatisticSeries('Mean', values, config);

    expect(result.color).toBe('#3b82f6');
  });

  it('uses default lineWidth of 1.5 when not specified', () => {
    const result = createStatisticSeries('Mean', values, config);

    expect(result.lineWidth).toBe(1.5);
  });

  it('uses custom lineWidth when specified', () => {
    const result = createStatisticSeries('Mean', values, { ...config, lineWidth: 3 });

    expect(result.lineWidth).toBe(3);
  });

  it('uses default lineStyle of solid when not specified', () => {
    const result = createStatisticSeries('Mean', values, config);

    expect(result.lineStyle).toBe('solid');
  });

  it('uses custom lineStyle when specified', () => {
    const result = createStatisticSeries('Median', values, { ...config, lineStyle: 'dashed' });

    expect(result.lineStyle).toBe('dashed');
  });

  it('applies group from config', () => {
    const result = createStatisticSeries('Mean', values, config);

    expect(result.group).toBe('Statistics');
  });

  it('handles empty arrays', () => {
    const result = createStatisticSeries('Mean', [], config);

    expect(result.data).toEqual([]);
  });

  it('passes initiallyVisible when provided', () => {
    const result = createStatisticSeries('Mean', values, { ...config, initiallyVisible: false });

    expect(result.initiallyVisible).toBe(false);
  });

  it('leaves initiallyVisible undefined when not provided', () => {
    const result = createStatisticSeries('Mean', values, config);

    expect(result.initiallyVisible).toBeUndefined();
  });
});

describe('dateCategoryTicks', () => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  /** Daily labels in the overview format, from `start` for `days` days */
  const daily = (start: Date, days: number): string[] =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return `${MONTHS[d.getMonth()]} ${d.getDate()} '${String(d.getFullYear()).slice(-2)}`;
    });

  it('ticks on 1 January for a multi-year range, skipping the partial first year', () => {
    const labels = daily(new Date(2015, 6, 30), 365 * 11);
    const ticks = dateCategoryTicks(labels, 12)!;
    expect([...ticks.values()]).toEqual([
      '2016',
      '2017',
      '2018',
      '2019',
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ]);
    expect(labels[[...ticks.keys()][0]]).toBe("Jan 1 '16");
  });

  it('ticks month starts within a year, naming the year on the first tick and each January', () => {
    const ticks = dateCategoryTicks(daily(new Date(2025, 10, 10), 120), 6)!;
    expect([...ticks.values()]).toEqual(['Dec 2025', 'Jan 2026', 'Feb', 'Mar']);
  });

  it('ticks once per day when hourly points repeat each day label', () => {
    const labels = daily(new Date(2026, 9, 15), 3).flatMap(l => Array(24).fill(l));
    const ticks = dateCategoryTicks(labels, 12)!;
    expect([...ticks.entries()]).toEqual([
      [0, 'Oct 15'],
      [24, 'Oct 16'],
      [48, 'Oct 17'],
    ]);
  });

  it('returns null for labels that are not dates', () => {
    expect(dateCategoryTicks(['100', '101', '102'], 12)).toBeNull();
  });
});

describe('timeAxisTicks', () => {
  const day = (y: number, m: number, d: number): number => Date.UTC(y, m - 1, d) / 1000;
  const labels = (min: number, max: number, width = 1200): string[] => timeAxisTicks(min, max, width).map(t => t.label);

  it('ticks every UTC midnight across a week of hours', () => {
    const ticks = timeAxisTicks(day(2026, 10, 29) + 13 * 3600, day(2026, 11, 5) + 12 * 3600, 1200);
    expect(ticks.map(t => t.label)).toEqual(['Oct 30', 'Oct 31', 'Nov 1', 'Nov 2', 'Nov 3', 'Nov 4', 'Nov 5']);
    expect(ticks.every(t => t.value % 86_400 === 0)).toBe(true);
  });

  it('ticks on Mondays across 30 to 90 days', () => {
    const ticks = timeAxisTicks(day(2026, 10, 7), day(2026, 11, 4), 1200);
    expect(ticks.map(t => t.label)).toEqual(['Oct 12', 'Oct 19', 'Oct 26', 'Nov 2']);
    expect(ticks.every(t => new Date(t.value * 1000).getUTCDay() === 1)).toBe(true);
  });

  it('ticks on the first of each month across a year, naming each January by its year', () => {
    expect(labels(day(2025, 11, 6), day(2026, 11, 4))).toEqual([
      'Dec 2025',
      '2026',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
    ]);
  });

  it('leaves the year off when the window is inside one year', () => {
    expect(labels(day(2026, 5, 9), day(2026, 11, 4))).toEqual(['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']);
  });

  it('adds the year to the first day or week of each year when the window spans years', () => {
    expect(labels(day(2025, 12, 28), day(2026, 1, 4))).toEqual([
      'Dec 28 2025',
      'Dec 29',
      'Dec 30',
      'Dec 31',
      'Jan 1 2026',
      'Jan 2',
      'Jan 3',
      'Jan 4',
    ]);
    expect(labels(day(2025, 12, 10), day(2026, 1, 9))).toEqual(['Dec 15 2025', 'Dec 22', 'Dec 29', 'Jan 5 2026']);
  });

  it('ticks on years across all of history', () => {
    expect(labels(day(2015, 7, 30), day(2026, 11, 4))).toEqual([
      '2016',
      '2017',
      '2018',
      '2019',
      '2020',
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ]);
  });

  it('steps by calendar-aligned multiples when the labels do not fit', () => {
    expect(labels(day(2015, 7, 30), day(2026, 11, 4), 282)).toEqual(['2016', '2018', '2020', '2022', '2024', '2026']);
    expect(labels(day(2024, 11, 6), day(2026, 11, 4), 282)).toEqual(['2025', 'Jul', '2026', 'Jul']);
  });

  it('has no ticks for an empty window', () => {
    expect(timeAxisTicks(100, 100, 1200)).toEqual([]);
  });
});
