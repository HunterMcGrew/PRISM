---
paths:
  - ".prism/plans/**/*.md"
  - ".prism/design/mocks/**/*.md"
---

# Implementation Task Detail

When authoring artifacts that drive implementation — Winston's `## Implementation Tasks` in a branch plan, or Pixel's mode 2 mock specs in `.prism/design/mocks/<slug>.md` — the bar is: any LLM at any effort level should be able to execute the artifact without making judgment calls about what file to touch, what specific change to make, or how to verify it worked. **Front-load every decision; do not front-load every keystroke.**

**Why:** Cross-LLM portability is one of PRISM's core promises. Sonnet, low-effort Opus, ChatGPT, Cursor — they all hit ambiguity differently, but they all hit it. A plan that leaves decisions to the implementer produces divergent outputs across runs and across models. Codifying the bar means the next planner doesn't have to reinvent the pattern, and the next reviewer has a concrete standard to flag against.

## When this rule applies

Two artifact classes are in scope:

- **`## Implementation Tasks` in branch plans** — written by Winston in plan mode. Each task line is a unit of work Clove (or another implementing persona) executes against.
- **Mode 2 saved mock specs** — written by Pixel at `.prism/design/mocks/<slug>.md`. The spec is the implementation guide for the design portion of the work; Winston reads it when writing tasks.

Two artifact classes are explicitly **exempt**:

- **Mode 1 inline sketches** — Pixel's conversational riffs in chat, including mid-ticket gap-fill. These are quick answers by design; holding them to the spec-class bar defeats their purpose.
- **Mode 3 HTML mockups** — Pixel's visual preview artifacts. These are renders, not specs; the detail goes in the paired mode 2 markdown spec, not in the HTML.

## The bar

A **decision** belongs in the artifact. A **keystroke** belongs to the implementer with the code in front of them.

| Counts as a decision (front-load) | Counts as a keystroke (leave to implementer) |
| --- | --- |
| Target file path (with line number when stable) | Variable names within new code |
| Specific change — text-to-text replacement, exact insertion point, full new content for new files | Loop construct choice (`for` vs `while` vs `.map`) |
| Verification command (the exact `pnpm` / `git` / build invocation) | Specific line counts in new code |
| Sequence — which task must finish before this one starts | Internal helper function names |
| External shape — function signatures crossing boundaries, ARIA roles, exact Tailwind tokens | Comment phrasing inside a function |

When you can't tell whether something is a decision or a keystroke, ask: "If two LLMs both executed this task perfectly, would they produce identical output?" If they'd diverge on this dimension, it's a decision — front-load it.

## Cite, don't restate, when overlapping existing framing

When the artifact restates a concept defined elsewhere — a doctrine, a template, an established enumeration — cite the source rather than re-enumerate it. Restated content drifts the moment either side moves; cited content can't.

**Why:** Same divergence failure mode the bar already addresses, just upstream. A rule or spec that re-enumerates "the five states" instead of citing Pixel's doctrine at [prism-design § States](../skills/prism-design/SKILL.md#states) will eventually disagree with it — and downstream artifacts get generated against whichever version the author read first. This rule's first-pass version shipped that exact bug: the rule enumerated states differently from Pixel's doctrine and the mode 2 template, three docs out of sync on day one. Caught by Eric on PR #3 review; fix re-pointed the rule at Pixel's doctrine.

**How to apply:** When authoring a rule, ADR, architect doc, or skill section that touches a concept owned by another doc, link to the owning doc and quote at most a sentence for context. Don't re-enumerate. If you find yourself writing "the five [things] are: a, b, c, d, e" and another doc already enumerates them, replace the list with `per [doc] § [section]`.

## How to apply — Winston's `## Implementation Tasks`

Each task names:

1. **Target file path** with relative path from repo root (e.g. `.ai-skills/skills/prism-design/shared.md`). Include line numbers when stable; reference section headings when line numbers will drift.
2. **The specific change.** For edits: the exact `old_string` → `new_string` replacement (or describe it precisely enough that Edit tool input writes itself). For new files: full content or a content outline tight enough that the writer doesn't have to invent structure. For deletions: name the lines or sections to delete.
3. **Verification command** when the change has runtime or build implications (`pnpm prism:check`, `pnpm prism:test`, `npx jest --testPathPatterns=...`). When the change is content-only with no build effect, state that explicitly so the implementer doesn't waste time guessing.
4. **Sequence dependencies** noted inline when applicable — "after task 3", "blocks task 7", "parallel with task 4–6".

The model to study is `.prism/plans/epic-phase-1-foundation.md` tasks 13–19. They name files, line numbers, exact replacements, and verification — they read like the artifact this rule is asking for.

### Example — good

> 13. **Drop the stale count claim from `.prism/rules/writing-voice.md:45`** (and the mirrored copy at `templates/claude/rules/writing-voice.md:45`). Replace `"five dangling references across..."` with `"the dangling references across..."` — no count, just the noun, per writing-voice § Count rules, not numbers. Verify with `pnpm prism:check`.

### Example — bad (under-specified version of the same)

> 13. Update writing-voice.md to remove the count claim.

The bad version leaves: which file, which surface, which line, what specific text, what replacement phrasing, what verification? An LLM executing this would have to read the rule, locate the count claim, choose between several valid phrasings, and decide whether both surfaces need the edit. That's four judgment calls the planner could have eliminated.

## How to apply — Pixel's mode 2 mock specs

A spec at this bar gives Winston enough fidelity to write `## Implementation Tasks` against it without round-tripping back to Pixel for clarification. Required elements:

1. **Measurable units in every wireframe.** Use Tailwind tokens (`text-lg`, `p-4`, `gap-2`, `max-w-md`) when they fit; explicit px or rem when they don't. Spacing, typography scale, color tokens, layout dimensions — all named.
2. **Cited principles for each interaction or layout decision.** Name the framework: Hick's Law, Fitts's Law, Miller's Law, Nielsen heuristic by number (Nielsen #4, Nielsen #8), Gestalt principle by name (proximity, common region). The intuition explains why the design feels right; the citation makes it auditable.
3. **All five states with annotated wireframes.** Per Pixel's five-state doctrine ([prism-design § States](../skills/prism-design/SKILL.md#states)). Each state gets its own wireframe with measurable units and cited principles. Skipping a state in the spec means Clove will guess.
4. **Copy direction precise enough to write final strings without judgment.** Not the final strings — the direction. "The delete confirmation should feel like a pause, not a warning. Use 'Remove link' not 'Delete link forever' — it's reversible." Final strings can be written from this direction without needing a second design pass.
5. **Keyboard flow, focus order, ARIA roles named.** Tab order through interactive elements. Focus trap behavior on dialogs. ARIA roles (`role="dialog"`, `aria-labelledby`, `aria-describedby`). Escape key behavior. Where focus moves on dismiss.
6. **Reused components named with file paths.** `frontend/components/Button.tsx`, `backend/plugins/.../blocks/<name>/`. Include server/client classification — RSC default; mark `'use client'` requirement explicitly when local state, hooks, or browser APIs are involved.
7. **Architectural inputs for Winston** — a dedicated section covering data flow (where state lives, where it's fetched), server/client component classification, and any architectural concerns Pixel surfaced (new shared component candidate, coupling risk, design pattern question).

### Example — good

> ### Default state
> Container: `max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm` — narrow modal width keeps Hick's Law in check (≤5 visible primary options); `shadow-sm` provides Gestalt figure-ground separation from the page background.
> Header: `text-lg font-semibold mb-4` — h2-equivalent weight, clear hierarchy per Nielsen #4 (consistency and standards).
> Primary CTA: `bg-primary text-white px-4 py-2 rounded` placed bottom-right of the dialog (Fitts's resting position for keyboard-driven dialog dismissal — primary action lands where the eye and pointer rest).
> ARIA: `role="dialog"`, `aria-labelledby` pointing at the header, `aria-describedby` pointing at the body. Focus traps to the dialog on open; Escape dismisses and returns focus to the trigger element.
> Reused components: `frontend/components/Modal.tsx` (RSC), `frontend/components/Button.tsx` (RSC).

### Example — bad (under-specified version of the same)

> ### Default state
> Modal with header, body, and a primary action button at the bottom. Should look clean and reuse existing modal patterns.

The bad version leaves: which Tailwind classes? Which principles justify which choices? Which existing modal component? What ARIA? What focus management? What Escape behavior? An LLM building from this would invent each of those — and two LLMs would invent different things.

## Who runs this rule

- **Winston** (`prism-architect`) — applies the bar when authoring `## Implementation Tasks` in plan mode. The bar is a baseline for every task Winston writes.
- **Pixel** (`prism-design`) — applies the bar when authoring mode 2 saved mock specs. Mode 1 inline sketches and mode 3 HTML mocks are exempt.
- **Briar** (`prism-code-review-self`) and **Eric** (`prism-code-review-pr`) — flag tasks or specs that fail the bar during self-review and PR review.

## Severity

Tasks or mock specs that fail the bar are at minimum **Major** in self-review and PR review. The cost compounds — every implementer who reads an under-specified task makes a judgment call that may diverge from the planner's intent, and the divergence shows up later as rework.
