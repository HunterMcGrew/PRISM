---
description: Semantic ordering convention for object literals and component props
paths:
  - frontend/**/*.tsx
  - frontend/**/*.ts
  - backend/**/*.tsx
---

# Object and Props Ordering (Team Standard)

When creating or editing object literals and component props, use a consistent semantic order to improve readability, reduce review churn, and make UI work faster to scan.

### Ordering priority

1. **Identity / variant** - what this thing is
   Examples: `id`, `name`, `title`, `type`, `kind`, `variant`

2. **Required control/state** - fields that drive behavior
   Examples: `open`, `enabled`, `status`, `value`, `disabled`, `isEditor`

3. **Core data/config** - primary non-callback inputs
   Examples: `form`, `formId`, `items`, `filters`, `direction`, `menu`, `ctas`

4. **Optional/advanced config** - less common toggles/options
   Examples: `retry`, `cache`, `timeout`, `experimental`

5. **Presentation details** - visual/layout fields
   Examples: `size`, `style`, `theme`, `iconSize`

6. **Callbacks/event handlers (always last)**
   Examples: `onOpenChange`, `onSubmit`, `onClose`, `onClick`

### `className` exception (UI readability)

- In JSX/component props, place `className` **immediately after identity/variant props**.
- `className` should appear **before control/state props** (for example, before `isEditor`).
- This exception applies only to UI-facing components.
- In non-UI objects, `className` follows normal presentation-field ordering.

### Tie-breakers

- Within each group, sort keys **alphabetically** by default.
- Keep related pairs adjacent when useful (`form` + `formId`, `min` + `max`).
- In callback group, sort alphabetically by default (`onBlur`, `onChange`, `onSubmit`).

### Semantic pair exception (preferred over alphabetical)

When both keys appear, keep these in natural reading order:

- `open` before `close`
- `onOpen` / `onOpenChange` before `onClose`
- `min` before `max`
- `from` / `start` before `to` / `end`
- `width` before `height`

Use this exception only for obvious paired semantics; otherwise keep alphabetical order.

### Exceptions and safety

- Do not reorder keys when order is runtime-significant (rare serializer/parser or interop cases).
- If one callback is the primary required API, it may appear earlier with a brief comment.
- For large objects, split into named sub-objects instead of long flat key lists.

### JSX example

<Component
  id="mobile-menu"
  title="Menu"
  className="lg:hidden"
  isEditor={isEditor}
  direction="left"
  iconSize={26}
  onOpenChange={setOpen}
  onClose={handleClose}
/>
