import type { JSX } from 'react';
import { clsx } from 'clsx';
import type { NetworkIconProps } from './NetworkIcon.types';

/**
 * Network icon type definitions
 */
type ImageIcon = { type: 'img'; content: string; lightContent?: string };
type EmojiIcon = { type: 'emoji'; content: string };
type NetworkIcon = ImageIcon | EmojiIcon;

/**
 * Network icon mapping - emojis and custom icons per network
 * Icons are defined without classNames so they can be applied dynamically
 * Mainnet uses theme-specific logos: dark grayscale for light mode, colorful for dark/star modes
 */
const NETWORK_ICONS: Record<string, NetworkIcon> = {
  mainnet: { type: 'img', content: '/images/ethereum-dark.svg', lightContent: '/images/ethereum-light.svg' },
  holesky: { type: 'emoji', content: '🦊' },
  sepolia: { type: 'emoji', content: '🐬' },
  hoodi: { type: 'emoji', content: '🦚' },
};

/**
 * NetworkIcon component displays an icon for a given network.
 *
 * Shows network-specific icons:
 * - Mainnet: Ethereum logo (theme-aware: dark grayscale in light mode, colorful in dark/star modes)
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

  // Mainnet: render img with theme-specific source
  if (icon?.type === 'img') {
    return (
      <>
        {/* Light mode: dark grayscale logo */}
        <img
          src={icon.lightContent || icon.content}
          alt="Ethereum"
          className={clsx('dark:hidden star:hidden', className || 'size-6')}
          aria-hidden="true"
        />
        {/* Dark/star mode: colorful logo */}
        <img
          src={icon.content}
          alt="Ethereum"
          className={clsx('hidden dark:block star:block', className || 'size-6')}
          aria-hidden="true"
        />
      </>
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
