import { describe, it, expect } from 'vitest';
import { parseClientName } from './parse-clients';

describe('parseClientName', () => {
  it('should parse execution and consensus clients from a node name', () => {
    expect(parseClientName('ethpandaops/mainnet/sentry-mainnet-lighthouse-nethermind-001')).toEqual({
      executionClient: 'nethermind',
      consensusClient: 'lighthouse',
    });
  });

  it('should not read the nimbus execution client as the nimbus consensus client', () => {
    expect(parseClientName('ethpandaops/hoodi/teku-nimbusel-001')).toEqual({
      executionClient: 'nimbusel',
      consensusClient: 'teku',
    });
  });

  it('should still find nimbus as the consensus client next to nimbusel', () => {
    expect(parseClientName('ethpandaops/hoodi/nimbus-nimbusel-001')).toEqual({
      executionClient: 'nimbusel',
      consensusClient: 'nimbus',
    });
  });

  it('should parse caplin as a consensus client', () => {
    expect(parseClientName('ethpandaops/mainnet/erigon-caplin-001')).toEqual({
      executionClient: 'erigon',
      consensusClient: 'caplin',
    });
  });

  it('should return nulls for an empty name', () => {
    expect(parseClientName(undefined)).toEqual({ executionClient: null, consensusClient: null });
  });
});
