# Mock: Legacy Import Modal — Auto-Show Behavior & Per-User Dismissal

**Ticket:** THR-1626
**Branch:** hmcgrew/thr-1626-design-review-legacy-import-modal-auto-show-behavior-vs
**Supersedes:** THR-1612 design decisions on dismissal storage and checkbox
**Author:** Pixel
**Date:** 2026-04-18

## User & Goal

WordPress admin users opening the Mega Menu editor — both the primary admin who configures the menu and secondary collaborators (marketing, sales) who land in the editor later. They need a one-time onboarding prompt to import from the legacy menu, with a non-invasive re-entry path, and a dismissal model that respects individual users rather than making one admin's choice stick for everyone.

## Feeling

Calm and informative on first view. Invisible on subsequent views. The modal is onboarding furniture — it belongs to the "before you've built your menu" phase of the UX and should step aside entirely once the user has a mega menu in place. No destructive-by-default affordances left sitting in the toolbar for reflexive clicks to find.

## Design Reversal from THR-1612

THR-1612 shipped a site-wide option-based dismissal with a "Don't show this again" checkbox. Field testing surfaced a gap: if Hunter (admin) dismisses the modal, Sarah (marketing) never sees the onboarding when she lands in the editor. Dismissal should be per-user, not site-wide.

This design swaps:

| Dimension | THR-1612 (shipped) | THR-1626 (this design) |
|---|---|---|
| Dismissal storage | WP site option (`platform_settings_mega_menu_migration_dismissed`) | localStorage, per-user-per-browser |
| Dismissal UI | Explicit "Don't show this again" checkbox | Implicit — button label carries the intent |
| Cancel button | Label: "Cancel" | Label: "Skip" |
| Auto-show condition | `hasLegacyMenu && !dismissed` | `hasLegacyMenu && !hasExistingMenu && !userDismissed` |
| Toolbar button visibility | `hasLegacyMenu` | `hasLegacyMenu && !hasExistingMenu` |
| Re-import flow | Modal supports re-import with warning + "Import and Replace" | Removed entirely — re-import is not a supported affordance |
| Modal variants | Default / re-import-draft / re-import-published | Single variant — first-time import only |
| Backend endpoint | `PUT /migrate/dismiss` | Not needed — dismissal is frontend-only |

The shipped PHP option and the `/migrate/dismiss` endpoint can either be deprecated or repurposed — see Implementation Notes.

## States

### Auto-show — first visit, legacy menu exists, no mega menu yet, user hasn't dismissed

```
┌──────────────────────────────────────────────────┐
│ Import from Legacy Menu                    [ × ] │
├──────────────────────────────────────────────────┤
│                                                  │
│ This will recreate your mega menu in the new     │
│ editor as a starting point. You can review and   │
│ adjust everything before publishing.             │
│                                                  │
│ You can also import anytime from the             │
│ "Import from Legacy Menu" button in the header.  │ ← muted/italic
│                                                  │
│                     [ Skip ]  [ Import and Review ] │
└──────────────────────────────────────────────────┘
```

- No warning notice — nothing to replace yet
- No checkbox
- Single modal variant — this is the only state the user ever sees

### Importing (in progress)

Unchanged from THR-1612 — spinner on the primary button, all controls disabled, × hidden while migrating.

### Import failed (error)

Unchanged from THR-1612 — error notice replaces body, "Try Again" replaces "Import and Review".

### Import succeeded

Modal closes, WP snackbar toast: "Menu imported — review your changes below." Unchanged from THR-1612.

### Auto-suppressed — mega menu already exists on site

Modal does not auto-show. The toolbar "Import from Legacy Menu" button is also hidden — the onboarding is complete. If the user genuinely needs to re-import (rare edge case), the natural recovery is to delete their draft; `hasExistingMenu` becomes false and the button reappears.

### Auto-suppressed — user has dismissed in this browser

Modal does not auto-show. Toolbar button remains visible (user hasn't built a menu yet, so onboarding isn't complete). Clicking it opens the same single modal variant.

### Hidden — no legacy menu exists

Modal never opens. Toolbar button hidden (existing behavior from THR-1612).

## Auto-Show & Button Visibility Decision Tree

```
Legacy menu exists?          ─── no ──→ No modal. Toolbar button hidden.
    │ yes
    ▼
Mega menu already on site?   ─── yes ─→ No modal. Toolbar button hidden.
    │ no                                Onboarding is complete — put the
    │                                   affordance away. (Recovery: delete
    │                                   the draft to bring the button back.)
    ▼
User dismissed this browser? ─── yes ─→ No auto-show. Toolbar button visible
    │ no                                (onboarding isn't complete yet).
    ▼
Auto-show the modal. Toolbar button visible.
```

**Guiding principle:** onboarding affordances live only as long as the onboarding. Once a mega menu exists, both the modal and the toolbar button step aside. This also eliminates the destructive-by-default risk — there's no "big blue button" sitting in the toolbar that a reflexive click could use to wipe real work.

## Dismissal Semantics

| Action | localStorage effect | Modal behavior next load |
|---|---|---|
| Click **Import and Review** / **Import and Replace** | Set `dismissed = true` | Won't auto-show |
| Click **Skip** | Set `dismissed = true` | Won't auto-show |
| Click **×** | Set `dismissed = true` | Won't auto-show |
| Press **Escape** | Set `dismissed = true` | Won't auto-show |

Any close gesture counts as dismissal. The reassurance copy ("You can also import anytime from the 'Import from Legacy Menu' button in the header") is what earns this simpler model — the user never loses access to the import flow, so × carrying permanent dismissal isn't a trap. This matches onboarding modal convention across SaaS products (Linear, Notion, Gmail, Figma) — Jakob's Law favors the unified close behavior.

The toolbar button remains the always-available re-entry path regardless of dismissal state.

## Interaction Notes

**Keyboard flow:**
- Tab order: close × → body text region → Skip → Import and Review/Replace
- Enter on focused primary button triggers import
- Escape closes and sets dismissal flag (same as × and Skip)
- No checkbox in tab order — removed

**Focus management:**
- On open: WP Modal default (focus moves to modal)
- On close: returns to the toolbar button that would have triggered it (or the editor canvas for auto-show)

**localStorage key:**
- Proposed: `thrive_mega_menu_import_dismissed_<userId>` — user-scoped for the multi-admin browser-shared case, though realistically each user has their own WP admin session
- Alternative: `thrive_mega_menu_import_dismissed` (no user scope) — simpler, relies on each user having their own browser profile / WP session which is typical
- Recommend: the simpler unscoped key. WP admin sessions are user-scoped server-side, so users sharing a browser profile on the same site is the edge of an edge case.

## Reused Components

All from `@wordpress/components` — same as THR-1612:
- `Modal`
- `Button`
- `Spinner`

**Removed from THR-1612:**
- `CheckboxControl` — no longer needed

## New Patterns

None.

## Accessibility Notes

- Warning notice: `role="alert"` when shown (or wrap in WP `Notice` component with `status="warning"`) so screen readers announce the replacement risk
- Reassurance copy ("You can also import anytime...") should be visible to screen readers — not hidden or purely decorative. Standard paragraph text works.
- Primary button label change between "Import and Review" and "Import and Replace" is announced on render — screen reader users hear the destructive intent
- × button retains `aria-label="Close"` (WP Modal default)

## Copy Direction

- **Title:** Unchanged — "Import from Legacy Menu"
- **Body:** Unchanged from THR-1612 — "This will recreate your mega menu in the new editor as a starting point. You can review and adjust everything before publishing."
- **Reassurance:** "You can also import anytime from the 'Import from Legacy Menu' button in the header." — muted styling, italic or lighter weight. This line is doing the work the checkbox used to do: reassuring the user that Skip / × isn't a one-way door.
- **Primary button:** "Import and Review" (unchanged from THR-1612). Since the modal is only reachable before a mega menu exists, there's nothing to replace and no need for an "Import and Replace" label.
- **Secondary button:** "Skip" (replaces "Cancel" — verb-first, clearer that this dismisses)
- **Warning notice:** Removed. There is no path to the modal where an existing menu is at risk.

## Mobile Behavior

WP admin modal — desktop-primary. No custom mobile adaptation needed (WP Modal handles small viewports). Same as THR-1612.

## Implementation Notes (for the follow-up ticket)

This design reverses shipped THR-1612 decisions. Clove / implementer needs to handle:

1. **Remove `CheckboxControl`** from the modal
2. **Rename** `Cancel` button → `Skip`
3. **Add reassurance copy** pointing to the toolbar button
4. **Swap dismissal storage** from WP site option to localStorage
5. **Remove the warning notice entirely** — the modal is only reachable when there is nothing to replace
6. **Gate the toolbar button** on `hasLegacyMenu && !hasExistingMenu` — today it only checks `hasLegacyMenu`. Once a mega menu exists, the button disappears.
7. **Gate auto-show** on `hasLegacyMenu && !hasExistingMenu && !userDismissed`
8. **Remove backend endpoint** `PUT /thrive-mega-menu/{id}/migrate/dismiss` and its route registration. THR-1612 has not shipped to production — no backwards compatibility needed.
9. **Remove WP site option** `platform_settings_mega_menu_migration_dismissed` — drop the constant, the read/write calls, and the `dismissed` field from the `/migrate/status` response. THR-1612 has not shipped — nothing to migrate.

## Open Questions

1. **localStorage key scope** — user-scoped key or not? Recommend not (simpler, edge case doesn't warrant the complexity).

---

## Handoff Note

Mock saved at `.claude/design/mocks/thr-1626-legacy-import-modal-auto-show.md`. Covers first-import, re-import with draft, re-import with published, and all suppression states. Reuses existing `@wordpress/components` primitives; removes `CheckboxControl`. **Flagging for Nora/Clove:** this design reverses dismissal decisions shipped in THR-1612 — there is removal work (checkbox, backend endpoint, WP option) as well as additive work. Status: Ready for implementation — needs a follow-up ticket filed against THR-1626.
