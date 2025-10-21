import type { ReactNode } from 'react';

export interface DisclosureProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}
