# Code Standards

Universal standards that apply to all code in this repository. For language-specific rules, see the dedicated files linked below.

## General

- Do not introduce formatting-only changes.
- Do not remove pre-existing code comments in code you are not otherwise modifying.
- Propose large architectural changes instead of executing them.
- Stop and explain before changing public APIs, shared types, or shared utilities.
- Follow existing repository patterns — read before writing.
- Do not introduce new dependencies without approval.
- Avoid premature abstraction — three similar lines are better than one speculative helper.

### Refactor scope

Refactor code you're already modifying for the ticket — including small local-frame reshape (initializing a variable to its default, extracting a helper from the function you're in, collapsing redundant branches) when the existing shape is making the right answer harder than it needs to be. That's not drive-by refactor; it's making the fix compose.

Do not refactor code outside the local frame. Drive-by cleanup of nearby-but-unrelated code goes in a follow-up ticket.

**Why:** Terse "do not refactor unrelated code" wording overrode downstream guidance on ambiguous calls and primed minimum-diff fixation — bolting fallback after fallback onto an awkward shape instead of reshaping the frame so the fix composes. Defining the local frame flips the precedence correctly without losing scope discipline. See THR-1805.

**What "local frame" means:**

- **In scope:** the lines you're already modifying; the function or method containing those lines; helpers you extract from that code; files already in the diff for this ticket.
- **Out of scope:** unmodified code elsewhere in the same file; sibling files; "while I'm here" cleanup of code the ticket doesn't otherwise touch.

For the implementation-mode framing of the same rule, see `.claude/skills/prism-code-dev/SKILL.md` § Scope discipline and `### Anti-pattern: Drive-by refactoring`.

## Whitespace

Use blank lines to separate logical units and improve scannability. Remove double blank lines and trailing whitespace.

### Required blank lines

- Between functions, methods, classes, types, and interfaces
- Before and after control structures (`if`, `else`, `for`, `foreach`, `while`, `switch`, `try`) — except:
  - When the control structure is the first statement in a block (right after `{`), omit the blank line above
  - When two tightly related control structures form a single logical check (e.g. sequential guard clauses that early-return), they may be grouped without a blank line between them
- Before a `return` statement, unless it is the only statement in the block
- Between groups of related variable assignments or declarations

### Not required

- Between individual lines within a single logical group (e.g. a set of `wp_enqueue_style` calls or consecutive property assignments)
- After an opening brace or before a closing brace

## Naming

- Functions must start with a verb — `checkPermission`, `filterItems`, `validateInput`.
- Do not use `is`-/`has`-prefixed names for regular functions — these read as boolean variables. **Exception:** TypeScript type guard functions (`x is SomeType` return type) use `is`-prefix by convention.
- **TypeScript**: camelCase — `filterItems`, `validateInput`. See `code-standards-ts.md`.
- **PHP**: snake_case — `filter_items`, `validate_input`. Matches WordPress core. See `code-standards-php.md`.

## Handlers

- Event handler functions use the `handle` prefix — `handleLinkChange`, `handleImageSelect`. The `onChange` / `onSelect` / `onClose` naming is reserved for prop names passed to components.
- When a named handler function exists, it must contain all its logic — callers pass the handler reference directly (e.g. `onChange={handleLinkChange}`, not `onChange={(v) => handleLinkChange(transform(v))}`).
- If a handler needs to transform its input, widen its parameter type and do the transformation inside the handler body.

## File Organization

- Order within a module: imports → constants → exported types → exported functions → private utilities.
- Constants (e.g. `gql` queries, static config) go above types and functions, immediately after imports.

## Tests

- Do not break existing tests.
- Do not delete tests to make changes pass.
- Add tests when changes introduce meaningful risk.
- Explain verification steps when behavior changes.
- **Storybook stories are mandatory** for every **frontend** component and block touched in a PR. Visual regressions are caught in Storybook, not Jest. See `frontend-tests.md` for details. Backend editor components (`backend/plugins/*/src/`) do not have Storybook or Jest — they are tested via Pest PHP. See `backend-editor-components.md`.

## Comments

Follow `.claude/rules/code-comments.md` — JSDoc on declarations, plain sentences for inline comments, no tags or prefixes, no ALL CAPS, and apply the Delete Test in review.

## Dedicated Standards

| Topic | File |
|-------|------|
| TypeScript (types, data flow, naming, blocks, server/client, tests) | `.claude/rules/code-standards-ts.md` |
| PHP (architecture, naming, security, WP integration, tests) | `.claude/rules/code-standards-php.md` |
| Comments | `.claude/rules/code-comments.md` |
| Accessibility (WCAG 2.1 AA) | `.claude/rules/accessibility.md` |
| Server/client boundaries | `.claude/rules/headless-architecture.md` |
| useEffect | `.claude/rules/use-effect-guidelines.md` |
| Component props decoupling | `.claude/rules/component-props-decoupling.md` |
| Prop/object key ordering | `.claude/rules/prop-ordering.md` |
| Bundle diagnosis | `.claude/references/bundle-diagnosis.md` |
