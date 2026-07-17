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

## Gradeability Bar

Every criterion carries a stable ID and a falsifiable Evidence sub-bullet — this is what lets an independent verifier (Reese's AC Verification mode) grade a criterion without asking the author what it means.

**Stable ID:** prefix each `- [ ]` with `**AC-N**` (AC-1, AC-2…), assigned at authoring. The ID stays fixed across reordering — targeted re-checks and disputes need a key that survives AC edits.

**Evidence sub-bullet:** every criterion carries one, tagged `machine` or `human`:

```
- [ ] **AC-N** Given [precondition], When [action], Then [outcome]
  - Evidence (machine|human): <procedure> → <expected observation> · UNMET looks like: <failure signature>
```

**Falsifiability rules:**

1. **Falsifiable, not merely runnable.** Name the exact command, inspection, or behavior; the expected observation ("exit 0 and output includes `12 passed`", not "run the tests"); and the failure signature. If you can't name what UNMET looks like, the criterion isn't gradeable.
2. **Absence-evidence needs a positive control.** "Grep for X returns nothing" pairs with a positive hit that proves the probe works — otherwise a broken grep and a passing grep look identical.
3. **Behavioral criteria get behavioral evidence** — a run or a probe. `inspected` file-state evidence is for non-behavioral constraints only.
4. **Two-verifiers standard.** Could two independent verifiers follow this with no author context and reach the same verdict? If not, rewrite it.
5. The criterion text stays tester-facing (existing rule above); the Evidence sub-bullet is verifier-facing and may be technical.

**Example:**

```
- [ ] **AC-1** Given a user is on the homepage, When they click the mega menu trigger, Then the mega menu panel opens with keyboard focus on the first item
  - Evidence (machine): open the homepage, click the trigger, inspect focus → `document.activeElement` is the first menu item · UNMET looks like: focus stays on the trigger or lands elsewhere
```

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

## Ticket Sync

AC must be synced to the ticket under `## Acceptance Criteria` at the bottom of the description. Winston syncs automatically after plan mode. Clove and Briar sync whenever AC changes. Nora can sync on demand.

**Strip-to-tracker rule:** when syncing, strip the `**AC-N**` ID prefix and the Evidence sub-bullets — sync behavioral criterion text only. IDs and Evidence sub-bullets live in the plan for the verifier; the ticket AC is stakeholder-facing and doesn't need either.
