---
paths:
  - '**/src/**/*.tsx'
  - '**/src/**/*.ts'
  - '**/src/**/*.css'
  - '**/src/**/*.mdx'
---

# Styling

- Every value is a token in `src/styles/tokens.css`, used as a Tailwind class. Tailwind's defaults are removed, so
  `bg-red-500`, `text-white`, `text-7xl` and `shadow-2xl` do not exist. Spacing and sizing use the 4px step (`p-4`,
  `gap-6`, `h-75`); each text size carries its line height, and `text-sm/6` sets another.
- Lint rejects classes and colours that bypass the tokens: arbitrary values (`h-[300px]`), `dark:` variants,
  `leading-*`, opacity modifiers (`bg-primary/10`), and colour literals in `style` or SVG colour attributes. It reads
  class strings in `className` and `…ClassName` props, `clsx`, the router's `activeProps` and `inactiveProps`, class
  constants and variant maps named `…ClassName`, `…Classes` or `…Styles`, and arrow-function helpers named
  `get…Class` or `get…Styles`. Write each class whole (not `` `text-${tone}` ``) so lint checks it and Tailwind finds
  it.
- Name tokens for their role (`danger`, `muted`, `panel`), never their look. Tags and chips name their category.
- Every base colour is a `light-dark(light, dark)` pair with its own value in `html.star`. Lab has three themes: light
  and dark are the two sides of each pair, and star is a dark scheme with its own palette. Colours derived from the
  base ones (tints, `panel`, `on-solid`) follow all three. Give a colour a pair or use a derived token; never a
  `dark:` variant. `on-dark:` is for what a token cannot carry, such as swapping a logo, and never takes a colour.
- Layouts Tailwind has no class for (grid templates, a size less the viewport, card insets) are named utilities in
  `src/styles/utilities.css`.
- No state is carried by colour alone: a word or a mark goes with it.
- Charts read colours through `useThemeColors()` and `src/utils/dataVizColors.ts`, which resolve the tokens for the
  active theme.

## Adding a token

1. Add it to the `@theme static` block in `tokens.css`, in Tailwind's namespace for it (`--color-*`, `--text-*` with
   its `--text-*--line-height`, `--radius-*`, `--container-*`, …). A base colour is `light-dark()` of two hex values,
   with its star value in `html.star`. Any other colour derives from the base ones with `var()`, or is a tint:
   `--color-primary-15: color-mix(in oklab, var(--color-primary) 15%, transparent)`.
2. Add a base colour to its group in `src/styles/tokens.ts`, and to a `CONTRAST_RULES` entry or to
   `CONTRAST_EXEMPT` with the reason. A derived colour goes in `DERIVED_COLORS`.
3. `pnpm test:unit` checks the file, the colour names and tints, contrast in all three themes, and that `index.html`
   and `ThemeProvider` give the browser each theme's background.
