---
step: greenfield-step-03-mode
---

# Greenfield Step 03 — Fast/coaching path selection

Ask the user how they want to draft.

## Actions

Prompt:

> "**Fast path** (I batch-draft all sections from your brain dump, tag `[ASSUMPTION]` wherever you didn't cover something, and you review at the end) or **coaching path** (we build each PRD section together, I ask PM-style clarifying questions before writing)?"

Capture the choice. Note in step-04-draft's frontmatter internally (Parker reads `mode-internal` from PRD body content; no frontmatter mutation needed — the next step file branches on the answer captured in chat).

For `hobby` stakes, default to fast path unless the user explicitly picks coaching.
For `launch` stakes, recommend coaching path explicitly: "At launch stakes, coaching path catches more gaps. Pick fast only if your brain dump is already PM-strong."

## Actions (continued)

Update PRD frontmatter: append `greenfield-step-03-mode` to `stepsCompleted`. `lastEdited: <ISO 8601>`.

## Exit condition

Fast/coaching choice captured. Advance to greenfield-step-04-draft.
