# Custom ESLint Rules for Lab

This directory contains custom ESLint rules for the Lab project.

## Overview

Colour, arbitrary-value and `dark:` enforcement is ESLint config, not a custom rule: see the better-tailwindcss block in
`eslint.config.js` and `.claude/rules/styling.md`. Only rules the config cannot express live here.

## Rules

### `lab/validate-route-images`

Validates that all images referenced in route meta tags (og:image, twitter:image) actually exist in the public directory.

**❌ Incorrect:**

```tsx
// In src/routes/xatu/contributors.tsx
export const Route = createFileRoute('/xatu/contributors')({
  head: () => ({
    meta: [
      { property: 'og:image', content: '/images/missing/file.png' }, // ❌ File doesn't exist
      { name: 'twitter:image', content: '/images/experiments/contributors.png' }, // ❌ Wrong section
    ],
  }),
});
```

**✅ Correct:**

```tsx
// In src/routes/xatu/contributors.tsx
export const Route = createFileRoute('/xatu/contributors')({
  head: () => ({
    meta: [
      { property: 'og:image', content: '/images/xatu/contributors.png' }, // ✅ File exists
      { name: 'twitter:image', content: '/images/xatu/contributors.png' }, // ✅ Correct path
    ],
  }),
});
```

**Image Path Convention:**

- Images should be placed at: `public/images/[section]/[page-name].png`
- Referenced as: `/images/[section]/[page-name].png`
- Example: `public/images/xatu/contributors.png` → `/images/xatu/contributors.png`

**When to create images:**

- Every page should have a feature image for social sharing (og:image, twitter:image)
- Images should be PNG format
- Follow the section-based directory structure
