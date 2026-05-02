# Mock: Mega Menu Migration Modal — Dismissal UX Redesign

**Ticket:** THR-1612
**Branch:** hmcgrew/thr-1612-mega-menu-migration-modal-reconsider-one-time-dismissal-ux
**Author:** Pixel
**Date:** 2026-04-17

## User & Goal

WordPress admin users opening the mega menu editor for the first time (or returning after a reset). They need to understand what legacy migration does, decide whether to proceed, and optionally suppress the modal for future visits — with a way to get it back later.

## Feeling

This should feel *calm and clear* — like a helpful note from the system, not a warning klaxon. The user should feel informed and in control: "I understand what this does, I can choose to proceed or not, and I can decide whether I want to see this again." The destructive-adjacent warning (replacing existing work) should feel *sobering but not alarming*.

## States

### Default — no existing draft/published menu

```
┌──────────────────────────────────────────────────┐
│  Import from Legacy Menu                    [ × ]│
├──────────────────────────────────────────────────┤
│                                                  │
│  This will recreate your mega menu in the new    │
│  editor as a starting point. You can review and  │
│  adjust everything before publishing.            │
│                                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │  □ Don't show this again                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│                   [ Cancel ]  [ Import and Review ]│
└──────────────────────────────────────────────────┘
```

- No warning notice — nothing to overwrite
- Checkbox still present — user can suppress regardless of state

### Default — has existing draft or published menu

```
┌──────────────────────────────────────────────────┐
│  Import from Legacy Menu                    [ × ]│
├──────────────────────────────────────────────────┤
│                                                  │
│  This will recreate your mega menu in the new    │
│  editor as a starting point. You can review and  │
│  adjust everything before publishing.            │
│                                                  │
│  ┌─ ⚠ ─────────────────────────────────────────┐ │
│  │  This will replace your existing draft or    │ │  ← amber bg, left border
│  │  published menu.                             │ │     (WP admin notice-warning style)
│  └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │  □ Don't show this again                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│                   [ Cancel ]  [ Import and Review ]│
└──────────────────────────────────────────────────┘
```

- Warning in a styled notice box (amber/yellow bg, 4px left border in warning color)
- Visually separated from body text via Gestalt common region

### Migrating (in progress)

```
┌──────────────────────────────────────────────────┐
│  Import from Legacy Menu                         │  ← X hidden (isDismissible: false)
├──────────────────────────────────────────────────┤
│                                                  │
│  This will recreate your mega menu in the new    │
│  editor as a starting point. You can review and  │
│  adjust everything before publishing.            │
│                                                  │
│  ┌─ ⚠ ─────────────────────────────────────────┐ │
│  │  This will replace your existing draft or    │ │
│  │  published menu.                             │ │
│  └──────────────────────────────────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │  □ Don't show this again                     │ │  ← disabled while migrating
│  └──────────────────────────────────────────────┘ │
│                                                  │
│           [ Cancel ]  [ ◐ Importing... ]         │  ← spinner + text, both btns disabled
└──────────────────────────────────────────────────┘
```

- All interactive elements disabled during migration
- Checkbox disabled (can't change preference mid-action)
- X button hidden (existing `isDismissible={!isMigrating}` behavior)

### Migration failed (error)

```
┌──────────────────────────────────────────────────┐
│  Import from Legacy Menu                    [ × ]│
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌─ ✕ ─────────────────────────────────────────┐ │
│  │  The import couldn't be completed. Your      │ │  ← red/error bg, left border
│  │  existing menu was not changed.              │ │     (WP admin notice-error style)
│  └──────────────────────────────────────────────┘ │
│                                                  │
│                     [ Close ]    [ Try Again ]    │  ← "Close" replaces "Cancel"
└──────────────────────────────────────────────────┘
```

- Error replaces body text and warning — user doesn't need the explanation anymore
- Reassurance: "Your existing menu was not changed" (reduces anxiety)
- "Close" instead of "Cancel" — nothing to cancel, the action already failed
- "Try Again" as primary — the most likely next step
- Checkbox hidden in error state — not relevant to the decision at hand
- Peak-End Rule: this is a memorable moment. Make it feel *handled*, not *broken*.

### Migration succeeded

No in-modal success state. The modal closes and the editor shows the imported result. Confirmation via a **toast/snackbar** (using `wp.data.dispatch('core/notices').createSuccessNotice()`):

> "Menu imported — review your changes below."

This matches the WP admin pattern for background operation confirmations. The user's attention should go to the imported content, not to a modal telling them it worked.

## Interaction Notes

**Keyboard flow:**
- Tab order: body text (read-only) → checkbox → Cancel → Import and Review
- Enter on focused "Import and Review" triggers migration
- Escape closes modal (when not migrating) — existing WP Modal behavior
- Checkbox toggleable with Space — standard CheckboxControl behavior

**Focus management:**
- On open: focus moves to the modal (WP Modal default)
- On close: focus returns to the triggering element (WP Modal default)
- On error state: focus moves to the error notice for screen reader announcement

**Checkbox persistence behavior:**
- Checking the box + clicking Cancel: persist the preference (user explicitly chose to suppress)
- Checking the box + clicking Import and Review: persist the preference
- Checking the box + clicking X: persist the preference
- Unchecking the box: remove the preference (modal will auto-open again next time conditions are met)
- Preference is saved on modal close/action, not on checkbox toggle

## Reused Components

All from `@wordpress/components` — no new components:
- `Modal` — container (already in use)
- `Button` — actions (already in use)
- `Spinner` — loading state (already in use)
- `CheckboxControl` — "Don't show this again" (new addition from existing WP library)
- `wp.data.dispatch('core/notices')` — success toast (existing WP pattern)

## New Patterns

None. This is a restitch of existing WP admin patterns.

## Accessibility Notes

- Warning notice: use `role="alert"` or wrap in a Notice component so screen readers announce it
- Error state: move focus to error notice on transition, use `role="alert"`
- Checkbox: standard `CheckboxControl` provides label association and keyboard support
- All interactive elements have visible focus indicators (WP component defaults)
- Color is not the sole indicator for warning/error states — icon prefix (⚠/✕) provides a secondary signal

## Copy Direction

- **Title:** Keep "Import from Legacy Menu" — it's accurate and scannable
- **Body:** Shorter than current. Tone: informative, not defensive. ~20 words max. Focus on "starting point" and "review before publishing."
- **Warning:** Direct and short. Tone: factual, not alarming. "This will replace" not "Warning: this action will..."
- **Checkbox:** "Don't show this again" — standard suppression language. Not "Don't remind me" (too casual) or "Never show this dialog" (too formal).
- **Error:** Reassuring. "Couldn't be completed" (not "failed"). "Your existing menu was not changed" (the thing they're worried about).
- **Success toast:** Brief, actionable. Points attention to what to do next.
- **Button labels:** Drop the → arrow from "Import and Review" — no navigation occurs. "Try Again" in error state, not "Retry" (more human).

## Mobile Behavior

This is a WordPress admin modal — desktop-primary. WP Modal handles responsive behavior (full-width on narrow viewports). No custom mobile adaptation needed. The `size="medium"` prop keeps it comfortable at standard admin widths.

## Open Questions

1. **Re-surface path:** How does a user who checked "Don't show this again" get the modal back? Recommend: keep the existing "Import from Legacy Menu" button in the Header visible when `hasLegacyMenu` is true, regardless of dismissal preference. The button is the manual trigger; the checkbox only suppresses the *auto-open*. This means the button always works as the re-surface path with zero new UI.
2. **Preference key name:** Recommend `platform_settings_mega_menu_migration_modal_dismissed` as a WP site option (not user meta) — matches `platform_settings_mega_menu_*` convention. But should this be per-user (user meta) or site-wide (option)? If per-user: one admin dismissing doesn't affect another. If site-wide: once anyone dismisses, it's dismissed for all. **Recommendation: site option** — there's typically one admin managing the mega menu, and if multiple admins are involved they likely share context.
3. **Should the checkbox appear when there's no legacy menu?** If `hasLegacyMenu` is false, the modal doesn't auto-open at all — so the checkbox is moot. The modal would only be shown via manual trigger in that case. Recommend: still show the checkbox for consistency, but it's a low-priority edge case.
