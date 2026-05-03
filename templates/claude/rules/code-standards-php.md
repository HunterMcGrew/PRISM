---
description: PHP coding standards — naming, architecture, security, WordPress integration, testing
paths:
  - backend/**/includes/**
  - backend/**/src/**
  - backend/**/tests/**
  - backend/themes/**
---

# PHP Standards

## Architecture

- Class-based under `Thrive_Core\` namespace with PSR-4 autoloading.
- All classes expose WordPress hooks via a static `register()` method — called from `App::registerCoreComponents()`.
- `register()` creates the instance and wires hooks. Dependencies are injected through the constructor or `register()` parameters.
- Directory structure follows responsibility: `Services/`, `Handlers/`, `PostTypes/`, `Utilities/`, `Setup/`, `RestApi/`, `GraphQL/`.
- See `php-classes.md` architect context for the full class hierarchy and patterns.

## Naming

Follow PSR conventions **except** for function and method names:

- **Classes**: PascalCase — `PostRevalidateHandler`, `LocationsPostType`
- **Functions and methods**: `snake_case` — matches WordPress core. Required because WP plugin class extension breaks with camelCase method overrides.
- **Constants**: UPPER_SNAKE_CASE — `THRIVE_PLUGIN_VERSION`
- **Namespaces**: PascalCase, following directory structure — `Thrive_Core\Handlers\PostRevalidateHandler`
- **Variables**: `$snake_case`

Existing camelCase functions/methods are grandfathered. New code and touched code must use snake_case.

## Type Safety

- Type-hint all parameters and return types.
- Validate all inputs at trust boundaries (REST endpoints, user input, external APIs).
- Use `WP_Error` for domain errors that callers need to handle. Use exceptions for programmer errors (bugs, invalid state).
- Do not widen types to silence errors — fix the root cause.

## Security

- **Input sanitization**: `sanitize_text_field()`, `absint()`, `sanitize_email()`, `wp_kses()` — always before storage or processing.
- **Output escaping**: `esc_html()`, `esc_attr()`, `esc_url()` — always on output. Late escaping, not early.
- **Nonce verification**: `wp_verify_nonce()` / `check_ajax_referer()` for all form submissions and AJAX requests.
- **Capability checks**: `current_user_can()` before any privileged operation.
- **Block markup**: do not use `wp_kses_post` on serialized block content — it strips HTML comments (`<!-- wp:block-name {...} -->`), silently destroying block structure. Apply `wp_kses_post` only to `innerHTML`/`innerContent` on output.

## WordPress Integration

- **Hook registration**: always via static `register()` methods. No loose `add_action`/`add_filter` calls outside of `register()` or legacy procedural files.
- **REST routes**: use `thrive/v1` namespace. Access control via `permission_callback`. Always validate and sanitize request parameters.
- **GraphQL types**: follow two-method pattern — `register()` for new types, `registerFields()` for fields on existing types. All registration inside `graphql_register_types` action.
- **Custom post types**: consistent pattern via `PostTypesLoader`. Enable `show_in_rest` and `show_in_graphql`.
- **ACF fields**: access via `get_field()`. Type-hint the expected return and validate — ACF can return `false`, `null`, or unexpected types.

## Error Handling

- **REST endpoints**: return `WP_Error` with proper HTTP status codes. Never expose internal error details to clients.
- **Hook callbacks**: fail silently with logging, not exceptions — an unhandled exception in a WordPress hook can break the entire page.
- **Logging**: use `Logger` class for structured logging. No `error_log()` or `var_dump()` in production code.

## Tests

- **Pest PHP v2** as the test runner (built on PHPUnit).
- **Brain\Monkey** for mocking WordPress functions. **Mockery** for class mocking.
- Unit tests in `tests/Unit/`, integration tests in `tests/Integration/` — mirror the `includes/` structure.
- Run: `composer test:unit` (no WP), `composer test:integration` (requires WP test DB), `composer test` (all).
- Use `expect()` chain assertions (Pest API). Use `Brain\Monkey\Functions\expect()` for WP function mocks.
- See `php-tests.md` architect context for patterns and conventions.
