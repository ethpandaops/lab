import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  isPrimary?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  isPrimary = false,
  isInteractive = false,
  onClick,
}) => {
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
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
  return <div className={clsx('card-header', className)}>{children}</div>;
};

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className }) => {
  return <div className={clsx('card-body', className)}>{children}</div>;
};

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
  return <div className={clsx('card-footer', className)}>{children}</div>;
};
