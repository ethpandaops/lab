import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio, sameColor } from './contrast';
import { colorValue, namespaceNames, srgbValue, tokenSource } from './tokenSource';
import {
  CATEGORY_COLOR_PREFIXES,
  COLOR_TOKENS,
  CONTRAST_EXEMPT,
  CONTRAST_RULES,
  DATA_COLOR_PREFIXES,
  DERIVED_COLORS,
  THEMES,
  type ColorToken,
} from './tokens';

const { blocks, statements, theme, starOverrides } = tokenSource;

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i;
const read = (file: string): string => readFileSync(join(import.meta.dirname, file), 'utf8');

/** `primary-10`: a colour at a percentage of its strength. */
const TINT = /^(.+)-(\d+)$/;

describe('tokens.css', () => {
  it('imports Tailwind and holds the colour schemes, one @theme block and the star palette, nothing else', () => {
    expect(statements).toEqual([
      "@import 'tailwindcss' source(none)",
      '@custom-variant on-dark (&:where(.dark, .dark *, .star, .star *))',
    ]);
    expect(blocks.map(block => block.header)).toEqual([':root', 'html.dark, html.star', '@theme static', 'html.star']);
  });

  it('sets only the colour scheme outside @theme and the star palette', () => {
    const stray = blocks
      .filter(block => block.header === ':root' || block.header === 'html.dark, html.star')
      .flatMap(block => [...block.declarations.keys()].filter(property => property !== 'color-scheme'));
    expect(stray).toEqual([]);
  });

  it("removes Tailwind's defaults before defining any token", () => {
    expect([...theme.entries()][0]).toEqual(['*', 'initial']);
  });

  it('writes colour literals in colour and shadow tokens only', () => {
    const literals = [...theme].filter(
      ([name, value]) => !name.startsWith('color-') && !name.startsWith('shadow-') && COLOR_LITERAL.test(value)
    );
    expect(literals.map(([name]) => `--${name}`)).toEqual([]);
  });
});

describe('colours', () => {
  const names = namespaceNames('color');
  const derived: string[] = Object.values(DERIVED_COLORS).flat();
  const isTint = (name: string): boolean => {
    const base = TINT.exec(name)?.[1];
    return base !== undefined && names.includes(base);
  };
  const byPrefix = (prefixes: readonly string[], name: string): boolean =>
    prefixes.some(prefix => name.startsWith(`${prefix}-`));

  it('defines every base colour as a light-dark() pair', () => {
    for (const name of COLOR_TOKENS) {
      const value = theme.get(`color-${name}`) ?? '';
      expect(value, name).toMatch(/^light-dark\(.+\)$/);
      for (const side of ['light', 'dark'] as const) {
        expect(colorValue(side, name), `${name} (${side})`).toMatch(/^(?:#[0-9a-f]{6}|oklch\(.+\))$/);
      }
    }
  });

  it('gives every base colour, and only those, its own value in star', () => {
    expect([...starOverrides.keys()].sort()).toEqual([...COLOR_TOKENS].sort());
  });

  it('knows every colour: base, derived, tint, data or category', () => {
    const unknown = names.filter(
      name =>
        !(COLOR_TOKENS as readonly string[]).includes(name) &&
        !derived.includes(name) &&
        !isTint(name) &&
        !byPrefix(DATA_COLOR_PREFIXES, name) &&
        !byPrefix(CATEGORY_COLOR_PREFIXES, name)
    );
    expect(unknown).toEqual([]);
    expect(derived.filter(name => !names.includes(name))).toEqual([]);
  });

  it('writes each tint as its colour at the percentage in its name', () => {
    for (const name of names.filter(isTint)) {
      const [, base, percent] = TINT.exec(name) ?? [];
      expect(theme.get(`color-${name}`), name).toBe(
        `color-mix(in oklab, var(--color-${base}) ${percent}%, transparent)`
      );
    }
  });

  it('derives the derived colours from other colours wherever they follow the theme', () => {
    const literalOnly = ['on-fill', 'beaconchain', 'scrim', 'hairline', 'cell-empty', 'cell-empty-hover'];
    for (const name of derived.filter(name => !literalOnly.includes(name))) {
      expect(theme.get(`color-${name}`), name).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgba?|oklch)\(/i);
    }
  });

  it('puts every base colour in a contrast rule, or exempts it with a reason', () => {
    const ruled = new Set(CONTRAST_RULES.flatMap(rule => [...rule.foregrounds, ...rule.backgrounds]));
    const bare = COLOR_TOKENS.filter(token => !ruled.has(token) && CONTRAST_EXEMPT[token as ColorToken] === undefined);
    expect(bare).toEqual([]);
  });
});

describe.each(THEMES)('contrast in the %s theme', name => {
  it.each(CONTRAST_RULES.map(rule => [rule.name, rule] as const))('%s', (_, rule) => {
    for (const foreground of rule.foregrounds) {
      for (const background of rule.backgrounds) {
        const ratio = contrastRatio(srgbValue(name, foreground), srgbValue(name, background));
        expect(ratio, `${foreground} on ${background}`).toBeGreaterThanOrEqual(rule.minimum);
      }
    }
  });
});

describe('outside tokens.css', () => {
  const LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|light-dark)\(/i;

  it('declares no theme and writes no colour literals in the other stylesheets', () => {
    const sheets = [
      '../index.css',
      'base.css',
      'utilities.css',
      '../components/Elements/Button/Button.css',
      '../components/DateTimePickers/DatePicker/DatePicker.css',
    ];
    for (const sheet of sheets) {
      const text = read(sheet).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(text, sheet).not.toMatch(/@theme|@custom-variant|--color-[a-z0-9-]+\s*:/);
      expect(text, sheet).not.toMatch(LITERAL);
    }
  });

  it("gives the browser each theme's background as its theme colour", () => {
    const sources = {
      'index.html': read('../../index.html'),
      ThemeProvider: read('../providers/ThemeProvider/ThemeProvider.tsx'),
    };
    for (const [file, text] of Object.entries(sources)) {
      const colors = /\{ light: '([^']+)', dark: '([^']+)', star: '([^']+)' \}/.exec(text)?.slice(1);
      expect(colors, `${file} theme colours`).toHaveLength(3);
      THEMES.forEach((name, index) => {
        expect(sameColor(colors?.[index] ?? '', colorValue(name, 'background')), `${file}: ${name}`).toBe(true);
      });
    }
  });
});
