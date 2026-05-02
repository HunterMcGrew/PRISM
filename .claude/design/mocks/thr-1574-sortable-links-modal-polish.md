# Mock: SortableLinksModal Polish — Empty State, Dirty Indicator, Undo Bar

**Ticket:** THR-1574
**Branch:** hmcgrew/thr-1574-sortablelinksmodal-unsaved-changes-persist-after-closing
**Author:** Pixel
**Date:** 2026-04-13

## User & Goal

WordPress admin users managing navigation links and featured links in the mega menu block editor. They open the SortableLinksModal to add, edit, reorder, and remove links. These three changes improve the feedback loop: the empty state guides them to start, the dirty indicator tells them where they stand, and the undo bar recovers accidental deletes without nuking the whole session.

## Feeling

These should feel like small courtesies — the modal noticing what you need before you have to ask. The empty state should feel like a friendly nudge, not a dead end. The dirty indicator should feel like a quiet status light, not an alarm. The undo bar should feel like a safety net you barely notice until you need it.

---

## Change A: Empty State Copy

### Current

```
┌────────────────────────────────────────┐
│ Manage Links                      [ × ]│
├────────────────────────────────────────┤
│                         [ + Add Link ] │
├────────────────────────────────────────┤
│                                        │
│          No links added yet.           │
│                                        │
├────────────────────────────────────────┤
│              [ Cancel ]    [ Save ]    │
└────────────────────────────────────────┘
```

### Updated

```
┌────────────────────────────────────────┐
│ Manage Links                      [ × ]│
├────────────────────────────────────────┤
│                         [ + Add Link ] │
├────────────────────────────────────────┤
│                                        │
│    No links yet — use Add Link above   │  ← points toward the action
│              to get started.           │
│                                        │
├────────────────────────────────────────┤
│              [ Cancel ]    [ Save ]    │
└────────────────────────────────────────┘
```

### Implementation

**File:** `SortableLinksModal.tsx:190`

Change the empty state `<p>` text from:
```
No links added yet.
```
to:
```
No links yet — use Add Link above to get started.
```

Keep the existing classes: `py-8 text-center text-gray-500`.

### Principle

Nielsen #6 (recognition over recall) — the user shouldn't have to scan the modal to find the action. The empty state tells them exactly where to go.

---

## Change D: Dirty Indicator + Always-Block Overlay Click

### Default state (no unsaved changes)

```
┌────────────────────────────────────────┐
│ Manage Links                      [ × ]│
├────────────────────────────────────────┤
│                         [ + Add Link ] │
├────────────────────────────────────────┤
│  ⋮⋮  Home                    [ ✎ ] [🗑]│
│  ⋮⋮  About                   [ ✎ ] [🗑]│
│  ⋮⋮  Contact                 [ ✎ ] [🗑]│
├────────────────────────────────────────┤
│                    [ Cancel ]  [ Save ]│
└────────────────────────────────────────┘
```

Footer shows Cancel and Save only. No indicator.

### Dirty state (unsaved changes exist)

```
┌────────────────────────────────────────┐
│ Manage Links                      [ × ]│
├────────────────────────────────────────┤
│                         [ + Add Link ] │
├────────────────────────────────────────┤
│  ⋮⋮  Home                    [ ✎ ] [🗑]│
│  ⋮⋮  New Link..              [ ✎ ] [🗑]│
│  ⋮⋮  Contact                 [ ✎ ] [🗑]│
├────────────────────────────────────────┤
│  ● Unsaved changes  [ Cancel ] [ Save ]│
└────────────────────────────────────────┘
```

The `●` is a small colored dot. Use `text-amber-600` for the dot and `text-gray-500` for the text — amber signals "attention, not danger" without competing with the primary Save button.

### Implementation

**File:** `link-modal-parts.tsx` — `ModalFooter`

1. Add `hasUnsavedChanges: boolean` to `ModalFooterProps`.

2. Update the footer layout to include the indicator on the left:

```
┌─────────────────────────────────────────────────┐
│  [indicator left-aligned]     [buttons right]   │
└─────────────────────────────────────────────────┘
```

Use `flex justify-between items-center` on the container. The indicator is a `<span>` on the left, buttons are a `<div>` on the right.

3. When `hasUnsavedChanges` is false, the indicator is not rendered. The buttons stay right-aligned via `justify-between` with nothing on the left (or use `ml-auto` on the button group as fallback).

4. Indicator markup:
   - `●` character (U+25CF) or a small `<span>` with `w-2 h-2 rounded-full bg-amber-500 inline-block`
   - Text: "Unsaved changes" in `text-sm text-gray-500`
   - Container: `flex items-center gap-2`

**File:** `SortableLinksModal.tsx`

5. Change `shouldCloseOnClickOutside` from `{!hasUnsavedChanges}` to `{false}` — always block overlay click. Cancel, X, and Escape are the deliberate exit paths.

6. Pass `hasUnsavedChanges` to `ModalFooter`.

### Accessibility

- The indicator is purely visual reinforcement — the Cancel and Save buttons already communicate the available actions.
- Do not use `aria-live` on the indicator — it changes on every keystroke in an edit form, which would spam screen readers. The state is already communicated through the presence of the Save button.

### Principle

Nielsen #1 (visibility of system status) — the user always knows whether they have uncommitted work. The dirty indicator is proactive: it preempts the "why didn't the modal close?" confusion by making the state visible before the user tries to dismiss. Always-blocking overlay click removes the ambiguity entirely — form-commit modals (Notion, Linear) close via deliberate action, not background click.

---

## Change E: Inline Undo Bar After Trash

### Default state (nothing recently removed)

No undo bar visible. List renders normally.

### After removing a link

```
┌────────────────────────────────────────┐
│ Manage Links                      [ × ]│
├────────────────────────────────────────┤
│                         [ + Add Link ] │
├────────────────────────────────────────┤
│  ⋮⋮  Home                    [ ✎ ] [🗑]│
│  ⋮⋮  Contact                 [ ✎ ] [🗑]│
│                                        │
│  "About" removed.              [ Undo ]│  ← inside the scrollable area
├────────────────────────────────────────┤
│  ● Unsaved changes  [ Cancel ] [ Save ]│
└────────────────────────────────────────┘
```

### After removing the last link (empty + undo)

```
┌────────────────────────────────────────┐
│ Manage Links                      [ × ]│
├────────────────────────────────────────┤
│                         [ + Add Link ] │
├────────────────────────────────────────┤
│                                        │
│    No links yet — use Add Link above   │
│              to get started.           │
│                                        │
│  "Home" removed.               [ Undo ]│
├────────────────────────────────────────┤
│  ● Unsaved changes  [ Cancel ] [ Save ]│
└────────────────────────────────────────┘
```

The undo bar appears below the empty state message. Both are visible — the user can either undo or add a new link.

### State management

**File:** `SortableLinksModal.tsx`

1. Add state:
   ```ts
   const [lastRemoved, setLastRemoved] = useState<{
     link: DragAndDropLink;
     index: number;
   } | null>(null);
   ```

2. Update `handleRemoveLink`:
   - Before filtering, capture the link and its index in the current `workingLinks` array
   - Store in `lastRemoved`
   - Then filter as before

3. Add `handleUndo`:
   - Splice `lastRemoved.link` back into `workingLinks` at `lastRemoved.index` (clamped to current length if the list is now shorter)
   - Clear `lastRemoved`

4. Clear `lastRemoved` on these events:
   - **Undo clicked** — restored, no longer relevant
   - **Another link trashed** — replaced by the new removal (only one undo level)
   - **Save clicked** — committed, working copy is now the source of truth
   - **Cancel / X / Escape** — modal closes, working copy discarded

   Note: do NOT clear on Add Link, edit start, Done, or reorder — the undo should persist through normal editing actions so the user doesn't lose their safety net mid-flow.

### Undo bar component

**File:** `link-modal-parts.tsx`

New subcomponent: `UndoBar`

```ts
type UndoBarProps = {
  linkLabel: string;
  onUndo: () => void;
};
```

Layout:
- Full-width bar with `flex items-center justify-between`
- Left side: `"About" removed.` — link label in quotes, then "removed." in `text-sm text-gray-600`
- Right side: `[ Undo ]` — `variant="tertiary"`, `size="small"`
- Container: `px-3 py-2 bg-gray-50 border border-gray-200 rounded`
- Placed inside the scrollable area, below the list items (or below the empty state message)

### Interaction flow

1. User clicks 🗑 on "About" → "About" disappears from list → undo bar appears: `"About" removed. [Undo]`
2. User clicks Undo → "About" reappears at its original position → undo bar disappears
3. User clicks 🗑 on "Contact" → previous undo (if any) is replaced → `"Contact" removed. [Undo]`
4. User clicks Save → undo bar cleared (changes committed)
5. User clicks Cancel → undo bar cleared (working copy discarded)

### Keyboard behavior

- After trash removes a link, focus should move to the Undo button — the link row the user was interacting with no longer exists, and Undo is the most likely next action.
- After Undo restores a link, focus should move to the restored link's edit button (use the existing `pendingFocusLinkId` pattern).

### Edge cases

- **Trashing the link currently being edited:** Current behavior already clears `editingId` and collapses the edit form. The undo bar should still appear. If the user undoes, the link reappears in display mode (not edit mode) — re-entering edit is a separate action.
- **Trashing, then undoing, then trashing the same link again:** Works naturally — each trash stores a fresh snapshot.
- **Undoing after a reorder:** The link is restored at its original index position from before it was removed. If the list was reordered in between, the restored position may not match the new visual order exactly — this is acceptable. The index is clamped to the current list length to prevent out-of-bounds insertion.

### Accessibility

- Undo button gets `aria-label="Undo removing {linkLabel}"` for screen reader context.
- When the undo bar appears, the focus move to the Undo button serves as the announcement mechanism — the screen reader will read the button label.
- The bar itself does not need `aria-live` since focus management handles the announcement.

### Principle

Nielsen #3 (user control and freedom) — always support undo. The working-copy pattern already provides modal-level undo via Cancel, but per-link undo means the user doesn't have to throw away a whole editing session to recover one accidental delete. Peak-End Rule: accidental deletes are emotional low-points — a visible, instant undo transforms that moment from frustration to "oh good, that was easy."

---

## States Summary

| State | What's visible |
|-------|---------------|
| Empty, clean | Empty state message + Add Link. No indicator. |
| Empty, dirty (links were removed) | Empty state message + undo bar + Add Link. Dirty indicator in footer. |
| Links present, clean | Link list + Add Link. No indicator. |
| Links present, dirty | Link list + Add Link. Dirty indicator in footer. |
| Links present, dirty, link just trashed | Link list + undo bar + Add Link. Dirty indicator in footer. |
| Editing a link, dirty | Link list with edit form expanded. Dirty indicator in footer. Undo bar persists if present. |

---

## Reused components

- `Button` from `@wordpress/components` — Undo button (tertiary, small), consistent with existing Cancel/Done
- Existing `ModalFooter` in `link-modal-parts.tsx` — extended with `hasUnsavedChanges` prop
- Existing `pendingFocusLinkId` pattern — reused for focus-after-undo

## New patterns

- `UndoBar` — new subcomponent in `link-modal-parts.tsx`. Justified because no existing component handles inline undo messaging inside a scrollable list. Small, self-contained, single-purpose.
- `lastRemoved` state — new state in `SortableLinksModal`. One-level undo stack scoped to the modal's working copy.

## Accessibility notes

- Undo button: `aria-label="Undo removing {linkLabel}"`
- Focus after trash: moves to Undo button
- Focus after undo: moves to restored link's edit button via `pendingFocusLinkId`
- Dirty indicator: visual only, no `aria-live` (avoids spamming screen readers on every edit keystroke)
- All new interactive elements are keyboard-accessible via existing Tab flow

## Copy direction

- Empty state: friendly, directive, brief. "No links yet — use Add Link above to get started." Not apologetic, not robotic.
- Dirty indicator: neutral status language. "Unsaved changes" — no exclamation, no urgency. A status light, not an alarm.
- Undo bar: factual + action. `"{label}" removed. [Undo]` — past tense confirms the action happened, Undo offers the recovery. No "Are you sure?" — the undo IS the safety net.

## Mobile behavior

N/A — this is WordPress block editor UI, desktop-primary. The modal already uses `className="w-full md:w-1/2"` for responsive width.

## Open questions

None — all three changes are scoped and ready to implement.
