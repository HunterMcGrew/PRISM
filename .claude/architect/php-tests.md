# PHP Tests

Architect context for PHP tests in `backend/**/tests/`. Covers test framework, organization, and conventions.

---

## Framework

- **Pest PHP v2** as the test runner (built on PHPUnit)
- **Brain\Monkey** for mocking WordPress functions
- **Mockery** for PHP class mocking
- **php-mock/php-mock-mockery** for mocking PHP built-in functions

---

## Test Commands

From the plugin directory (e.g., `backend/plugins/gravity-platform-core/`):

```bash
composer test:unit          # Run unit tests only
composer test:integration   # Run integration tests (requires WP test database)
composer test               # Run all tests
```

Pest uses `--group=unit` and `--group=integration` flags defined in `phpunit.xml`.

---

## Directory Structure

```
backend/plugins/gravity-platform-core/
├── phpunit.xml              # PHPUnit/Pest configuration
├── tests/
│   ├── bootstrap.php        # Test bootstrap
│   ├── Unit/                # Unit tests (no WordPress, no DB)
│   │   ├── Admin/
│   │   ├── Handlers/
│   │   ├── Llms/
│   │   ├── RestApi/
│   │   ├── Search/
│   │   ├── Services/
│   │   ├── Setup/
│   │   └── Utilities/
│   ├── Integration/         # Integration tests (requires WP + DB)
│   │   ├── Setup/
│   │   └── ...
│   ├── phpunit/             # PHPUnit bootstrap and config
│   └── scripts/             # Test setup scripts (install-wp-tests.php)
```

Tests mirror the `includes/` class structure.

### thrive-sss also has tests:
```
backend/plugins/thrive-sss/tests/
├── Unit/Models/, Unit/Services/
├── Integration/Api/, Integration/Config/, Integration/Handlers/, Integration/Tasks/
```

---

## Unit Test Pattern (Pest)

```php
<?php

use Brain\Monkey\Functions;
use Thrive_Core\Setup\LoginSecuritySetup;

beforeEach(function () {
    $this->loginSecurity = new LoginSecuritySetup();
});

test('checkLoginAttempts returns user unchanged when username is empty', function () {
    $user = Mockery::mock('WP_User');
    $result = $this->loginSecurity->checkLoginAttempts($user, '', 'password');
    expect($result)->toBe($user);
});

test('checkLoginAttempts returns WP_Error when locked out', function () {
    $user = Mockery::mock('WP_User');

    Functions\expect('get_transient')
        ->once()
        ->with(Mockery::pattern('/^thrive_login_lockout_/'))
        ->andReturn(time() + 300);

    $result = $this->loginSecurity->checkLoginAttempts($user, 'testuser', 'password');

    expect($result)->toBeInstanceOf('WP_Error');
    expect($result->get_error_code())->toBe('too_many_attempts');
});
```

Key conventions:
- Pest's `test()` function instead of PHPUnit's `testMethodName()`
- `expect()` chain for assertions (Pest's expectation API)
- `Brain\Monkey\Functions\expect()` for mocking WordPress functions
- `Mockery::mock()` for PHP class mocking
- `beforeEach()` for test setup

---

## Integration Test Pattern

```php
<?php

use Thrive_Core\Setup\FormsFieldsSetup;

beforeEach(function () {
    remove_all_filters('gform_add_field_buttons');
});

it('removes unsupported fields from the field buttons', function () {
    $field_buttons = makeGroups([...]);
    $filtered = FormsFieldsSetup::filterFieldButtons($field_buttons);

    expect($filtered)->toHaveCount(2)
        ->and($filtered[0]['name'])->toBe('standard_fields');
});
```

Integration tests may require WordPress test database. The `test:integration` composer script runs `test:check` first to verify the database exists.

---

## PHPUnit Configuration

```xml
<phpunit bootstrap="tests/bootstrap.php">
  <testsuites>
    <testsuite name="Unit Test Suite">
      <directory>./tests/Unit/</directory>
    </testsuite>
    <testsuite name="Integration Test Suite">
      <directory>./tests/Integration/</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

---

## Mocking Conventions

- **WordPress functions**: `Brain\Monkey\Functions\expect('wp_function')->andReturn(value)`
- **WordPress classes**: `Mockery::mock('WP_User')`, `Mockery::mock('WP_Post')`
- **Transients**: Mock `get_transient`, `set_transient`, `delete_transient`
- **Options**: Mock `get_option` for settings-dependent code
- **Pattern matching**: `Mockery::pattern('/regex/')` for flexible argument matching
