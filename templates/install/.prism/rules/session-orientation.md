# Session Orientation

## Purpose

Every persona skill opens a session with the same four-question battery, closes with another four, and checks in briefly whenever the work shifts underneath it in between. Getting this right catches scope drift, silent assumptions, and unproven "done" claims before they compound — on a five-minute fix as much as a multi-hour epic. This rule carries the mechanics once, so every skill body can point here instead of repeating the same paragraphs across the roster.

**Why:** the batteries only protect against drift if every skill runs them the same way — a skill that quietly drops the Ambiguity calibration clause, or forgets to persist the opening Bounds for the closing battery to diff against, loses the guarantee without anyone noticing. Centralizing the mechanic here means a wording fix lands once, not in however many skill bodies have already drifted from each other.

**How to apply:** run the Opening Orientation Battery at session start, persist it per Battery Persistence, run the Closing Re-Orientation Battery before reporting back, re-anchor at your skill's own event boundaries, and keep a lifecycle list near the top of your skill body. The sections below carry the exact mechanics for each.

## Opening Orientation Battery

Run this battery once, immediately after startup completes and before any of the skill's core work begins. Answer all four questions in sequence, inline in the response, so the scope and intent are clear before the first edit.

1. **Intent** — in one sentence, what is the plan/user actually asking for (the outcome, not the literal words)?
2. **Ambiguity** — what is unclear, under-specified, or readable two ways? For each: load-bearing (must resolve before starting) or non-load-bearing (proceed on a documented default)? **Calibration:** there is no user available mid-dispatch — do not stall; for each load-bearing gap pick a defensible default, state the assumption, and proceed. Escalate only by emitting a typed verdict (`needs-replan` / `blocked` / `needs-human`) when a gap genuinely blocks — never by a question into the void.
3. **Bounds** — what does "done" look like, and what must I not touch?
4. **Approach** — what is the smallest correct approach; is there a simpler framing than the obvious one?

## Battery Persistence

The opening battery's answers don't stay in the transcript — they compress to one line appended to the branch plan's `## Sessions` section (see `.prism/rules/branch-plan.md`), in an `open:` clause. The closing battery re-reads that line and diffs the finished work against the opening `Bounds` answer — Closing Q1 (Scope boundary) is that diff. When the closing battery finishes, append its verdict to the same line as a `close:` clause: `scope held` if the work matched the opening Bounds, or `drifted — <why>` if it didn't.

## Closing Re-Orientation Battery

Run this battery once, immediately before declaring the work complete and reporting back. Answer all four questions in sequence, inline in the response.

1. **Scope boundary** — what did I touch; is any of it outside what was named? What did I notice in adjacent work and leave alone? Emit `found-followup-work` or `found-bug` per `.prism/rules/followup-scope.md` § worker-emit pre-filter for anything left alone that warranted it.
2. **Unasked assumptions** — what did the request not specify that my work nonetheless decided? Name each silent decision.
3. **Edge recall** — what boundary inputs (empty, zero, absent, negative, malformed) does my work hit, and did I choose its behavior on purpose?
4. **Verification honesty** — for each thing I claim is done, what is the evidence (a test, a trace, a run)? Where am I asserting without proof?

Append the `close:` verdict to the same `## Sessions` line from the opening battery (see Battery Persistence above) before stopping.

## Mid-flight Re-anchors

Long sessions drift between the opening and closing batteries — a plan gets re-read, a scope-changing fact surfaces, a review comes back with findings. At each such event boundary, emit a one-line re-orientation: restate the current Intent and Bounds in one sentence each, confirm they still hold, and continue. This rule carries the generic trigger — re-anchor at event boundaries — because the specific events that count as a boundary are persona-shaped: a phase transition for a diagnostic skill, a review round for a reviewer, a plan re-read for an implementer. Each skill's own body names its own trigger events.

**Why:** a session that only checks orientation at the two ends can drift for hours in the middle without anyone noticing — the mid-flight re-anchor is cheap insurance against exactly that, and it costs one sentence, not a battery re-run.

## Lifecycle List

Every skill carries a short "The run, in order" list near the top of its body — the lifecycle phases in sequence, named in a few words each. It isn't new information; it's a long-context anchor, so a session that has read a lot since startup can re-orient from the list without re-reading the whole body.

## Who runs this rule

Every persona skill loads this rule and runs both batteries. Utility skills and onboarding run whichever parts fit their shape — a persona-less utility skips the persona-specific re-anchor line but still runs the batteries and keeps a lifecycle list; each skill's own body states which parts apply.
