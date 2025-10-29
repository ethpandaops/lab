/**
 * @fileoverview Tests for no-primitive-color-scales rule
 * @author Lab Team
 *
 * Run with: node eslint-rules/no-primitive-color-scales.test.cjs
 */

const rule = require('./no-primitive-color-scales.cjs');
const { RuleTester } = require('eslint');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

ruleTester.run('no-primitive-color-scales', rule, {
  valid: [
    // Semantic tokens (brand)
    { code: '<div className="bg-primary">Text</div>' },
    { code: '<div className="text-secondary">Text</div>' },
    { code: '<div className="border-accent">Text</div>' },

    // Semantic tokens (surface)
    { code: '<div className="bg-background">Text</div>' },
    { code: '<div className="bg-surface">Text</div>' },
    { code: '<div className="text-foreground">Text</div>' },
    { code: '<div className="text-muted">Text</div>' },
    { code: '<div className="border-border">Text</div>' },

    // Semantic tokens (state)
    { code: '<div className="bg-success">Text</div>' },
    { code: '<div className="bg-warning">Text</div>' },
    { code: '<div className="bg-danger">Text</div>' },

    // Data viz tokens (allowed)
    { code: '<div className="bg-blob-0">Text</div>' },
    { code: '<div className="bg-continent-af">Text</div>' },
    { code: '<div className="bg-chart-0">Text</div>' },
    { code: '<div className="bg-performance-excellent">Text</div>' },

    // clsx with semantic tokens
    { code: 'clsx("bg-primary", "text-foreground")' },
    { code: 'cn("bg-success", isActive && "text-danger")' },
  ],

  invalid: [
    // Terracotta scale
    {
      code: '<div className="bg-terracotta-500">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'terracotta', match: 'bg-terracotta-500' },
        },
      ],
    },
    {
      code: '<div className="text-terracotta-300">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'terracotta', match: 'text-terracotta-300' },
        },
      ],
    },

    // Sand scale
    {
      code: '<div className="bg-sand-50">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'sand', match: 'bg-sand-50' },
        },
      ],
    },
    {
      code: '<div className="text-sand-600">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'sand', match: 'text-sand-600' },
        },
      ],
    },

    // Neutral scale
    {
      code: '<div className="bg-neutral-700">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'neutral', match: 'bg-neutral-700' },
        },
      ],
    },
    {
      code: '<div className="border-neutral-500">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'neutral', match: 'border-neutral-500' },
        },
      ],
    },

    // Aurora scales
    {
      code: '<div className="bg-aurora-cyan-400">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'aurora-cyan', match: 'bg-aurora-cyan-400' },
        },
      ],
    },
    {
      code: '<div className="bg-aurora-purple-500">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'aurora-purple', match: 'bg-aurora-purple-500' },
        },
      ],
    },
    {
      code: '<div className="text-aurora-pink-300">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'aurora-pink', match: 'text-aurora-pink-300' },
        },
      ],
    },

    // With opacity
    {
      code: '<div className="bg-terracotta-500/50">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'terracotta', match: 'bg-terracotta-500/50' },
        },
      ],
    },

    // Multiple violations
    {
      code: '<div className="bg-terracotta-500 text-sand-600 border-neutral-700">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'terracotta', match: 'bg-terracotta-500' },
        },
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'sand', match: 'text-sand-600' },
        },
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'neutral', match: 'border-neutral-700' },
        },
      ],
    },

    // clsx with violations
    {
      code: 'clsx("bg-terracotta-500", "text-primary")',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'terracotta', match: 'bg-terracotta-500' },
        },
      ],
    },

    // cn with violations
    {
      code: 'cn("bg-sand-100 text-neutral-900")',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'sand', match: 'bg-sand-100' },
        },
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'neutral', match: 'text-neutral-900' },
        },
      ],
    },

    // Various Tailwind utilities
    {
      code: '<div className="from-terracotta-500">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'terracotta', match: 'from-terracotta-500' },
        },
      ],
    },
    {
      code: '<div className="via-sand-400">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'sand', match: 'via-sand-400' },
        },
      ],
    },
    {
      code: '<div className="to-neutral-600">Text</div>',
      errors: [
        {
          messageId: 'primitiveColorScale',
          data: { scale: 'neutral', match: 'to-neutral-600' },
        },
      ],
    },
  ],
});

console.log('✅ All no-primitive-color-scales tests passed!');
