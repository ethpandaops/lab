import type { JSX } from 'react';
import { clsx } from 'clsx';
import type { NetworkIconProps } from './NetworkIcon.types';

/**
 * Network icon mapping - emojis and custom icons per network
 * Icons are defined without classNames so they can be applied dynamically
 */
const NETWORK_ICONS: Record<string, { type: 'img' | 'emoji'; content: string | JSX.Element }> = {
  mainnet: { type: 'img', content: '/images/ethereum.svg' },
  holesky: { type: 'emoji', content: '🦊' },
  sepolia: { type: 'emoji', content: '🐬' },
  hoodi: { type: 'emoji', content: '🦚' },
};

/**
 * NetworkIcon component displays an icon for a given network.
 *
 * Shows network-specific icons:
 * - Mainnet: Ethereum logo
 * - Holesky: 🦊
 * - Sepolia: 🐬
 * - Hoodi: 🦚
 * - Unknown networks: 🧪 (fallback)
 *
 * @example
 * ```tsx
 * // Default size (size-6)
 * <NetworkIcon networkName="mainnet" />
 *
 * // Custom size
 * <NetworkIcon networkName="holesky" className="size-8" />
 * ```
 */
export function NetworkIcon({ networkName, className }: NetworkIconProps): JSX.Element {
  const icon = NETWORK_ICONS[networkName];

  // Mainnet: render img with className
  if (icon?.type === 'img') {
    return (
      <img src={icon.content as string} alt="Ethereum" className={clsx(className || 'size-6')} aria-hidden="true" />
    );
  }

  // Emoji icons: render span with className
  if (icon?.type === 'emoji') {
    return (
      <span className={clsx(className || 'text-base')} aria-hidden="true">
        {icon.content}
      </span>
    );
  }

  // Fallback for unknown networks
  return (
    <span className={clsx(className || 'text-base')} aria-hidden="true">
      🧪
    </span>
  );
}
