import { useState, useEffect } from 'react';

/**
 * Hook to detect if the device supports hover interactions.
 * Returns false on touch-only devices (mobile/tablet).
 *
 * Uses the CSS media query `(hover: hover)` which returns true only
 * for devices with a primary pointing device that can hover.
 */
export function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(hover: hover)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover)');
    setCanHover(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent): void => setCanHover(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return canHover;
}
