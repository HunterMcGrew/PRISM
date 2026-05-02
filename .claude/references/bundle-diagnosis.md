---
description: Three-command workflow for diagnosing Next.js client bundle size issues
---

# Bundle Diagnosis — Next.js Client Chunks

For the hydration consequence of `next/dynamic` — `useId` mismatches after chunk swap-in — see `.claude/rules/headless-architecture.md` § `next/dynamic` code splitting requires `"use client"` → Hydration consequence: useId shifts after dynamic chunks land.

## The Three Commands

```bash
# 1. Find which built chunk contains a specific library
grep -l "LibraryClassName" frontend/.next/static/chunks/*.js

# 2. Confirm a chunk is loaded on a specific page
grep "chunk-filename.js" frontend/.next/server/app/index.html

# 3. Full visual treemap (opens in browser after build completes)
cd frontend && ANALYZE=true pnpm run build
```

`@next/bundle-analyzer` is installed and wired to `ANALYZE=true` in `next.config.ts`. The build must be run from the `frontend/` directory. Two HTML report files open automatically in your browser after the build: one for the client bundle and one for the server bundle.

---

## Diagnosis Workflow

### Step 1 — Identify the offending library

Pick a unique class or string from the library you suspect (e.g. `TypesenseInstantSearchAdapter`, `ApolloClient`, `createMultiSearchClient`). Run command #1.

### Step 2 — Check if it's loaded on the target page

Take the chunk filename from step 1 and run command #2 against the pre-rendered HTML for the page you care about (e.g. `index.html`, `[...slug]/page.html`). If it appears as a `<script>` tag, it's loading on that page.

### Step 3 — Find what imports it

In the **source** (not built output), grep for the library import:

```bash
grep -r "library-name" frontend --include="*.{ts,tsx}" -l
```

Then check whether each importer is behind a dynamic boundary or statically reachable from the layout.

---

## How Next.js Decides What to Load

**Static imports** (`import Foo from "..."` at the top of a file) are always bundled with the importing module. If the importing module is in the layout chain, the library ends up in the eager bundle on every page.

**Dynamic imports** (`() => import("...")` or `next/dynamic`) create a separate chunk. Next.js statically analyzes these at build time and emits the chunk — but includes it as an `async` script tag in the page HTML, so it still loads on any page that could render that component.

**Key implication:** moving a heavy import from an eager module into a dynamic-import module reduces the size of the initial blocking bundle, but does NOT prevent the chunk from loading if the page HTML includes it as `async`. The chunk only disappears from a page's network requests if nothing on that page's module graph references it at all.

---

## Common Patterns and Fixes

### Static import in an RSC page

A page component (e.g. `app/search/page.tsx`) statically imports a heavy client component. The component's full dep tree lands in that route's chunk and gets referenced in the page manifest.

**Fix:** Wrap with `next/dynamic` inside a `"use client"` wrapper (RSC cannot use `ssr: false` directly).

```tsx
// app/search/KronosSearchFallback.tsx
"use client";

import dynamic from "next/dynamic";

const Block = dynamic(() => import("./HeavyBlock"), {
	ssr: false,
	loading: () => null,
});
export default function Fallback(props) {
	return <Block {...props} />;
}
```

### Heavy dep in a shared context provider

A `"use client"` provider (e.g. `AppContext.tsx`) statically imports a heavy lib. Because the provider is in the root layout, the lib ends up in the layout chunk on every page.

**Fix:** Move the import to the leaf components that actually consume it. If those leaves are already dynamically imported via the block registry, the lib moves into their chunks and only loads on pages that render those blocks.

### Barrel import preventing tree-shaking

```ts
import * as Icons from "react-icons/fa"; // pulls entire icon pack
```

**Fix:** Use a lookup table with individual named imports, or a dynamic import keyed by icon name.

---

## The Block Registry Behavior

Blocks registered in `block-registry.ts` use arrow-function dynamic imports:

```ts
view: () => import("@frontend/blocks/kronos-search/KronosSearchBlock");
```

Next.js statically analyzes these and includes their chunks as `async` scripts in every page's HTML — even if that block doesn't appear on the page. This means moving code into a block consumer reduces initial bundle size only if the block's chunk was previously merged into the layout chunk. It does **not** eliminate the network request for that chunk on pages that don't use the block.

---

## Measuring Impact

Before making a change, note the raw size of the chunk(s) in question:

```bash
ls -lh frontend/.next/static/chunks/*.js | sort -k5 -h -r | head -20
```

After rebuilding, compare. For layout chunk impact specifically, check `layout-*.js` size directly.
