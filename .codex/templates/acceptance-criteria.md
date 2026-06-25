# Acceptance Criteria Format

AC has two sections: behavioral (user interactions) and non-behavioral (constraints and quality requirements).

---

## Behavioral — Gherkin Format

Use `Given / When / Then` for any criterion that describes a user interaction or observable behavior.

```
- [ ] Given [precondition or starting state],
      When [user action or system event],
      Then [expected outcome]
```

**Examples:**
- [ ] Given a user is on the homepage, When they click the mega menu trigger, Then the mega menu panel opens with keyboard focus on the first item
- [ ] Given a product has no image, When the card renders, Then a placeholder image is displayed with alt text "No image available"

**Rules:**
- Each criterion is independently testable
- Written for non-technical testers — no file names, function names, or types
- Start with an action verb when the Given clause is implicit (e.g. "Navigate to...", "Verify that...")
- Include where to find the relevant setting in the admin or configuration surface when not obvious

### Pre-requisites Background

When several behavioral criteria share the same starting state — a logged-in user with a specific role, a populated fixture, a configured feature flag — extract the shared state into a `**Background:**` block at the top of the behavioral section instead of repeating the same Given clause across every item. Following Gherkin's Background convention keeps individual criteria scoped to the action and outcome that distinguish them.

**Format:**

```
**Background:** [shared state — written as a sentence, not a Given clause]

- [ ] When [user action], Then [outcome]
- [ ] When [user action], Then [outcome]
```

**Example:**

```
**Background:** The user is logged in with the admin role and the dealer-locator feature flag is enabled.

- [ ] When the user navigates to /admin/dealers, Then the dealer list loads with all active dealers shown
- [ ] When the user clicks "Add Dealer," Then the new-dealer modal opens with the location field focused
```

**When to extract a Background:** three or more criteria share the same Given clause word-for-word. With fewer than three, keep the Given inline — extracting prematurely makes the AC harder to scan.

---

## Non-behavioral — Plain Checklist

Use a plain checklist for constraints that aren't user interactions: performance budgets, accessibility compliance, code quality gates.

```
- [ ] [Constraint or quality requirement]
```

**Examples:**
- [ ] Color contrast meets WCAG 2.1 AA ratio (4.5:1 for text, 3:1 for large text)
- [ ] Page loads in under 3 seconds on 3G throttle

---

## AC Adjustments

When an agent discovers during implementation that an AC item can't be met as written or needs modification, they record an adjustment — never silently change behavior.

```markdown
### AC Adjustment: [short title]
- **Original:** Given X, When Y, Then Z
- **Proposed:** Given X, When Y, Then W
- **Reason:** [why the change is needed]
- **Status:** `proposed` | `accepted` | `rejected`
```

**Rules:**
- Agents propose, humans accept or reject
- Status starts as `proposed` — agent must ask the human before proceeding
- Accepted adjustments replace the original AC item
- Rejected adjustments are kept for audit trail with `rejected` status

---

## Linear Sync

AC must be synced to the Linear ticket under `## Acceptance Criteria` at the bottom of the description. Winston syncs automatically after plan mode. Clove and Briar sync whenever AC changes. Nora can sync on demand.
