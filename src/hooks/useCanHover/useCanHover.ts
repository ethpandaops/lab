import { useSyncExternalStore } from 'react';

const HOVER_QUERY = '(hover: hover)';

/** Calls `onChange` whenever the hover capability changes, e.g. when a mouse is connected */
function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(HOVER_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

/** Whether the primary pointing device can hover right now */
function getSnapshot(): boolean {
  return window.matchMedia(HOVER_QUERY).matches;
}

/** Without a window, assume hover */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Hook to detect if the device supports hover interactions.
 * Returns false on touch-only devices (mobile/tablet).
 *
 * Uses the CSS media query `(hover: hover)` which returns true only
 * for devices with a primary pointing device that can hover.
 */
export function useCanHover(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
