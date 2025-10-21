import { useEffect, useRef } from 'react';

/**
 * Declarative interval hook based on Dan Abramov's pattern.
 *
 * This hook manages setInterval declaratively, handling the complexity of:
 * - Keeping the callback fresh without resetting the interval
 * - Proper cleanup on unmount
 * - Dynamic delay changes (restart interval when delay changes)
 * - Pausing execution (pass null as delay)
 *
 * Key advantages over raw setInterval:
 * - Callback is always fresh (no stale closures)
 * - Interval doesn't reset when callback changes
 * - Can pause/resume by changing delay to/from null
 * - Automatic cleanup
 *
 * @see https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 *
 * @example
 * ```tsx
 * function Timer() {
 *   const [count, setCount] = useState(0);
 *   const [delay, setDelay] = useState(1000);
 *   const [isRunning, setIsRunning] = useState(true);
 *
 *   useInterval(
 *     () => {
 *       setCount(c => c + 1);
 *     },
 *     isRunning ? delay : null
 *   );
 *
 *   return (
 *     <div>
 *       <p>Count: {count}</p>
 *       <button onClick={() => setIsRunning(!isRunning)}>
 *         {isRunning ? 'Pause' : 'Resume'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Delay in milliseconds, or null to pause
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  // Remember the latest callback without resetting the interval
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    // Don't schedule if delay is null (paused state)
    if (delay === null) {
      return;
    }

    function tick(): void {
      savedCallback.current();
    }

    const id = setInterval(tick, delay);

    return () => clearInterval(id);
  }, [delay]);
}
