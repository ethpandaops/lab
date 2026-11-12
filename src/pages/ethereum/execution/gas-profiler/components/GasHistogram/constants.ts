import type { HistogramBucket } from './GasHistogram.types';

/**
 * Default buckets for transaction-level gas (larger ranges)
 */
export const TRANSACTION_BUCKETS: HistogramBucket[] = [
  { label: '21K-50K', min: 21000, max: 50000 },
  { label: '50K-100K', min: 50000, max: 100000 },
  { label: '100K-250K', min: 100000, max: 250000 },
  { label: '250K-500K', min: 250000, max: 500000 },
  { label: '500K-1M', min: 500000, max: 1000000 },
  { label: '1M-5M', min: 1000000, max: 5000000 },
  { label: '5M+', min: 5000000, max: Infinity },
];

/**
 * Default buckets for call-level gas (smaller ranges)
 */
export const CALL_BUCKETS: HistogramBucket[] = [
  { label: '0-1K', min: 0, max: 1000 },
  { label: '1K-5K', min: 1000, max: 5000 },
  { label: '5K-20K', min: 5000, max: 20000 },
  { label: '20K-50K', min: 20000, max: 50000 },
  { label: '50K-100K', min: 50000, max: 100000 },
  { label: '100K-500K', min: 100000, max: 500000 },
  { label: '500K+', min: 500000, max: Infinity },
];
