# PHP Theme

Architect context for the FSE (Full Site Editing) block theme at `backend/themes/gravity-platform/`. Covers theme structure, configuration, templates, and patterns.

---

## Overview

`gravity-platform` is a WordPress Full Site Editing block theme. It serves as the CMS editing layer — the actual frontend rendering is handled by Next.js.

The theme is minimal by design: it configures the WordPress editor experience (colors, spacing, typography, block styles) and provides template structure for content editing.

---

## Directory Structure

```
backend/themes/gravity-platform/
├── functions.php         # Theme setup, menus, patterns, editor styles
├── theme.json            # FSE configuration (colors, spacing, typography)
├── index.php             # Required by WordPress
├── templates/
│   └── index.html        # Default template
├── parts/
│   ├── header.html       # Header template part
│   └── footer.html       # Footer template part
├── patterns/
│   ├── header-dark.php   # Dark header block pattern
│   └── header-light.php  # Light header block pattern
└── styles/
    └── editor-styles.css # Editor-specific styles
```

---

## theme.json

Controls the WordPress editor's design system:

### Colors

Custom palette with restricted options (no custom colors, no gradients):

```json
{
  "settings": {
    "color": {
      "custom": false,
      "defaultPalette": false,
      "customGradient": false,
      "palette": [
        { "name": "Primary", "slug": "primary", "color": "#367c2b" },
        { "name": "Secondary", "slug": "secondary", "color": "#ffde00" },
        { "name": "White", "slug": "white", "color": "#ffffff" }
      ]
    }
  }
}
```

### Spacing

Custom spacing scale with controlled options:

```json
{
  "settings": {
    "spacing": {
      "margin": true,
      "padding": true,
      "blockGap": true,
      "customSpacingSize": false,
      "spacingScale": {
        "operator": "*",
        "increment": 2,
        "steps": 7,
        "mediumStep": 2,
        "unit": "rem"
      }
    }
  }
}
```

### Global Styles

Default styles for elements and blocks:
- Links use `var(--wp--preset--color--primary)`
- Headings use `var(--wp--preset--color--gray-600)`
- Images have `border-radius: 8px`
- Groups have `blockGap: 1rem`

---

## functions.php

### Editor Styles

```php
add_theme_support('editor-styles');
add_editor_style('styles/editor-styles.css');
add_editor_style("../../plugins/gravity-platform-core/build/main.css");
```

The plugin's compiled CSS is loaded into the editor for consistent styling.

### Google Fonts

Inter font is enqueued for both frontend and editor:

```php
wp_enqueue_style('google-fonts-inter',
    'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
```

### Navigation Menus

Registered menu locations:

| Slug | Purpose |
|------|---------|
| `primary-menu` | Main site navigation |
| `mobile-menu` | Mobile navigation |
| `brow-menu` | Top bar navigation |
| `footer-menu` | Footer navigation |
| `colophon` | Bottom footer/legal links |

Menus can be gated behind feature flags. Disabled flags have their menus unregistered via `FeatureFlags::is_enabled()` and `FeatureFlags::get_gated_menus()`. See the Feature Flags section in `php-classes.md` for details.

### Block Patterns

- Core block patterns are removed (`remove_theme_support('core-block-patterns')`)
- Remote patterns are disabled (`should_load_remote_block_patterns` → false)
- Only `gravity-platform` (Thrive) patterns are allowed
- Custom category `thrive` is registered for patterns
- External plugin patterns (Jetpack, WooCommerce) are filtered out

---

## Templates and Parts

Templates use WordPress block HTML format:

- `templates/index.html` — default page template
- `parts/header.html` — site header
- `parts/footer.html` — site footer

These define the block structure that the WordPress editor renders. Custom blocks from `gravity-platform-core` are used within these templates.

---

## Patterns

Block patterns are PHP files that return block markup:

- `patterns/header-dark.php` — dark-themed header pattern
- `patterns/header-light.php` — light-themed header pattern

Patterns are registered under the `thrive` category.
