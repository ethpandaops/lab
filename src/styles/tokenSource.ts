import { formatHex } from 'culori';
import css from './tokens.css?raw';
import type { Theme } from './tokens';

/**
 * tokens.css read as written, for the Foundations docs and tokens.test.ts.
 * The app never imports this: it reads tokens through Tailwind classes.
 */

/** A rule with no rule inside it: tokens.css holds nothing nested. */
const BLOCK = /([^{};]+)\{([^{}]*)\}/g;
const DECLARATION = /([a-z-][a-z0-9*-]*)\s*:\s*([^;]+);/g;

const clean = (text: string): string => text.trim().replace(/\s+/g, ' ');

const source = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Each top-level block's header and declarations, in order. */
const blocks = [...source.matchAll(BLOCK)].map(([, header = '', body = '']) => ({
  header: clean(header),
  declarations: new Map(
    [...body.matchAll(DECLARATION)].map(([, property = '', value = '']) => [property, clean(value)])
  ),
}));

/** `light-dark(a, b)` → `[a, b]`, splitting on the comma between the two arguments only. */
function lightDark(value: string): readonly [string, string] | undefined {
  const inner = /^light-dark\((.*)\)$/.exec(value)?.[1];
  if (inner === undefined) return undefined;
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++;
    if (inner[i] === ')') depth--;
    if (inner[i] === ',' && depth === 0) return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()];
  }
  throw new Error(`light-dark() needs two values: ${value}`);
}

const themeBlocks = blocks.filter(block => /^@theme\b/.test(block.header));
if (themeBlocks.length !== 1) throw new Error(`tokens.css needs exactly one @theme block; found ${themeBlocks.length}`);

/** `@theme`'s custom properties, without their `--`. */
const theme = new Map([...(themeBlocks[0]?.declarations ?? [])].map(([property, value]) => [property.slice(2), value]));

/** The colours html.star sets in place of the dark side, without their `--color-`. */
const starOverrides = new Map(
  [...(blocks.find(block => block.header === 'html.star')?.declarations ?? [])]
    .filter(([property]) => property.startsWith('--color-'))
    .map(([property, value]) => [property.slice('--color-'.length), value])
);

const colorsIn = (themeName: Theme): Map<string, string> =>
  new Map(
    [...theme]
      .filter(([name]) => name.startsWith('color-'))
      .map(([name, value]) => {
        const color = name.slice('color-'.length);
        const star = themeName === 'star' ? starOverrides.get(color) : undefined;
        return [color, star ?? lightDark(value)?.[themeName === 'light' ? 0 : 1] ?? value];
      })
  );

export const tokenSource = {
  blocks,
  /** Top-level statements such as `@import …`. */
  statements: source.replace(BLOCK, '').split(';').map(clean).filter(Boolean),
  theme,
  starOverrides,
  /** Each colour's value per theme: its `light-dark()` pair split, and star's own palette. */
  colors: { light: colorsIn('light'), dark: colorsIn('dark'), star: colorsIn('star') } as Readonly<
    Record<Theme, ReadonlyMap<string, string>>
  >,
};

/** A colour token's value in one theme, following `var()` references to the literal. */
export function colorValue(themeName: Theme, name: string): string {
  const value = tokenSource.colors[themeName].get(name);
  if (value === undefined) throw new Error(`--color-${name} is not in tokens.css's @theme block`);
  const reference = /^var\(--color-([a-z0-9-]+)\)$/.exec(value)?.[1];
  return reference === undefined ? value : colorValue(themeName, reference);
}

/**
 * A colour token's value in one theme as sRGB hex or rgb(), which contrast.ts reads. The
 * category colours are Tailwind's oklch palette; sRGB is what an sRGB display shows of them.
 */
export function srgbValue(themeName: Theme, name: string): string {
  const value = colorValue(themeName, name);
  return value.startsWith('oklch(') ? (formatHex(value) ?? value) : value;
}

/** The token names under `--<namespace>-*`, without sub-properties such as `--line-height`. */
export function namespaceNames(namespace: string): string[] {
  return [...theme.keys()]
    .filter(key => key.startsWith(`${namespace}-`) && !key.includes('--'))
    .filter(key => namespace !== 'font' || !key.startsWith('font-weight-'))
    .map(key => key.slice(namespace.length + 1));
}
