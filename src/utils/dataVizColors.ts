import { resolveCssColorToHex } from './color';

/** Named data hues (`--color-data-*` in src/index.css) for series that need a specific hue */
const DATA_HUES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
] as const;
type DataHue = (typeof DATA_HUES)[number];

// Cache object to avoid re-reading DOM on every call
const cache: { colors: ReturnType<typeof computeDataVizColors> | null } = { colors: null };

// Watch for theme changes on <html> element and invalidate cache
// Only invalidate when theme classes (dark/star) change, not for other class modifications
if (typeof document !== 'undefined') {
  let previousTheme = getCurrentTheme();

  const observer = new MutationObserver(() => {
    const currentTheme = getCurrentTheme();
    if (currentTheme !== previousTheme) {
      cache.colors = null; // Invalidate cache only when theme actually changes
      previousTheme = currentTheme;
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

// Helper to get current theme (same logic as useThemeColors)
function getCurrentTheme(): 'light' | 'dark' | 'star' {
  if (typeof document === 'undefined') return 'light';
  const classList = document.documentElement.classList;
  if (classList.contains('star')) return 'star';
  if (classList.contains('dark')) return 'dark';
  return 'light';
}

/**
 * Compute data visualization colors from CSS variables
 *
 * Uses resolveCssColorToHex (via culori) to convert Tailwind v4's oklch colors
 * to hex format for ECharts compatibility.
 * This is called once and cached for performance.
 */
function computeDataVizColors(): {
  BLOB_COLORS: readonly string[];
  CONTINENT_COLORS: {
    AF: string;
    AS: string;
    EU: string;
    NA: string;
    OC: string;
    SA: string;
    AN: string;
  };
  PERFORMANCE_TIME_COLORS: {
    excellent: string;
    good: string;
    fair: string;
    slow: string;
    poor: string;
  };
  CHART_CATEGORICAL_COLORS: readonly string[];
  DATA_COLORS: Record<DataHue, string>;
} {
  // Helper to resolve CSS variable to hex using shared utility
  const resolveVar = (varName: string): string => {
    return resolveCssColorToHex(`var(${varName})`);
  };

  const BLOB_COLORS: readonly string[] = [
    resolveVar('--color-blob-0'),
    resolveVar('--color-blob-1'),
    resolveVar('--color-blob-2'),
    resolveVar('--color-blob-3'),
    resolveVar('--color-blob-4'),
    resolveVar('--color-blob-5'),
  ] as const;

  const CONTINENT_COLORS = {
    AF: resolveVar('--color-continent-af'),
    AS: resolveVar('--color-continent-as'),
    EU: resolveVar('--color-continent-eu'),
    NA: resolveVar('--color-continent-na'),
    OC: resolveVar('--color-continent-oc'),
    SA: resolveVar('--color-continent-sa'),
    AN: resolveVar('--color-continent-an'),
  };

  const PERFORMANCE_TIME_COLORS = {
    excellent: resolveVar('--color-performance-excellent'),
    good: resolveVar('--color-performance-good'),
    fair: resolveVar('--color-performance-fair'),
    slow: resolveVar('--color-performance-slow'),
    poor: resolveVar('--color-performance-poor'),
  };

  const CHART_CATEGORICAL_COLORS: readonly string[] = [
    resolveVar('--color-chart-0'),
    resolveVar('--color-chart-1'),
    resolveVar('--color-chart-2'),
    resolveVar('--color-chart-3'),
    resolveVar('--color-chart-4'),
    resolveVar('--color-chart-5'),
    resolveVar('--color-chart-6'),
    resolveVar('--color-chart-7'),
    resolveVar('--color-chart-8'),
    resolveVar('--color-chart-9'),
    resolveVar('--color-chart-10'),
    resolveVar('--color-chart-11'),
    resolveVar('--color-chart-12'),
    resolveVar('--color-chart-13'),
    resolveVar('--color-chart-14'),
  ] as const;

  const DATA_COLORS = Object.fromEntries(DATA_HUES.map(hue => [hue, resolveVar(`--color-data-${hue}`)])) as Record<
    DataHue,
    string
  >;

  return {
    BLOB_COLORS,
    CONTINENT_COLORS,
    PERFORMANCE_TIME_COLORS,
    CHART_CATEGORICAL_COLORS,
    DATA_COLORS,
  };
}

/**
 * Invalidate the data viz colors cache (for testing)
 * @internal
 */
export function invalidateDataVizColorsCache(): void {
  cache.colors = null;
}

/**
 * Get data visualization colors from CSS variables
 *
 * These colors represent data categories (not UI elements) and remain
 * constant across themes. They are defined in `src/index.css` as CSS
 * variables and read via `getComputedStyle`.
 *
 * **Performance:** Results are cached after first call to avoid repeated DOM reads.
 * The first call reads from CSS via `getComputedStyle`, subsequent calls return
 * the cached result. Cache is automatically invalidated when the `<html>` element's
 * class changes (e.g., theme switching), ensuring colors stay in sync.
 *
 * **Usage Pattern:** Prefer module-level constants for best performance:
 *
 * @returns {Object} Data visualization color constants
 *
 * @example
 * ```ts
 * // Module-level constant (recommended - runs once)
 * import { getDataVizColors } from '@/utils/dataVizColors';
 * const { CONTINENT_COLORS } = getDataVizColors();
 *
 * export function MyComponent() {
 *   // Use CONTINENT_COLORS directly
 *   return <div style={{ color: CONTINENT_COLORS.EU }} />;
 * }
 * ```
 */
export function getDataVizColors(): ReturnType<typeof computeDataVizColors> {
  if (!cache.colors) {
    cache.colors = computeDataVizColors();
  }
  return cache.colors;
}

/** Font stack for ECharts canvas text; matches the UI's --font-sans. */
export const CHART_FONT_FAMILY = "'Geist Variable', Geist, system-ui, sans-serif";
