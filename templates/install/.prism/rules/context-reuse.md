---
load: always
---

# Context Reuse Within a Session

## Purpose

When a skill is multi-step and the same file shows up across steps, re-reading it on every step is wasted work. The file's content already lives in the session — the tokens are paid for, the bytes are in context, and another `Read` call adds noise without adding signal. The cost compounds across long sessions: a five-step skill that re-reads the same three files at every step burns roughly fifteen redundant tool calls and the read-results overhead that comes with them, all to learn what the session already knows.

**Why:** Skills that re-read are skills that drift. The re-read appears safe — "just confirm the file hasn't changed" — but in practice nothing's changed between two steps of the same session, and the safety margin is illusory. The real cost is that re-reads crowd context with duplicate content and push older, load-bearing context (the plan, the architect docs, the user's framing) closer to compaction. Reuse keeps the working memory intact.

## When to apply

Any multi-step skill invocation that touches the same file across steps. Concretely:

- Read each file once at the point it first matters, then refer back to that content from memory for the rest of the session.
- If the user explicitly says "the plan changed, re-read it" — re-read. The explicit signal overrides the default.
- If a tool you ran modified the file (e.g. `Edit`, `Write`, a build script that regenerates the file), the in-memory copy is stale by definition — re-read after the mutation, not before the next step.
- Otherwise, treat the first read as authoritative for the session.

The pattern is "read once, refer many" — not "read every step."

## Architect-context routing is diff-blind

Architect-context routing keys on the working diff (`prism-architect` startup step 4 matches the diff against `.prism/architect/manifest.json`), so a doc you are about to edit is invisible to it — a prompt-driven task carries an unrelated diff, and the target path's own architect doc never loads through that route. When a task names a specific existing doc or directory, match that target path against `manifest.json` and load its context before editing.

A `PostToolUse` hook on `Read` enforces this mechanically on hosts that expose the event (Claude Code today). This clause is the fallback that runs everywhere else, including hosts without a hook yet.

## Citation list — skills that load this rule

This rule is referenced by every PRISM skill's reflex-bullets section:

- prism-architect (Winston)
- prism-code-dev (Clove)
- prism-code-review-pr (Eric)
- prism-code-review-self (Briar)
- prism-debugger (Sasha)
- prism-documentation (Eli)
- prism-design (Pixel)
- prism-qa-test-plan (Reese)
- prism-ticket-start (Nora)
- prism-user-stories (Mira)
- prism-changelog (Sage)
- prism-standup-summary (Lilac)
