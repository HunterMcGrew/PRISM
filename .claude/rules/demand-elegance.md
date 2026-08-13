---
load: always
---

# Demand Elegance

## Purpose

When a change has a design with tradeoffs — more than one shape would work, and the shapes differ in what they cost later — stop before presenting it and ask whether a cleaner solution exists. A mechanical edit does not get this pause.

**Why:** the first working version of a change with real design choices is rarely the clean one, and once it is in the tree the hacky shape becomes the pattern the next change copies. A rule phrased as a blanket license to reshape gets executed broadly rather than as the narrow judgment call it means — thrive PR #2273 measured that cost directly.

**How to apply:**

- The test for whether this rule fires: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits do not.
- When the rule fires and the fix feels hacky, step back and ask what the clean solution is knowing everything you now know. When it does not fire, ship the obvious version.
