import { describe, it, expect } from 'vitest';
import { createBandSeries, createStatisticSeries } from './MultiLine.utils';

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

  it('uses default lineWidth of 2 when not specified', () => {
    const result = createStatisticSeries('Mean', values, config);

    expect(result.lineWidth).toBe(2);
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
