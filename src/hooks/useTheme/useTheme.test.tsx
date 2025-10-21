import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';
import { ThemeContext } from '@/contexts/ThemeContext';
import type { ThemeContextValue, Theme } from '@/contexts/ThemeContext/ThemeContext.types';
import { type ReactNode } from 'react';

describe('useTheme', () => {
  const createWrapper = (
    contextValue: ThemeContextValue | undefined
  ): (({ children }: { children: ReactNode }) => JSX.Element) => {
    const Wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
    );
    return Wrapper;
  };

  describe('basic functionality', () => {
    it('should return theme context value when used within ThemeProvider', () => {
      const mockContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current).toEqual(mockContextValue);
      expect(result.current.theme).toBe('light');
    });

    it('should return dark theme', () => {
      const mockContextValue: ThemeContextValue = {
        theme: 'dark',
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should provide setTheme function', () => {
      const setTheme = vi.fn();
      const mockContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme,
        clearTheme: vi.fn(),
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.setTheme).toBe(setTheme);
      expect(typeof result.current.setTheme).toBe('function');
    });

    it('should provide clearTheme function', () => {
      const clearTheme = vi.fn();
      const mockContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme: vi.fn(),
        clearTheme,
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.clearTheme).toBe(clearTheme);
      expect(typeof result.current.clearTheme).toBe('function');
    });
  });

  describe('error handling', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within ThemeProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should throw error when context is undefined', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: createWrapper(undefined),
        });
      }).toThrow('useTheme must be used within ThemeProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should include correct error message', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        renderHook(() => useTheme());
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('useTheme must be used within ThemeProvider');
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('theme values', () => {
    it('should handle light theme', () => {
      const mockContextValue: ThemeContextValue = {
        theme: 'light' as Theme,
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.theme).toBe('light');
    });

    it('should handle dark theme', () => {
      const mockContextValue: ThemeContextValue = {
        theme: 'dark' as Theme,
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      expect(result.current.theme).toBe('dark');
    });
  });

  describe('context updates', () => {
    it('should update when theme changes', () => {
      let currentContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <ThemeContext.Provider value={currentContextValue}>{children}</ThemeContext.Provider>
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current.theme).toBe('light');

      // Update context value
      currentContextValue = {
        theme: 'dark',
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      rerender();

      expect(result.current.theme).toBe('dark');
    });

    it('should update when setTheme function changes', () => {
      const setTheme1 = vi.fn();
      const setTheme2 = vi.fn();

      let currentContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme: setTheme1,
        clearTheme: vi.fn(),
      };

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <ThemeContext.Provider value={currentContextValue}>{children}</ThemeContext.Provider>
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current.setTheme).toBe(setTheme1);

      // Update context value
      currentContextValue = {
        theme: 'light',
        setTheme: setTheme2,
        clearTheme: vi.fn(),
      };

      rerender();

      expect(result.current.setTheme).toBe(setTheme2);
    });

    it('should update when clearTheme function changes', () => {
      const clearTheme1 = vi.fn();
      const clearTheme2 = vi.fn();

      let currentContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme: vi.fn(),
        clearTheme: clearTheme1,
      };

      const DynamicWrapper = ({ children }: { children: ReactNode }): JSX.Element => (
        <ThemeContext.Provider value={currentContextValue}>{children}</ThemeContext.Provider>
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: DynamicWrapper,
      });

      expect(result.current.clearTheme).toBe(clearTheme1);

      // Update context value
      currentContextValue = {
        theme: 'light',
        setTheme: vi.fn(),
        clearTheme: clearTheme2,
      };

      rerender();

      expect(result.current.clearTheme).toBe(clearTheme2);
    });
  });

  describe('function calls', () => {
    it('should be able to call setTheme with light theme', () => {
      const setTheme = vi.fn();
      const mockContextValue: ThemeContextValue = {
        theme: 'dark',
        setTheme,
        clearTheme: vi.fn(),
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      result.current.setTheme('light');

      expect(setTheme).toHaveBeenCalledWith('light');
      expect(setTheme).toHaveBeenCalledTimes(1);
    });

    it('should be able to call setTheme with dark theme', () => {
      const setTheme = vi.fn();
      const mockContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme,
        clearTheme: vi.fn(),
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      result.current.setTheme('dark');

      expect(setTheme).toHaveBeenCalledWith('dark');
      expect(setTheme).toHaveBeenCalledTimes(1);
    });

    it('should be able to call clearTheme', () => {
      const clearTheme = vi.fn();
      const mockContextValue: ThemeContextValue = {
        theme: 'dark',
        setTheme: vi.fn(),
        clearTheme,
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      result.current.clearTheme();

      expect(clearTheme).toHaveBeenCalledWith();
      expect(clearTheme).toHaveBeenCalledTimes(1);
    });

    it('should be able to call functions multiple times', () => {
      const setTheme = vi.fn();
      const clearTheme = vi.fn();
      const mockContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme,
        clearTheme,
      };

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      result.current.setTheme('dark');
      result.current.setTheme('light');
      result.current.clearTheme();

      expect(setTheme).toHaveBeenCalledTimes(2);
      expect(clearTheme).toHaveBeenCalledTimes(1);
    });
  });

  describe('reference stability', () => {
    it('should maintain reference when context value does not change', () => {
      const mockContextValue: ThemeContextValue = {
        theme: 'light',
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      const firstResult = result.current;

      // Rerender without changing context
      rerender();

      expect(result.current).toBe(firstResult);
    });

    it('should return same theme value across rerenders if unchanged', () => {
      const mockContextValue: ThemeContextValue = {
        theme: 'dark',
        setTheme: vi.fn(),
        clearTheme: vi.fn(),
      };

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: createWrapper(mockContextValue),
      });

      const firstTheme = result.current.theme;

      rerender();
      rerender();
      rerender();

      expect(result.current.theme).toBe(firstTheme);
    });
  });
});
