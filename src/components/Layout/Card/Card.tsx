import { type JSX } from 'react';
import clsx from 'clsx';
import type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './Card.types';

export function Card({
  children,
  className,
  isPrimary = false,
  isInteractive = false,
  onClick,
}: CardProps): JSX.Element {
  return (
    <div
      className={clsx(
        'card',
        isPrimary ? 'card-primary' : 'card-secondary',
        isInteractive && 'card-interactive',
        className
      )}
      onClick={isInteractive ? onClick : undefined}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardHeaderProps): JSX.Element {
  return <div className={clsx('card-header', className)}>{children}</div>;
}

export function CardBody({ children, className }: CardBodyProps): JSX.Element {
  return <div className={clsx('card-body', className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardFooterProps): JSX.Element {
  return <div className={clsx('card-footer', className)}>{children}</div>;
}
