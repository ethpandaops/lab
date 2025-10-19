import type { ReactNode } from 'react';

export interface FeatureCardProps {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  icon?: ReactNode;
  logo?: string;
  href: string;
  accentColor?: {
    light: string;
    medium: string;
  };
  actionText?: string;
  ActionIcon?: React.ElementType;
  isExternal?: boolean;
}
