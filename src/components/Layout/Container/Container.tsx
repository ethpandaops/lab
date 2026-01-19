import { type JSX } from 'react';
import type { ContainerProps } from './Container.types';

export function Container({ children, className = '' }: ContainerProps): JSX.Element {
  return (
    <div
      className={`mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8 3xl:max-w-screen-3xl 4xl:max-w-screen-4xl ${className}`.trim()}
    >
      {children}
    </div>
  );
}
