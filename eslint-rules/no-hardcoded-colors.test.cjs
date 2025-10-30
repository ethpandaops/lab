/**
 * @fileoverview Tests for no-hardcoded-colors rule
 * @author Lab Team
 *
 * Run with: node eslint-rules/no-hardcoded-colors.test.cjs
 */

const rule = require('./no-hardcoded-colors.cjs');
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

ruleTester.run('no-hardcoded-colors', rule, {
  valid: [
    // Tailwind semantic tokens
    { code: '<div className="bg-primary">Text</div>' },
    { code: '<div className="text-danger">Text</div>' },
    { code: '<div className="border-accent">Text</div>' },

    // CSS variables in inline styles
    { code: '<div style={{ color: "var(--color-primary)" }}>Text</div>' },
    { code: '<div style={{ backgroundColor: "var(--color-danger)" }}>Text</div>' },

    // Special allowed values
    { code: '<div style={{ color: "transparent" }}>Text</div>' },
    { code: '<div style={{ color: "currentColor" }}>Text</div>' },
    { code: '<div style={{ color: "inherit" }}>Text</div>' },

    // Non-literal values (theme colors from hook)
    { code: '<div style={{ color: themeColors.primary }}>Text</div>' },
    { code: '<div style={{ backgroundColor: props.color }}>Text</div>' },

    // clsx with semantic tokens
    { code: 'clsx("bg-primary", "text-foreground")' },
    { code: 'cn("bg-success", isActive && "text-danger")' },
  ],

  invalid: [
    // Tailwind arbitrary values - hex
    {
      code: '<div className="bg-[#ff0000]">Text</div>',
      errors: [
        {
          messageId: 'hardcodedHexColor',
          data: { value: '[#ff0000]' },
        },
      ],
    },

    // Tailwind arbitrary values - rgb
    {
      code: '<div className="text-[rgb(255,0,0)]">Text</div>',
      errors: [
        {
          messageId: 'hardcodedRgbColor',
          data: { value: '[rgb(255,0,0)]' },
        },
      ],
    },

    // Tailwind arbitrary values - hsl
    {
      code: '<div className="border-[hsl(0,100%,50%)]">Text</div>',
      errors: [
        {
          messageId: 'hardcodedHslColor',
          data: { value: '[hsl(0,100%,50%)]' },
        },
      ],
    },

    // Inline styles - hex
    {
      code: '<div style={{ color: "#ff0000" }}>Text</div>',
      errors: [
        {
          messageId: 'hardcodedHexColor',
          data: { value: '#ff0000' },
        },
      ],
    },

    // Inline styles - rgb
    {
      code: '<div style={{ backgroundColor: "rgb(255,0,0)" }}>Text</div>',
      errors: [
        {
          messageId: 'hardcodedRgbColor',
          data: { value: 'rgb(255,0,0)' },
        },
      ],
    },

    // Inline styles - rgba
    {
      code: '<div style={{ borderColor: "rgba(255,0,0,0.5)" }}>Text</div>',
      errors: [
        {
          messageId: 'hardcodedRgbColor',
          data: { value: 'rgba(255,0,0,0.5)' },
        },
      ],
    },

    // Inline styles - hsl
    {
      code: '<div style={{ color: "hsl(0,100%,50%)" }}>Text</div>',
      errors: [
        {
          messageId: 'hardcodedHslColor',
          data: { value: 'hsl(0,100%,50%)' },
        },
      ],
    },

    // Inline styles - named colors
    {
      code: '<div style={{ color: "red" }}>Text</div>',
      errors: [
        {
          messageId: 'hardcodedNamedColor',
          data: { value: 'red', property: 'color' },
        },
      ],
    },
    {
      code: '<div style={{ backgroundColor: "blue" }}>Text</div>',
      errors: [
        {
          messageId: 'hardcodedNamedColor',
          data: { value: 'blue', property: 'backgroundColor' },
        },
      ],
    },

    // Multiple violations
    {
      code: '<div style={{ color: "#ffffff", backgroundColor: "blue", borderColor: "rgb(0,255,0)" }}>Text</div>',
      errors: [
        {
          messageId: 'hardcodedHexColor',
          data: { value: '#ffffff' },
        },
        {
          messageId: 'hardcodedNamedColor',
          data: { value: 'blue', property: 'backgroundColor' },
        },
        {
          messageId: 'hardcodedRgbColor',
          data: { value: 'rgb(0,255,0)' },
        },
      ],
    },

    // clsx with violations
    {
      code: 'clsx("bg-[#00ff00]", "text-primary")',
      errors: [
        {
          messageId: 'hardcodedHexColor',
          data: { value: '[#00ff00]' },
        },
      ],
    },

    // cn with violations
    {
      code: 'cn("bg-[#ff0000] text-[rgb(0,255,0)]")',
      errors: [
        {
          messageId: 'hardcodedHexColor',
          data: { value: '[#ff0000]' },
        },
        {
          messageId: 'hardcodedRgbColor',
          data: { value: '[rgb(0,255,0)]' },
        },
      ],
    },
  ],
});

console.log('✅ All no-hardcoded-colors tests passed!');
