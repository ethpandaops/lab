import type { ReactNode } from 'react';

export type CardVariant = 'default' | 'muted' | 'primary' | 'accent' | 'elevated' | 'surface';

export interface CardProps {
  /** Main content section (body) */
  children: ReactNode;
  /** Optional header section (top slot) */
  header?: ReactNode;
  /** Optional footer section (bottom slot) */
  footer?: ReactNode;
  /** Visual variant that controls background colors of header/main/footer sections */
  variant?: CardVariant;
  className?: string;
  isInteractive?: boolean;
  onClick?: () => void;
  /** Optional feature image element (typically an img) displayed on right side with fade effect */
  featureImage?: ReactNode;
}
