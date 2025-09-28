import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface IntegratedContextualHeaderProps {
  title: ReactNode;
  description?: ReactNode | string;
  actions?: ReactNode;
  className?: string;
}

export const IntegratedContextualHeader: React.FC<IntegratedContextualHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <div className={clsx('mb-6 p-4 bg-surface/50 rounded-lg border border-subtle', className)}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Left: Title & Description */}
        <div className="flex-1 min-w-0">
          {' '}
          {/* Added flex-1 and min-w-0 to prevent overflow */}
          <h2 className="text-xl font-sans font-bold text-primary mb-1 truncate">
            {' '}
            {/* Added truncate */}
            {title}
          </h2>
          {description && <p className="text-sm font-mono text-secondary max-w-3xl">{description}</p>}
        </div>
        {/* Right: Controls/Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {' '}
            {/* Added flex-shrink-0 */}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
