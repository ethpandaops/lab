# Head Meta & SEO

## Meta Hierarchy

- Base meta tags defined in `src/routes/__root.tsx`
- Routes override with `head: () => ({ meta: [...] })`
- Child routes inherit and can extend parent meta
- **No variables in head**: Only use literals and `import.meta.env.VITE_*` (processed by build plugin)

## Page Feature Images

Each page should have a feature image at `public/images/[section]/[page-name].png`.

**Route implementation:**

```tsx
// In routes/[section]/[page-name].tsx
head: () => ({
  meta: [
    { title: `Page Name | ${import.meta.env.VITE_BASE_TITLE}` },
    { name: 'description', content: 'Unique description of what this page does' },
    { property: 'og:image', content: '/images/[section]/[page-name].png' },
    { property: 'og:description', content: 'Unique description of what this page does' },
    { name: 'twitter:image', content: '/images/[section]/[page-name].png' },
    { name: 'twitter:description', content: 'Unique description of what this page does' },
  ],
})
```

## Checklist

- Always include page-specific title
- Write unique description for each page
- Update all three descriptions (meta, og:description, twitter:description)
- Provide unique feature image per page
