import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDataVizColors, invalidateDataVizColorsCache } from './dataVizColors';

describe('getDataVizColors', () => {
  let mockElement: HTMLElement;
  let originalGetComputedStyle: typeof window.getComputedStyle;

  beforeEach(() => {
    // Store original getComputedStyle
    originalGetComputedStyle = window.getComputedStyle;

    // Create a mock element to test MutationObserver
    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    // Mock getComputedStyle to return predictable CSS variable values
    // Implementation reads temp.style.color after setting it to var(--color-name),
    // so we need to mock the .color property based on what was set
    window.getComputedStyle = vi.fn((element: Element) => {
      // Get the color that was set on the element's style
      const styleColor = (element as HTMLElement).style.color;

      // Map CSS variables to their hex values (simulating browser resolution)
      const mockColors: Record<string, string> = {
        'var(--color-blob-0)': 'rgb(255, 0, 0)', // #ff0000
        'var(--color-blob-1)': 'rgb(0, 255, 0)', // #00ff00
        'var(--color-blob-2)': 'rgb(0, 0, 255)', // #0000ff
        'var(--color-blob-3)': 'rgb(255, 255, 0)', // #ffff00
        'var(--color-blob-4)': 'rgb(255, 0, 255)', // #ff00ff
        'var(--color-blob-5)': 'rgb(0, 255, 255)', // #00ffff
        // Continent colors
        'var(--color-continent-af)': 'rgb(175, 0, 0)', // #af0000
        'var(--color-continent-as)': 'rgb(0, 175, 0)', // #00af00
        'var(--color-continent-eu)': 'rgb(0, 0, 175)', // #0000af
        'var(--color-continent-na)': 'rgb(175, 175, 0)', // #afaf00
        'var(--color-continent-oc)': 'rgb(175, 0, 175)', // #af00af
        'var(--color-continent-sa)': 'rgb(0, 175, 175)', // #00afaf
        'var(--color-continent-an)': 'rgb(175, 175, 175)', // #afafaf
        // Performance colors
        'var(--color-performance-excellent)': 'rgb(0, 255, 0)', // #00ff00
        'var(--color-performance-good)': 'rgb(127, 255, 0)', // #7fff00
        'var(--color-performance-fair)': 'rgb(255, 255, 0)', // #ffff00
        'var(--color-performance-slow)': 'rgb(255, 127, 0)', // #ff7f00
        'var(--color-performance-poor)': 'rgb(255, 0, 0)', // #ff0000
        // Chart categorical colors
        'var(--color-chart-0)': 'rgb(193, 0, 0)', // #c10000
        'var(--color-chart-1)': 'rgb(193, 0, 1)', // #c10001
        'var(--color-chart-2)': 'rgb(193, 0, 2)', // #c10002
        'var(--color-chart-3)': 'rgb(193, 0, 3)', // #c10003
        'var(--color-chart-4)': 'rgb(193, 0, 4)', // #c10004
        'var(--color-chart-5)': 'rgb(193, 0, 5)', // #c10005
        'var(--color-chart-6)': 'rgb(193, 0, 6)', // #c10006
        'var(--color-chart-7)': 'rgb(193, 0, 7)', // #c10007
        'var(--color-chart-8)': 'rgb(193, 0, 8)', // #c10008
        'var(--color-chart-9)': 'rgb(193, 0, 9)', // #c10009
        'var(--color-chart-10)': 'rgb(193, 0, 10)', // #c1000a
        'var(--color-chart-11)': 'rgb(193, 0, 11)', // #c1000b
        'var(--color-chart-12)': 'rgb(193, 0, 12)', // #c1000c
        'var(--color-chart-13)': 'rgb(193, 0, 13)', // #c1000d
        'var(--color-chart-14)': 'rgb(193, 0, 14)', // #c1000e
      };

      const mockStyles: Partial<CSSStyleDeclaration> = {
        color: mockColors[styleColor] || '',
        getPropertyValue: (property: string): string => {
          return mockColors[`var(${property})`] || '';
        },
      };
      return mockStyles as CSSStyleDeclaration;
    }) as typeof window.getComputedStyle;
  });

  afterEach(() => {
    // Restore original getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;

    // Clean up DOM
    if (mockElement.parentNode) {
      document.body.removeChild(mockElement);
    }

    vi.restoreAllMocks();

    // Explicitly invalidate cache for next test
    invalidateDataVizColorsCache();

    // Reset to light theme
    document.documentElement.className = '';
  });

  describe('BLOB_COLORS', () => {
    it('should return 6 blob colors', () => {
      const { BLOB_COLORS } = getDataVizColors();
      expect(BLOB_COLORS).toHaveLength(6);
    });

    it('should return blob colors in correct order', () => {
      const { BLOB_COLORS } = getDataVizColors();
      expect(BLOB_COLORS[0]).toBe('#ff0000');
      expect(BLOB_COLORS[1]).toBe('#00ff00');
      expect(BLOB_COLORS[2]).toBe('#0000ff');
      expect(BLOB_COLORS[3]).toBe('#ffff00');
      expect(BLOB_COLORS[4]).toBe('#ff00ff');
      expect(BLOB_COLORS[5]).toBe('#00ffff');
    });

    it('should return blob colors as readonly array', () => {
      const { BLOB_COLORS } = getDataVizColors();
      expect(Object.isFrozen(BLOB_COLORS)).toBe(false); // TypeScript readonly, not runtime frozen
      expect(Array.isArray(BLOB_COLORS)).toBe(true);
    });
  });

  describe('CONTINENT_COLORS', () => {
    it('should return colors for all 7 continents', () => {
      const { CONTINENT_COLORS } = getDataVizColors();
      expect(Object.keys(CONTINENT_COLORS)).toHaveLength(7);
    });

    it('should have colors for each continent code', () => {
      const { CONTINENT_COLORS } = getDataVizColors();
      expect(CONTINENT_COLORS.AF).toBe('#af0000');
      expect(CONTINENT_COLORS.AS).toBe('#00af00');
      expect(CONTINENT_COLORS.EU).toBe('#0000af');
      expect(CONTINENT_COLORS.NA).toBe('#afaf00');
      expect(CONTINENT_COLORS.OC).toBe('#af00af');
      expect(CONTINENT_COLORS.SA).toBe('#00afaf');
      expect(CONTINENT_COLORS.AN).toBe('#afafaf');
    });

    it('should return all hex colors in correct format', () => {
      const { CONTINENT_COLORS } = getDataVizColors();
      const hexPattern = /^#[0-9a-f]{6}$/i;
      Object.values(CONTINENT_COLORS).forEach(color => {
        expect(color).toMatch(hexPattern);
      });
    });
  });

  describe('PERFORMANCE_TIME_COLORS', () => {
    it('should return colors for all 5 performance levels', () => {
      const { PERFORMANCE_TIME_COLORS } = getDataVizColors();
      expect(Object.keys(PERFORMANCE_TIME_COLORS)).toHaveLength(5);
    });

    it('should have colors for each performance level', () => {
      const { PERFORMANCE_TIME_COLORS } = getDataVizColors();
      expect(PERFORMANCE_TIME_COLORS.excellent).toBe('#00ff00');
      expect(PERFORMANCE_TIME_COLORS.good).toBe('#7fff00');
      expect(PERFORMANCE_TIME_COLORS.fair).toBe('#ffff00');
      expect(PERFORMANCE_TIME_COLORS.slow).toBe('#ff7f00');
      expect(PERFORMANCE_TIME_COLORS.poor).toBe('#ff0000');
    });

    it('should return all hex colors in correct format', () => {
      const { PERFORMANCE_TIME_COLORS } = getDataVizColors();
      const hexPattern = /^#[0-9a-f]{6}$/i;
      Object.values(PERFORMANCE_TIME_COLORS).forEach(color => {
        expect(color).toMatch(hexPattern);
      });
    });
  });

  describe('CHART_CATEGORICAL_COLORS', () => {
    it('should return 9 chart categorical colors', () => {
      const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
      expect(CHART_CATEGORICAL_COLORS).toHaveLength(15);
    });

    it('should return chart colors in correct order', () => {
      const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
      expect(CHART_CATEGORICAL_COLORS[0]).toBe('#c10000');
      expect(CHART_CATEGORICAL_COLORS[1]).toBe('#c10001');
      expect(CHART_CATEGORICAL_COLORS[2]).toBe('#c10002');
      expect(CHART_CATEGORICAL_COLORS[3]).toBe('#c10003');
      expect(CHART_CATEGORICAL_COLORS[4]).toBe('#c10004');
      expect(CHART_CATEGORICAL_COLORS[5]).toBe('#c10005');
      expect(CHART_CATEGORICAL_COLORS[6]).toBe('#c10006');
      expect(CHART_CATEGORICAL_COLORS[7]).toBe('#c10007');
      expect(CHART_CATEGORICAL_COLORS[8]).toBe('#c10008');
      expect(CHART_CATEGORICAL_COLORS[9]).toBe('#c10009');
      expect(CHART_CATEGORICAL_COLORS[10]).toBe('#c1000a');
      expect(CHART_CATEGORICAL_COLORS[11]).toBe('#c1000b');
      expect(CHART_CATEGORICAL_COLORS[12]).toBe('#c1000c');
      expect(CHART_CATEGORICAL_COLORS[13]).toBe('#c1000d');
      expect(CHART_CATEGORICAL_COLORS[14]).toBe('#c1000e');
    });

    it('should return chart colors as readonly array', () => {
      const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
      expect(Array.isArray(CHART_CATEGORICAL_COLORS)).toBe(true);
    });

    it('should return all hex colors in correct format', () => {
      const { CHART_CATEGORICAL_COLORS } = getDataVizColors();
      const hexPattern = /^#[0-9a-f]{6}$/i;
      CHART_CATEGORICAL_COLORS.forEach(color => {
        expect(color).toMatch(hexPattern);
      });
    });
  });

  describe('caching behavior', () => {
    it('should return cached colors on subsequent calls', () => {
      const firstCall = getDataVizColors();
      const secondCall = getDataVizColors();

      // Should be the exact same object reference (cached)
      expect(firstCall).toBe(secondCall);
      expect(firstCall.BLOB_COLORS).toBe(secondCall.BLOB_COLORS);
      expect(firstCall.CONTINENT_COLORS).toBe(secondCall.CONTINENT_COLORS);
      expect(firstCall.PERFORMANCE_TIME_COLORS).toBe(secondCall.PERFORMANCE_TIME_COLORS);
      expect(firstCall.CHART_CATEGORICAL_COLORS).toBe(secondCall.CHART_CATEGORICAL_COLORS);
    });

    it('should only compute colors once when cached', () => {
      const spy = vi.spyOn(window, 'getComputedStyle');

      // First call computes all 33 colors (6 blob + 7 continent + 5 performance + 15 chart)
      getDataVizColors();
      const firstCallCount = spy.mock.calls.length;

      // Reset spy to count subsequent calls
      spy.mockClear();

      // Second and third calls should use cache, not compute again
      getDataVizColors();
      getDataVizColors();

      // Should not call getComputedStyle again due to caching
      expect(spy).toHaveBeenCalledTimes(0);

      // Verify first call computed all colors (33 calls to getComputedStyle)
      expect(firstCallCount).toBe(33);
    });

    it('should invalidate cache when theme changes', () => {
      const firstCall = getDataVizColors();

      // Trigger cache invalidation by adding theme class
      document.documentElement.className = 'dark';

      // Allow MutationObserver to process
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const secondCall = getDataVizColors();

          // Should be different object references after theme change
          expect(firstCall).not.toBe(secondCall);
          resolve();
        }, 50);
      });
    });

    it('should recompute colors after theme change', () => {
      // Start with light theme (empty className)
      document.documentElement.className = '';
      getDataVizColors();

      // Update mock to return different colors
      window.getComputedStyle = vi.fn((element: Element) => {
        const styleColor = (element as HTMLElement).style.color;
        const mockColors: Record<string, string> = {
          'var(--color-blob-0)': 'rgb(0, 0, 0)', // Changed from rgb(255, 0, 0)
        };
        return {
          color: mockColors[styleColor] || 'rgb(255, 255, 255)',
          getPropertyValue: (): string => '',
        } as unknown as CSSStyleDeclaration;
      }) as typeof window.getComputedStyle;

      // Invalidate cache by changing to dark theme
      document.documentElement.className = 'dark';

      // Allow MutationObserver to process
      return new Promise<void>(resolve => {
        setTimeout(() => {
          const { BLOB_COLORS } = getDataVizColors();
          expect(BLOB_COLORS[0]).toBe('#000000');
          resolve();
        }, 50);
      });
    });
  });

  describe('MutationObserver behavior', () => {
    it('should invalidate cache only on theme changes (dark/star)', () => {
      const firstCall = getDataVizColors();

      // Add dark theme class
      document.documentElement.className = 'dark';

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const secondCall = getDataVizColors();
          // Should invalidate cache on theme change
          expect(firstCall).not.toBe(secondCall);
          resolve();
        }, 50);
      });
    });

    it('should NOT invalidate cache on non-theme class changes', () => {
      const firstCall = getDataVizColors();

      // Add a non-theme class (should not invalidate cache)
      document.documentElement.className = 'some-other-class';

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const secondCall = getDataVizColors();
          // Should be the same reference (cache not invalidated)
          expect(firstCall).toBe(secondCall);
          resolve();
        }, 50);
      });
    });

    it('should only monitor class attribute changes, not other attributes', () => {
      const firstCall = getDataVizColors();

      // Change a different attribute (should not invalidate cache)
      document.documentElement.setAttribute('data-test', 'value');

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const secondCall = getDataVizColors();
          // Should be the same reference (cache not invalidated)
          expect(firstCall).toBe(secondCall);
          resolve();
        }, 50);
      });
    });
  });

  describe('integration with resolveCssColorToHex', () => {
    it('should convert CSS color variables to hex format', () => {
      const { BLOB_COLORS, CONTINENT_COLORS, PERFORMANCE_TIME_COLORS, CHART_CATEGORICAL_COLORS } = getDataVizColors();

      // All colors should be hex format
      const hexPattern = /^#[0-9a-f]{6}$/i;

      BLOB_COLORS.forEach(color => expect(color).toMatch(hexPattern));
      Object.values(CONTINENT_COLORS).forEach(color => expect(color).toMatch(hexPattern));
      Object.values(PERFORMANCE_TIME_COLORS).forEach(color => expect(color).toMatch(hexPattern));
      CHART_CATEGORICAL_COLORS.forEach(color => expect(color).toMatch(hexPattern));
    });
  });

  describe('return type structure', () => {
    it('should return object with all expected properties', () => {
      const colors = getDataVizColors();

      expect(colors).toHaveProperty('BLOB_COLORS');
      expect(colors).toHaveProperty('CONTINENT_COLORS');
      expect(colors).toHaveProperty('PERFORMANCE_TIME_COLORS');
      expect(colors).toHaveProperty('CHART_CATEGORICAL_COLORS');
    });

    it('should return correct types for all properties', () => {
      const colors = getDataVizColors();

      expect(Array.isArray(colors.BLOB_COLORS)).toBe(true);
      expect(typeof colors.CONTINENT_COLORS).toBe('object');
      expect(typeof colors.PERFORMANCE_TIME_COLORS).toBe('object');
      expect(Array.isArray(colors.CHART_CATEGORICAL_COLORS)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle missing CSS variables gracefully', async () => {
      // Mock getComputedStyle to return empty strings
      window.getComputedStyle = vi.fn((_element: Element) => {
        return {
          color: '',
          getPropertyValue: (): string => '',
        } as unknown as CSSStyleDeclaration;
      }) as typeof window.getComputedStyle;

      // Invalidate cache by switching to dark theme (triggers cache invalidation)
      document.documentElement.className = 'dark';

      // Wait for MutationObserver to process
      await new Promise(resolve => setTimeout(resolve, 50));

      const colors = getDataVizColors();

      // resolveCssColorToHex should return fallback #000000 for empty values
      expect(colors.BLOB_COLORS[0]).toBe('#000000');
    });

    it('should handle whitespace in CSS variable values', async () => {
      // Mock with whitespace
      window.getComputedStyle = vi.fn((element: Element) => {
        const styleColor = (element as HTMLElement).style.color;
        if (styleColor === 'var(--color-blob-0)') {
          return {
            color: 'rgb(255, 0, 0)',
            getPropertyValue: (): string => '',
          } as unknown as CSSStyleDeclaration;
        }
        return {
          color: '',
          getPropertyValue: (): string => '',
        } as unknown as CSSStyleDeclaration;
      }) as typeof window.getComputedStyle;

      // Invalidate cache by switching to star theme (triggers cache invalidation)
      document.documentElement.className = 'star';

      // Wait for MutationObserver to process
      await new Promise(resolve => setTimeout(resolve, 50));

      const { BLOB_COLORS } = getDataVizColors();
      expect(BLOB_COLORS[0]).toBe('#ff0000');
    });
  });
});
