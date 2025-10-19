import type { JSX } from 'react';
import type { NetworkIconProps } from './NetworkIcon.types';

/**
 * Network icon mapping - emojis and custom icons per network
 */
const NETWORK_ICONS: Record<string, JSX.Element> = {
  mainnet: <img src="/images/ethereum.svg" alt="Ethereum" className="size-6" aria-hidden="true" />,
  holesky: (
    <span className="text-base" aria-hidden="true">
      🦊
    </span>
  ),
  sepolia: (
    <span className="text-base" aria-hidden="true">
      🐬
    </span>
  ),
  hoodi: (
    <span className="text-base" aria-hidden="true">
      🦚
    </span>
  ),
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

  // If we have a custom icon (like the mainnet image), apply the className to it
  if (icon && icon.type === 'img') {
    return <img {...icon.props} className={className ?? 'size-6'} />;
  }

  // For emoji icons or fallback, return as-is (emojis don't need size classes)
  if (icon) {
    return icon;
  }

  // Fallback for unknown networks
  return (
    <span className="text-base" aria-hidden="true">
      🧪
    </span>
  );
}
