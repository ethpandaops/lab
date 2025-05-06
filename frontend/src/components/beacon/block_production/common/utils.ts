import { BidData } from './types';

// Simple hash function to generate a color from a string (e.g., relay name)
export const generateConsistentColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  // Generate HSL color - fixed saturation and lightness for consistency
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Helper function to count unique builder pubkeys from all bids
export const countUniqueBuilderPubkeys = (bids: Array<{builderPubkey?: string; [key: string]: any}>): number => {
  const uniqueBuilderPubkeys = new Set();
  bids.forEach(bid => {
    if (bid.builderPubkey) {
      uniqueBuilderPubkeys.add(bid.builderPubkey);
    }
  });
  return uniqueBuilderPubkeys.size;
};

// Truncate string with ellipsis in the middle
export const truncateMiddle = (str: string, startChars = 6, endChars = 4) => {
  if (!str) return 'N/A';
  if (str.length <= startChars + endChars) return str;
  return `${str.substring(0, startChars)}...${str.substring(str.length - endChars)}`;
};

// Transition times (in milliseconds)
export const PROPAGATION_DEFAULT_TIME = 5000; // 5s into slot
export const ATTESTATION_DEFAULT_TIME = 6500; // 6.5s into slot
export const ACCEPTANCE_DEFAULT_TIME = 8500;  // 8.5s into slot

// Helper function to transform bids data based on the current time
export const getTransformedBids = (allBids: BidData[], currentTime: number, winningBidData?: { blockHash: string } | null) => {
  // Only show bids that have occurred before the current time
  const timeFilteredBids = allBids.filter(bid => bid.time <= currentTime);
  
  // Sort by value descending (highest value bids first)
  return [...timeFilteredBids].sort((a, b) => {
    // Always keep winning bid first
    if (a.isWinning && !b.isWinning) return -1;
    if (!a.isWinning && b.isWinning) return 1;
    // Then sort by value
    return b.value - a.value;
  });
};