import type { JSX } from 'react';
import clsx from 'clsx';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /**
   * The source URL of the avatar image
   */
  src: string;
  /**
   * Alt text for the avatar image
   */
  alt?: string;
  /**
   * The size of the avatar
   * @default 'md'
   */
  size?: AvatarSize;
  /**
   * Whether the avatar should be rounded (circular)
   * @default false
   */
  rounded?: boolean;
  /**
   * Additional CSS classes to apply to the avatar
   */
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
  xl: 'size-14',
};

/**
 * Avatar component for displaying user profile images
 *
 * Supports multiple sizes and can be rendered as either square or circular.
 * Includes a subtle outline that adapts to light and dark themes.
 *
 * @example
 * ```tsx
 * <Avatar src="/path/to/image.jpg" alt="User name" size="md" rounded />
 * ```
 */
export const Avatar = ({ src, alt = '', size = 'md', rounded = false, className }: AvatarProps): JSX.Element => {
  return (
    <img
      src={src}
      alt={alt}
      className={clsx(
        'inline-block outline -outline-offset-1 outline-black/5 dark:outline-white/10',
        sizeClasses[size],
        rounded && 'rounded-full',
        className
      )}
    />
  );
};
