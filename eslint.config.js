import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintReact from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier/recommended';
import vitest from '@vitest/eslint-plugin';
import storybook from 'eslint-plugin-storybook';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';
import customRules from './eslint-rules/index.cjs';

const noColor = 'Colours come from tokens in src/styles/tokens.css, used as Tailwind classes.';
const noFixedStyle = 'A fixed value is a Tailwind class; style only carries values computed at runtime.';
// A colour literal: hex, rgb() or hsl().
const colorLiteral = '^(?:#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\\(.*\\))$';
const colorAttribute = '^(?:fill|stroke|color|stopColor|floodColor|lightingColor)$';
const styleValue = "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property";
// An opacity modifier (`bg-primary/10`). `w-1/2` is a fraction, and `text-sm/6` gives a type
// size a line height from the spacing step.
const modifier = '(?:^|:)!?(?!text-(?:2xs|xs|sm|base|lg|\\d?xl)/)[a-z-]*[a-z]/\\d+!?$';
const noParentImports = { group: ['../*'], message: 'Import through the @/ alias instead of parent-relative paths.' };

export default defineConfig(
  {
    // src/api and src/lab-api are generated from the CBT and lab-backend OpenAPI specs (pnpm generate:api).
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'storybook-static',
      'lab',
      'eslint-rules',
      'src/api',
      'src/lab-api',
      'src/routeTree.gen.ts',
    ],
  },
  {
    // A suppression only stays honest if a dead one fails the build.
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    ...eslintReact.configs['recommended-typescript'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // eslint-plugin-react-hooks owns hooks correctness; @eslint-react's
      // overlapping rules are off so nothing reports twice.
      '@eslint-react/rules-of-hooks': 'off',
      '@eslint-react/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // React Compiler static analysis. The compiler is not enabled in the
      // build; these rules are a lint-time guard only.
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/set-state-in-render': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/static-components': 'error',
      'react-hooks/use-memo': 'error',
      'react-hooks/globals': 'error',
      'react-hooks/error-boundaries': 'error',
      'react-hooks/no-deriving-state-in-effects': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      'no-restricted-imports': ['error', { patterns: [noParentImports] }],
      'no-restricted-syntax': [
        'error',
        // A value written into an inline style is a class instead; style keeps what is computed at runtime.
        {
          selector: `${styleValue} > :matches(Literal, TemplateLiteral[expressions.length=0], UnaryExpression[argument.type='Literal']).value`,
          message: noFixedStyle,
        },
        {
          selector: `${styleValue} > ConditionalExpression.value:matches([consequent.type='Literal'][alternate.type='Literal'], [consequent.type='Literal'][alternate.name='undefined'], [consequent.name='undefined'][alternate.type='Literal'])`,
          message: noFixedStyle,
        },
        // An element's SVG colour attributes take currentColor, none or a url() paint. Components keep colour
        // props (Badge's color="green" names a variant) but never a colour literal.
        {
          selector: `JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name=/${colorAttribute}/] > Literal[value!=/^(?:currentColor|none|url\\(.*\\))$/i]`,
          message: noColor,
        },
        {
          selector: `JSXOpeningElement:not([name.name=/^[a-z]/]) > JSXAttribute[name.name=/${colorAttribute}/] > Literal[value=/${colorLiteral}/]`,
          message: noColor,
        },
      ],
    },
  },
  {
    // Class names must be tokens: Tailwind's defaults are reset in src/styles/tokens.css, so
    // an unknown class is one no token covers. Besides className, clsx and the plugin's other
    // defaults, it reads class constants and variant maps (`…ClassName`, `…Classes`,
    // `…Styles`), props named `…ClassName`, helpers named `get…Class` or `get…Styles` written
    // as arrow functions, and the router's activeProps / inactiveProps.
    files: ['src/**/*.{ts,tsx}'],
    // Tests pass placeholder class names to check that props reach the DOM.
    ignores: ['src/**/*.test.{ts,tsx}'],
    extends: [betterTailwind.configs['correctness-error']],
    settings: {
      'better-tailwindcss': {
        entryPoint: 'src/index.css',
        selectors: [
          ...getDefaultSelectors(),
          {
            kind: 'variable',
            name: '^[a-z][A-Za-z]*(?:Class|Classes|ClassName|Styles)$',
            match: [{ type: 'strings' }, { type: 'objectValues' }],
          },
          { kind: 'attribute', name: '^[a-z][A-Za-z]*ClassName$', match: [{ type: 'strings' }] },
          {
            kind: 'variable',
            name: '^get[A-Z][A-Za-z]*(?:Class|Classes|ClassName|Styles)$',
            match: [{ type: 'anonymousFunctionReturn', match: [{ type: 'strings' }] }],
          },
          {
            kind: 'attribute',
            name: '^(?:active|inactive)Props$',
            match: [{ type: 'objectValues', path: '^className$' }],
          },
        ],
      },
    },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': 'error',
      // dark and star mark the theme on <html>; a story may set one to preview it.
      'better-tailwindcss/no-unknown-classes': ['error', { ignore: ['^dark$', '^star$'] }],
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            { pattern: '\\[[^\\[\\]]*\\](?!:)', message: 'Arbitrary values bypass the tokens; add a token instead.' },
            { pattern: '\\(--[^()]*\\)', message: 'Arbitrary variables bypass the tokens; add a token instead.' },
            {
              pattern: '(?:^|:)dark:',
              message: 'Tokens change with the theme; give the colour a light-dark() pair instead of a dark: variant.',
            },
            {
              pattern:
                '(?:^|:)on-dark:!?(?:bg|text|border|ring|inset-ring|outline|fill|stroke|from|via|to|shadow|divide|decoration|accent|caret|placeholder)-',
              message: 'on-dark: is for what a token cannot carry, such as images; colours are light-dark() tokens.',
            },
            { pattern: '(?:^|:)!?leading-', message: 'Line height comes with each text size; text-sm/6 sets another.' },
            {
              pattern: modifier,
              message: 'Opacity modifiers bypass the tokens; use a tint token (bg-primary-10) or add one.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      lab: customRules,
    },
    rules: {
      'lab/validate-route-images': 'error',
    },
  },
  {
    // The Foundations blocks draw swatches in the colours they document.
    files: ['src/design-docs/**/*.tsx'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Loading placeholders are identical and never reorder, so their index is their identity.
    files: ['src/**/*Skeleton.tsx'],
    rules: { '@eslint-react/no-array-index-key': 'off' },
  },
  {
    // Tests and stories see the same data on every run (src/test-utils/time.ts and random.ts).
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.stories.tsx'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Take the time from NOW_MS in @/test-utils/time.' },
        { object: 'Math', property: 'random', message: 'Use seededRandom from @/test-utils/random.' },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@testing-library/react', message: 'Import Testing Library helpers from @/test-utils.' }],
          patterns: [noParentImports],
        },
      ],
    },
  },
  {
    // The design-sync bundle resolves modules through its own path map (.design-sync/tsconfig.paths.json).
    files: ['.design-sync/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Route files export the Route object; Storybook config is not hot-reloaded.
    files: ['src/routes/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'knip.ts', 'vite-plugins/**/*.ts', '.storybook/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  storybook.configs['flat/recommended'],
  {
    files: ['.storybook/**/*.{js,ts}'],
    rules: {
      'storybook/no-uninstalled-addons': [
        'error',
        {
          packageJsonLocation: './package.json',
          ignore: ['storybook/viewport'],
        },
      ],
    },
  }
);
