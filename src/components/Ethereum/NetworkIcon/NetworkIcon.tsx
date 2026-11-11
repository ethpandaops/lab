import type { JSX } from 'react';
import { clsx } from 'clsx';
import type { NetworkIconProps } from './NetworkIcon.types';

/** An icon image, with a different one for light mode when set */
type NetworkIconImage = { src: string; lightSrc?: string };

/**
 * Icon per network, as bundled images so they render without a colour emoji font. Mainnet uses theme-specific
 * logos: dark grayscale for light mode, colourful for dark/star modes. The others are Noto Emoji SVGs.
 */
const NETWORK_ICONS: Record<string, NetworkIconImage> = {
  mainnet: { src: '/images/ethereum-dark.svg', lightSrc: '/images/ethereum-light.svg' },
  holesky: { src: '/images/networks/holesky.svg' },
  sepolia: { src: '/images/networks/sepolia.svg' },
  hoodi: { src: '/images/networks/hoodi.svg' },
};

/** Icon for networks without their own, such as devnets */
const FALLBACK_ICON: NetworkIconImage = { src: '/images/networks/devnet.svg' };

/**
 * NetworkIcon component displays an icon for a given network.
 *
 * Shows network-specific icons:
 * - Mainnet: Ethereum logo (theme-aware: dark grayscale in light mode, colorful in dark/star modes)
 * - Holesky: fox
 * - Sepolia: dolphin
 * - Hoodi: peacock
 * - Unknown networks: test tube (fallback)
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
  const icon = NETWORK_ICONS[networkName] ?? FALLBACK_ICON;

  if (icon.lightSrc) {
    return (
      <>
        {/* Light mode */}
        <img src={icon.lightSrc} alt="" className={clsx('on-dark:hidden', className || 'size-6')} aria-hidden />
        {/* Dark/star mode */}
        <img src={icon.src} alt="" className={clsx('hidden on-dark:block', className || 'size-6')} aria-hidden />
      </>
    );
  }

  return <img src={icon.src} alt="" className={clsx('object-contain', className || 'size-6')} aria-hidden />;
}
