export * from './types';
export * from './utils';
export * from './PhaseUtils';

// Original timeline component
export { default as PhaseTimeline } from './PhaseTimeline';
export { default as PhaseIcons } from './PhaseIcons';
export { default as TopControls } from './TopControls';

// New block visualization components
export { default as BlockHeader } from './BlockHeader';
export { default as BlockContent } from './BlockContent';
export { default as BlockDetailsPanel } from './BlockDetailsPanel';
export { 
  normalizeBlockData,
  calculateBlobCount,
  formatHash,
  formatTimestamp,
  formatBytes,
  formatGwei
} from './blockDataNormalizer';
export type { NormalizedBlockData } from './blockDataNormalizer';