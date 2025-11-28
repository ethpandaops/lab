import type { ReactNode } from 'react';

export interface DisclosureProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Optional content to display on the right side of the disclosure button */
  rightContent?: ReactNode;
  /** Optional className to override the panel styling */
  panelClassName?: string;
}
