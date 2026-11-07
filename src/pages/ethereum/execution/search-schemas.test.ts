import { describe, it, expect } from 'vitest';
import { timingsSearchSchema } from './timings/IndexPage.types';
import { performanceSearchSchema } from './performance/IndexPage.types';
import { executionOverviewSearchSchema } from './overview/constants';
import { payloadsSearchSchema } from './payloads/IndexPage.types';
import { locallyBuiltBlocksSearchSchema } from './locally-built-blocks/IndexPage.types';
import { gasProfilerHomeSearchSchema, gasProfilerTxSearchSchema } from './gas-profiler/IndexPage.types';

describe('execution search schemas', () => {
  it('drop an invalid value and keep the valid ones', () => {
    expect(timingsSearchSchema.parse({ range: '7d', tab: 'clients' })).toEqual({ range: undefined, tab: 'clients' });
    expect(performanceSearchSchema.parse({ range: '7d', refNodes: true })).toEqual({
      range: undefined,
      refNodes: true,
    });
    expect(executionOverviewSearchSchema.parse({ t: '7days' })).toEqual({ t: undefined });
    expect(payloadsSearchSchema.parse({ page: 'x', pageSize: 500, elClient: 'reth' })).toMatchObject({
      page: undefined,
      pageSize: undefined,
      elClient: 'reth',
    });
    expect(locallyBuiltBlocksSearchSchema.parse({ window: 'week', sort: 'nope', gasMin: -1 })).toMatchObject({
      window: undefined,
      sort: undefined,
      gasMin: undefined,
    });
    expect(gasProfilerHomeSearchSchema.parse({ t: '7days' })).toEqual({ t: undefined });
  });

  it('fall back to the default for an invalid value with one', () => {
    expect(gasProfilerTxSearchSchema.parse({ opcodeView: 'grid' })).toMatchObject({
      opcodeView: 'chart',
      opcodeSort: 'gas',
    });
  });
});
