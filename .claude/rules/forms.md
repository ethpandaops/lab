# Form Management

## Zod & URL Search Params

Zod schemas are used for **TanStack Router search param validation**, not react-hook-form resolvers:

```tsx
// In route files (e.g., src/routes/ethereum/slots/$slot.tsx)
const slotSearchSchema = z.object({
  network: z.string().optional(),
  tab: z.enum(['overview', 'attestations']).optional(),
});

export const Route = createFileRoute('/ethereum/slots/$slot')({
  validateSearch: slotSearchSchema,
});
```

Type the search params in page components:

```tsx
type SearchParams = z.infer<typeof slotSearchSchema>;
```

## react-hook-form

- `useForm` is used for simple form state management (filters, inputs)
- One `FormProvider` per page when sharing form state across child components
- Child components access form state via `useFormContext()`
- No Zod resolvers are used with react-hook-form — Zod is for route validation only

## Placement

- Generic filter components → `src/components/Forms/`
- Page-specific form components → `src/pages/[section]/[page-name]/components/`
- Search param types → `src/pages/[section]/[page-name]/IndexPage.types.ts`
