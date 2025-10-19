import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  isPrimary?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}
