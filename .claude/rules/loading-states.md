---
paths:
  - '**/src/pages/**/*.tsx'
  - '**/src/components/**/*.tsx'
---

# Loading states

- Every asynchronous read renders loading, error and settled states, and empty where that can happen. Tests and stories cover each one.
- Loading renders a skeleton in the shape of the content it stands in for, built from `LoadingContainer` (`src/components/Layout/LoadingContainer/`). A page's skeleton is `[PageName]Skeleton`, a component's `[ComponentName]Skeleton`, in that page's `components/` folder.
- Data goes stale when a refetch fails or a live feed stops. Show that a value is stale or unavailable; never present an old value as current.
- While data loads, controls that would act on it are disabled.
