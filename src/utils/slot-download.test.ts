import { describe, it, expect } from 'vitest';
import { getBlockDownloadUrl, getBlobDownloadUrl } from './slot-download';

const root = '0x712f994351d05d72b466bf2a55f70cedbb734284200dceedd0b0346f4393b881';
const vh = '0x01247543e38115941fd15ea7cb7082920be4fa0c98e23f2c8b46aa16516eacd8';

describe('getBlockDownloadUrl', () => {
  it('builds a json proxy url', () => {
    expect(getBlockDownloadUrl('mainnet', 100, root, 'json')).toBe(
      `/api/v1/download/mainnet/block?slot=100&block_root=${root}&format=json`
    );
  });

  it('builds an ssz proxy url', () => {
    expect(getBlockDownloadUrl('hoodi', 5, root, 'ssz')).toBe(
      `/api/v1/download/hoodi/block?slot=5&block_root=${root}&format=ssz`
    );
  });
});

describe('getBlobDownloadUrl', () => {
  it('builds a blob proxy url keyed by versioned hash', () => {
    expect(getBlobDownloadUrl('mainnet', vh)).toBe(`/api/v1/download/mainnet/blob?versioned_hash=${vh}`);
  });
});
