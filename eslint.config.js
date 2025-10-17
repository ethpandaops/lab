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

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage', 'eslint_report.json', 'src/api', 'storybook-static'],
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
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-unregistered-classes': ['warn'],
      'better-tailwindcss/no-deprecated-classes': 'warn',
      // Disable all stylistic rules (Prettier handles these)
      'better-tailwindcss/multiline': 'off',
      'better-tailwindcss/sort-classes': 'off',
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
