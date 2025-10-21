import { type JSX } from 'react';
import clsx from 'clsx';
import type { HeaderProps } from './Header.types';

export function Header({ title, description, showAccent = true, className }: HeaderProps): JSX.Element {
  return (
    <div className={clsx('mb-8', className)}>
      <h1 className="mb-2 text-4xl/tight font-bold text-foreground">{title}</h1>
      {description && <p className="text-muted">{description}</p>}
      {showAccent && <div className="mt-4 h-1 w-24 rounded-sm bg-linear-to-r from-primary to-accent" />}
    </div>
  );
}
