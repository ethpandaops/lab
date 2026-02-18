import { type JSX } from 'react';
import clsx from 'clsx';

export type ResourceViewMode = 'opcode' | 'resource';

export interface ResourceViewToggleProps {
  value: ResourceViewMode;
  onChange: (mode: ResourceViewMode) => void;
}

/**
 * Segmented toggle to switch between "By Opcode" and "By Resource" views.
 * Includes tooltip descriptions explaining what each view answers.
 */
export function ResourceViewToggle({ value, onChange }: ResourceViewToggleProps): JSX.Element {
  return (
    <div className="inline-flex items-center rounded-sm border border-border bg-surface p-0.5">
      <button
        onClick={() => onChange('opcode')}
        className={clsx(
          'rounded-xs px-3 py-1.5 text-xs font-medium transition-colors',
          value === 'opcode' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
        )}
        title="Which EVM instructions used gas?"
      >
        By Opcode
      </button>
      <button
        onClick={() => onChange('resource')}
        className={clsx(
          'rounded-xs px-3 py-1.5 text-xs font-medium transition-colors',
          value === 'resource' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
        )}
        title="What system resources did gas pay for?"
      >
        By Resource
      </button>
    </div>
  );
}
