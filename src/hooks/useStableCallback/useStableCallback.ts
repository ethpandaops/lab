import { useRef, useCallback, useLayoutEffect } from 'react';

/**
 * Creates a stable callback reference that always calls the latest version of the function.
 *
 * This is inspired by react-use-event-hook and the useEvent RFC (now useEffectEvent in React 19.2,
 * but only for effects). We inline it to avoid a dependency for ~10 lines of code.
 * Unlike useCallback, this hook always returns the same function reference while ensuring
 * the function body uses the latest props and state.
 *
 * ## When to Use
 *
 * - Callbacks passed to custom hooks with dependencies
 * - Event handlers that need stable references but access fresh state
 * - Avoiding unnecessary effect re-runs
 *
 * ## When NOT to Use
 *
 * - Simple event handlers (just use regular functions)
 * - When you want the callback to be a dependency (use useCallback instead)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [count, setCount] = useState(0);
 *
 *   // ❌ Without useStableCallback - causes effect to re-run on every render
 *   const handleClick = () => console.log(count);
 *   useEffect(() => {
 *     document.addEventListener('click', handleClick);
 *     return () => document.removeEventListener('click', handleClick);
 *   }, [handleClick]); // Re-runs every render!
 *
 *   // ✅ With useStableCallback - stable reference, fresh state
 *   const handleClick = useStableCallback(() => console.log(count));
 *   useEffect(() => {
 *     document.addEventListener('click', handleClick);
 *     return () => document.removeEventListener('click', handleClick);
 *   }, [handleClick]); // Only runs once!
 * }
 * ```
 *
 * @see https://github.com/reactjs/rfcs/pull/220 (original useEvent RFC)
 * @see https://www.npmjs.com/package/react-use-event-hook (npm package with same implementation)
 * @see https://react.dev/blog/2025/10/01/react-19-2 (useEffectEvent in React 19.2)
 */
export function useStableCallback<Args extends readonly unknown[], Return>(
  callback: (...args: Args) => Return
): (...args: Args) => Return {
  const callbackRef = useRef(callback);

  // Update ref to latest callback using useLayoutEffect to ensure it happens before paint
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Return stable callback that always calls the latest version
  return useCallback((...args: Args) => {
    return callbackRef.current(...args);
  }, []);
}

/**
 * Type guard to check if useEffectEvent is available (React 19.2+)
 *
 * @example
 * ```tsx
 * import { useEffectEvent } from 'react';
 *
 * const createStableCallback = hasUseEffectEvent()
 *   ? useEffectEvent
 *   : useStableCallback;
 * ```
 */
export function hasUseEffectEvent(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    return typeof React.useEffectEvent === 'function';
  } catch {
    return false;
  }
}
