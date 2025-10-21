import type { ReactNode } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  leftColor?: string;
  rightColor?: string;
  srLabel?: string;
  size?: 'default' | 'small';
}
