import type { ForkVersion } from '@/utils/beacon';

export interface ForkLabelProps {
  /**
   * The fork version to display
   */
  fork: ForkVersion;

  /**
   * Optional className for styling
   */
  className?: string;

  /**
   * Display size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show the emoji icon
   * @default true
   */
  showIcon?: boolean;
}
