# Demand Elegance

## Purpose

For non-trivial changes, pause and ask "is there a more elegant way?" If a fix feels hacky, step back and ask: "Knowing everything I know now, what's the clean solution?" Challenge your own work before presenting it. The flip side: skip this for simple, obvious fixes — elegance is a tool, not a tax.

**Why:** the first working version of a non-trivial change is rarely the clean one, and the moment to find the clean version is before it ships — once it's in the tree, the hacky shape becomes the pattern the next change copies. The balance matters as much as the demand: over-engineering a one-line config change is its own failure, spending elegance budget where there's nothing to gain.

**How to apply:**

- For non-trivial changes, pause before presenting and ask whether a cleaner solution exists. If the fix feels hacky, it probably is — step back and find the clean version.
- Skip the pause for simple, obvious fixes. A one-line config change doesn't earn an elegance review.
- The test for which side you're on: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits don't.
