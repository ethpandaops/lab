# useStableCallback Hook

A utility hook that creates stable callback references while always accessing fresh props and state.

## Overview

`useStableCallback` solves a common React problem: callbacks that need stable references for performance (avoiding re-renders or effect re-runs) while still accessing the latest values from closures.

This is inspired by the [useEvent RFC](https://github.com/reactjs/rfcs/pull/220) and [`react-use-event-hook`](https://www.npmjs.com/package/react-use-event-hook), implemented in-house to avoid dependencies for ~10 lines of code.

## Problem It Solves

### Without useStableCallback

```tsx
function MyComponent() {
  const [count, setCount] = useState(0);

  // ❌ Creates new function on every render
  const handleClick = () => {
    console.log('Count:', count);
  };

  useEffect(() => {
    // Effect re-runs on EVERY render because handleClick changes
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleClick]); // This dependency causes re-runs

  return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
}
```

### With useCallback (Manual Dependencies)

```tsx
function MyComponent() {
  const [count, setCount] = useState(0);

  // ⚠️ Must manually manage dependencies
  const handleClick = useCallback(() => {
    console.log('Count:', count);
  }, [count]); // Oops! Still recreates when count changes

  useEffect(() => {
    // Still re-runs whenever count changes
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleClick]);

  return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
}
```

### With useStableCallback ✅

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';

function MyComponent() {
  const [count, setCount] = useState(0);

  // ✅ Stable reference, always sees fresh count!
  const handleClick = useStableCallback(() => {
    console.log('Count:', count); // Always gets current value
  });

  useEffect(() => {
    // Effect runs ONCE - handleClick never changes
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleClick]);

  return <button onClick={() => setCount(c => c + 1)}>Increment</button>;
}
```

## Installation

Already included in this codebase at `src/hooks/useStableCallback/`.

## Usage

### Basic Example

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';

function MyComponent({ userId }: { userId: string }) {
  const [data, setData] = useState(null);

  const fetchData = useStableCallback(async () => {
    const response = await fetch(`/api/users/${userId}`);
    const json = await response.json();
    setData(json);
  });

  // Effect only runs once, but fetchData always uses current userId
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return <div>{data?.name}</div>;
}
```

### With SlotPlayerProvider

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';

function App() {
  const [log, setLog] = useState<string[]>([]);

  const handleSlotChange = useStableCallback((slot: number) => {
    // Always accesses current log state
    setLog(prev => [...prev, `Moved to slot ${slot}`]);
  });

  const callbacks = useMemo(() => ({
    onSlotChange: handleSlotChange,
  }), [handleSlotChange]); // handleSlotChange never changes!

  return (
    <SlotPlayerProvider callbacks={callbacks}>
      <SlotViewer />
    </SlotPlayerProvider>
  );
}
```

### With Custom Hooks

```tsx
import { useStableCallback } from '@/hooks/useStableCallback';

function useWebSocket(url: string, onMessage: (data: unknown) => void) {
  // Stable callback means effect doesn't restart when onMessage changes
  const stableOnMessage = useStableCallback(onMessage);

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      stableOnMessage(JSON.parse(event.data));
    };
    return () => ws.close();
  }, [url, stableOnMessage]); // Only reconnects when url changes
}

function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<string[]>([]);

  // Can pass inline function - no need to wrap in useCallback!
  useWebSocket(`ws://chat/${roomId}`, (msg) => {
    setMessages(prev => [...prev, msg.text]);
  });

  return <ul>{messages.map(m => <li>{m}</li>)}</ul>;
}
```

## API

```tsx
function useStableCallback<Args extends readonly unknown[], Return>(
  callback: (...args: Args) => Return
): (...args: Args) => Return
```

### Parameters

- `callback`: The function to stabilize. Can access any props/state.

### Returns

A stable function reference that always calls the latest version of `callback`.

## When to Use

✅ **Use `useStableCallback` when:**

- Passing callbacks to effects that shouldn't re-run on every render
- Creating custom hooks that accept callback props
- Callbacks passed to providers (like `SlotPlayerProvider`)
- Event handlers that need to access fresh state without recreating

❌ **Don't use `useStableCallback` when:**

- Simple click handlers that don't cause performance issues
- You want the callback to be a dependency (use `useCallback` instead)
- Inside `useEffect` (use `useEffectEvent` in React 19.2+)

## Comparison

| Hook | Reference Stability | Fresh Closures | Dependencies | Use Case |
|------|-------------------|----------------|--------------|----------|
| `useStableCallback` | ✅ Stable | ✅ Always fresh | ❌ None needed | Callbacks as props/effects |
| `useCallback` | ⚠️ Changes with deps | ✅ When recreated | ✅ Manual | General memoization |
| `useEffectEvent` (React 19.2+) | ✅ Stable | ✅ Always fresh | ❌ None needed | **Only** inside `useEffect` |
| Regular function | ❌ New every render | ✅ Always fresh | N/A | Simple handlers |

## Implementation Details

```tsx
export function useStableCallback<Args extends readonly unknown[], Return>(
  callback: (...args: Args) => Return
): (...args: Args) => Return {
  const callbackRef = useRef(callback);

  // Update ref synchronously before paint
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  // Return stable callback that calls latest version
  return useCallback((...args: Args) => {
    return callbackRef.current(...args);
  }, []);
}
```

**Key points:**

- Uses `useRef` to store the latest callback
- `useLayoutEffect` updates ref synchronously (before browser paint)
- Returns a `useCallback` with empty deps (never recreates)
- TypeScript generics preserve argument and return types

## Relationship to React 19.2's useEffectEvent

React 19.2 introduced `useEffectEvent`, but it's **only for use inside `useEffect`**:

```tsx
// ✅ useEffectEvent - only works in effects
useEffect(() => {
  const handler = useEffectEvent(() => console.log(count));
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []);

// ❌ useEffectEvent - ERROR: can't use outside effects
const handleClick = useEffectEvent(() => console.log(count));
return <button onClick={handleClick}>Click</button>;
```

`useStableCallback` fills the gap for callbacks passed as props or used outside of effects.

## Related

- [SlotPlayerProvider](../useSlotPlayer/README.md) - Uses this hook for callback stability
- [React useEvent RFC](https://github.com/reactjs/rfcs/pull/220) - Original proposal
- [react-use-event-hook](https://www.npmjs.com/package/react-use-event-hook) - NPM package with same implementation
- [React 19.2 useEffectEvent](https://react.dev/blog/2025/10/01/react-19-2) - Official but limited version

## License

Part of the ethpandaops lab project.
