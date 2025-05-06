import { FC, ReactNode } from 'react';
import clsx from 'clsx';

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon?: ReactNode;
}

export const TabButton: FC<TabButtonProps> = ({ isActive, onClick, label, icon }) => {
  return (
    <button
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-sm transition-colors',
        isActive
          ? 'bg-accent/10 text-accent'
          : 'bg-surface/30 text-tertiary hover:text-primary hover:bg-surface/40',
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
};
