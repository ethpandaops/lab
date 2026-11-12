import { useEffect, useState } from 'react';

/**
 * The current time in milliseconds, updated every `intervalMs` and whenever the tab is shown again, for rendering
 * anything that moves with the clock. Browsers throttle timers in hidden tabs, so a tick alone can run late there.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = (): void => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);

  return now;
}
