import { type JSX } from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Toggle } from '@/components/Forms/Toggle';
import { useTimezone } from '@/hooks/useTimezone';

interface TimezoneToggleProps {
  /**
   * Size variant for the toggle
   */
  size?: 'default' | 'compact';
}

/**
 * Toggle component for switching between UTC and local timezone
 * Preference is persisted to localStorage
 */
export function TimezoneToggle({ size = 'default' }: TimezoneToggleProps): JSX.Element {
  const { timezone, toggleTimezone } = useTimezone();

  const isCompact = size === 'compact';

  return (
    <div className={isCompact ? 'flex items-center gap-1.5' : 'flex items-center gap-3'}>
      <GlobeAltIcon className={isCompact ? 'size-4 text-muted' : 'size-5 text-muted'} />
      <div className={isCompact ? 'flex items-center gap-1.5' : 'flex items-center gap-2'}>
        <span className={isCompact ? 'text-xs text-muted' : 'text-sm text-muted'}>Local</span>
        <Toggle
          checked={timezone === 'UTC'}
          onChange={toggleTimezone}
          srLabel="Timezone mode"
          size={isCompact ? 'small' : 'default'}
        />
        <span className={isCompact ? 'text-xs text-muted' : 'text-sm text-muted'}>UTC</span>
      </div>
    </div>
  );
}
