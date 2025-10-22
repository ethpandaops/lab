---
name: Create New Routes
description: Learn how to create a new route in The Lab.
---

# Create New Routes

This skill creates production-ready React routes following Lab's established architecture patterns.

## Routing & Pages
- Route files in `src/routes/` - thin TanStack Router definitions
- Page components in `src/pages/` - UI implementations
- Page-scoped components in `pages/[section]/components/`
- Dynamic routes use `$param.tsx` syntax
- Always barrel export via `index.tsx`