# useSlotPlayer Hook

A high-performance React hook for controlling Ethereum consensus layer slot playback with a media-player-like interface.

## Overview

The `useSlotPlayer` hook provides a complete solution for navigating through historical Ethereum slots with play/pause controls, seeking, speed adjustment, and real-time progress tracking. It's designed for applications that need to visualize or analyze blockchain data across time.

## Quick Start

### Basic Usage

```tsx
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
import { useSlotPlayer } from '@/hooks/useSlotPlayer';

function App() {
  return (
    <SlotPlayerProvider tables={['fct_block', 'fct_attestation']}>
      <SlotViewer />
    </SlotPlayerProvider>
  );
}

function SlotViewer() {
  const { currentSlot, isPlaying, slotProgress, actions, isLoading, error } = useSlotPlayer();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Slot {currentSlot}</h1>
      <p>Progress: {slotProgress}ms</p>

      <button onClick={actions.toggle}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button onClick={actions.previousSlot}>Previous</button>
      <button onClick={actions.nextSlot}>Next</button>
      <button onClick={actions.jumpToLive}>Jump to Live</button>
    </div>
  );
}
```

### Multiple Tables Usage

Specify multiple tables to aggregate bounds across different data sources:

```tsx
function App() {
  return (
    <SlotPlayerProvider
      tables={['fct_block', 'fct_attestation', 'fct_validator_balance']}
      initialPlaying={true}
    >
      <SlotViewer />
    </SlotPlayerProvider>
  );
}
```

The provider will use the earliest `min` and latest `max` across all specified tables, ensuring the player can navigate the full range of available data.

### Performance-Optimized Usage

Use individual hooks to subscribe only to what you need:

```tsx
import {
  useSlotPlayerState,
  useSlotPlayerActions
} from '@/hooks/useSlotPlayer';

function ControlBar() {
  // Only re-renders when state changes, not on every frame
  const { currentSlot, isPlaying } = useSlotPlayerState();
  const actions = useSlotPlayerActions();

  return (
    <div>
      <span>Slot {currentSlot}</span>
      <button onClick={actions.toggle}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}

function ProgressBar() {
  // Only re-renders on progress updates (60fps)
  const { slotProgress } = useSlotPlayerProgress();
  const { slotDuration } = useSlotPlayerConfig();

  return (
    <div style={{ width: `${(slotProgress / slotDuration) * 100}%` }} />
  );
}
```

## API Reference

### Provider Props

```tsx
interface SlotPlayerProviderProps {
  children: ReactNode;
  tables: string[];             // REQUIRED: Tables for bounds (e.g., ['fct_block', 'fct_attestation'])
  initialSlot?: number;         // Starting slot (default: maxSlot - 2)
  initialMode?: SlotMode;       // 'continuous' | 'single' (default: 'continuous')
  initialPlaying?: boolean;     // Auto-play on mount (default: false)
  slotDuration?: number;        // Duration per slot in ms (default: 12000)
  playbackSpeed?: number;       // Initial speed (default: 1)
  callbacks?: SlotPlayerCallbacks;
}
```

### Available Hooks

#### `useSlotPlayer()`

Returns the complete player state and actions. Use sparingly - prefer individual hooks.

#### `useSlotPlayerProgress()`

```tsx
{ slotProgress: number }  // 0 to slotDuration, updates at 60fps
```

#### `useSlotPlayerState()`

```tsx
{
  currentSlot: number;
  isPlaying: boolean;
  mode: SlotMode;
  isStalled: boolean;
  isStale: boolean;          // More than 10 slots behind
  staleBehindSlots: number;
  isLive: boolean;           // Within 10 slots of safe max
  pauseReason: PauseReason;
}
```

#### `useSlotPlayerConfig()`

```tsx
{
  slotDuration: number;
  playbackSpeed: number;
  minSlot: number;
  maxSlot: number;
}
```

#### `useSlotPlayerActions()`

```tsx
{
  // Playback
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setMode: (mode: SlotMode) => void;

  // Navigation
  goToSlot: (slot: number) => void;
  nextSlot: () => void;
  previousSlot: () => void;

  // Seeking
  rewind: () => void;
  fastForward: () => void;
  seekToTime: (ms: number) => void;

  // Settings
  setSlotDuration: (ms: number) => void;
  setPlaybackSpeed: (speed: number) => void;

  // State
  markStalled: () => void;
  clearStalled: () => void;
  jumpToLive: () => void;
}
```

#### `useSlotPlayerMeta()`

```tsx
{
  isLoading: boolean;
  error: Error | null;
}
```

## Advanced Usage

### With Callbacks (useStableCallback - Recommended)

Using `useStableCallback` provides stable references without managing dependencies:

```tsx
import { useMemo } from 'react';
import { useStableCallback } from '@/hooks/useStableCallback';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';

function App() {
  const [logs, setLogs] = useState<string[]>([]);

  // ✅ Stable references, always access fresh state, no dependencies!
  const handleSlotChange = useStableCallback((slot: number) => {
    console.log('Moved to slot:', slot);
    setLogs(prev => [...prev, `Slot: ${slot}`]); // Always fresh!
  });

  const handlePlayStateChange = useStableCallback((isPlaying: boolean, reason: PauseReason) => {
    console.log('Playback:', isPlaying ? 'started' : 'stopped', 'Reason:', reason);
  });

  const handleStalled = useStableCallback(() => {
    console.error('Playback stalled!');
  });

  const callbacks = useMemo(
    () => ({
      onSlotChange: handleSlotChange,
      onPlayStateChange: handlePlayStateChange,
      onStalled: handleStalled,
    }),
    [handleSlotChange, handlePlayStateChange, handleStalled]
  );

  return (
    <SlotPlayerProvider
      tables={['fct_block', 'fct_attestation']}
      callbacks={callbacks}
    >
      <SlotViewer />
    </SlotPlayerProvider>
  );
}
```

### With Callbacks (useCallback - Manual)

Using `useCallback` requires manual dependency management:

```tsx
import { useCallback, useMemo } from 'react';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';

function App() {
  const [logs, setLogs] = useState<string[]>([]);

  // ⚠️ Must manually track all dependencies
  const handleSlotChange = useCallback(
    (slot: number) => {
      console.log('Moved to slot:', slot);
      // If you forget to add 'logs' to deps, you'll access stale state!
      setLogs(prev => [...prev, `Slot: ${slot}`]);
    },
    [] // Empty deps means callback never changes, which is what we want
  );

  const handlePlayStateChange = useCallback(
    (isPlaying: boolean, reason: PauseReason) => {
      console.log('Playback:', isPlaying ? 'started' : 'stopped', 'Reason:', reason);
    },
    []
  );

  const handleStalled = useCallback(() => {
    console.error('Playback stalled!');
  }, []);

  const callbacks = useMemo(
    () => ({
      onSlotChange: handleSlotChange,
      onPlayStateChange: handlePlayStateChange,
      onStalled: handleStalled,
    }),
    [handleSlotChange, handlePlayStateChange, handleStalled]
  );

  return (
    <SlotPlayerProvider
      tables={['fct_block', 'fct_attestation']}
      callbacks={callbacks}
    >
      <SlotViewer />
    </SlotPlayerProvider>
  );
}
```

**Note:** When using `useCallback`, be careful with stale closures. If your callback needs to access state that changes, either:

1. Use updater functions (`setState(prev => ...)`)
2. Add the state to dependencies (which recreates the callback)
3. Use `useStableCallback` instead

### Custom Playback Speed

```tsx
function SpeedControl() {
  const { playbackSpeed } = useSlotPlayerConfig();
  const { setPlaybackSpeed } = useSlotPlayerActions();

  return (
    <select
      value={playbackSpeed}
      onChange={e => setPlaybackSpeed(Number(e.target.value))}
    >
      <option value={0.5}>0.5x</option>
      <option value={1}>1x</option>
      <option value={2}>2x</option>
      <option value={5}>5x</option>
    </select>
  );
}
```

### Error Handling

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <SlotPlayerProvider tables={['fct_block', 'fct_attestation']}>
        <SlotViewer />
      </SlotPlayerProvider>
    </ErrorBoundary>
  );
}

function SlotViewer() {
  const { isLoading, error } = useSlotPlayerMeta();
  const { currentSlot } = useSlotPlayerState();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>Slot {currentSlot}</div>;
}
```

## Testing

### Basic Test Setup

```tsx
import { render, screen } from '@testing-library/react';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  const wrapper = ({ children }) => (
    <SlotPlayerProvider
      tables={['fct_block', 'fct_attestation']}
      initialSlot={100}
    >
      {children}
    </SlotPlayerProvider>
  );

  it('displays current slot', () => {
    render(<MyComponent />, { wrapper });
    expect(screen.getByText(/Slot 100/)).toBeInTheDocument();
  });
});
```

### Mocking the Hook

```tsx
import { vi } from 'vitest';

vi.mock('@/hooks/useSlotPlayer', () => ({
  useSlotPlayerState: () => ({
    currentSlot: 12345,
    isPlaying: false,
    mode: 'continuous',
    isStalled: false,
    isStale: false,
    staleBehindSlots: 0,
    isLive: true,
    pauseReason: null,
  }),
  useSlotPlayerActions: () => ({
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    // ... other actions
  }),
}));
```

## Performance Considerations

### Context Splitting

The hook uses 5 separate contexts to minimize re-renders:

| Context | Update Frequency | Use Case |
|---------|------------------|----------|
| `ProgressContext` | 60fps | Progress bars, animations |
| `StateContext` | On state change | Current slot, play state |
| `ConfigContext` | Rarely | Settings, bounds |
| `ActionsContext` | Never | Control functions |
| `MetaContext` | On load/error | Loading states |

### Best Practices

✅ **DO**:

- Use individual hooks (`useSlotPlayerActions`) instead of `useSlotPlayer()` when possible
- Wrap callbacks in `useCallback` and `useMemo`
- Use React.memo for components that only need specific values
- Profile with React DevTools before optimizing further

❌ **DON'T**:

- Use `useSlotPlayer()` if you only need one or two values
- Pass inline functions as callbacks
- Create new objects/arrays in render without memoization

## Architecture

### State Management Flow

```
SlotPlayerProvider
  ├─ API Call (useTablesBounds) → aggregate.minOfMins, aggregate.maxOfMaxes
  ├─ Animation Loop (useLayoutEffect + rAF)
  │   └─ Updates slotProgress every frame
  ├─ State Management (useState + useRef)
  │   ├─ currentSlot
  │   ├─ isPlaying
  │   ├─ mode
  │   └─ ...
  └─ Context Providers (5 separate)
      ├─ ProgressContext → slotProgress
      ├─ StateContext → currentSlot, isPlaying, etc.
      ├─ ConfigContext → bounds, duration, speed
      ├─ ActionsContext → memoized functions
      └─ MetaContext → isLoading, error
```

### Why useLayoutEffect?

The animation loop uses `useLayoutEffect` instead of `useEffect` to ensure cleanup happens synchronously before browser re-paint. This prevents animation frames from "escaping" cleanup logic during fast re-renders.

See: [Using requestAnimationFrame with React Hooks](https://css-tricks.com/using-requestanimationframe-with-react-hooks/)

## Troubleshooting

### Component re-renders on every frame

**Problem**: Your component re-renders 60 times per second.

**Solution**: You're using `useSlotPlayer()` or `useSlotPlayerProgress()` when you don't need progress. Use `useSlotPlayerState()` or `useSlotPlayerActions()` instead.

```tsx
// ❌ This re-renders on every frame
const { actions } = useSlotPlayer();

// ✅ This only re-renders on state changes
const actions = useSlotPlayerActions();
```

### Animation loop restarts frequently

**Problem**: Playback stutters or restarts.

**Solution**: Your callbacks aren't memoized. Wrap them in `useCallback` and `useMemo`.

```tsx
// ❌ This creates a new callback on every render
<SlotPlayerProvider
  tables={['fct_block']}
  callbacks={{ onSlotChange: (slot) => console.log(slot) }}
>

// ✅ This creates a stable callback
const handleSlotChange = useCallback((slot) => console.log(slot), []);
const callbacks = useMemo(() => ({ onSlotChange: handleSlotChange }), [handleSlotChange]);
<SlotPlayerProvider tables={['fct_block', 'fct_attestation']} callbacks={callbacks}>
```

### Slot bounds not loading

**Problem**: `minSlot` and `maxSlot` are both 0.

**Solution**: Check that:

1. You've provided `tables` prop (required - e.g., `['fct_block', 'fct_attestation']`)
2. The table names are correct and exist in the API
3. The API is accessible and returns data for the specified tables
4. Check `error` state via `useSlotPlayerMeta()`

## Related

- [SlotPlayerContext](../../contexts/SlotPlayerContext/SlotPlayerContext.types.ts) - Type definitions
- [SlotPlayerProvider](../../providers/SlotPlayerProvider/SlotPlayerProvider.tsx) - Provider implementation
- [useBeaconClock](../useBeaconClock/) - For wall clock slot time
- [useTablesBounds](../useBounds/) - For fetching and aggregating slot bounds across multiple tables

## License

Part of the ethpandaops lab project.
