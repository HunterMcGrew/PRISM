# Backend Blocks

Architect context for WordPress block registration and editor-side behavior. Covers `blocks.php`, `block.json`, the PHP-to-React bridge, and editor preview patterns in `edit.tsx`.

---

## Block Registration Entry Point

`backend/plugins/gravity-platform-core/includes/blocks.php` handles all block registration:

### Block Type Registration

```php
function gravity_platform_core_blocks_init()
{
    wp_register_script('gravity-platform-blocks', THRIVE_CORE_URL . 'build/main.js', [
        'wp-blocks', 'wp-block-editor', 'wp-element', 'wp-i18n', 'wp-api-fetch', 'wp-data', 'wp-core-data'
    ]);

    wp_register_style('gravity-platform-blocks', THRIVE_CORE_URL . 'build/main.css');
    wp_register_style('gravity-platform-blocks-theme', THRIVE_CORE_URL . 'build/style-main.css');

    foreach (glob(THRIVE_CORE_PATH . 'src/blocks/*', GLOB_ONLYDIR) as $block) {
        register_block_type($block);
    }
}
```

Each directory in `src/blocks/` is auto-registered using WordPress's `register_block_type()` which reads the `block.json` metadata.

### Block Category

A custom `gravity-platform` category ("Thrive") is registered for all custom blocks.

### Block Allowlist

`gravity_platform_exclude_blocks()` maintains an exclusion list that filters out:

- Core blocks not supported by the frontend (archives, audio, calendar, etc.)
- WooCommerce blocks (entire `woocommerce/` prefix)
- Yoast SEO blocks (entire `yoast-seo/` prefix)
- Blocks gated behind disabled feature flags

### Pattern Categories

Custom pattern categories are registered: `page_layout`, `service`, `parts`, `images`.

---

## Block Source Structure

Block source files live in `backend/plugins/gravity-platform-core/src/blocks/`:

```
src/blocks/{block-name}/
├── index.tsx       # Block registration (registerBlockType)
├── edit.tsx        # Editor component
├── save.tsx        # Frontend render (usually returns null for dynamic blocks)
├── block.json      # WordPress block metadata
└── ...             # Additional editor components
```

~57 block directories.

### block.json

Each block has a `block.json` that defines:

- Block name, title, category, icon
- WordPress-native features: typography, alignment, spacing, color
- Editor and save script/style references

`block.json` is for WordPress-native configuration only. Block-specific attributes are defined in the frontend `schema.ts`.

---

## Build Output

Webpack compiles the editor-side code into:

```
build/
├── main.js          # Combined editor scripts
├── main.css         # Editor styles
├── style-main.css   # Theme/frontend styles
└── blocks/
    └── {block-name}/
        └── block.json   # Compiled block metadata
```

The build config is in `backend/plugins/gravity-platform-core/webpack.config.js`.

---

## PHP-to-React Bridge

WordPress provides blocks as structured data (JSON with `blockName`, `attrs`, `innerBlocks`). The Next.js frontend:

1. Fetches page content via WPGraphQL (blocks come as `IPostBlock[]`)
2. `BlocksRenderer` iterates the block tree
3. `BlockService` looks up each block in `block-registry.ts`
4. If a resolver exists, it runs server-side to transform attrs into component props
5. The view component renders with resolved props

PHP's role is registration and editor-side behavior. Rendering is entirely handled by Next.js.

---

## Feature Flags

Blocks can be gated behind feature flags defined in `THRIVE_FEATURE_FLAGS`:

```php
if (defined('THRIVE_FEATURE_FLAGS')) {
    foreach (THRIVE_FEATURE_FLAGS as $flag_key => $flag_config) {
        if (empty($flag_config['gated_blocks'])) continue;
        $enabled = get_option('platform_settings_' . $flag_key);
        if ($enabled === '0' || $enabled === false) {
            $blocks_to_exclude = array_merge($blocks_to_exclude, $flag_config['gated_blocks']);
        }
    }
}
```

Feature flags also gate menus (see `php-theme.md`).

---

## Editor Preview Props

Editor `edit.tsx` components render a preview of the frontend component using the block's `attributes`. Two patterns exist depending on whether the block has a resolver.

### Blocks without a resolver (presentational blocks)

List each component prop explicitly — no `{...attributes}` spread. Choose the right operator per field type:

| Field type                                 | Operator    | Why                                                                             |
| ------------------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| Clearable text (`headline`, `description`) | `\|\|`      | Catches empty strings — user clearing a field falls back to placeholder/default |
| Numbers, booleans, objects                 | `??`        | Preserves falsy-but-valid values (`0`, `false`, `{}`)                           |
| Constrained enums (`alignment`)            | direct pass | Value is always valid — schema enforces the constraint                          |

```tsx
<MegaMenuAboutUs
	headline={attributes.headline || DEFAULT_ATTRIBUTES.headline}
	description={attributes.description || DEFAULT_ATTRIBUTES.description}
	alignment={attributes.alignment}
/>
```

This replaces the older `{...attributes}` spread + override pattern. Explicit listing is 3–5 lines per block, self-documenting, and requires no explanatory comment.

### Blocks with a resolver (`usePreviewProps`)

Blocks that fetch data server-side use `usePreviewProps` to merge resolved data with live attribute changes. The `usePreviewProps` hook is the single tool for resolver-based editor previews. The `||` vs `??` rules above still apply when constructing the initial preview state from attributes.

### Intentionally blank fields

If a field should render as truly empty when the user clears it (no placeholder fallback), pass the attribute directly without `||`. This is rare — most text fields benefit from showing a placeholder in the editor so the preview doesn't collapse.

---

## MediaUpload + ResponsiveWrapper Preview Pattern

When a block's `edit.tsx` renders an image preview in the InspectorControls sidebar using `@wordpress/components` `ResponsiveWrapper`, pass `naturalWidth` and `naturalHeight` from the uploaded image's actual dimensions. Hardcoded constants distort the preview.

**Why:** `ResponsiveWrapper` builds a padding-bottom aspect-ratio box from `naturalHeight / naturalWidth` and absolutely-positions its child `<img>` at `width: 100%; height: 100%` inside that box. Any mismatch between the declared natural dimensions and the image's intrinsic dimensions stretches the image to fit the box. THR-1817 surfaced this on the Mega Menu Featured Banner block — `naturalWidth={854} naturalHeight={400}` was hardcoded, so every uploaded image whose intrinsic aspect ratio wasn't 854:400 rendered visibly skewed.

**Schema implication:** the block stores image data as `image: IImage` (see § Image Attributes and ADR-0027). `IImage.mediaDetails.width` and `IImage.mediaDetails.height` carry the dimensions the preview needs:

```tsx
<ResponsiveWrapper
	naturalWidth={attributes.image?.mediaDetails?.width}
	naturalHeight={attributes.image?.mediaDetails?.height}
>
	<img src={attributes.image.sourceUrl} alt={attributes.image.altText} />
</ResponsiveWrapper>
```

Build the full `IImage` object inside the `MediaUpload` `onSelect` handler from `media.id`, `media.url`, `media.alt`, `media.title`, `media.width`, `media.height`. Reset `image` to its default in the remove handler — clearing a single attribute clears all the dimensions at once.

**Dimension fallback asymmetry — onSelect vs migrate.** The onSelect handler uses `?? 0` for the `media.width` / `media.height` fallback (`mediaDetails: { width: media.width ?? 0, height: media.height ?? 0 }`); the `deprecated[]` `migrate()` function uses `mediaDetails: undefined` when either dimension is missing. The asymmetry is intentional: WordPress's `MediaUpload` reliably returns dimensions for image media, so the handler's fallback is theoretical, while legacy migrated content may genuinely lack dimensions and `undefined` correctly signals "fall back to intrinsic" through `ResponsiveWrapper`. Don't harmonize the two by reflex — they're defending against different failure modes.

**Canonical example:** `backend/plugins/gravity-platform-core/src/blocks/mega-menu-info-banner/edit.tsx` — `handleMediaSelect` builds the full `IImage` object, the `<ResponsiveWrapper>` invocation reads `attributes.image.mediaDetails?.width/height`, and `MediaUpload` reads `value={Number(attributes.image.id) || 0}`.

**Backwards compatibility:** `ResponsiveWrapper` accepts `undefined` for `naturalWidth` / `naturalHeight` and falls back to rendering the img at intrinsic dimensions with no aspect-ratio enforcement. Block instances migrated from a legacy `imageUrl: string` shape via WP's `deprecated[]` array land with `image.mediaDetails === undefined` until the editor next replaces the image — the preview renders without skew via the intrinsic-size fallback, and the next replace populates `mediaDetails` from the fresh upload. No data migration is required when retrofitting an existing block.

**When this section applies:** any `edit.tsx` that wraps an `<img>` in `ResponsiveWrapper`. If a block has an image preview but uses a different mechanism (CSS aspect-ratio container with `object-fit`, native intrinsic-sized `<img>`), the schema implication still holds when the preview needs to mirror frontend cover/contain behavior, but `ResponsiveWrapper`'s specific failure mode doesn't.

---

## Styling the Outer Block Wrapper — `getEditWrapperProps`

Gutenberg apiVersion 2 renders every block as **two nested divs** in the editor: an outer `.block-editor-block-list__block.wp-block` wrapper and an inner div that receives `useBlockProps` (plus `useInnerBlocksProps` when present). The inner div's parent is `display: block`, so styles that need the block to participate in its parent's flex or grid layout must be applied to the outer wrapper — not via `useBlockProps`.

**Why this matters:** a child block of a flex-row parent (e.g. `mega-menu-column` inside `mega-menu-columns`) only resizes if the flex item itself carries `flex-basis` / `flex-grow` / `flex-shrink`. Writing those into `useBlockProps`'s `style` puts them on the inner div, which isn't the flex item — the browser's layout pane literally reports "The display: block property on the parent element prevents flex-basis from having an effect." Frontend doesn't have this problem because the rendered component is a direct child of its parent layout, with no WP wrapper interposed.

**The fix:** `registerBlockType` accepts a `getEditWrapperProps(attributes)` function that returns props applied to the outer wrapper. Use it whenever the block needs to be styled _as_ a flex/grid child:

```tsx
registerBlockType<ColumnBlockAttributes>(
	"gravity-platform-core/mega-menu-column",
	{
		// ...attributes, edit, save...
		getEditWrapperProps(attributes) {
			if (!attributes.width) return {};
			return {
				style: {
					flexBasis: attributes.width,
					flexGrow: 0,
					flexShrink: 0,
				},
			} as unknown as Record<string, string | number | boolean>;
		},
	}
);
```

**Type gap:** `@wordpress/blocks` declares the return type as `Record<string, string | number | boolean>`, which rejects nested style objects. WP core's own `core/column` block returns `{ style: { flexBasis } }` from this same API — the runtime accepts style objects, the types don't. Cast with `as unknown as Record<string, string | number | boolean>` and leave the inline comment short; the architect-level explanation lives here.

**When to reach for this instead of `useBlockProps`:**

- The block needs a layout property that only applies to flex/grid items (`flexBasis`, `flexGrow`, `gridColumn`, `alignSelf`, etc.)
- CSS rules target the outer wrapper via `.block-editor-block-list__block[data-type="..."]` and you need to override them per-attribute
- Styles authored in `useBlockProps` visibly have no effect despite being in the DOM

`useBlockProps` remains correct for everything that styles the block's inner content — className for internal layout, content sizing, min-height, text alignment, etc. The two APIs are not interchangeable; they target different elements in the editor DOM.

---

## Link Attributes

Block link attributes take the `ILink` shape (`{ href, target?, rel? }`) defined in `frontend/lib/domain/link.ts`. `url: string` and split `url`/`urlTarget` attribute pairs are phased out — see ADR-0019 for the decision, the editor component pairing (`LinkControl` + `ToolbarLink`), and the encounter protocol for existing blocks that still use the legacy shape.

---

## Image Attributes

Block image attributes take the `IImage` shape (`{ id, sourceUrl, altText, title, mediaDetails? }`) defined in `frontend/lib/domain/image.ts`. `imageUrl: string` and split URL + dimension clusters (`imageUrl` + `imageWidth` + `imageHeight` + `imageId`) are phased out — see ADR-0027 for the decision, the canonical pattern (`mega-menu-info-banner/edit.tsx`), the migration shape decision tree (native vs adapter), and the encounter protocol for existing blocks that still use the legacy shape.

The frontend domain layer already standardizes on `IImage` (`IPost.featuredImage`, `IEmployee.featuredImage`, `IProduct.featuredImage`, `IPromotion.gallery`, etc.). New block image attributes use `IImage` end-to-end so the frontend consumes the same shape it does everywhere else, and so the editor preview math (`ResponsiveWrapper` reading `image.mediaDetails.width/height`) works without bookkeeping flat dimension fields alongside the URL.

---

## Deprecating Block Attributes

When a block attribute is being renamed, restructured, or replaced with a domain object, the editor side carries two of the three legs of the deprecation pattern: the WP `deprecated[]` array and (when present) the PHP migration service emit shape. The third leg — the frontend read-side adapter — lives in `frontend-blocks.md` § Legacy Attribute Adapter Pattern. See [ADR-0028](../spec/adrs/0028-block-attribute-deprecation-pattern.md) for the full doctrine and naming convention.

### Leg 1 — WP `deprecated[]` array

Add an entry to the `deprecated: [...]` array in the block's `index.tsx`. The entry has three required keys:

- `attributes` — the legacy attribute schema as it was registered before the deprecation. Include every field the legacy shape carried.
- `isEligible(attributes)` — predicate that returns true when the legacy shape is present. Most deprecations check by attribute presence (`typeof attributes.legacyField === "string"`); the rare same-name re-deprecation checks by structure instead. The structural-check case has implications for the frontend's typed legacy shape — see ADR-0028 § Naming convention.
- `migrate(attributes)` — function that returns the canonical attribute shape. Must produce exactly what `BlockAttributes` declares — the editor will write this back on next save.

The `save` function for the deprecated entry typically reuses the current block's `save`. If the legacy block had a different `save` shape (server-side rendered HTML), reproduce the legacy shape here.

**Why:** WordPress runs `migrate()` only when the editor parses the saved block markup. Before any editor activity, saved content stays in legacy shape — so the read-side leg has to cover that gap.

**Canonical pattern:** `backend/plugins/gravity-platform-core/src/blocks/button-group-item/index.tsx` (`url: string` → `link: ILink`). `mega-menu-featured-banner/index.tsx` is the multi-field precedent (`backgroundImage` + dimension cluster → `image: IImage`).

### Leg 2 — PHP migration service emit shape

When a PHP service builds blocks of this type — `MegaMenuMigrationService::build*()`, content seeders, importers — its emit shape is a write path the WP `deprecated[]` array doesn't catch. Without this leg, every fresh dealer migration produces legacy-shape content the resolver has to adapt indefinitely.

Before opening the PR, run the grep test from ADR-0028:

```bash
grep -rn "'blockName' => 'gravity-platform-core/<block-name>'" backend/plugins/gravity-platform-core/includes/
```

Each match is a write-side leak. Update each call site to emit the canonical attribute shape, and update the matching unit tests (typically in `tests/Unit/Services/<area>/<test>.php` with `expect($block['attrs'][...])` assertions).

**Why:** the migration service runs when a dealer first onboards. If it emits legacy shape, the dealer's `platform_settings_mega_menu_blocks` lands in legacy shape immediately and stays there until a human opens the editor. The frontend reads from that storage directly — so until the human visits the editor, the page renders without the migrated content. THR-1817 surfaced this: `MegaMenuMigrationService::buildFeaturedBanner()` shipped with the WP `deprecated[]` array but kept emitting `attrs.backgroundImage` for every new dealer migration.

### Leg 3 lives in the frontend

The read-side adapter — typed legacy shape in `schema.ts`, resolver fallback in `resolver.props.ts` — is the frontend's responsibility. See `frontend-blocks.md` § Legacy Attribute Adapter Pattern for the type composition, the `Legacy<DeprecatedAttributeName>` naming convention, and the resolver shape.

**The architect rule:** when adding a `deprecated[]` array to a backend block, the frontend pair is required for any block that serves from persistent storage to the frontend (almost all of them). ADR-0028 describes when each leg is required and the retirement criterion for legacy types. Reviewers (Eric, Briar) flag a backend `deprecated[]` addition without a paired frontend leg as Major.

---

## WordPress Entity Records

`getEntityRecords()` returns implicit `any` from `@wordpress/core-data` unless explicitly typed. All `useSelect` calls that fetch entity records must cast the return value.

### Types directory

WordPress entity types live in `backend/plugins/gravity-platform-core/src/types/`:

| Type               | File                    | Used for                                                 |
| ------------------ | ----------------------- | -------------------------------------------------------- |
| `WPPost`           | `wordpress-post.ts`     | Post-type entities (`getEntityRecords("postType", ...)`) |
| `WPTaxonomyEntity` | `wordpress-taxonomy.ts` | Taxonomy terms (`getEntityRecords("taxonomy", ...)`)     |
| `WPMedia`          | `wordpress-media.ts`    | Media library items                                      |
| `WPEvent`          | `event.ts`              | Event entities                                           |

All are exported from `src/types/index.ts`.

### Store access — use the imported store reference with parameterized `select`

The Mega Menu editor (`apps/mega-menu-editor/`) runs inside a **standalone `@wordpress/data` registry** — not the default registry used by the regular Gutenberg post editor. Blocks that may render inside the mega menu **must not** use module-level `select("storeName")` with a string, because module-level `select` is bound to the default registry. The `useSelect` subscription is wired to the **active** registry (the mega menu's), so the read target and the subscription target cross wires: the resolver fetches data into the wrong registry, and the component never re-renders when the fetch lands.

Always use the imported store reference with the parameterized `select` passed by `useSelect`:

```tsx
import { store as coreStore } from "@wordpress/core-data";
import { useSelect } from "@wordpress/data";

import { WPPost } from "../../types";

const posts = useSelect(
	(select) =>
		select(coreStore).getEntityRecords("postType", "locations", {
			per_page: -1,
		}) as WPPost[] | null,
	[]
);
```

This pattern works in both the regular Gutenberg editor (default registry) and the mega menu editor (standalone registry) because `useSelect`'s `select` argument resolves store references against whichever registry the component is mounted inside.

The same rule applies to the block editor store and every other `@wordpress/*` data store — import the store reference (`store as blockEditorStore`, `store as coreStore`, etc.) and read it via the parameterized `select`, never via module-level `select("blockName")`.

**Never use** `import { select } from "@wordpress/data"` followed by `select("core").getEntityRecords(...)` inside a block's `edit.tsx`. It will work in the post editor and silently fail the moment the block is rendered inside the mega menu.

If no matching type exists for the entity being fetched, create one in `src/types/wordpress-{entity}.ts` following the existing JSDoc + interface pattern.

App builders working under `src/apps/` see the same rule from a different angle in `.claude/architect/backend-apps.md` § Cross-registry useSelect.
