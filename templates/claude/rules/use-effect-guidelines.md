# useEffect Guidelines

`useEffect` is a synchronization tool — it connects React to **external systems** (DOM APIs, browser subscriptions, third-party libraries). It is not a lifecycle hook, not an event handler, and not a place to derive state. Misuse causes hard-to-reproduce production bugs: stale closures, race conditions, cascading re-renders, and unmounted-component state updates that only surface under real-world timing.

RSC-first means most frontend components should not need `useEffect` at all. When reviewing or writing client components, apply these rules strictly.

---

## Scope

These rules apply to **all `useEffect` usage** across the entire codebase. WordPress editor components (`edit.tsx`) have targeted exceptions documented in the "WordPress Editor Patterns" section — the anti-pattern rules and async safety requirements still apply there.

---

## Anti-patterns — always flag in review

### 1. Syncing external values to state

This includes props, hook return values, and context values. If the value comes from outside the component, don't copy it into state — use it directly.

```tsx
// Bad — state is just a copy of the prop
const [isOpen, setIsOpen] = useState(openPanel);
useEffect(() => {
	setIsOpen(openPanel);
}, [openPanel]);

// Bad — same smell, different source (hook return value)
const { query } = useSearchBox();
const [inputValue, setInputValue] = useState(query);
useEffect(() => {
	setInputValue(query);
}, [query]);

// Good — use the value directly
function Panel({ openPanel }: PanelProps) {
	// use openPanel wherever you used isOpen
}
```

**When the component needs to diverge from the external value after mount** (e.g. user can close a panel, user can edit a search field):

- Use the external value directly and call callbacks (`onClose`, `onChange`) without local shadow state — this is the first choice
- Use a **key reset** (`<Panel key={id} />`) when full re-mount is acceptable — **key reset is not appropriate when the component manages animation or transition state** (e.g. Headless UI `Dialog` with `transition`, slide animations)
- As a last resort, use a single `initialValue` prop with no sync effect

**Recurring pattern — dialog/panel components:**
We've seen this repeatedly in components like `SlidingPanel`, where an `openPanel` prop is copied into local `isOpen` state via effect. The parent already controls the value and the component calls `onClose()` on dismiss — the local state adds nothing. When reviewing, watch for any dialog or panel that shadows its open/close prop in state.

**Recurring pattern — search inputs:**
Components like `SearchBox` have synced external query state (e.g. from `useSearchBox()`) into local `inputValue` state via effect. Often this tangles a legitimate concern (debounce cleanup) with an unnecessary one (state sync). When reviewing, check whether the local state is truly needed or whether the external value can be used directly.

### 2. Computing derived values

If a value can be computed from existing state or props during render, compute it during render. Never store derived values in state.

```tsx
// Bad — extra render cycle for a value computable during render
const [fullName, setFullName] = useState("");
useEffect(() => {
	setFullName(`${first} ${last}`);
}, [first, last]);

// Good — compute inline
const fullName = `${first} ${last}`;

// Good — expensive computation
const sorted = useMemo(() => expensiveSort(items), [items]);
```

### 3. Handling user events

If an effect reacts to state that was set by an event handler, the logic belongs in the event handler — not in an effect.

```tsx
// Bad — effect reacting to state that was set by a click
const [searchType, setSearchType] = useState(initial);
useEffect(() => {
	refine(searchType);
}, [searchType]);

// Good — call the action in the handler
function handleTypeChange(type: string) {
	setSearchType(type);
	refine(type);
}
```

**When the effect guards against stale external state**, the fix is to read that external state at call time inside the handler — not to keep the effect with a guard condition. Effects that guard against stale state are a code smell indicating the logic should live closer to the event.

```tsx
// Bad — effect guards against stale state
useEffect(() => {
	if (searchType && searchType !== indexUiState.menu?.searchType) {
		refine(searchType);
	}
}, [indexUiState, searchType, refine]);

// Good — read current state in the handler at call time
function handleTypeChange(type: string) {
	setSearchType(type);
	if (type !== indexUiState.menu?.searchType) {
		refine(type);
	}
}
```

### 4. Hydration-only boolean

```tsx
// Bad — extra render just to flip a flag
const [isClient, setIsClient] = useState(false);
useEffect(() => {
	setIsClient(true);
}, []);
if (!isClient) return null;

// Better — use next/dynamic with ssr: false for entire component
// Better — use suppressHydrationWarning for small differences
```

**Exception:** reCAPTCHA and similar third-party widgets that fundamentally cannot render on the server may use this pattern when `next/dynamic` with `ssr: false` is not practical at the call site (e.g. deeply nested form fields).

### 5. Fetching data that the server could provide

In frontend components, data fetching belongs in resolvers or server components — not in client-side effects.

```tsx
// Bad — client waterfall
useEffect(() => {
	fetch("/api/data").then(setData);
}, []);

// Good — fetch in a resolver or server component and pass as props
```

See `headless-architecture.md` for RSC-first data fetching patterns.

### 6. One-time initialization without cleanup

`useEffect(() => { ... }, [])` with no cleanup function is almost always wrong. If it registers a listener, it leaks. If it fires a side effect, it fires twice in StrictMode. If it initializes a value, it should be computed during render or moved to module scope.

```tsx
// Bad — no cleanup, fires twice in StrictMode
useEffect(() => {
	analytics.init();
}, []);

// Good — module-level initialization (runs once, truly)
if (typeof window !== "undefined") {
	analytics.init();
}

// Good — subscription with cleanup
useEffect(() => {
	const handler = () => {
		/* ... */
	};
	window.addEventListener("resize", handler);
	return () => window.removeEventListener("resize", handler);
}, []);
```

---

## Cleanup functions are mandatory

Every `useEffect` that creates a subscription, registers a listener, starts a timer, or initializes an external resource **must** return a cleanup function. No exceptions.

```tsx
// Bad — listener leak
useEffect(() => {
	window.addEventListener("resize", handleResize);
}, []);

// Good — cleanup removes the listener
useEffect(() => {
	window.addEventListener("resize", handleResize);
	return () => window.removeEventListener("resize", handleResize);
}, []);
```

**What requires cleanup:**

- Event listeners (`addEventListener`)
- Observers (`ResizeObserver`, `IntersectionObserver`, `MutationObserver`)
- Timers (`setTimeout`, `setInterval`)
- External library instances (Vimeo player, Splide carousel)
- WebSocket or EventSource connections
- Async operations (see next section)

**What does not require cleanup:**

- One-shot imperative DOM actions (`ref.current.focus()`, `ref.current.scrollIntoView()`)
- Reading a value from `localStorage` or `navigator`

---

## Async effect safety

When a `useEffect` performs async work, it **must** handle cancellation. Without this, setting state after the component unmounts causes bugs that only appear under real-world latency and navigation timing.

```tsx
// Bad — no cancellation, race condition on fast navigation
useEffect(() => {
	fetchData(id).then(setData);
}, [id]);

// Good — AbortController prevents stale updates (preferred)
useEffect(() => {
	const controller = new AbortController();
	fetchData(id, { signal: controller.signal })
		.then(setData)
		.catch((e) => {
			if (e.name !== "AbortError") throw e;
		});
	return () => controller.abort();
}, [id]);

// Acceptable — boolean guard when AbortController isn't practical
useEffect(() => {
	let cancelled = false;
	fetchData(id).then((result) => {
		if (!cancelled) setData(result);
	});
	return () => {
		cancelled = true;
	};
}, [id]);
```

**Prefer `AbortController`** over the `isMounted`/`cancelled` flag pattern. `AbortController` actually cancels the network request — the flag only prevents the state update but the request still completes and wastes bandwidth.

This rule applies everywhere — frontend components **and** WordPress editor `edit.tsx` files.

### useCallback that owns its setState — pass an isCancelled probe

When a `useCallback` calls `setState` internally, a `cancelled` flag in the surrounding `useEffect` cannot intercept those state updates — it only prevents calling the callback, not what happens inside it. Add an optional `isCancelled?: () => boolean` parameter to the callback and guard each `setState` with `if (!isCancelled?.())`. The effect passes `() => cancelled` as the argument.

**Why:** `fetchRevisions` was a `useCallback` that called `setRevisions` / `setIsLoadingRevisions` internally. The wrapping effect set a `cancelled` flag in cleanup, but the flag never reached the setState calls. Component unmount during in-flight fetch produced "set state on unmounted component" warnings.

**How to apply:**

```tsx
const fetchRevisions = useCallback(
	async (id: string, isCancelled?: () => boolean) => {
		const data = await api.fetch(id);
		if (isCancelled?.()) return;
		setRevisions(data);
		setIsLoadingRevisions(false);
	},
	[]
);

useEffect(() => {
	let cancelled = false;
	fetchRevisions(currentId, () => cancelled);
	return () => {
		cancelled = true;
	};
}, [currentId, fetchRevisions]);
```

`AbortController` is still preferred when the network request can be aborted; the `isCancelled` probe is for cases where state-update protection is the goal and the request itself doesn't expose an abort signal.

---

## useLayoutEffect vs useEffect for DOM measurement

When an effect measures the DOM (getBoundingClientRect, offsetHeight, computed styles) and uses that measurement to update what's rendered, use `useLayoutEffect` instead of `useEffect`. This prevents a visible flash where the component renders with wrong dimensions and then corrects itself.

```tsx
// Bad — user sees a flash of incorrect layout
useEffect(() => {
	const rect = ref.current.getBoundingClientRect();
	setPosition(rect.bottom);
}, []);

// Good — measurement happens before browser paint
useLayoutEffect(() => {
	const rect = ref.current.getBoundingClientRect();
	setPosition(rect.bottom);
}, []);
```

**Use `useLayoutEffect` for:**

- `getBoundingClientRect()` measurements that affect layout
- Font size calculations (FitText-style components)
- Scroll position restoration
- Any measurement → state update → re-render cycle where the intermediate state would be visible

**Do not use `useLayoutEffect` for:**

- Event listener registration (use `useEffect`)
- Data fetching (use `useEffect` or server components)
- External library initialization (use `useEffect`)
- One-time side effects (use `useEffect` or module scope)

`useLayoutEffect` blocks the browser paint, so misuse causes jank. Only use it when the visual flash is the actual problem.

**Note:** `requestAnimationFrame` is a raw browser scheduling API, not a React synchronization primitive. Do not use `rAF` as a substitute for `useLayoutEffect` — React's hook system handles the render → commit → paint lifecycle; `rAF` does not.

---

## WordPress Editor Patterns (`backend/plugins/.../blocks/`)

Backend block editor components run inside wp-admin, **not** in Next.js. There is no RSC runtime, no server components, and no resolvers available at edit time. This changes what's legitimate, but it does not exempt editor code from quality standards.

### Legitimate editor patterns

**Data fetching via ServiceFactory / useSiteGlobals:**
The editor has no server component layer. Effects that fetch data using `ServiceFactory` in response to `useSiteGlobals` or WordPress entity props are the established pattern. Async safety rules still apply — use `AbortController` or a cancelled flag.

```tsx
// Current pattern (missing cancellation — should be improved)
useEffect(() => {
  const fetchOffers = async () => {
    if (!siteGlobals || !spcApiUrl) return;
    const offers = await ServiceFactory.createOfferService(...).getItems();
    setPreviewProps((prev) => ({ ...prev, offers }));
  };
  fetchOffers();
}, [siteGlobals, spcApiUrl, spcApiKey]);

// Better — with cancellation
useEffect(() => {
  let cancelled = false;
  const fetchOffers = async () => {
    if (!siteGlobals || !spcApiUrl) return;
    const offers = await ServiceFactory.createOfferService(...).getItems();
    if (!cancelled) setPreviewProps((prev) => ({ ...prev, offers }));
  };
  fetchOffers();
  return () => { cancelled = true; };
}, [siteGlobals, spcApiUrl, spcApiKey]);
```

**Attribute syncing between parent and child blocks:**
WordPress inner blocks require imperative syncing via `dispatch(blockEditorStore)`. Effects that propagate parent attribute changes (colors, text settings, background) to inner blocks are legitimate — this is WordPress block API orchestration, not a prop-to-state anti-pattern.

**WordPress store subscriptions:**
Effects that react to `useSelect` state changes for block editor orchestration (block counts, inner block structures) are legitimate.

**Ensuring minimum inner block counts:**
Effects that create initial inner blocks when a block is first inserted are legitimate.

### Anti-patterns that still apply in editor code

Even in `edit.tsx` files, flag these:

- **Derived values in effects** — e.g. computing a warning flag from attributes belongs in render, not an effect (see carousel-item/edit.tsx)
- **Event logic in effects** — if the effect reacts to a user action, move it to the handler
- **Missing cleanup on async effects** — every async effect needs cancellation
- **Missing cleanup on subscriptions** — listeners, observers, intervals must clean up

### Current editor codebase status (snapshot — March 2026)

The following patterns exist in the editor codebase at time of writing. Not all are ideal — treat as a recognition aid, not a permanent audit:

| Pattern                        | Files                                                                                                            | Cleanup          | Cancellation                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------- |
| Data fetching (ServiceFactory) | offers, events-list, footer-menu, offers-carousel, locations-map, site-footer, feature, regional-offers-carousel | 0/8 have cleanup | 0/8 handle cancellation                                    |
| Data fetching (with isMounted) | careers, locations, employees                                                                                    | 3/3 have cleanup | 3/3 use isMounted flag (should migrate to AbortController) |
| Attribute sync to inner blocks | panel-hero, mega-menu, panel-hero-inner-panel, panel-hero-main-panel, kronos-search ResultsCustomizer            | None needed      | N/A                                                        |
| Ensure minimum inner blocks    | panel-hero-secondary-panel, carousel                                                                             | None needed      | N/A                                                        |
| Derived value in effect        | carousel-item (image warning)                                                                                    | No               | N/A — should compute during render                         |
| Legacy backfill                | dealer-announcement-carousel (UUID backfill)                                                                     | No               | N/A                                                        |

---

## Legitimate uses — do not flag

These are the valid reasons for `useEffect` in frontend components. Every one must follow the cleanup and async safety rules above.

- **DOM measurement** — ResizeObserver, getBoundingClientRect after layout. Prefer `useLayoutEffect` when the measurement drives a visual update.
- **Subscriptions / event listeners** — window resize, click-outside, scroll, media queries. Must have cleanup.
- **External library initialization** — Vimeo player, Splide carousel, Termly CMP, third-party scripts. Must have cleanup/teardown.
- **Imperative DOM sync** — focus management, scroll position restoration. One-shot actions that don't create subscriptions.
- **Browser-only APIs** — cookies, localStorage, navigator — only when the value cannot be server-rendered and cannot be handled by `suppressHydrationWarning` or `next/dynamic`.
- **Timers** — `setTimeout`/`setInterval` for autoplay, debounce, polling. Must clean up with `clearTimeout`/`clearInterval`.
- **Client-triggered data fetching** — fetches that depend on user interaction or client-side state that isn't known at server render time. Must call route handlers (`/api/...`) — never import `ServiceFactory`, `@apollo/client`, or other server-only libraries into `"use client"` files. Async safety rules apply (AbortController or cancelled flag). If the data _could_ have been fetched server-side, it should be — see anti-pattern #5.

---

## Review checklist for any useEffect in a diff

1. **Is this in a frontend component or an editor `edit.tsx`?** Apply all rules to frontend. Apply editor exception rules to `edit.tsx`, but anti-pattern and safety rules still apply.
2. **Can this value be computed during render?** If yes, remove the effect — compute inline or use `useMemo`.
3. **Is this reacting to a user event?** If yes, move the logic to the event handler. If it guards against stale state, read current state in the handler at call time.
4. **Does this sync an external value to state?** (prop, hook return, context value) If yes, use the value directly or key-reset.
5. **Does this fetch data?** In frontend: move to a server component or resolver. In editor: legitimate, but async safety is required.
6. **Is this a hydration workaround?** Use `next/dynamic` or `suppressHydrationWarning` unless impractical.
7. **Is this a one-time init with no cleanup?** It probably belongs at module scope or in a ref.
8. **Does this async effect handle cancellation?** If no, it must — add `AbortController` or a cancelled flag.
9. **Does it have a cleanup function?** Every subscription, listener, timer, observer, and library init must clean up.
10. **Should this be `useLayoutEffect` instead?** If it measures the DOM and updates state that affects the next paint, yes.
11. **Are dependency array values correct and minimal?** Missing deps cause stale closures. Extra deps cause unnecessary re-runs. Both cause production bugs.
