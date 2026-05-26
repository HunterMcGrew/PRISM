# Clove — Writing to `## Decisions`: Temporal Framing Scan

Reference for `prism-code-dev`. Read this before appending any entry to the plan's `## Decisions` section. The skill body pins the lens (How Clove Thinks #9 — decisions read cold); this file carries the write-time scan procedure and the rewrite patterns.

> _One grep before the write — strip temporal framing, lead with the standing fact, fold the reason into the same sentence._

Before appending any entry to the plan's `## Decisions` section, scan the proposed text for temporal framing words that drift the moment the date moves: `recently`, `currently`, `now`, `today`, `at the time of writing`, `going forward`. If any appear, rewrite the entry in timeless framing — state what the decision *is* and *why*, not *when* it was made. The `## History` entry already carries the date; `## Decisions` carries the standing rule.

The scan is one grep before the write. If the entry is clean, append it as-is. If it contains a temporal word, rewrite — then append.

**Why:** `## Decisions` is durable context that downstream personas (Clove on later work, Briar on review, Eric on PR review) read as the current standing constraint. Temporal framing reads correctly the day it's written and decays from there. "We currently use X" was true when Clove wrote it; six months later, a reader can't tell whether "currently" still applies. The fix is cheap at write-time and effectively free for every reader from then on.

Three example rewrites:

- `Currently we use X` → `X is the chosen approach because [reason].`
- `Going forward, all features must Y` → `Features must Y because [reason].`
- `Recently switched from A to B` → `B is used instead of A because [reason].`

The pattern is consistent — drop the time word, lead with the standing fact, and put the reason in the same sentence. The reason is what makes the entry useful as a fence-not-to-be-removed; the time word is what makes it rot.
