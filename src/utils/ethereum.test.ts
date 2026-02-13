import { describe, it, expect } from 'vitest';
import {
  weiToEth,
  ethToWei,
  weiToGwei,
  gweiToWei,
  truncateAddress,
  parseExecutionClient,
  getClientLayer,
} from './ethereum';

describe('weiToEth', () => {
  it('should convert 1 ETH in wei to ETH', () => {
    expect(weiToEth('1000000000000000000')).toBe(1);
  });

  it('should convert 0.5 ETH in wei to ETH', () => {
    expect(weiToEth('500000000000000000')).toBe(0.5);
  });

  it('should convert BigInt wei to ETH', () => {
    expect(weiToEth(1000000000000000000n)).toBe(1);
  });

  it('should handle zero wei', () => {
    expect(weiToEth('0')).toBe(0);
    expect(weiToEth(0n)).toBe(0);
  });

  it('should handle very large wei values', () => {
    // 1 million ETH
    expect(weiToEth('1000000000000000000000000')).toBe(1000000);
  });

  it('should handle small fractions', () => {
    // 1 wei
    expect(weiToEth('1')).toBe(0.000000000000000001);
  });
});

describe('ethToWei', () => {
  it('should convert 1 ETH to wei', () => {
    expect(ethToWei(1)).toBe(1000000000000000000n);
  });

  it('should convert 0.5 ETH to wei', () => {
    expect(ethToWei(0.5)).toBe(500000000000000000n);
  });

  it('should handle zero ETH', () => {
    expect(ethToWei(0)).toBe(0n);
  });

  it('should handle larger ETH values', () => {
    // Test with 100 ETH (stays within safe precision range)
    expect(ethToWei(100)).toBe(100000000000000000000n);
  });

  it('should handle small fractions with precision', () => {
    expect(ethToWei(0.000000001)).toBe(1000000000n);
  });

  it('should preserve precision for decimal values', () => {
    expect(ethToWei(0.123456789)).toBe(123456789000000000n);
  });
});

describe('weiToGwei', () => {
  it('should convert 1 gwei in wei to gwei', () => {
    expect(weiToGwei('1000000000')).toBe(1);
  });

  it('should convert 0.5 gwei in wei to gwei', () => {
    expect(weiToGwei('500000000')).toBe(0.5);
  });

  it('should convert BigInt wei to gwei', () => {
    expect(weiToGwei(1000000000n)).toBe(1);
  });

  it('should handle zero wei', () => {
    expect(weiToGwei('0')).toBe(0);
    expect(weiToGwei(0n)).toBe(0);
  });

  it('should handle very large wei values', () => {
    expect(weiToGwei('100000000000')).toBe(100);
  });

  it('should handle small fractions', () => {
    expect(weiToGwei('1')).toBe(0.000000001);
  });
});

describe('gweiToWei', () => {
  it('should convert 1 gwei to wei', () => {
    expect(gweiToWei(1)).toBe(1000000000n);
  });

  it('should convert 0.5 gwei to wei', () => {
    expect(gweiToWei(0.5)).toBe(500000000n);
  });

  it('should handle zero gwei', () => {
    expect(gweiToWei(0)).toBe(0n);
  });

  it('should handle large gwei values', () => {
    expect(gweiToWei(100)).toBe(100000000000n);
  });

  it('should handle small fractions with precision', () => {
    expect(gweiToWei(0.001)).toBe(1000000n);
  });
});

describe('truncateAddress', () => {
  const longAddress = '0x1234567890abcdef1234567890abcdef12345678';

  it('should truncate long addresses with default parameters', () => {
    expect(truncateAddress(longAddress)).toBe('0x1234...5678');
  });

  it('should truncate with custom start and end characters', () => {
    expect(truncateAddress(longAddress, 8, 6)).toBe('0x123456...345678');
  });

  it('should truncate with different character counts', () => {
    expect(truncateAddress(longAddress, 10, 8)).toBe('0x12345678...12345678');
  });

  it('should return full address if shorter than truncation length', () => {
    const shortAddress = '0x123456';
    expect(truncateAddress(shortAddress, 6, 4)).toBe('0x123456');
  });

  it('should return "Unknown" for empty string', () => {
    expect(truncateAddress('')).toBe('Unknown');
  });

  it('should return "Unknown" for undefined input', () => {
    expect(truncateAddress(undefined)).toBe('Unknown');
  });

  it('should handle addresses exactly at boundary', () => {
    const exactAddress = '0x12345678';
    // Address length (8) = startChars (6) + endChars (2), so it still truncates
    expect(truncateAddress(exactAddress, 6, 2)).toBe('0x1234...78');
  });
});

describe('parseExecutionClient', () => {
  it('should parse client name with version separator', () => {
    expect(parseExecutionClient('Nethermind/v1.25.4')).toBe('Nethermind v1.25.4');
  });

  it('should parse geth client with version', () => {
    expect(parseExecutionClient('Geth/v1.13.0')).toBe('Geth v1.13.0');
  });

  it('should handle multiple slashes by using first two parts', () => {
    expect(parseExecutionClient('Nethermind/v1.25.4/linux-x64')).toBe('Nethermind v1.25.4');
  });

  it('should return original string if no slash separator', () => {
    expect(parseExecutionClient('geth-lighthouse-1')).toBe('geth-lighthouse-1');
  });

  it('should return original string for simple client names', () => {
    expect(parseExecutionClient('Besu')).toBe('Besu');
  });

  it('should return "Unknown" for empty string', () => {
    expect(parseExecutionClient('')).toBe('Unknown');
  });

  it('should return "Unknown" for undefined input', () => {
    expect(parseExecutionClient(undefined)).toBe('Unknown');
  });

  it('should handle client names with spaces', () => {
    // trim() removes extra spaces, so result has single space
    expect(parseExecutionClient('Erigon / v2.48.0')).toBe('Erigon v2.48.0');
  });

  it('should trim whitespace from parts', () => {
    expect(parseExecutionClient('Nethermind / v1.25.4 ')).toBe('Nethermind v1.25.4');
  });
});

describe('getClientLayer', () => {
  it('should classify known consensus clients as CL', () => {
    expect(getClientLayer('lighthouse')).toBe('CL');
    expect(getClientLayer('TeKu')).toBe('CL');
  });

  it('should classify known execution clients as EL', () => {
    expect(getClientLayer('geth')).toBe('EL');
    expect(getClientLayer('Nethermind')).toBe('EL');
  });

  it('should classify CL/EL aliases case-insensitively', () => {
    expect(getClientLayer('CL')).toBe('CL');
    expect(getClientLayer('cl')).toBe('CL');
    expect(getClientLayer('EL')).toBe('EL');
    expect(getClientLayer('el')).toBe('EL');
  });

  it('should return null for unknown client types', () => {
    expect(getClientLayer('')).toBeNull();
    expect(getClientLayer('unknown-client')).toBeNull();
  });
});
