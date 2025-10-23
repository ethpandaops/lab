import { type JSX } from 'react';
import type { ContainerProps } from './Container.types';

export function Container({ children, className = '' }: ContainerProps): JSX.Element {
  return <div className={`mx-auto p-4 sm:p-6 lg:p-8 ${className}`.trim()}>{children}</div>;
}
