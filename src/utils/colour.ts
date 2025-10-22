/**
 * Colour Utilities
 *
 * Helper functions for working with CSS colors, including modern color formats like oklch
 */

/**
 * Add opacity/alpha to any CSS color format (hex, rgb, oklch, etc)
 *
 * Uses CSS color-mix for maximum compatibility with modern color formats
 *
 * @param color - Any valid CSS color (hex, rgb, oklch, named colors, etc)
 * @param opacity - Opacity value between 0 (transparent) and 1 (opaque)
 * @returns CSS color-mix string with applied opacity
 *
 * @example
 * ```ts
 * addOpacity('#ff0000', 0.5) // 50% opacity red
 * addOpacity('oklch(78.9% 0.154 211.53)', 0.25) // 25% opacity oklch color
 * addOpacity('rgb(255, 0, 0)', 0.8) // 80% opacity red
 * ```
 */
export function addOpacity(color: string, opacity: number): string {
  // Clamp opacity between 0 and 1
  const clampedOpacity = Math.max(0, Math.min(1, opacity));

  // Use CSS color-mix for modern color support (oklch, rgb, hex, etc)
  return `color-mix(in srgb, ${color} ${clampedOpacity * 100}%, transparent)`;
}

/**
 * Resolve any CSS color to hex format
 *
 * Converts modern CSS colors (oklch, color-mix, etc.) to hex format
 * that libraries like ECharts can understand
 *
 * @param color - Any valid CSS color string
 * @param fallback - Fallback color if resolution fails
 * @returns Hex color string (e.g., '#06b6d4')
 *
 * @example
 * ```ts
 * resolveCssColorToHex('oklch(78.9% 0.154 211.53)') // '#06b6d4'
 * resolveCssColorToHex('color-mix(in srgb, red 50%, blue)') // '#800080'
 * resolveCssColorToHex('rgb(255, 0, 0)') // '#ff0000'
 * resolveCssColorToHex('invalid', '#000000') // '#000000'
 * ```
 */
export function resolveCssColorToHex(color: string, fallback = '#000000'): string {
  // If already a hex color, return as-is
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }

  // Create a temporary element to resolve the color
  const temp = document.createElement('div');
  temp.style.color = color;

  // Append to body to ensure computed styles work
  document.body.appendChild(temp);

  // Get the computed color value
  const computedColor = window.getComputedStyle(temp).color;

  // Clean up
  document.body.removeChild(temp);

  // Parse rgb/rgba to hex
  const rgbMatch = computedColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    const toHex = (n: string): string => parseInt(n, 10).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // If parsing failed, return fallback
  return fallback;
}

/**
 * Convert hex color to rgba format with alpha channel
 *
 * Useful for canvas operations (like ECharts gradients) that require rgba format
 *
 * @param color - Any CSS color (will be resolved to hex first)
 * @param alpha - Alpha/opacity value between 0 (transparent) and 1 (opaque)
 * @param fallback - Fallback hex color if resolution fails
 * @returns RGBA color string (e.g., 'rgba(6, 182, 212, 0.5)')
 *
 * @example
 * ```ts
 * hexToRgba('#06b6d4', 0.5) // 'rgba(6, 182, 212, 0.5)'
 * hexToRgba('oklch(78.9% 0.154 211.53)', 0.25) // 'rgba(6, 182, 212, 0.25)'
 * hexToRgba('rgb(255, 0, 0)', 0.8) // 'rgba(255, 0, 0, 0.8)'
 * ```
 */
export function hexToRgba(color: string, alpha: number, fallback = '#06b6d4'): string {
  // Clamp alpha between 0 and 1
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  // Resolve to hex first
  const hex = resolveCssColorToHex(color, fallback);

  // Convert hex to rgb
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}
