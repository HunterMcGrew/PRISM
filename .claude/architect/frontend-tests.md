# Frontend Tests

Architect context for frontend test files (`frontend/**/*.test.*`). Covers test organization, fixtures, mocking patterns, and conventions.

Run tests with: `pnpm run test <filename>` from the `frontend/` directory.

---

## Organization

Tests live in `__tests__/` subdirectories colocated with source files:

```
frontend/blocks/{name}/__tests__/resolver.test.ts
frontend/blocks/{name}/__tests__/resolver.props.test.ts
frontend/components/{name}/__tests__/{Component}.test.tsx
frontend/lib/domain/__tests__/link.test.ts
frontend/lib/type-guards/__tests__/link.test.ts
frontend/lib/utilities/__tests__/{utility}.test.ts
frontend/lib/services/{domain}/__tests__/{Service}.test.ts
```

~112 `__tests__/` directories across the frontend.

---

## Framework

- **Jest** as the test runner
- **React Testing Library** for component rendering (`render`, `screen`, `within`)
- **`@testing-library/jest-dom`** for DOM matchers (`toBeInTheDocument`, `toHaveClass`)

---

## Configuration

### Jest Config (`frontend/jest.config.mjs`)

Uses the `next/jest` factory for Next.js-aware transforms. Key settings:

- **Test environment:** `jsdom`
- **Module alias:** `@frontend/*` maps to `<rootDir>/*`
- **Setup file:** `frontend/jest.setup.mjs` — runs after the test environment is initialized
- **Ignored paths:** `node_modules`, `.next`, `.storybook`, `stories/`, `storybook-static/`, `styles/`
- **Coverage:** Collected automatically with `text-summary`, `html`, and `json-summary` reporters. Output in `frontend/__tests__/coverage/`. Global thresholds are 2% (effectively no enforcement)

### Setup File (`frontend/jest.setup.mjs`)

Runs before every test suite. It:

1. Imports `@testing-library/jest-dom` (adds DOM matchers to `expect`)
2. Polyfills `crypto`, `TextEncoder`, `TextDecoder`, and `TransformStream` for `jsdom`
3. Imports 5 global mocks from `frontend/__mocks__/`:
   - `cache.mock` — mocks `next/cache` (`unstable_cache`, `revalidateTag`)
   - `fetch.mock` — mocks global `fetch`
   - `resize-observer.mock` — mocks `ResizeObserver`
   - `router.mock` — mocks `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`)
   - `next-image/ImageMock` — mocks `next/image`

### Global Mocks (`frontend/__mocks__/`)

Reusable mock modules auto-loaded by the setup file or referenced in `jest.config.mjs`:

| File | Mocks |
|------|-------|
| `apollo-client.mock.ts` | Apollo client for service tests |
| `cache.mock.ts` | `next/cache` functions |
| `crypto-hash.mock.ts` | `crypto-hash` module (mapped via `moduleNameMapper`) |
| `es-modules.mock.ts` | ESM module compatibility |
| `fetch.mock.ts` | Global `fetch` |
| `fetchers.mock.ts` | Data fetcher functions |
| `resize-observer.mock.ts` | `ResizeObserver` API |
| `router.mock.ts` | Next.js navigation hooks |
| `splide.mock.ts` | Splide carousel library |
| `mega-menu/` | Mega menu component mocks |
| `next-image/` | `next/image` component mock |

When adding a new global mock, add it to `__mocks__/` and import it in `jest.setup.mjs` if it should be available to all tests.

---

## Fixtures

All shared fixtures live in `frontend/__fixtures__/`:

| File | Purpose |
|------|---------|
| `site-globals.fixture.ts` | `getMockSiteGlobals()` — used in almost every resolver and service test |
| `post-block.fixture.ts` | Mock block builders (`postBlockWithWpEmptyAttrs`, etc.) |
| `blocks.fixture.ts` | Block tree construction helpers |
| `context.fixture.ts` | Mock context objects |
| `domain.fixture.ts` | Generic domain entity fixtures |
| `equipment.fixture.ts` | Equipment-specific test data |
| `index-record.fixture.ts` | Search index record fixtures |
| `seo.fixture.ts` | SEO field fixtures |

Domain-specific fixtures also exist colocated with their tests:
```typescript
import { createMockMenu, createMockMenuItem } from "./__fixtures__/menu.fixture";
```

---

## Resolver Tests

Test the resolver logic with mock block trees:

```typescript
describe("accordion resolver", () => {
  it("returns empty array when block has no innerBlocks", async () => {
    const result = await resolver.resolveChildren!({
      id: "block-1",
      site,
      block: undefined,
    });
    expect(result).toEqual([]);
  });

  it("applies default font settings to child blocks", async () => {
    const heading = makeBlock(BLOCK_TYPES.HEADING);
    const panel = makePanel(heading);
    const result = await resolver.resolveChildren!({
      id: "block-1",
      site,
      block: { blockName: "...", attrs: {}, innerBlocks: [panel], innerHTML: "", innerContent: [] },
    });
    expect(result[0]!.innerBlocks[0]!.attrs).toEqual({ /* expected */ });
  });
});
```

Pattern:
- Helper functions to construct mock blocks: `makeBlock()`, `makePanel()`
- Test happy path, missing data, and attribute overrides
- Assert computed properties and defaults

---

## Component Tests

Render components and assert DOM output:

```typescript
import { render, screen } from "@testing-library/react";

describe("Heading", () => {
  it("renders the correct heading tag", () => {
    render(<Heading level={2}>Hello</Heading>);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("applies correct CSS classes for size", () => {
    render(<Heading level={1}>Title</Heading>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-2xl", "md:text-5xl");
  });
});
```

Pattern:
- Use `screen.getByRole()` or `screen.getByText()` for queries
- Assert classes, styles, and DOM structure
- Test prop variations and edge cases

---

## Service Tests

Mock repositories and test service business logic:

```typescript
const mockRepo = { getItems: jest.fn(), getItemBySlug: jest.fn() };
const service = new EventService(mockRepo as any, site);

it("filters past events by default", async () => {
  mockRepo.getItems.mockResolvedValue([pastEventDto, futureEventDto]);
  const result = await service.getItems();
  expect(result).toHaveLength(1);
});
```

---

## Type Guard Tests

Test predicate functions exhaustively:

```typescript
describe("isLinkTarget", () => {
  it("accepts valid targets", () => {
    expect(isLinkTarget("_self")).toBe(true);
    expect(isLinkTarget("_blank")).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(isLinkTarget("_new")).toBe(false);
    expect(isLinkTarget(null)).toBe(false);
    expect(isLinkTarget(42)).toBe(false);
  });
});
```

---

## Testing Runtime Validation of Typed Fields

When a resolver or type guard validates a value at runtime (e.g. `isLinkTarget()`), tests need to pass invalid values that TypeScript won't allow. Cast through `unknown` to bypass the type system while keeping the test intention clear:

```typescript
// Testing that an invalid buttonUrlTarget falls back to the default
it("falls back to default buttonUrlTarget for invalid value", async () => {
  const result = await resolver.resolveProps!({
    id: "block-1",
    attrs: { buttonUrlTarget: "invalid-target" as unknown as undefined },
    site,
  });

  expect(result.buttonUrlTarget).toBe(DEFAULT_ATTRIBUTES.buttonUrlTarget);
});
```

**Why `as unknown as undefined` instead of `as unknown as LinkTarget`:** Casting to the target type (`LinkTarget`) would defeat the purpose — TypeScript would think it's valid, but the test is specifically checking that runtime validation catches it. Casting to `undefined` (a valid member of `Partial<BlockAttributes>`) satisfies the type checker while preserving the runtime behavior of passing a garbage string.

**When to use this pattern:**
- Testing `isLinkTarget()`, `isValidSortOption()`, or similar runtime type guards
- Testing resolver fallback logic for invalid CMS data
- Testing API boundary validation where WordPress may send unexpected values

---

## Mocking

- Use `jest.mock()` for heavy dependencies (Apollo, external libraries)
- Import mocks at the top of the file before other imports
- Mock modules live in `__mocks__/` directories when reused across tests
- Prefer real implementations over mocks when feasible
- Check `frontend/__mocks__/` before creating a new global mock — it may already exist

---

## Storybook Visual Regression Stories

**Every component and block touched in a PR must have Storybook stories.** This is not optional and is one of the most important quality gates in the project.

**Why this matters:** We use **Chromatic** for automated UI snapshot visual regression testing. Chromatic runs in CI on every non-draft PR and on `ready for qa` label. It captures a visual snapshot of every Storybook story and diffs it against the baseline. If a story doesn't exist for a component, Chromatic can't catch visual regressions in it — the change ships blind. Every story you write becomes an automatic visual regression test with zero extra effort.

Both components (~56/65 have stories) and blocks (~27/73 have stories) already follow this convention — this rule makes it mandatory for any file you modify.

**What to cover:**
- Happy path rendering with typical props
- Key visual variants (sizes, states, themes, responsive breakpoints)
- Layout contexts that matter for the component (e.g. inside flex, grid, columns)
- Edge cases visible to users (empty states, long text, missing images)

**DOM measurement components** (FitText, auto-sizing, responsive breakpoints) get extra attention: Jest runs in JSDOM which does not compute layout — `clientWidth`, `scrollWidth`, `getBoundingClientRect()`, and `getComputedStyle()` all return zeros. Tests for these components will always pass trivially in Jest without catching actual bugs. Use `play` functions to assert on computed styles and measured dimensions in a real browser.

**Jest is still the right tool** for non-visual concerns — prop handling, className composition, conditional rendering, ARIA attributes, resolver logic. Write Jest tests for logic, Storybook stories for visual behavior.

**When a change could cause a visual regression, it needs a story.** If a code change affects how something renders — a new prop, a layout fix, a conditional style, a new variant — and there isn't already a story covering that specific case, write one. Don't rely on existing stories to implicitly catch it. If the regression is possible, the story must be explicit.

**When reviewing:** if a PR modifies a component or block and doesn't add or update Storybook stories, flag it. No stories = no Chromatic coverage = visual regressions ship undetected.
