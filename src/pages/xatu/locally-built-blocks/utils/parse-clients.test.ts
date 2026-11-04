import { describe, it, expect } from 'vitest';
import { parseExecutionClient } from './parse-clients';

describe('parseExecutionClient', () => {
  it('finds the execution client in a node name', () => {
    expect(parseExecutionClient('ethpandaops/mainnet/sentry-mainnet-lighthouse-nethermind-001')).toBe('nethermind');
    expect(parseExecutionClient('ethpandaops/mainnet/utility-mainnet-prysm-geth-tysm-001')).toBe('geth');
  });

  it('reads nimbusel as the nimbus execution client', () => {
    expect(parseExecutionClient('ethpandaops/hoodi/nimbus-nimbusel-001')).toBe('nimbusel');
  });

  it('returns null for an empty name', () => {
    expect(parseExecutionClient(undefined)).toBeNull();
  });
});
