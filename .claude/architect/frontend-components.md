# Frontend Components

Architect context for `frontend/components/`. Covers organization, variant patterns, and reusable component conventions.

For coding rules see `.claude/rules/code-standards.md` and `.claude/rules/code-standards-ts.md`.
For prop ordering see `.claude/rules/prop-ordering.md`.
For accessibility see `.claude/rules/accessibility.md`.
For server/client boundaries and the wrapper pattern, see `.claude/rules/headless-architecture.md` and [ADR-0026](../spec/adrs/0026-rsc-by-default-use-client-is-load-bearing.md) for the RSC-by-default decision.

---

## Organization

Components live in `frontend/components/{component-name}/` organized by feature or domain.

Each component directory typically contains:

| File                      | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `{Component}.tsx`         | Main component                                     |
| `index.ts`                | Re-exports for cleaner imports (optional)          |
| `{Component}.stories.tsx` | Storybook stories                                  |
| `__tests__/`              | Unit/integration tests                             |
| `util/`                   | Private helper components scoped to this component |

~60 component directories exist. Categories include:

- **UI primitives**: `button/`, `Heading/`, `dropdown/`, `icon/`, `slider/`
- **Cards**: `card/` (StandardCard, ProductCard, OfferCard, etc.)
- **Domain-specific**: `equipment-*`, `locations/`, `mega-menu/`, `finance-calculator/`
- **Layout/utility**: `utility/` (SortableItems, ModalDialog), `skeletons/`, `scroll/`
- **Composite**: `hero-carousel/`, `panel-hero/`, `three-panel-hero/`

---

## Block Components

When a block needs a client-side component (one that uses hooks or interactive libraries), that component lives in `frontend/components/` — not in `frontend/blocks/`.

The block system (`frontend/blocks/{name}/`) handles:

- `schema.ts` — CMS attribute type and defaults
- `resolver.ts` — server-only data fetching and transformation
- `{BlockName}.view.tsx` — thin wrapper that imports the component for registration (Pattern 3)

This separation keeps:

- **Components reusable** — they have no knowledge of the block system
- **Props independent** — component Props are not coupled to `BlockAttributes` (see `.claude/rules/component-props-decoupling.md`)
- **Block system thin** — registration only, no implementation logic
- **Testing simple** — components can be tested without block/resolver infrastructure
- **Bundle impact clear** — code splits correctly via `block-views.tsx` and `next/dynamic()`

**Example:** `MegaMenuNavigationList.tsx` lives in `frontend/components/mega-menu-navigation-list/`, uses hooks (`useId`, `useMegaMenuContext`), and has `"use client"`. The block system imports it via a thin wrapper in `frontend/blocks/mega-menu-navigation-list/MegaMenuNavigationListBlock.view.tsx`. The resolver in `frontend/blocks/` transforms WordPress attributes into `MegaMenuNavigationListProps`, keeping the component and CMS schema completely decoupled.

**Component organization patterns:** For the three component patterns (which folder to use?) and their decision tree, see `.claude/architect/frontend-blocks.md`, "Block Components: Three Patterns".

---

## Variant Management with CVA

Components use `class-variance-authority` (CVA) for style variants:

```typescript
import { cva, VariantProps } from "class-variance-authority";

const buttonStyles = cva("base-classes", {
	variants: {
		intent: { primary: "...", secondary: "..." },
		size: { small: "...", medium: "...", large: "..." },
	},
	defaultVariants: { intent: "primary", size: "medium" },
	compoundVariants: [{ intent: "primary", disabled: true, className: "..." }],
});

export interface ButtonProps extends VariantProps<typeof buttonStyles> {
	// additional props
}
```

- CVA defines the variant matrix and default values
- Props extend `VariantProps<typeof styles>` for type safety
- `compoundVariants` handle combinations (e.g., disabled + intent)
- `classNames` from the `classnames` package handles conditional classes

---

## Card Hierarchy

Cards follow a shared `ICard` interface from `@frontend/lib/domain/card`:

- `StandardCard` — base card with image, headline, description, buttons, tags
- `ProductCard`, `OfferCard`, etc. — domain-specific cards extending the pattern
- `CardButtonsList` — private utility in `card/util/`
- Default heading level: `CARD_DEFAULT_HEADING_LEVEL = 3`

---

## Heading Component

`Heading` maps heading levels (1-6) to size tokens and weight tokens via lookup objects:

- `SIZE_BY_LEVEL` — maps h1-h6 to size tokens (5xl, 4xl, 3xl, xl, lg, base)
- `WEIGHT_BY_SIZE` — maps size tokens to font weights
- `SIZE_CLASSES_BY_SIZE` — maps size tokens to responsive Tailwind classes
- Explicit `size` or `weight` props override the level-derived defaults
- String children render via `dangerouslySetInnerHTML` (WordPress HTML)

---

## Props Design

### Props Naming (Critical Rule)

**All component Props types must be named `{ComponentName}Props` — never use generic names like `Props`.**

This applies to **all** components: public, private, single-file, multi-file, block components, utility components, leaf components, containers. One rule. No exceptions.

```tsx
// ✓ Good — specific, grepable, consistent
export interface ProductCardProps {
	product: Product;
	onSelect: (id: string) => void;
}

export default function ProductCard(props: ProductCardProps) {}

// ❌ Bad — generic name is not grepable, creates ambiguity, causes friction on refactor/extract
export interface Props {
	product: Product;
	onSelect: (id: string) => void;
}
```

**Why specific names:**

- **Greppability** — `grep ProductCardProps` finds all usages; `grep Props` is useless noise
- **IDE clarity** — hover hints show `ProductCardProps` not just `Props`
- **Refactoring safety** — extract a component, the name is already correct
- **Team clarity** — no judgment call about when generic is "ok"
- **Consistency** — one rule beats many judgment calls

---

### Props Shape and Decoupling

**For block components:** Props should be independent from `BlockAttributes`. The resolver transforms CMS data into component-ready props; the component should declare what it actually needs to render. See `.claude/rules/component-props-decoupling.md` (active migration THR-1452).

**Keep Props focused and minimal:**

```tsx
// ✓ Good — component knows exactly what it needs
interface HeadingProps {
	level: 1 | 2 | 3 | 4 | 5 | 6;
	children: ReactNode;
	className?: string;
}

// ❌ Bad — accepting overly generic bags of data
interface HeadingProps {
	config: any; // Too vague
	data?: unknown;
}
```

**Order Props semantically — see `.claude/rules/prop-ordering.md` for the full standard:**

```tsx
interface ButtonProps {
	// Identity / variant first
	intent: "primary" | "secondary";
	size: "sm" | "md" | "lg";

	// Content
	children: ReactNode;
	icon?: ReactNode;

	// Presentation
	className?: string;

	// Callbacks last
	onClick: (event: React.MouseEvent) => void;
	onHover?: () => void;
}
```

**Key rule:** Identity/variant first, callbacks last. For exceptions (semantic pairs like `open`/`close`, `min`/`max`) and the full standard, see the prop-ordering rule.

---

## Generic Components

Utility components in `frontend/components/utility/` use TypeScript generics with render function patterns:

```typescript
type SortableItemsProps<T> = {
	items: T[];
	getItemId: (item: T) => string;
	onReorder: (items: T[]) => void;
	renderItem: (item: T, dragProps: DragProps) => ReactNode;
};
```

Before creating a new component, check `frontend/components/utility/` and `backend/.../components/` for existing reusable ones.

---

## Common Pitfalls

### ❌ Creating a new component when one already exists

**Bad:**

```tsx
// ProductList.tsx — a new component
export default function ProductList({ products }: Props) {
	return (
		<ul>
			{products.map((p) => (
				<ProductCard key={p.id} product={p} />
			))}
		</ul>
	);
}

// ... but SortableItems already does this!
```

**Good:**

```tsx
// Use existing SortableItems utility
import SortableItems from "@frontend/components/utility/SortableItems";

export default function ProductList({ products }: Props) {
	return (
		<SortableItems
			items={products}
			getItemId={(p) => p.id}
			renderItem={(p) => <ProductCard product={p} />}
		/>
	);
}
```

**Why:** Duplicating components means maintaining two versions, testing both, and inconsistent behavior. Check `frontend/components/utility/` first.

### ❌ Wrapping a component in `"use client"` just to use one hook

**Bad:**

```tsx
"use client"; // ❌ Entire component becomes client-heavy
export default function ProductList({ products, details }: Props) {
	const [sorted, setSorted] = useState(false); // Only this uses a hook

	return (
		<div>
			{/* Lots of static, server-side render logic here */}
			<Products products={products} sort={sorted} />
			<Details details={details} /> {/* Could be RSC */}
		</div>
	);
}
```

**Good:**

```tsx
// ✓ RSC — layout and server logic
export default function ProductList({ products, details }: Props) {
	return (
		<div>
			<Products products={products} />
			<Details details={details} />
			<SortToggle /> {/* Extract the one "use client" piece */}
		</div>
	);
}

// ✓ Tiny client component (just the hook)
("use client");
export default function SortToggle() {
	const [sorted, setSorted] = useState(false);
	return <button onClick={() => setSorted(!sorted)}>Sort</button>;
}
```

**Why:** Every `"use client"` boundary and its imports ship to the browser. Keep them thin.

### ❌ Accepting non-serializable props from RSC parents

**Bad:**

```tsx
// RSC parent tries to pass a function to client component
const parent = async () => {
	const handler = (id: string) => {
		/* ... */
	};
	return <ClientComponent onSelect={handler} />; // ❌ Functions can't serialize
};
```

**Good:**

```tsx
// ✓ Pass a callback reference the client can call
import { useCallback } from "react";

("use client");
export default function ClientComponent({ onSelect }: Props) {
	const handleClick = useCallback((id: string) => {
		// Call the server action
		selectItem(id);
	}, []);

	return <button onClick={() => handleClick("123")}>Select</button>;
}
```

**Why:** Props cross the RSC → client boundary must be JSON-serializable. Functions, component references, and class instances can't cross.

### ❌ Putting business logic inside a UI component instead of a hook

**Bad:**

```tsx
export default function UserProfile({ userId }: Props) {
	const [user, setUser] = useState(null);

	useEffect(() => {
		// Business logic mixed with UI
		const fetchUser = async () => {
			const data = await fetch(`/api/users/${userId}`);
			const user = await data.json();
			if (user.isActive && user.verified) {
				setUser(user);
			}
		};
		fetchUser();
	}, [userId]);

	return <div>{user?.name}</div>;
}
```

**Good:**

```tsx
// ✓ Hook encapsulates the business logic
"use client";

import useUser from "@frontend/hooks/use-user";

export default function UserProfile({ userId }: Props) {
	const user = useUser(userId);
	return <div>{user?.name}</div>;
}

// hooks/use-user.ts
export default function useUser(userId: string) {
	const [user, setUser] = useState(null);

	useEffect(() => {
		const fetchUser = async () => {
			const data = await fetch(`/api/users/${userId}`);
			const user = await data.json();
			if (user.isActive && user.verified) {
				setUser(user);
			}
		};
		fetchUser();
	}, [userId]);

	return user;
}
```

**Why:** Hooks are testable, reusable, and composable. Components should focus on rendering.

### ❌ Using generic `Props` instead of component-specific names

**Bad:**

```tsx
// Not grepable, ambiguous, breaks refactoring
interface Props {
	title: string;
	description: string;
	imageUrl?: string;
}

export default function Card({ title, description, imageUrl }: Props) {
	return <div>{title}</div>;
}
```

**Good:**

```tsx
// Specific, grepable, consistent
interface CardProps {
	title: string;
	description: string;
	imageUrl?: string;
}

export default function Card({ title, description, imageUrl }: CardProps) {
	return <div>{title}</div>;
}
```

**Why:** Component-specific names enable grep searches, IDE hints, and safe refactoring. This is a team consistency rule — one name format for all components, period.

### ❌ Not defining an explicit Props type

**Bad:**

```tsx
export default function Card(props: { title: string; description: any }) {
	return <div>{props.title}</div>;
}
```

**Good:**

```tsx
interface CardProps {
	title: string;
	description: string;
	imageUrl?: string;
}

export default function Card({ title, description, imageUrl }: CardProps) {
	return <div>{title}</div>;
}
```

**Why:** Explicit Props types are self-documenting, enable TypeScript checking, and make refactoring safer.

---

## Third-Party Script Resilience

Components that interact with the DOM at the document/body level need to survive third-party scripts that mutate, clone, or re-parent elements they don't own — accessibility overlays (AudioEye), translate widgets (Google Translate), cookie banners, A/B testing tools. These scripts are common on dealer sites and they show up without warning.

**Prefer React-owned state over cached DOM references.** When a component's behavior depends on a DOM element it manages, keep that element's state in component state and let React reconciliation write to it. React tracks the fiber's current node — if a third-party script moves, clones, or wraps it, React still updates the right one on the next render. Libraries that expose "I own this DOM ref" as their contract (e.g. NProgress's singleton `.bar` element) are inherently fragile against this kind of mutation; evaluate replacement over patching.

**Don't design durability around per-vendor opt-out hints.** Attributes like `data-audioeye-ignore`, `data-translate="no"`, or custom parent containers are per-vendor promises that don't hold across vendors and aren't always honored even by the vendor that defines them. Test them when convenient, but don't bet the implementation on them.

**Concrete case (THR-1737):** AudioEye's `aem.js` re-parents elements inside the document body. NProgress (used via `nextjs-toploader`) cached a reference to its `.bar` element at render time and called `applyCss(bar, …)` from `setInterval`. After AudioEye's mutation, that reference dereferenced null and crashed client-side navigation across every dealer site running AudioEye. Replacing NProgress with a React-controlled progress bar — state in `useState`, written by React on each render — fixed the crash and made the bar resilient to any future DOM-mutating script in the same class. See `frontend/components/progress-bar/ProgressBar.tsx` for the implementation pattern.

---

## Testing Components

**Unit test approach:**

- Test the component in isolation with different props
- Mock child components and hooks
- Verify rendering and event handling

```tsx
// ProductCard.test.tsx
import { render, screen } from "@testing-library/react";

import ProductCard from "./ProductCard";

describe("ProductCard", () => {
	it("renders product name", () => {
		render(<ProductCard product={{ id: "1", name: "Widget" }} />);
		expect(screen.getByText("Widget")).toBeInTheDocument();
	});

	it("calls onSelect when clicked", () => {
		const onSelect = jest.fn();
		render(
			<ProductCard product={{ id: "1", name: "Widget" }} onSelect={onSelect} />
		);
		screen.getByRole("button").click();
		expect(onSelect).toHaveBeenCalledWith("1");
	});
});
```

**RSC testing:**

- RSC components are rendered on the server, so test them by checking the rendered HTML
- Mock server functions and databases as needed

```tsx
// ProductList.test.tsx (RSC)
import { render } from "@testing-library/react";

import ProductList from "./ProductList";

// Mock the server-side fetch
jest.mock("@/lib/db", () => ({
	fetchProducts: jest.fn(() => [{ id: "1", name: "Widget" }]),
}));

describe("ProductList", () => {
	it("renders fetched products", async () => {
		const { container } = render(await ProductList());
		expect(container.textContent).toContain("Widget");
	});
});
```

**Accessibility testing (required for all UI components):**

- Include accessibility assertions in all component tests
- Test keyboard navigation, focus management, ARIA roles, semantic HTML
- Reference `.claude/rules/accessibility.md` for WCAG 2.1 AA requirements

```tsx
it("heading has correct level", () => {
	render(<Heading level={2}>Section Title</Heading>);
	expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
});

it("button is keyboard accessible", () => {
	const onClick = jest.fn();
	render(<Button onClick={onClick}>Click me</Button>);
	const button = screen.getByRole("button");
	button.focus();
	fireEvent.keyDown(button, { key: "Enter" });
	expect(onClick).toHaveBeenCalled();
});

it("list is properly associated with its heading", () => {
	render(
		<div>
			<h2 id="list-heading">Items</h2>
			<ul aria-labelledby="list-heading">{/* items */}</ul>
		</div>
	);
	expect(screen.getByRole("list")).toHaveAttribute(
		"aria-labelledby",
		"list-heading"
	);
});
```

---

## When to Create a New Component

**Create a new component when:**

- ✓ It's reusable across multiple contexts (not just one block)
- ✓ It has distinct rendering logic or styling
- ✓ It's large enough (> 100 lines) to benefit from isolation
- ✓ It has testable behavior (state, event handling, conditions)

**Don't create a new component for:**

- ❌ Simple one-off wrappers (just inline or use a utility)
- ❌ Small presentational bits (< 50 lines of JSX)
- ❌ Thin wrappers around built-in HTML elements
- ❌ Code that exists elsewhere (`SortableItems`, `ItemSelector`, etc.)

**Decision tree:**

```
Is it reused in 2+ places?
  → Yes: Create a component
  → No: Can it be used elsewhere in the future?
    → Probably: Create a component (investment for reusability)
    → No: Inline it or use a utility hook

Is it > 100 lines?
  → Yes: Extract it as a component (readability)
  → No: Inline unless it has distinct responsibility

Is it testable / has behavior?
  → Yes: Component (so tests can run in isolation)
  → No: Utility, hook, or inline

Already exists in `utility/`, `backend/.../components/`, etc.?
  → Yes: Use the existing one
  → No: Create new only if nothing similar exists
```

---

## Server vs Client: RSC-First Design

**Default: React Server Components (RSC)**

Components are RSCs by default. Only add `"use client"` when the component needs client features.

**Why RSC-first?**

- **Bundle size**: Server components don't ship to the browser — zero JavaScript
- **Direct server access**: Can fetch from databases and services without route handlers
- **Security**: API keys and secrets stay on the server
- **Performance**: No loading spinners for server-side data; content renders immediately

**When to add `"use client"`:**

- Component uses React hooks (`useState`, `useEffect`, `useContext`, `useSortable`, etc.)
- Component uses browser APIs (`window`, `localStorage`, `canvas`, etc.)
- Component imports a client-only library (e.g., FullCalendar, Sentry browser SDK)
- Component needs event handlers (`onClick`, `onChange`, etc.)

```tsx
// ✓ RSC — no hooks, no client APIs
export default function ProductCard({ product }: Props) {
	return (
		<div>
			{product.name} — ${product.price}
		</div>
	);
}

// ✓ Client component — uses useState
("use client");
export default function ProductCard({ product }: Props) {
	const [quantity, setQuantity] = useState(1);
	return (
		<div>
			{product.name}
			<input value={quantity} onChange={(e) => setQuantity(+e.target.value)} />
		</div>
	);
}
```

**When NOT to use `"use client"` just to avoid props passing:**
Many developers wrap entire sections in `"use client"` to avoid threading props through RSC layers. Don't do this — it defeats the purpose of RSC.

**Bad:**

```tsx
"use client";  // ❌ Entire tree becomes client-heavy
export default function Page() {
  const data = await fetch(...);  // ❌ Can't await in client component
  return <ProductCard data={data} />;
}
```

**Good:**

```tsx
// ✓ RSC — fetch on server
export default async function Page() {
  const data = await fetch(...);
  return <ProductCard data={data} />;
}

// ✓ Client component (thin, at the leaf)
"use client";
export default function ProductCard({ data }: Props) {
  const [selected, setSelected] = useState(false);
  // ...
}
```

**Bundle impact:**

- Each `"use client"` boundary and its import tree ships to the browser
- Excessive `"use client"` boundaries inflate the client bundle
- `ServiceFactory`, `@apollo/client`, and database imports should not appear in a `"use client"` file — they'll be bundled for the browser and leak server-only dependencies into client code

**Client-initiated server fetches:**
When a client component needs to fetch data in response to user interaction (not known at render time), use route handlers:

```tsx
// ✓ Client component calls a route handler
"use client";

// ✓ Route handler (server-side)
// app/api/search/route.ts
import { ServiceFactory } from "...";

export default function Search({ query }: Props) {
	const [results, setResults] = useState([]);

	const handleSearch = async (q: string) => {
		const res = await fetch(`/api/search?q=${q}`); // Route handler
		setResults(await res.json());
	};

	return <input onChange={(e) => handleSearch(e.target.value)} />;
}

export async function GET(request: Request) {
	const query = new URL(request.url).searchParams.get("q");
	const results = await ServiceFactory.search(query);
	return Response.json(results);
}
```

---

## DOM Measurement and Flex Layouts

Components that measure `clientWidth` or `getBoundingClientRect` for layout calculations (e.g. FitText binary search, auto-sizing) must set `width: 100%` as an inline style on the measured element. This is a measurement invariant, not a layout choice — it belongs in the measuring component, not in consumers.

**Why:** In flex containers with non-stretch alignment (`items-center`, `items-start`, `items-end`), elements shrink-wrap to content width. Without explicit `width: 100%`, `clientWidth` reflects content size rather than available container space, and any size calculation based on that measurement will be wrong.

**Affected layout contexts:**

- Flex column with `items-center` / `items-start` / `items-end` — child shrink-wraps (broken without fix)
- Flex column with `items-stretch` or default — child stretches naturally (works without fix, but explicit width is still correct)
- CSS Grid with auto-sized tracks — same shrink-wrap risk

**Related:** When a consumer block applies Tailwind Typography's `prose` class (which sets `max-width: 65ch`), and the measured component mutates font-size during calculation, the `65ch` constraint recomputes as font-size changes — creating inconsistent measurements. The fix is to conditionally not render `prose` when the measurement component is active, not to override with `max-w-none`.

---

## Fill-container iframes — CSS container-query units, not ResizeObserver

To make an iframe cover a container at a fixed aspect ratio (16:9 video embeds, third-party players), use CSS container query units. Add `container-type: size` to the parent wrapper. Size the iframe with `width: max(100cqw, calc(100cqh * 16 / 9))` and `height: max(100cqh, calc(100cqw * 9 / 16))`. The iframe stays an RSC — no client JS, no hydration timing.

**Why:** iframes do not support `object-fit: cover` (browser specification — not a quirk to work around). The historical pattern was a `ResizeObserver` in a `"use client"` component that measured the parent and updated iframe dimensions. That approach added client JS, caused a flash on initial render before measurement, and produced hydration-timing bugs when the observer fired before the React tree settled. Container query units calculate at the browser layer with no JS round-trip. THR-952 and THR-1509 each landed on this pattern independently for video and image fill-cover work; THR-952 also surfaced the scale-buffer constraint below.

**How to apply:**

- Parent: `container-type: size; container-name: <something descriptive>;` plus the layout rules that establish its bounds.
- Iframe: `width: max(100cqw, calc(100cqh * 16 / 9)); height: max(100cqh, calc(100cqw * 9 / 16));` for 16:9. Adjust the ratio for other aspect targets.
- **Scale buffer:** Third-party players (YouTube, Vimeo) consume internal pixels for chrome and padding. At near-16:9 container ratios (e.g. 1389×800), the exact-cover calculation produces zero overflow and YouTube's chrome reveals thin black bars. Add a 2–5% scale buffer to the math (`calc(100cqh * 16 / 9 * 1.03)`) to prevent the edge case. Test at viewport widths that produce container ratios close to the target aspect ratio, not just standard breakpoints.
