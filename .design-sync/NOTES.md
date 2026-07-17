# design-sync notes — ethPandaOps Lab

`lab` is a **Vite application, not a published component library**. The storybook-shape
converter assumes a library with a compiled `dist/` + `.d.ts` export surface; lab has
neither. The adaptations below make it work. Read these before a re-sync.

## Architecture adaptations (the load-bearing ones)

- **Barrel entry `.design-sync/ds-entry.ts`** — auto-generated re-export of every storied
  component so the IIFE global (`window.Lab`) exposes each one the stories import.
  - Uses **relative paths** (`../src/...`), NOT the `@/` alias, because it doubles as the
    ts-morph types entry (see below) and ts-morph in the converter has no `@/` resolution.
  - The 9 echarts 2D charts export `<Name>Chart` (e.g. `Bar.tsx` exports `BarChart`), so the
    barrel adds `export { BarChart as Bar }` aliases — the story-import redirect and
    `[BUNDLE_EXPORT]` keyed on the **filename**, and titleParts names the component by the
    title's last segment (`Bar`).
  - Regenerate with the same rule if components are added: `export *` per storied
    `componentPath` from `sb-reference/index.json`, plus a filename alias wherever the
    filename isn't an exported name.
- **`types: .design-sync/ds-entry.ts` in `package.json`** — points the converter's ts-morph
  type extraction (`findTypesRoot`/`exportedNames`) at the barrel. Without a types entry the
  `exported` set is empty and the storybook shape drops **every** component as
  `[TITLE_UNMAPPED]`. This is the only edit outside `.design-sync/`.
- **`cfg.tsconfig` → `.design-sync/tsconfig.paths.json`** (NOT the repo's `tsconfig.app.json`):
  1. `tsconfig.app.json` has a **trailing comma** in `paths`, which the converter's
     comment-stripping `JSON.parse` rejects → the alias plugin silently returns null and no
     `@/` import resolves.
  2. The alias plugin can't do directory→index resolution (it returns the directory for
     `@/components/Layout/Card`, which esbuild can't read). The clean file enumerates an
     explicit `@/<dir> → src/<dir>/index` mapping for **every** `src/` directory that has an
     index file, ahead of the `@/*` wildcard. Regenerate by scanning `src/` for index dirs if
     the tree changes.
- **Provider chain — `.design-sync/ds-providers.tsx` + `cfg.provider`.** The converter's
  auto-bundling of `.storybook/preview.tsx` decorators fails (the CSS/`.woff2` font import has
  no loader in the decorator esbuild pass), and lab's chain can't be expressed as static
  provider JSON (hydrated QueryClient + memory router). `DesignSyncProvider` replicates the
  preview decorator (QueryClient hydrated with `mockConfig`/`mockBounds`, ThemeProvider,
  ConfigGate, memory Router → NetworkProvider) and is added to the bundle via
  `cfg.extraEntries`. **Theme is pinned to dark** (`themeOverride="dark"`) to match the
  storybook default deterministically (storybook uses `withThemeByClassName` defaultTheme
  `dark`, which the converter stubs to inert).
- **`.design-sync/ds-body-guard.ts`** (imported first by ds-providers) — lab computes dataviz
  colors at import time by probing CSS vars via `document.body.appendChild`
  (`getDataVizColors → resolveCssColorToHex`). The `[BUNDLE_EXPORT]` smoke check injects the
  bundle into a `<head>`-only document where `document.body` is null, so that probe throws and
  aborts the bundle before `window.Lab` is set. The guard ensures a body exists before any
  component module evaluates; it's a no-op in a real page (storybook, the design app). Without
  it the smoke check falsely reports "103/103 not a component on window.Lab".

## echarts charts — `echarts-for-react/lib/core` shim

All ~21 chart components (`Bar`, `Line`, `Donut`, `Gauge`, `Radar`, …) import
`ReactEChartsCore from 'echarts-for-react/lib/core'` (a CJS module). esbuild compiles that
default import with node-style interop (`__toESM(require_core(), 1).default`), so the default
resolves to the whole CJS exports object `{ default: EChartsReactCore, __esModule: true }`
instead of the class — React then gets an object as an element type and every chart throws
"Element type is invalid". `.design-sync/echarts-core-shim.js` imports the CJS module (via the
explicit `.js` path to avoid a redirect loop) and re-exports its `.default`; a
`echarts-for-react/lib/core → .design-sync/echarts-core-shim` mapping in `tsconfig.paths.json`
routes all chart importers through it. (Redirecting to the package's ESM build instead breaks
under pnpm — its `tslib`/`size-sensor` deps don't resolve from the mapped path.)

## echarts animation vs the grading capture

echarts charts animate their entrance (~1000ms canvas/JS animation). The compare harness's
`animations: 'disabled'` only fast-forwards CSS/Web animations, not canvas-internal JS, and it
captures after networkidle+font/image settle (~a few hundred ms). So chart grading screenshots
catch echarts **mid-entrance-animation** — bars at ~0 height, series value labels not yet
painted — on BOTH the storybook reference and the preview (the storybook side sometimes catches
a slightly later frame, so its value labels appear while the preview's don't). This is a
**capture artifact, not a component defect**: the shipped previews render live and fully
animate the chart in the design app. Grade animated charts (`Bar`, `Line`, `Donut`, `Gauge`,
embedded charts in `PopoutCard`, the ethereum `*Chart` components) `close` with a note; charts
that render statically (`Heatmap`, `FlameGraph`, `GasFlowDiagram`) grade `match` normally.

## PolicySelector — excluded (upstream story bug)

`PolicySelector`'s storybook stories throw `formatBytes is not a function` (a real bug in the
story/component in the reference build itself, not a sync issue — the preview surfaces the same
error). Excluded via `cfg.titleMap` null so a broken preview isn't shipped.

## Story/context-broken components excluded (render an error in the preview)

- **Tab, ScrollableTabs** — their stories wrap content in `<TabGroup>` from `@headlessui/react`
  (in the story), while the component's `<Tab>` consumes TabGroup context from the bundle's copy
  of `@headlessui`. The story compile bundles a SECOND `@headlessui` instance → context identity
  breaks → `<Tab.List/> is missing a parent <Tab.Group/>`. Only these two components put the
  headlessui provider in the STORY (Dropdown/Dialog/Disclosure self-contain it and work). Fixing
  would need `@headlessui` deduped across preview + bundle (add it to `extraEntries`), which
  clears every grade — not worth it for 2 components.
- **FeatureGate** — its story nests its own `RouterProvider` inside `DesignSyncProvider`'s global
  router → tanstack-router "Could not find a nearest match!" crash.
- **Breadcrumb** — story mocks `useRouterState` (`.mockReturnValue`); the mock isn't set up in the
  bundle so BOTH storybook reference and preview error (like PolicySelector).
- **ConfigGate** — an app-internal gate; its Loading/Error stories rely on per-story
  `hydration:false` + MSW/retry overrides that `DesignSyncProvider`'s fixed success-hydration
  ignores, so 4/5 stories render the raw test placeholder instead of the gate UI.

- **DataColumnDataAvailability** — consistently crashed the compare chromium (`page.setViewportSize:
  Target page/browser has been closed`) across multiple attempts, producing no capture at all
  (its sibling `BlobDataAvailability` captured fine). Likely a heavy per-slot data-column render;
  couldn't verify it via screenshot, so excluded rather than ship unverified. `BlobDataAvailability`
  covers the slot data-availability pattern. Worth retrying on a machine with more headroom.

Also seen but KEPT (render acceptably, graded close): DataTable/Table optional page-level title
sits on the card background outside the component's own surface and can be low-contrast; Toggle's
2 bare stories and ThemeToggle reflect page/theme background rather than their own surface. Table
content itself matches in all cases.

## Provider-gated components excluded

`ds-providers.tsx` replicates `.storybook/preview.tsx`'s **global** decorator chain (Query,
Theme, Config, Router, Network). A few components depend on providers that stories wrap
story-file-locally, or on providers missing from the storybook globals entirely:

- **TimezoneToggle** (`useTimezone`) — its story wraps in a story-local `TimezoneProvider`, so the
  storybook reference renders but the preview errors (`ds-providers` has no `TimezoneProvider`).
- **GeographicalFilters** (`react-hook-form`) — its story wraps in a story-local `FormProvider`;
  the preview errors `Cannot destructure property 'register' of 'useFormContext(...)' as it is null`.
- **CopyToClipboard** (`useNotification`) — the storybook reference ITSELF errors (`useNotification`
  with no `NotificationProvider` in the global decorators); both sides broken (like PolicySelector).

Both excluded via `cfg.titleMap` null. Only these two DS components are affected (grep: `useTimezone`
/ `useNotification` appear in no other storied component). Adding the providers to `ds-providers`
would fix TimezoneToggle but changes the grade contract → clears **every** component's grade and
forces a full re-grade, not worth it for 1–2 components. If more provider-gated components surface
in a future sync, reconsider adding the full app provider stack up front (before grading).

## Public-asset images (`/images/*.png|svg`)

~11 stories reference lab public assets by absolute path (`/images/experiments.png`,
`/images/ethereum-dark.svg`, echarts geo maps, …). Storybook serves `public/`; the design
bundle does not, so those images show broken in previews and in the design app. They're
mostly incidental sample content (Avatar sample image, experiment-card thumbnails); the
components themselves render correctly. Not bundled (the upload plan doesn't include an
`images/` path, and `public/` is ~11MB). Grade such stories `close` with a note.

## Excluded components

- **Globe, Map** (`cfg.titleMap` null) — use `echarts-gl@2.0.9`, which imports internal
  `echarts/lib/*` + `zrender/lib/*` paths without `.js`; echarts v6's strict exports map +
  esbuild reject them. WebGL 3D charts are unsuitable for static preview capture anyway.
- **Map2D, GeographicalMapView** (`cfg.titleMap` null) — 2D echarts geo maps that `fetch('/data/maps/world.json')`
  (a lab public asset) at runtime and `echarts.registerMap('world', …)`. Storybook serves `public/`
  so the map renders there; the design bundle doesn't serve `/data/`, so the map is blank in the
  preview (verified: storybook renders the full world map, preview shows only the caption). Bundling
  the ~MB GeoJSON would need the upload plan re-opened for a `data/` path — not worth it for 2 map
  components. (So ALL four map components — Globe, Map, Map2D, GeographicalMapView — are excluded.)
- **Probes, ValidatorHeatmap** (`cfg.titleMap` null) — `Pages/...` story demos, not reusable
  components. `Probes` title (`Probes`) ≠ export (`ProbesView`); `ValidatorHeatmap` has no
  `componentPath` in the storybook index.

## Reference storybook build

`main.ts` sets `config.base = '/lab/'` when `NODE_ENV=production` (which `storybook build`
sets), which bakes `/lab/assets/...` paths into `iframe.html`. Served at root by the compare
harness those 404 → every story renders "No Preview" (`sb-error` for all). **Always build the
reference with `STORYBOOK_BASE_PATH=.`** (a single dot — NOT `/`, which makes preview.tsx build
the MSW worker URL as `//mockServiceWorker.js` and the service-worker registration fails,
re-breaking every story):

```
STORYBOOK_BASE_PATH=. npx storybook build -c .storybook -o "$(git rev-parse --show-toplevel)/.design-sync/sb-reference"
```

Service workers DO register in the compare harness's headless chromium, so MSW works once the
worker URL is correct — no need to disable it.

## Compiled Tailwind CSS — `.design-sync/ds-tailwind.css` (via `cfg.cssEntry`)

lab styles with Tailwind 4 utility classes generated by `@tailwindcss/vite`. Those utilities
are NOT imported by the component modules, so esbuild's bundle CSS (`_ds_bundle.css`, ~30KB)
has none of them → previews render completely unstyled. The converter's storybook-CSS fallback
only triggers when the bundle CSS is a tiny placeholder, which it isn't here. So the compiled
Tailwind is supplied explicitly via `cfg.cssEntry`, which appends it to `_ds_bundle.css`.

`.design-sync/ds-tailwind.css` is the reference storybook's compiled iframe CSS (the largest
`assets/iframe-*.css`, ~231KB — it has all utilities used across the component library) with
its `@font-face` `url(/assets/*.woff2)` refs rewritten to inline `data:` URIs (self-contained,
so Space Grotesk loads in previews and the design app without shipping font files). Regenerate
after a reference rebuild (the CSS + font filenames are content-hashed):

```
# after building .design-sync/sb-reference:
MAIN=$(grep -oE 'assets/iframe-[^"]*\.css' .design-sync/sb-reference/iframe.html | head -1)
cp ".design-sync/sb-reference/$MAIN" .design-sync/ds-tailwind.css
# then inline the 3 woff2 files it references (see .design-sync/ or the sync run's inline step)
```

## Re-sync risks (watch-list)

- **`package.json types` field** must stay pointed at the barrel — a `pnpm`/tooling change or
  a teammate removing it re-drops every component.
- **`tsconfig.paths.json` index-dir map** is a filesystem snapshot; new `src/` index
  directories that components import won't resolve until regenerated.
- **Barrel completeness** — components added upstream won't sync until re-added to
  `ds-entry.ts` (and a chart with a `<Name>Chart` export needs the filename alias).
- **Mock data drift** — `DesignSyncProvider` hydrates from `.storybook/mocks.ts`
  (`mockConfig`/`mockBounds`); if the config/bounds shape changes upstream, data-driven
  previews may go blank until mocks are updated.
- **The `[BUNDLE_EXPORT]` body-guard** depends on ds-body-guard evaluating before the
  chart modules — keep it as the first import of ds-providers.
