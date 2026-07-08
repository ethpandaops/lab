## Building with this design system

These are the real ethPandaOps **Lab** React components (an Ethereum network/analytics app),
bundled to `window.Lab.*`. Compose them the way the app itself does.

### Wrapping & theme (required)

Wrap your rendered tree in **`<DesignSyncProvider>`** (exported on `window.Lab`). It supplies the
context the components read — theme, query cache, router, and network — and **pins the dark
theme**. Without it, theme-aware components render unstyled or crash on a missing provider.

```jsx
const { DesignSyncProvider, Card, Button } = window.Lab;
root.render(<DesignSyncProvider>{/* your UI */}</DesignSyncProvider>);
```

The system is **dark-first**. Theming is class-based: a `dark` (or `star`) class on a root
ancestor switches themes; no class = light. `DesignSyncProvider` sets `dark` for you — you only
manage the class if you deliberately offer a theme switch.

### Styling idiom — Tailwind 4 utility classes with semantic tokens

Components are styled with Tailwind utilities and accept a `className` prop for layout and
overrides. For your own layout glue, use the DS's **semantic color tokens** (they adapt across
light/dark/star automatically) — do NOT reach for raw Tailwind palette (`bg-gray-800`) or hex:

| Role | Classes |
|---|---|
| Page / surface backgrounds | `bg-background`, `bg-surface` |
| Text | `text-foreground` (primary), `text-muted` (secondary/labels) |
| Borders | `border-border` |
| Intent | `primary` (terracotta brand accent), `accent`, `success`, `warning`, `danger` — each as `bg-*` / `text-*` / `border-*` |
| Specific shades | brand scales `terracotta-{50..950}` (warm accent), `sand-{50..950}` (warm neutrals), `slate-{50..950}` |
| Layout / type | standard Tailwind — `p-6`, `gap-4`, `rounded-lg`, `text-lg`, `font-semibold` |

Typeface is **Space Grotesk** (variable), applied globally by `styles.css` — you don't set it.

### Where the truth lives

- `styles.css` and its `@import` closure — the full token + utility vocabulary.
- Per component: `components/<group>/<Name>/<Name>.prompt.md` (usage + variant list) and
  `<Name>.d.ts` (prop types). Read these before composing a component you haven't used.

### Idiomatic snippet

```jsx
const { DesignSyncProvider, Card, Button, Badge } = window.Lab;

function SlotCard() {
  return (
    <DesignSyncProvider>
      <Card className="bg-surface p-6 rounded-lg max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">Slot 8,912,344</h2>
          <Badge color="green">Proposed</Badge>
        </div>
        <p className="text-muted mt-1">Arrived 4.2s into the slot</p>
        <Button variant="primary" size="sm" className="mt-4">View details</Button>
      </Card>
    </DesignSyncProvider>
  );
}
```
