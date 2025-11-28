/**
 * @fileoverview Tests for validate-route-images rule
 * @author Lab Team
 */

const { RuleTester } = require('eslint');
const rule = require('./validate-route-images.cjs');

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
});

// Mock fs.existsSync to control test behavior
const fs = require('fs');
const originalExistsSync = fs.existsSync;

ruleTester.run('validate-route-images', rule, {
  valid: [
    {
      // File exists (we'll mock this)
      code: `
        export const Route = createFileRoute('/xatu/contributors')({
          head: () => ({
            meta: [
              { property: 'og:image', content: '/images/xatu/contributors.png' },
              { name: 'twitter:image', content: '/images/xatu/contributors.png' },
            ],
          }),
        });
      `,
      filename: 'src/routes/xatu/contributors.tsx',
    },
    {
      // Not a route file
      code: `
        const meta = { property: 'og:image', content: '/images/missing.png' };
      `,
      filename: 'src/components/SomeComponent.tsx',
    },
    {
      // External URL (not /images/)
      code: `
        export const Route = createFileRoute('/test')({
          head: () => ({
            meta: [
              { property: 'og:image', content: 'https://example.com/image.png' },
            ],
          }),
        });
      `,
      filename: 'src/routes/test.tsx',
    },
  ],

  invalid: [
    {
      // Missing image file
      code: `
        export const Route = createFileRoute('/test')({
          head: () => ({
            meta: [
              { property: 'og:image', content: '/images/missing/file.png' },
            ],
          }),
        });
      `,
      filename: 'src/routes/test.tsx',
      errors: [
        {
          messageId: 'missingImage',
          data: {
            imagePath: '/images/missing/file.png',
          },
        },
      ],
    },
    {
      // Missing twitter image
      code: `
        export const Route = createFileRoute('/test')({
          head: () => ({
            meta: [
              { name: 'twitter:image', content: '/images/nonexistent.png' },
            ],
          }),
        });
      `,
      filename: 'src/routes/test.tsx',
      errors: [
        {
          messageId: 'missingImage',
          data: {
            imagePath: '/images/nonexistent.png',
          },
        },
      ],
    },
  ],
});

console.log('✅ All validate-route-images tests passed');
