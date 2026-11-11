// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier/recommended';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';
import customRules from './eslint-rules/index.cjs';

const noColor = 'Colours come from tokens in src/styles/tokens.css, used as Tailwind classes.';
// A colour literal: hex, rgb() or hsl(); in a colour property, a named colour too.
const colorLiteral = '^(?:#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\\(.*\\))$';
const colorProperty =
  '^(?:color|background(?:Color)?|border(?:Top|Right|Bottom|Left)?Color|outlineColor|textDecorationColor|fill|stroke|caretColor|accentColor)$';
// An opacity modifier (`bg-primary/10`). `w-1/2` is a fraction, and `text-sm/6` gives a type
// size a line height from the spacing step.
const modifier = '(?:^|:)!?(?!text-(?:2xs|xs|sm|base|lg|\\d?xl)/)[a-z-]*[a-z]/\\d+!?$';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'eslint_report.json',
      'src/api',
      'src/lab-api',
      'storybook-static',
      'lab',
      'eslint-rules',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['../*'], message: 'Import through the @/ alias instead of parent-relative paths.' }],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAnyKeyword',
          message:
            'The `any` type defeats the purpose of TypeScript. Use proper types instead or `unknown` if the type is truly unknown.',
        },
        // Colour literals in inline styles and SVG colour attributes bypass the tokens.
        { selector: `JSXAttribute[name.name='style'] Property > Literal[value=/${colorLiteral}/]`, message: noColor },
        {
          selector: `JSXAttribute[name.name='style'] Property[key.name=/${colorProperty}/] > Literal[value=/^(?!(?:currentColor|transparent|inherit|initial|unset|none)$)[a-zA-Z]+$/]`,
          message: noColor,
        },
        {
          selector: `JSXAttribute[name.name=/^(?:fill|stroke|color|stopColor|floodColor|lightingColor)$/] > Literal[value=/${colorLiteral}/]`,
          message: noColor,
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
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
              message: 'Opacity tints skip the contrast checks; use a tint token (bg-primary-10) or add one.',
            },
          ],
        },
      ],
    },
  },
  // Custom rules
  {
    files: ['**/*.{ts,tsx}'], // Only TSX/TS files have JSX and className
    plugins: {
      lab: customRules,
    },
    rules: {
      // Validate route images exist
      'lab/validate-route-images': 'error',
    },
  },
  {
    // The design-sync bundle resolves modules through its own path map (.design-sync/tsconfig.paths.json).
    files: ['.design-sync/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  // TanStack Router route files export both components and Route objects
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  storybook.configs['flat/recommended'],
  {
    files: ['**/.storybook/**/*.{js,ts}'],
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
