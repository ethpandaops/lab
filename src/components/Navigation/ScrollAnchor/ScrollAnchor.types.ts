import type { ReactNode } from 'react';

export interface ScrollAnchorProps {
  /** Unique ID for the anchor - used in URL hash */
  id: string;
  /** Content to wrap and make linkable */
  children: ReactNode;
  /** Optional className to apply to the wrapper element */
  className?: string;
  /** Whether to show a link icon on hover. Defaults to true */
  showLinkIcon?: boolean;
  /** Optional offset in pixels when scrolling to this anchor. Useful to account for fixed headers. Defaults to 80 */
  scrollOffset?: number;
  /** Optional callback when the anchor is clicked */
  onClick?: () => void;
}
