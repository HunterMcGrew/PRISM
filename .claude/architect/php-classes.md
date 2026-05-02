# PHP Classes

Architect context for PHP class architecture under `backend/plugins/*/includes/` and `backend/plugins/*/src/`. Covers namespace conventions, class patterns, and subsystem organization.

For PHP coding rules (naming, type-hinting, security, hooks) see `.claude/rules/code-standards-php.md`.

---

## Namespace and Autoloading

The main plugin uses PSR-4 autoloading:

```json
{
  "autoload": {
    "psr-4": {
      "Thrive_Core\\": "includes"
    }
  }
}
```

All classes live under the `Thrive_Core\` namespace, mapping to `backend/plugins/gravity-platform-core/includes/`.

Other plugins follow the same PSR-4 pattern in their own namespaces.

---

## App Entrypoint

`includes/App.php` is the plugin's entrypoint. `App::init()` is called from the main plugin file.

It orchestrates:
1. Creates shared dependencies (Logger, RevalidateService)
2. Calls `registerCoreComponents()` — invokes `::register()` on all PSR-4 classes
3. Sets up the search service
4. Includes legacy procedural files

---

## Class Registration Pattern

All classes expose their WordPress hooks via a static `register()` method:

```php
class PostRevalidateHandler
{
    public static function register(RevalidateService $revalidateService): void
    {
        $self = new self($revalidateService);
        add_action('save_post', [$self, 'handleSavePost'], 20, 3);
        add_action('acf/save_post', [$self, 'handleAcfSavePost'], 20, 1);
        add_action('trashed_post', [$self, 'handleTrashedPost'], 20, 1);
    }

    public function __construct(RevalidateService $revalidateService)
    {
        $this->revalidateService = $revalidateService;
    }
}
```

Pattern:
- `register()` is static, called from `App::registerCoreComponents()`
- `register()` creates the instance and wires WordPress hooks
- Dependencies are injected through the constructor or `register()` parameters
- `register()` is the only public static method — everything else is instance methods

### All-static variant

Stateless classes (no dependencies, no stored state) may use all-static methods instead of the instance pattern. No constructor, no `new self()` in `register()`. See `FeatureFlags` and `PrivateSettings` in `Settings/`.

---

## Directory Structure

```
includes/
├── App.php                    # Entrypoint
├── Admin/                     # Admin UI, settings, notices, toolbar
│   ├── AdminAssets.php
│   ├── AdminColors.php
│   ├── AdminNotices.php
│   ├── CacheClearToolbar.php
│   ├── CallToActions.php
│   └── PlatformSettings.php
├── Services/                  # Business logic services
│   ├── FrontendLinkService.php
│   └── RevalidateService.php
├── Handlers/                  # Event handlers (WordPress hooks)
│   ├── LlmsTxtRevalidateHandler.php
│   ├── PostIndexSyncHandler.php
│   ├── PostRevalidateHandler.php
│   ├── ProductIndexSyncHandler.php
│   └── ReindexButtonHandler.php
├── PostTypes/                 # Custom post type registrations
│   ├── PostTypesLoader.php
│   ├── LocationsPostType.php
│   ├── EmployeesPostType.php
│   ├── EquipmentPostType.php
│   ├── PromotionsPostType.php
│   └── ... (9 total)
├── Utilities/                 # Helper classes
│   ├── ArrayUtilities.php
│   ├── ColorUtilities.php
│   ├── DateUtilities.php
│   ├── Logger.php
│   ├── NumberUtilities.php
│   └── TaxonomyUtilities.php
├── Setup/                     # Plugin initialization
│   ├── FormsSetup.php
│   ├── FrontendLinksSetup.php
│   ├── ImporterSetup.php
│   └── LoginSecuritySetup.php
├── Settings/                  # Configuration and feature flags
│   ├── FeatureFlags.php
│   └── PrivateSettings.php
├── Roles/                     # WordPress roles
│   └── RolesBuilder.php
├── Commands/                  # WP-CLI commands
├── Llms/                      # LLM/SEO integration
│   ├── LlmsTxtService.php
│   ├── Contracts/
│   ├── Dto/
│   └── Providers/
├── RestApi/                   # REST API endpoints
├── GraphQL/                   # WPGraphQL types (see php-graphql.md)
├── Search/                    # Search integration
└── plugin-hooks/              # Third-party plugin integrations (procedural)
```

---

## PostTypes

Custom post types follow a consistent pattern:

```php
class LocationsPostType
{
    public static function register(): void
    {
        register_post_type('locations', [
            'labels' => [...],
            'public' => true,
            'has_archive' => false,
            'supports' => ['title', 'thumbnail'],
            'show_in_rest' => true,
            'show_in_graphql' => true,
            'graphql_single_name' => 'location',
            'graphql_plural_name' => 'locations',
        ]);
    }
}
```

All post types enable `show_in_rest` and `show_in_graphql`. They are loaded by `PostTypesLoader::register()`.

---

## REST API

REST endpoints live in `includes/RestApi/`:

```php
class PostPassCookieApi
{
    public static function register(): void
    {
        $self = new self();
        add_action('rest_api_init', function () use ($self) {
            register_rest_route('thrive/v1', '/validate-password', [
                'methods'  => 'POST',
                'callback' => [$self, 'validatePassword'],
                'permission_callback' => '__return_true',
            ]);
        });
    }
}
```

Routes use the `thrive/v1` namespace. Access control is handled by `RestApiAccessControl`.

`MegaMenuBlocksApi` owns all mega menu storage operations — reads, writes, publishes, snapshots, revisions, and the default block template. Other classes that need block data (e.g. `MegaMenuEditor`) call its public static methods (`getDraftSerializedBlocks()`, `getDefaultSerializedBlocks()`). Option key constants live only in `MegaMenuBlocksApi`.

---

## Search Integration

Search lives in `includes/Search/` with its own layered architecture:

- `Interfaces/` — `SearchServiceInterface`, `DataProviderInterface`
- `Services/` — `TypesenseSearchService`, `SearchServiceFactory`
- `Providers/` — `WordPressIndexDocumentProvider`
- `Mappings/` — `ContentMappingFactory`, `Equipment_Mapping`, `Rental_Mapping`
- `Models/` — `Index_Record`, `Typesense_Settings`

Supports Typesense and Algolia. The search service is initialized in `App::setupSearchService()` and wired to index sync handlers.

---

## Other Plugins

### thrive-sss (Shopify Sync Service)
```
src/Api/       — REST API endpoints
src/Config/    — Configuration and post types
src/Handlers/  — Event handlers
src/Models/    — Data models
src/Services/  — Business logic
src/Tasks/     — Queue tasks
```

### thrive-byo (Build Your Own)
```
src/Connection/ — External service connections
src/Type/       — GraphQL types (Enum/, Object/)
```

Both follow the same PSR-4 and `register()` patterns.

---

## Feature Flags

Feature flags gate blocks and menus behind ACF true/false toggles on the Platform Settings page.

### Registry

`FeatureFlags::FLAGS` is a class constant on `Settings\FeatureFlags`. Each entry maps an ACF field name to its gated blocks and menus. Follows the same pattern as `PrivateSettings::SETTINGS` — co-locates config with the only class that reads it.

### Reading flags

Always use `FeatureFlags::is_enabled($flag_key)` — never call `get_option('platform_settings_' . $key)` directly. The class enforces a single canonical truthiness check that handles all edge cases (ACF stores `'1'`/`'0'`, `get_option` returns `false` for missing options).

### Adding a new flag

1. Add an ACF true/false field to the Feature Flags field group
2. Add an entry to `FeatureFlags::FLAGS` in `includes/Settings/FeatureFlags.php` with `gated_blocks` and/or `gated_menus`
3. Add the corresponding field to `IFeatureFlags` on the frontend

`FeatureFlags::register()` automatically exposes each flag as a Boolean GraphQL field on `ThriveSettings`. `blocks.php` and theme `functions.php` iterate `FeatureFlags::FLAGS` and call `FeatureFlags::is_enabled()` to exclude gated blocks and menus.

---

## Plugin Hooks (Procedural)

Third-party integrations in `includes/plugin-hooks/` are procedural PHP files:

- `acf.php` — Advanced Custom Fields hooks
- `woocommerce.php` — WooCommerce hooks
- `wp-graphql.php` — WPGraphQL hooks
- `yoast-seo.php` — Yoast SEO hooks
- `simple-history.php` — Simple History hooks
- `tec.php` — The Events Calendar hooks

These are included by `App::includeFiles()` and follow older conventions.
