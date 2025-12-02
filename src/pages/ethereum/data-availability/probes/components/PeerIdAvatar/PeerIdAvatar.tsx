import { type JSX, useMemo } from 'react';

/**
 * Props for the PeerIdAvatar component
 */
interface PeerIdAvatarProps {
  /** The unique peer ID number to generate the avatar from */
  peerId: number;
  /** Size of the avatar in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Color palette for the avatar - using semantic colors that work in both themes
 */
const COLORS = [
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#14b8a6', // teal
  '#a855f7', // purple
];

/**
 * Simple hash function to generate consistent values from a number
 */
function hashNumber(n: number, seed: number): number {
  const x = Math.sin(n * 9999 + seed * 7777) * 10000;
  return Math.abs(x - Math.floor(x));
}

/**
 * Generates a unique 4x4 grid pattern based on a peer ID
 * The pattern is mirrored horizontally for a symmetric look
 */
function generatePattern(peerId: number): boolean[][] {
  const grid: boolean[][] = [];

  for (let row = 0; row < 4; row++) {
    const rowData: boolean[] = [];
    for (let col = 0; col < 2; col++) {
      // Use hash to determine if cell is filled
      const hash = hashNumber(peerId, row * 10 + col);
      rowData.push(hash > 0.4);
    }
    // Mirror the pattern horizontally
    grid.push([...rowData, ...rowData.reverse()]);
  }

  return grid;
}

/**
 * Gets a color based on the peer ID
 */
function getColor(peerId: number): string {
  const index = Math.abs(peerId) % COLORS.length;
  return COLORS[index];
}

/**
 * Gets a secondary color for the avatar background
 */
function getBackgroundColor(peerId: number): string {
  // Use a different seed to get a different but consistent color
  const index = Math.abs(peerId * 7) % COLORS.length;
  return COLORS[index] + '20'; // Add alpha for subtle background
}

/**
 * A unique visual avatar generated from a peer ID number.
 * Creates a consistent, symmetric identicon-style pattern.
 */
export function PeerIdAvatar({ peerId, size = 24, className = '' }: PeerIdAvatarProps): JSX.Element {
  const { pattern, color, backgroundColor } = useMemo(() => {
    return {
      pattern: generatePattern(peerId),
      color: getColor(peerId),
      backgroundColor: getBackgroundColor(peerId),
    };
  }, [peerId]);

  const cellSize = size / 4;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`Peer ID avatar for ${peerId}`}
    >
      {/* Background */}
      <rect width={size} height={size} fill={backgroundColor} rx={size * 0.1} />

      {/* Pattern cells */}
      {pattern.map((row, rowIndex) =>
        row.map((filled, colIndex) =>
          filled ? (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellSize}
              y={rowIndex * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
              rx={cellSize * 0.2}
            />
          ) : null
        )
      )}
    </svg>
  );
}
