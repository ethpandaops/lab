import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStableCallback, hasUseEffectEvent } from './useStableCallback';

describe('useStableCallback', () => {
  describe('basic functionality', () => {
    it('should call the callback with correct arguments', () => {
      const callback = vi.fn((a: number, b: string) => `${a}-${b}`);
      const { result } = renderHook(() => useStableCallback(callback));

      const returnValue = result.current(42, 'test');

      expect(callback).toHaveBeenCalledWith(42, 'test');
      expect(returnValue).toBe('42-test');
    });

    it('should return the callback return value', () => {
      const callback = vi.fn(() => 'test-value');
      const { result } = renderHook(() => useStableCallback(callback));

      const returnValue = result.current();

      expect(returnValue).toBe('test-value');
    });

    it('should handle callbacks with no arguments', () => {
      const callback = vi.fn(() => 'no-args');
      const { result } = renderHook(() => useStableCallback(callback));

      const returnValue = result.current();

      expect(callback).toHaveBeenCalledWith();
      expect(returnValue).toBe('no-args');
    });

    it('should handle callbacks with multiple arguments', () => {
      const callback = vi.fn((a: number, b: string, c: boolean) => ({ a, b, c }));
      const { result } = renderHook(() => useStableCallback(callback));

      const returnValue = result.current(1, 'test', true);

      expect(callback).toHaveBeenCalledWith(1, 'test', true);
      expect(returnValue).toEqual({ a: 1, b: 'test', c: true });
    });
  });

  describe('reference stability', () => {
    it('should return the same function reference across renders', () => {
      let renderCount = 0;
      const { result, rerender } = renderHook(() => {
        renderCount++;
        return useStableCallback(() => renderCount);
      });

      const firstReference = result.current;
      rerender();
      const secondReference = result.current;
      rerender();
      const thirdReference = result.current;

      // All references should be identical
      expect(firstReference).toBe(secondReference);
      expect(secondReference).toBe(thirdReference);
    });

    it('should maintain stable reference even when callback changes', () => {
      const { result, rerender } = renderHook(({ callback }) => useStableCallback(callback), {
        initialProps: { callback: () => 'first' },
      });

      const firstReference = result.current;

      // Update with new callback
      rerender({ callback: () => 'second' });
      const secondReference = result.current;

      rerender({ callback: () => 'third' });
      const thirdReference = result.current;

      // Reference should remain stable
      expect(firstReference).toBe(secondReference);
      expect(secondReference).toBe(thirdReference);
    });
  });

  describe('fresh closures', () => {
    it('should always call the latest version of the callback', () => {
      const { result, rerender } = renderHook(
        ({ value }) => {
          const callback = (): string => value;
          return useStableCallback(callback);
        },
        {
          initialProps: { value: 'initial' },
        }
      );

      expect(result.current()).toBe('initial');

      // Update the value
      rerender({ value: 'updated' });
      expect(result.current()).toBe('updated');

      // Update again
      rerender({ value: 'final' });
      expect(result.current()).toBe('final');
    });

    it('should access fresh props and state in callback', () => {
      const { result, rerender } = renderHook(
        ({ count, multiplier }) => {
          const callback = (): number => count * multiplier;
          return useStableCallback(callback);
        },
        {
          initialProps: { count: 5, multiplier: 2 },
        }
      );

      expect(result.current()).toBe(10);

      rerender({ count: 10, multiplier: 2 });
      expect(result.current()).toBe(20);

      rerender({ count: 10, multiplier: 3 });
      expect(result.current()).toBe(30);
    });

    it('should call the latest callback even when stored reference is called later', () => {
      const calls: string[] = [];
      const { result, rerender } = renderHook(
        ({ value }) => {
          const callback = (): void => {
            calls.push(value);
          };
          return useStableCallback(callback);
        },
        {
          initialProps: { value: 'first' },
        }
      );

      const stableCallback = result.current;

      // Store the reference and call it after updates
      rerender({ value: 'second' });
      stableCallback(); // Should call with 'second'

      rerender({ value: 'third' });
      stableCallback(); // Should call with 'third'

      expect(calls).toEqual(['second', 'third']);
    });
  });

  describe('async callbacks', () => {
    it('should work with async callbacks', async () => {
      const asyncCallback = vi.fn(async (value: number) => {
        return Promise.resolve(value * 2);
      });

      const { result } = renderHook(() => useStableCallback(asyncCallback));

      const returnValue = await result.current(21);

      expect(asyncCallback).toHaveBeenCalledWith(21);
      expect(returnValue).toBe(42);
    });

    it('should maintain stable reference with async callbacks', async () => {
      const { result, rerender } = renderHook(
        ({ multiplier }) => {
          const callback = async (value: number): Promise<number> => {
            return Promise.resolve(value * multiplier);
          };
          return useStableCallback(callback);
        },
        {
          initialProps: { multiplier: 2 },
        }
      );

      const firstReference = result.current;

      rerender({ multiplier: 3 });
      const secondReference = result.current;

      expect(firstReference).toBe(secondReference);

      // Should use the latest multiplier
      const value = await result.current(10);
      expect(value).toBe(30);
    });
  });

  describe('edge cases', () => {
    it('should handle callbacks that throw errors', () => {
      const error = new Error('Test error');
      const callback = vi.fn(() => {
        throw error;
      });

      const { result } = renderHook(() => useStableCallback(callback));

      expect(() => result.current()).toThrow(error);
      expect(callback).toHaveBeenCalled();
    });

    it('should handle callbacks returning undefined', () => {
      const callback = vi.fn(() => undefined);
      const { result } = renderHook(() => useStableCallback(callback));

      const returnValue = result.current();

      expect(returnValue).toBeUndefined();
    });

    it('should handle callbacks returning null', () => {
      const callback = vi.fn(() => null);
      const { result } = renderHook(() => useStableCallback(callback));

      const returnValue = result.current();

      expect(returnValue).toBeNull();
    });

    it('should handle rapid consecutive calls', () => {
      let counter = 0;
      const { result } = renderHook(() => {
        const callback = (): number => ++counter;
        return useStableCallback(callback);
      });

      // Call multiple times rapidly
      result.current();
      result.current();
      result.current();

      expect(counter).toBe(3);
    });

    it('should work when callback references external mutable state', () => {
      const state = { value: 0 };
      const callback = (): number => state.value;

      const { result } = renderHook(() => useStableCallback(callback));

      expect(result.current()).toBe(0);

      state.value = 42;
      expect(result.current()).toBe(42);

      state.value = 100;
      expect(result.current()).toBe(100);
    });
  });

  describe('callback invocation count', () => {
    it('should only call the latest callback once per invocation', () => {
      let callCount = 0;
      const { result, rerender } = renderHook(
        ({ id }) => {
          const callback = (): string => {
            callCount++;
            return id;
          };
          return useStableCallback(callback);
        },
        {
          initialProps: { id: 'first' },
        }
      );

      // First call
      callCount = 0;
      result.current();
      expect(callCount).toBe(1);

      // Update and call again
      rerender({ id: 'second' });
      callCount = 0;
      result.current();
      expect(callCount).toBe(1);
    });
  });
});

describe('hasUseEffectEvent', () => {
  it('should return a boolean', () => {
    const result = hasUseEffectEvent();
    expect(typeof result).toBe('boolean');
  });

  it('should not throw when called', () => {
    expect(() => hasUseEffectEvent()).not.toThrow();
  });

  // Note: We can't easily test the actual return value in this environment
  // as it depends on the React version, but we can verify it works
  it('should consistently return the same value', () => {
    const first = hasUseEffectEvent();
    const second = hasUseEffectEvent();
    expect(first).toBe(second);
  });
});
