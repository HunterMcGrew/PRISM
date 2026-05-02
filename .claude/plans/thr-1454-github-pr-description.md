## Summary

Removes **Gravity Forms** from the **client Apollo** import path: **submit** goes through a **Server Action** with `FormData` (JSON field values + file parts); **form definitions** load via **server-only** GraphQL (`fetchForm` / `fetchAllForms`) and the **`GET /api/form`** route handler when a client subtree still needs to fetch. This is a **stepping stone** toward **THR-1238** (smaller browser chunks)—Apollo can still ship from **other** client imports (e.g. product flows).

**Ticket:** THR-1454

---

## Problem

- `GfForm` used **`@apollo/client`** (`getClient` + `mutate`) for **`submitGfForm`** in the browser.
- Gravity form **reads** and mixed **populate** logic lived next to server fetch helpers, encouraging client bundles to pull **connector / Apollo** for non-submit code paths.

---

## What changed

### Submit (client → server)

- **`submitFormAction`** (`frontend/lib/forms/submit-form-action.ts`, `"use server"`) — reads `FormData`: `formId`, `fieldValues` (JSON), `file_{fieldId}` for uploads; merges files into the parsed payload; runs the existing **`submitGfForm`** mutation with **`getClient(wpBase, "upload")`** on the server only.
- **`GfForm`** builds `FormData` via **`serializeForm`** (`frontend/lib/forms/serialize-form.ts`) and calls **`submitFormAction`** — no `useMutation`, no `AppContext` / `wpUrl` for submit.

### Fetch (definitions)

- **`fetchForm` / `fetchAllForms`** (`frontend/lib/forms/fetch-form.ts`) — `import "server-only"`; uses persisted GraphQL client + existing **`GET_FORM` / `GET_FORMS`** queries and cache tags where applicable.
- **`GET /api/form`** (`frontend/app/api/form/route.ts`) — calls **`fetchForm`** for client-side consumers.
- **`useGetGravityForm`** — `fetch('/api/form?formId=…')` instead of Apollo.

### Populate & imports

- **`populateDynamicFormFields`** → **`frontend/lib/forms/populate-form-fields.ts`** so client code can import population without dragging server fetch/Apollo.

### App context (layout + block editors)

- **`getAppContextProps`** → **`frontend/components/context/get-app-context-props.ts`** (maps site globals → **`AppContextPageProps`**).
- **`AppContextPageProps` / `AppContextFields`** types → **`frontend/components/context/app-context.ts`** (replacing **`frontend/lib/interfaces/app-context`**).
- **Root layout** imports **`getAppContextProps`** from the new path.

### WordPress block editor (`gravity-platform-core`)

Block `edit.tsx` files and **`WithAppContext.tsx`** that wrapped previews with **`getAppContextProps`** were updated to import from:

- `@frontend/components/context/get-app-context-props`
- `@frontend/components/context/app-context` (`AppContextPageProps`)

so **`pnpm run check-types`** passes for the monorepo.

---

## Tests & fixtures

- `frontend/lib/forms/__tests__/fetch-form.test.ts`
- `frontend/lib/forms/__tests__/populate-form-fields.test.ts`
- `frontend/lib/forms/__tests__/serialize-form.test.ts`
- `frontend/lib/forms/__tests__/submit-form-action.test.ts`
- `frontend/blocks/gravity-form/__tests__/resolver.test.ts` (uses **`fetchForm`**)
- **`frontend/__fixtures__/equipment.fixture.ts`**, **`index-record.fixture.ts`**; **`context.fixture`** import path updated

---

## Out of scope / follow-up

- **RSC-first** form props everywhere (reduce **`useGetGravityForm`** / **`/api/form`** where a server parent can pass `form`).
- **Bundle measurement** and chasing **other** client Apollo graph (e.g. **`ServiceFactory`** on product templates, **`ProductSelector`**, **`ProductCategorySelector`**) — separate tickets.

---

## How to verify

- [ ] `pnpm run check-types` (monorepo)
- [ ] `pnpm --filter next-frontend test`
- [ ] `pnpm run build`
- [ ] Smoke: submit a form with **file upload**, **confirmation / redirect**, **modal** contact form, **block** Gravity Form in editor preview if applicable

---

## Related

- Plan: `.claude/plans/thr-1454.md`
- Parent theme: **THR-1238** — `.claude/plans/thr-1238.md`
