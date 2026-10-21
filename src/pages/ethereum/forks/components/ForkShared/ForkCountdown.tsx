import type { ReactNode } from 'react';
import type { CountdownTime } from './countdown';

function Separator(): React.JSX.Element {
  return <div className="text-2xl text-muted">:</div>;
}

function CountdownCell({ value, unit }: { value: number; unit: string }): React.JSX.Element {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-accent tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted">{unit}</div>
    </div>
  );
}

interface ForkCountdownProps {
  countdown: CountdownTime;
  /** Rendered under the digits, e.g. the local activation time */
  footer?: ReactNode;
}

/**
 * "Goes Live In" countdown. The days cell is hidden once less than a day remains.
 */
export function ForkCountdown({ countdown, footer }: ForkCountdownProps): React.JSX.Element {
  return (
    <div className="mb-6 rounded-sm border border-border py-6">
      <div className="mb-3 text-center text-xs font-medium text-muted">Goes Live In</div>
      <div className="flex items-center justify-center gap-4">
        {countdown.days > 0 && (
          <>
            <CountdownCell value={countdown.days} unit="days" />
            <Separator />
          </>
        )}
        <CountdownCell value={countdown.hours} unit="hours" />
        <Separator />
        <CountdownCell value={countdown.minutes} unit="minutes" />
        <Separator />
        <CountdownCell value={countdown.seconds} unit="seconds" />
      </div>
      {footer}
    </div>
  );
}

/**
 * Countdown placeholder shown until the network genesis time is known.
 */
export function ForkCountdownSkeleton(): React.JSX.Element {
  return (
    <div className="mb-6 rounded-sm border border-border py-6">
      <div className="mb-3 text-center text-xs font-medium text-muted">Goes Live In</div>
      <div className="flex items-center justify-center gap-4">
        {['days', 'hours', 'minutes', 'seconds'].map((unit, index) => (
          <div key={unit} className="flex items-center gap-4">
            {index > 0 && <Separator />}
            <div className="text-center">
              <div className="h-12 w-16 animate-pulse rounded-xs bg-muted/20"></div>
              <div className="mt-1 text-xs text-muted">{unit}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
