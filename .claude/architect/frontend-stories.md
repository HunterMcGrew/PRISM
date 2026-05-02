# Frontend Stories

Architect context for Storybook stories (`*.stories.tsx` / `*.stories.ts`). Covers configuration, patterns, typing, and fixtures.

---

## Location

Stories are colocated with their source files:

- Component stories: `frontend/components/{name}/{Component}.stories.tsx`
- Block stories: `frontend/blocks/{name}/{Block}.stories.tsx`
- Single-template stories: `frontend/single-templates/{name}/{Template}.stories.tsx`

---

## Configuration

### Storybook Config (`frontend/.storybook/`)

| File                  | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `main.ts`             | Framework config, story globs, addons                     |
| `preview.ts`          | Global decorators, control matchers, CSS imports          |
| `DefaultTemplate.tsx` | Global decorator wrapping all stories (layout, providers) |
| `preview.css`         | Storybook-specific styles                                 |

### Addons

| Addon                       | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `@storybook/addon-docs`     | Auto-generated documentation                                           |
| `@storybook/addon-links`    | Story cross-linking                                                    |
| `@chromatic-com/storybook`  | Chromatic visual testing integration                                   |
| `@storybook/addon-coverage` | Istanbul coverage for `blocks/` and `components/`                      |
| `@storybook/addon-a11y`     | Accessibility checks (WCAG 2.1 AA) — runs automatically on every story |

### Key Settings

- **Framework:** `@storybook/nextjs-vite` with `experimentalRSC: true` — enables React Server Component rendering in stories
- **Global decorator:** `DefaultTemplate` wraps all stories (imported in `preview.ts`)
- **CSS:** Both `preview.css` and `globals.css` are loaded globally. Vite handles CSS/PostCSS/Tailwind natively via `postcss.config.js`.
- **Server-only APIs:** `getMockSiteGlobals()` fixture sets `useCache: false` so resolvers skip `unstable_cache` (server-only). The `@storybook/nextjs-vite` framework stubs other Next.js server APIs (`next/navigation`, `next/headers`, `next/router`).
- **TypeScript:** Uses `react-docgen` for prop extraction. The `.storybook/` directory requires explicit `include` entries in `tsconfig.json` because TypeScript's `**` glob doesn't match dot-directories.
- **Telemetry:** Disabled

---

## Framework

Storybook uses `@storybook/nextjs-vite` as the framework. All type imports come from there:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
```

---

## Component Story Pattern

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import MyComponent from "./MyComponent";

const meta: Meta<typeof MyComponent> = {
	title: "Thrive/Components/MyComponent",
	component: MyComponent,
	argTypes: {
		variant: { control: { type: "select" }, options: ["primary", "secondary"] },
		size: {
			control: { type: "select" },
			options: ["small", "medium", "large"],
		},
		disabled: { control: "boolean" },
	},
	tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
	args: { variant: "primary", size: "medium" },
};

export const Disabled: Story = {
	args: { variant: "primary", disabled: true },
};
```

Key points:

- `meta` uses `Meta<typeof Component>` for type safety
- `tags: ["autodocs"]` enables auto-generated documentation
- Title follows `"Thrive/Components/{Name}"` or `"Thrive/Blocks/{Name}"`
- Named exports for each story variant
- Story objects use `StoryObj<typeof Component>` type

---

## Block Story Pattern

Block stories are more complex — they construct mock block trees and render through `BlocksRenderer`:

```typescript
import "@frontend/lib/services/block/block-registry";
import { expect, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getMockSiteGlobals } from "@frontend/__fixtures__/site-globals.fixture";
import BlocksRenderer from "@frontend/blocks/BlocksRenderer";
import type { IPostBlock } from "@frontend/lib/contracts/block";

const site = getMockSiteGlobals();

type StoryArgs = {
  headline: string;
  // story-specific controls
};

const DEFAULT_ARGS: StoryArgs = {
  headline: "Default Headline",
};

const meta: Meta<StoryArgs> = {
  title: "Thrive/Blocks/MyBlock",
  argTypes: { /* controls */ },
  args: DEFAULT_ARGS,
  render: (args) => {
    const blocks: IPostBlock[] = [/* construct block tree from args */];
    return <BlocksRenderer blocks={blocks} site={site} />;
  },
};
```

Key points:

- Import `block-registry` at top to ensure all blocks are registered
- Use `getMockSiteGlobals()` fixture for site context
- Define a `StoryArgs` type for story-specific controls separate from block attributes
- `DEFAULT_ARGS` constant with sensible defaults
- `render` function constructs mock `IPostBlock` trees from story args

---

## Fixtures

- `@frontend/__fixtures__/site-globals.fixture` — `getMockSiteGlobals()`
- `@frontend/__fixtures__/post-block.fixture` — mock block builders
- Constants: `STORYBOOK_COLOR_OPTIONS`, `STORYBOOK_DEFAULT_PLACEHOLDER_IMAGE`, `STORYBOOK_LINK_TARGET_OPTIONS` from `@frontend/lib/constants`

---

## Mocking Service Methods

Stories that render through `BlocksRenderer` (integration stories) need to mock service methods to prevent real API calls. Use `spyOn` from `storybook/test` in a `beforeEach` hook:

```typescript
import { spyOn } from "storybook/test";

import { PromotionService } from "@frontend/lib/services/promotion/PromotionService";

const meta: Meta<typeof PromotionsBlock> = {
	title: "Thrive/Blocks/Promotions",
	component: PromotionsBlock,
	beforeEach: () => {
		spyOn(PromotionService.prototype, "getItems").mockResolvedValue(mockData);
	},
};
```

Key points:

- `spyOn` auto-restores between stories — no manual cleanup needed
- `beforeEach` runs before the story renders, so mocks are in place for resolver calls
- Works with any bundler (Vite or webpack) and with RSC via `experimentalRSC`
- No addon required — `spyOn` is built into `storybook/test`

### `getMockSiteGlobals` fixture defaults `useCache` to false

The fixture is the story-side contract that pairs with the resolver-side `useCache` gate. Stories that render through `BlocksRenderer` rely on `getMockSiteGlobals({ useCache: false })` (or the default, which is `false`); without the gate in the resolver, stories crash because `unstable_cache` is server-only and Storybook isn't a server context.

The other half of the contract lives in `.claude/architect/frontend-services.md` § `unstable_cache` requires the `useCache` gate — resolvers must check `site.policy.useCache` before calling `unstable_cache`. THR-1571 fixed the navigation resolver after a story crash surfaced the gap.

---

## Render Tests in Stories

Stories can include play functions for interaction testing:

```typescript
import { expect, within } from "storybook/test";

export const WithInteraction: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		expect(canvas.getByText("Expected")).toBeInTheDocument();
	},
};
```
