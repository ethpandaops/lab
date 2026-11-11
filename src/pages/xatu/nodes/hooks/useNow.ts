import { useEffect, useState } from 'react';

/** Once a minute, so a range moves on to its next hourly bucket, and a node shows offline, at most a minute late */
const TICK_MS = 60_000;

/**
 * Current unix time in seconds, updated every minute. Pages read the time from here rather than the clock during
 * render, so every range on the page ends at the same instant and moves on while the page stays open.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now() / 1000), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return now;
}
