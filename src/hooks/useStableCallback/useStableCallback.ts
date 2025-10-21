import { useRef, useCallback, useLayoutEffect } from 'react';

/**
 * Creates a stable callback reference that always calls the latest version of the function.
 *
 * ## Overview
 *
 * `useStableCallback` solves a common React problem: callbacks that need stable references for
 * performance (avoiding re-renders or effect re-runs) while still accessing the latest values
 * from closures.
 *
 * This is inspired by the useEvent RFC and react-use-event-hook, implemented in-house to avoid
 * dependencies for ~10 lines of code. Unlike useCallback, this hook always returns the same
 * function reference while ensuring the function body uses the latest props and state.
 *
 * ## Problem It Solves
 *
 * ### Without useStableCallback
 * ```tsx
 * function MyComponent() {
 *   const [count, setCount] = useState(0);
 *
 *   // ❌ Creates new function on every render
 *   const handleClick = () => {
 *     console.log('Count:', count);
 *   };
 *
 *   useEffect(() => {
 *     // Effect re-runs on EVERY render because handleClick changes
 *     document.addEventListener('click', handleClick);
 *     return () => document.removeEventListener('click', handleClick);
 *   }, [handleClick]); // This dependency causes re-runs
 *
 *   return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
 * }
 * ```
 *
 * ### With useCallback (Manual Dependencies)
 * ```tsx
 * function MyComponent() {
 *   const [count, setCount] = useState(0);
 *
 *   // ⚠️ Must manually manage dependencies
 *   const handleClick = useCallback(() => {
 *     console.log('Count:', count);
 *   }, [count]); // Oops! Still recreates when count changes
 *
 *   useEffect(() => {
 *     // Still re-runs whenever count changes
 *     document.addEventListener('click', handleClick);
 *     return () => document.removeEventListener('click', handleClick);
 *   }, [handleClick]);
 *
 *   return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
 * }
 * ```
 *
 * ### With useStableCallback ✅
 * ```tsx
 * function MyComponent() {
 *   const [count, setCount] = useState(0);
 *
 *   // ✅ Stable reference, always sees fresh count!
 *   const handleClick = useStableCallback(() => {
 *     console.log('Count:', count); // Always gets current value
 *   });
 *
 *   useEffect(() => {
 *     // Effect runs ONCE - handleClick never changes
 *     document.addEventListener('click', handleClick);
 *     return () => document.removeEventListener('click', handleClick);
 *   }, [handleClick]);
 *
 *   return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
 * }
 * ```
 *
 * ## Usage Examples
 *
 * ### Basic Example
 * ```tsx
 * function MyComponent({ userId }: { userId: string }) {
 *   const [data, setData] = useState(null);
 *
 *   const fetchData = useStableCallback(async () => {
 *     const response = await fetch(`/api/users/${userId}`);
 *     const json = await response.json();
 *     setData(json);
 *   });
 *
 *   // Effect only runs once, but fetchData always uses current userId
 *   useEffect(() => {
 *     fetchData();
 *   }, [fetchData]);
 *
 *   return <div>{data?.name}</div>;
 * }
 * ```
 *
 * ### With Providers
 * ```tsx
 * function App() {
 *   const [log, setLog] = useState<string[]>([]);
 *
 *   const handleSlotChange = useStableCallback((slot: number) => {
 *     // Always accesses current log state
 *     setLog(prev => [...prev, `Moved to slot ${slot}`]);
 *   });
 *
 *   const callbacks = useMemo(() => ({
 *     onSlotChange: handleSlotChange,
 *   }), [handleSlotChange]); // handleSlotChange never changes!
 *
 *   return (
 *     <SlotPlayerProvider callbacks={callbacks}>
 *       <SlotViewer />
 *     </SlotPlayerProvider>
 *   );
 * }
 * ```
 *
 * ### With Custom Hooks
 * ```tsx
 * function useWebSocket(url: string, onMessage: (data: unknown) => void) {
 *   // Stable callback means effect doesn't restart when onMessage changes
 *   const stableOnMessage = useStableCallback(onMessage);
 *
 *   useEffect(() => {
 *     const ws = new WebSocket(url);
 *     ws.onmessage = (event) => {
 *       stableOnMessage(JSON.parse(event.data));
 *     };
 *     return () => ws.close();
 *   }, [url, stableOnMessage]); // Only reconnects when url changes
 * }
 *
 * function ChatRoom({ roomId }: { roomId: string }) {
 *   const [messages, setMessages] = useState<string[]>([]);
 *
 *   // Can pass inline function - no need to wrap in useCallback!
 *   useWebSocket(`ws://chat/${roomId}`, (msg) => {
 *     setMessages(prev => [...prev, msg.text]);
 *   });
 *
 *   return <ul>{messages.map(m => <li>{m}</li>)}</ul>;
 * }
 * ```
 *
 * ## When to Use
 *
 * ✅ **Use `useStableCallback` when:**
 * - Passing callbacks to effects that shouldn't re-run on every render
 * - Creating custom hooks that accept callback props
 * - Callbacks passed to providers (like `SlotPlayerProvider`)
 * - Event handlers that need to access fresh state without recreating
 *
 * ❌ **Don't use `useStableCallback` when:**
 * - Simple click handlers that don't cause performance issues
 * - You want the callback to be a dependency (use `useCallback` instead)
 * - Inside `useEffect` (use `useEffectEvent` in React 19.2+)
 *
 * ## Comparison
 *
 * | Hook | Reference Stability | Fresh Closures | Dependencies | Use Case |
 * |------|-------------------|----------------|--------------|----------|
 * | `useStableCallback` | ✅ Stable | ✅ Always fresh | ❌ None needed | Callbacks as props/effects |
 * | `useCallback` | ⚠️ Changes with deps | ✅ When recreated | ✅ Manual | General memoization |
 * | `useEffectEvent` (React 19.2+) | ✅ Stable | ✅ Always fresh | ❌ None needed | **Only** inside `useEffect` |
 * | Regular function | ❌ New every render | ✅ Always fresh | N/A | Simple handlers |
 *
 * ## Implementation Details
 *
 * **Key points:**
 * - Uses `useRef` to store the latest callback
 * - `useLayoutEffect` updates ref synchronously (before browser paint)
 * - Returns a `useCallback` with empty deps (never recreates)
 * - TypeScript generics preserve argument and return types
 *
 * ## Relationship to React 19.2's useEffectEvent
 *
 * React 19.2 introduced `useEffectEvent`, but it's **only for use inside `useEffect`**:
 *
 * ```tsx
 * // ✅ useEffectEvent - only works in effects
 * useEffect(() => {
 *   const handler = useEffectEvent(() => console.log(count));
 *   window.addEventListener('click', handler);
 *   return () => window.removeEventListener('click', handler);
 * }, []);
 *
 * // ❌ useEffectEvent - ERROR: can't use outside effects
 * const handleClick = useEffectEvent(() => console.log(count));
 * return <button onClick={handleClick}>Click</button>;
 * ```
 *
 * `useStableCallback` fills the gap for callbacks passed as props or used outside of effects.
 *
 * @param callback - The function to stabilize. Can access any props/state.
 * @returns A stable function reference that always calls the latest version of `callback`.
 *
 * @see https://github.com/reactjs/rfcs/pull/220 - Original useEvent RFC
 * @see https://www.npmjs.com/package/react-use-event-hook - NPM package with same implementation
 * @see https://react.dev/blog/2025/10/01/react-19-2 - React 19.2 useEffectEvent
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
