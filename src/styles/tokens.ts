/**
 * The colour tokens, grouped as the Foundations docs present them, and the
 * contrast each must reach. Values live only in tokens.css; tokens.test.ts
 * fails if the two disagree. Other tokens are read from tokens.css itself.
 */

/** Star is a dark theme with its own palette: tokens.css sets it in html.star. */
export const THEMES = ['light', 'dark', 'star'] as const;
export type Theme = (typeof THEMES)[number];

/** Where content sits, back to front. */
export const SURFACE_COLORS = ['background', 'surface'] as const;
export const BORDER_COLORS = ['border'] as const;
export const TEXT_COLORS = ['foreground', 'muted'] as const;
export const BRAND_COLORS = ['primary', 'secondary', 'accent', 'hyper'] as const;
export const STATUS_COLORS = ['success', 'warning', 'danger'] as const;

/** The base colours: each a light-dark() pair, which star replaces with its own value. */
export const COLOR_TOKENS = [
  ...SURFACE_COLORS,
  ...BORDER_COLORS,
  ...TEXT_COLORS,
  ...BRAND_COLORS,
  ...STATUS_COLORS,
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

/**
 * Every other colour that is neither a tint (`primary-10`: primary at 10%) nor a
 * data or category colour, by what it is for. Most follow the base colours; the
 * fixed ones (on-fill, beaconchain, cell-empty) read the same in every theme.
 */
export const DERIVED_COLORS = {
  'On a solid fill': ['on-fill', 'on-solid'],
  'Panels and text': ['panel', 'well', 'foreground-soft'],
  'Overlays and outlines': ['scrim', 'hairline', 'cell-empty', 'cell-empty-hover'],
  'States and washes': [
    'primary-hover',
    'primary-soft',
    'primary-soft-hover',
    'primary-wash',
    'primary-halo',
    'primary-toggle',
    'accent-wash',
    'danger-hover',
    'danger-soft',
    'surface-hover',
    'muted-hover',
    'muted-halo',
    'row-active',
    'dot-done',
    'dot-pending',
    'code-highlight',
    'data-blue-hover',
    'data-blue-row',
    'data-blue-fill',
    'data-violet-hover',
    'data-violet-row',
    'data-violet-fill',
  ],
  Logos: ['beaconchain'],
} as const;

/**
 * Colours for data rather than interface, the same in every theme: data hues and
 * what maps to them (`chart-0`, `blob-0`, `continent-eu`, `performance-good`).
 */
export const DATA_COLOR_PREFIXES = ['data', 'chart', 'blob', 'continent', 'performance'] as const;

/** Category colours from Tailwind's palette: Badge and chip tags, phase text, contributor classes. */
export const CATEGORY_COLOR_PREFIXES = ['tag', 'phase', 'contributor'] as const;

/** Category tag text (Badge, beacon and fork chips). */
const TAG_TEXT_COLORS = [
  'tag-gray',
  'tag-gray-chip',
  'tag-yellow',
  'tag-teal',
  'tag-blue',
  'tag-indigo',
  'tag-purple',
  'tag-pink',
  'tag-sky',
  'tag-slate',
  'tag-violet',
  'tag-amber',
] as const;

export interface ContrastRule {
  /** What the rule protects, as the docs name it. */
  name: string;
  foregrounds: readonly string[];
  backgrounds: readonly ColorToken[];
  /** WCAG 2.2 contrast: 4.5 for text, 3 for marks and large text. */
  minimum: number;
}

/**
 * Every pair tokens.test.ts checks in all three themes, and the Colours page shows.
 * Body text meets AA (4.5). The other minimums sit just under the light theme's weakest
 * pair, below AA: 4 for muted, status and tag text, and 2.5 for primary and accent, which
 * are for marks and large text. Dark and star clear them by a wide margin (dark primary on
 * surface is 7.47), so these minimums do not hold those themes at today's values.
 */
export const CONTRAST_RULES: readonly ContrastRule[] = [
  {
    name: 'Body text on every surface',
    foregrounds: ['foreground'],
    backgrounds: SURFACE_COLORS,
    minimum: 4.5,
  },
  {
    name: 'Muted text and status colours on every surface',
    foregrounds: ['muted', ...STATUS_COLORS],
    backgrounds: SURFACE_COLORS,
    minimum: 4,
  },
  {
    name: 'Brand colours on every surface (marks and large text)',
    foregrounds: ['primary', 'accent'],
    backgrounds: SURFACE_COLORS,
    minimum: 2.5,
  },
  {
    name: 'Category tag text on every surface',
    foregrounds: TAG_TEXT_COLORS,
    backgrounds: SURFACE_COLORS,
    minimum: 4,
  },
];

/** Colours no contrast rule covers, and why none needs to. */
export const CONTRAST_EXEMPT: Readonly<Partial<Record<ColorToken, string>>> = {
  border: 'separates; it identifies nothing you act on',
  secondary: 'a fill; nothing is read in it',
  hyper: "the hyper button's pulse; nothing is read in it",
};
