// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier/recommended';
import { fixupPluginRules } from '@eslint/compat';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import customRules from './eslint-rules/index.cjs';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'eslint_report.json',
      'src/api',
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
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAnyKeyword',
          message:
            'The `any` type defeats the purpose of TypeScript. Use proper types instead or `unknown` if the type is truly unknown.',
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
  // Tailwind CSS conflict detection (Prettier handles sorting)
  {
    plugins: {
      'better-tailwindcss': fixupPluginRules(betterTailwindcss),
    },
    rules: {
      // Correctness rules only - no styling/sorting rules
      'better-tailwindcss/no-conflicting-classes': 'warn', // Less expensive than error
      'better-tailwindcss/no-duplicate-classes': 'warn',
      // Disabled: Custom component classes in @layer components are intentional
      'better-tailwindcss/no-unknown-classes': 'off',
      'better-tailwindcss/no-deprecated-classes': 'off', // Disable expensive rule - Tailwind 4 is stable
      // Disable all stylistic rules (Prettier handles these)
      'better-tailwindcss/enforce-consistent-class-order': 'off',
      'better-tailwindcss/enforce-consistent-important-position': 'off',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-variable-syntax': 'off',
      'better-tailwindcss/enforce-shorthand-classes': 'off',
      'better-tailwindcss/no-unnecessary-whitespace': 'off',
    },
    settings: {
      'better-tailwindcss': {
        // Point to Tailwind v4 CSS-based config
        entryPoint: 'src/index.css',
        // Detect classes in these utility functions
        callees: ['classnames', 'clsx', 'cn', 'cva'],
      },
    },
  },
  // Custom color theming rules
  {
    files: ['**/*.{ts,tsx}'], // Only TSX/TS files have JSX and className
    plugins: {
      lab: customRules,
    },
    rules: {
      // Ban hardcoded colors (hex, rgb, hsl) in Tailwind classes
      'lab/no-hardcoded-colors': 'error',
      // Ban primitive color scales (terracotta-*, sand-*, neutral-*, aurora-*)
      'lab/no-primitive-color-scales': 'error',
      // Validate route images exist
      'lab/validate-route-images': 'error',
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
