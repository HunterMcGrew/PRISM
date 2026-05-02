# PHP GraphQL

Architect context for WPGraphQL integration in `backend/**/GraphQL/`. Covers the TypeRegistry, custom types, and field registration.

---

## TypeRegistry

`includes/GraphQL/TypeRegistry.php` is the central registration point for all custom GraphQL types and fields.

```php
class TypeRegistry
{
    public static function init(): void
    {
        add_action('graphql_register_types', function () {
            // Register types
            Equipment::register();
            LlmsTxt::register();
            SearchSettings::register();
            Sitemap::register();
            TemplateParts::register();
            ThemeSettings::register();
            ThemeStyles::register();

            // Register fields on types
            Equipment::registerFields();
            LlmsTxt::registerFields();
            Page::registerFields();
            Post::registerFields();
            Product::registerFields();
            Redirect::registerFields();
            SearchSettings::registerFields();
            Sitemap::registerFields();
            TemplateParts::registerFields();
            ThemeSettings::registerFields();
            ThemeStyles::registerFields();
        });
    }
}
```

`TypeRegistry::init()` is called from `App::registerCoreComponents()`.

All type and field registration happens inside the `graphql_register_types` action hook.

---

## Directory Structure

```
includes/GraphQL/
├── TypeRegistry.php          # Central registration
├── Type/
│   └── Object/
│       ├── Equipment.php     # Custom equipment fields
│       ├── LlmsTxt.php       # LLMs.txt content
│       ├── Page.php          # Additional page fields
│       ├── Post.php          # Additional post fields
│       ├── Product.php       # WooCommerce product fields
│       ├── Redirect.php      # Redirect fields
│       ├── SearchSettings.php # Search configuration
│       ├── Sitemap.php       # Sitemap generation
│       ├── TemplateParts.php # Theme template parts
│       ├── ThemeSettings.php # Theme settings/options
│       └── ThemeStyles.php   # Theme style variables
└── Utils/
    └── BlocksProcessor.php   # Block content processing
```

---

## Type Registration Pattern

Each type class follows a two-method pattern:

### `register()` — Define new GraphQL types

```php
class SearchSettings
{
    public static function register(): void
    {
        register_graphql_object_type('SearchSettings', [
            'description' => 'Search configuration',
            'fields' => [
                'provider' => ['type' => 'String'],
                'apiKey' => ['type' => 'String'],
                // ...
            ],
        ]);
    }
}
```

### `registerFields()` — Add fields to existing types

```php
class Equipment
{
    public static function registerFields(): void
    {
        register_graphql_field('Equipment', 'customField', [
            'type' => 'String',
            'resolve' => function ($equipment) {
                return get_field('custom_field', $equipment->ID);
            },
        ]);
    }
}
```

Types that only add fields to existing WPGraphQL types (Page, Post, Product, Redirect) only have `registerFields()`.

---

## Relationship to Frontend

The frontend queries these types via Apollo Client through `GQL*Repository` classes:

```
PHP: TypeRegistry registers GraphQL types/fields
     ↓
WPGraphQL: Exposes /graphql endpoint
     ↓
Frontend: GQLEventRepository queries with Apollo Client
     ↓
Frontend: EventService maps DTOs to domain models
```

GraphQL queries live in `frontend/lib/wp/queries/`.

ACF `select` fields are exposed via WPGraphQL as `string[]` regardless of the `multiple` setting. Frontend mappers must unwrap. See `.claude/architect/frontend-services.md` § Verifying GraphQL response shape > ACF field shapes via WPGraphQL.

---

## BlocksProcessor

`Utils/BlocksProcessor.php` handles processing of WordPress block content for GraphQL responses — transforming raw block HTML/JSON into structured data the frontend can consume.

---

## Other Plugin GraphQL Types

### thrive-byo

```
src/Type/
├── Enum/     # GraphQL enum types
└── Object/   # GraphQL object types
```

Follows the same `register()` / `registerFields()` pattern within its own namespace.
