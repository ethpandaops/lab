/** 0x90b4f6…e766 */
export const shortRoot = (root: string): string => `${root.slice(0, 8)}…${root.slice(-4)}`;

/** +8,228 gwei / −5,334 gwei */
export const formatGwei = (gwei: number): string =>
  `${gwei > 0 ? '+' : gwei < 0 ? '−' : ''}${Math.abs(gwei).toLocaleString()} gwei`;
