/** A colour as 8-bit sRGB channels and an alpha from 0 to 1. */
interface Color {
  rgb: readonly [number, number, number];
  alpha: number;
}

/** Parses hex (3, 4, 6 or 8 digits) and `rgb()` / `rgba()`. */
function parseColor(value: string): Color {
  const color = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(color)?.[1];
  if (hex !== undefined) {
    const full = hex.length <= 4 ? hex.replace(/./g, '$&$&') : hex;
    const byte = (offset: number): number => parseInt(full.slice(offset, offset + 2), 16);
    return { rgb: [byte(0), byte(2), byte(4)], alpha: full.length === 8 ? byte(6) / 255 : 1 };
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(color);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : Number(rgb[4]) / (rgb[5] === '%' ? 100 : 1);
    return { rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])], alpha };
  }
  throw new Error(`not a colour contrast.ts reads (hex or rgb()): ${value}`);
}

/** True when two colours are the same sRGB colour and alpha, whatever their notation. */
export function sameColor(a: string, b: string): boolean {
  const [x, y] = [parseColor(a), parseColor(b)];
  return x.rgb.every((channel, index) => channel === y.rgb[index]) && Math.abs(x.alpha - y.alpha) <= 1 / 255;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance of an opaque colour; a translucent one has no contrast of its own. */
function luminance(value: string): number {
  const { rgb, alpha } = parseColor(value);
  if (alpha < 1) throw new Error(`contrast needs an opaque colour: ${value}`);
  const [r, g, b] = rgb.map(channel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio, from 1 (none) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
