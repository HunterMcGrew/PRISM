# Lessons

Append-only working memory for the dogfood install. Captures patterns from corrections, mistakes, and confirmed-good calls during work on PRISM itself — anything a future session would want to pick up without re-litigating.

## Format

One entry per pattern. Lead with the rule, then a `**Why:**` line (the trigger — usually a date and a one-line summary of what happened), and a `**How to apply:**` line (when the rule kicks in). Keep entries short — one sentence per line where possible.

```markdown
## Don't reach for X when Y is available

**Why:** 2026-05-02 — used X for Z and lost an hour debugging when Y would have done the same job in three lines.

**How to apply:** Check for Y first. Reach for X only when Y demonstrably can't carry the case.
```

Group related entries under topical headings. Update existing entries before adding new ones — duplicate lessons defeat the purpose.

## Scope

This file is for the **PRISM toolkit's own evolution** — patterns about how the build works, how the canonical sources behave, how the dogfood interacts with consumers. Team-side lessons (lessons a consumer team learns about their own codebase) belong in their own `.prism/lessons.md`, generated during onboarding.

## Why this file is otherwise empty

PRISM was extracted from a personal install of Thrive's `.claude/` toolkit. The original `lessons.md` carried 200+ lines of Thrive-specific corrections that don't apply outside Thrive. Phase 1 prune cleared them out. New lessons accumulate from PRISM development going forward.

## On Windows, the Write tool's `/tmp/` resolves to `D:/tmp/`, not the OS temp dir

**Why:** 2026-05-03 — wrote a PR body to `/tmp/pr1-body-new.md` via the Write tool, then `gh pr edit --body-file /tmp/...` failed with "system cannot find the file specified" because gh resolved `/tmp/` to `C:\Users\<user>\AppData\Local\Temp\` (Windows OS temp). The Write tool had actually placed the file at `D:\tmp\` (literal `/tmp/` on the D drive). Cost one round trip to locate.

**How to apply:** When passing files between the Write tool and a Windows-native CLI tool (`gh`, native git, etc.) on this dogfood install, use absolute Windows-style paths (`D:/...` or `C:/Users/.../Temp/...`) explicitly rather than relying on `/tmp/`. Or write the temp file inside the project tree (gitignored) so the path is unambiguous across tools.

## When updating cross-cutting docs, verify behavioral claims against current ADRs, not prior doc text

**Why:** 2026-05-23 — README update for #32 preserved the line "`.prism/rules/` for cross-cutting standards loaded into every conversation" because the prior README said it. That phrasing predated ADR-0035 (2026-05-22, three-tier rule loading) and was no longer accurate — only Tier 1 rules load unconditionally; Tier 2 is path-scoped via `paths:` frontmatter and Tier 3 is skill-internal. Hunter caught it on the merged PR, forcing a follow-up (#33).

**How to apply:** When updating user-facing docs (README, top-level guides) that describe runtime behavior of the system — loading model, persona routing, file resolution, etc. — re-verify each claim against the current ADRs in `.prism/spec/adrs/` before publishing. Don't trust the prior doc's wording on behavioral claims, even if you're "just updating" adjacent content. ADRs are the source of truth; docs paraphrasing them rot when an ADR lands but the doc doesn't follow.

## Epic plans are preserved, not deleted, despite branch-plan.md saying "delete"

**Why:** 2026-05-23 — Phase 1.5f close-out hit a rule-vs-practice divergence. `.prism/rules/branch-plan.md § Before Closing` says "Delete the plan — once decisions are promoted, delete the plan file. Git history preserves it if you ever need to look back." But the actual PRISM practice for shipped epic plans (1.5c, 1.5d, 1.5e all still exist) is to preserve them — the roadmap links each shipped epic to its plan file as an archived reference. Epic plans serve as durable historical records of the architectural decisions and persona changes the phase introduced, more useful preserved than deleted.

**How to apply:** Until the rule is reconciled with the practice, follow the practice for epic plans (preserve, mark `shipped` in roadmap). Regular ticket plans likely still follow the rule (delete after close). The branch-plan.md § Before Closing language needs an update to distinguish the two — flag for Winston (or a future Theo pass) to resolve. Surface as a follow-up: either tighten the rule to except epic plans, or formally delete the prior shipped epics if the rule's intent is to preserve only in git history. (Resolved 2026-06-05: Hunter ruled plans are never deleted — any class; branch-plan.md § Before Closing now codifies preserve-and-mark-closed. ADR-0047.)

## `gh pr edit --add-label` fails silently due to GitHub Projects Classic deprecation

**Why:** 2026-05-23 (Phase 1.5f, every PR) — `gh pr edit <num> --add-label "X"` returned exit 1 with `GraphQL: Projects (classic) is being deprecated...` for every label-apply attempt on PRISM. The deprecation hit a code path that prevents the label from being added entirely. Cost one round trip per PR to detect; fixed by switching to REST.

**How to apply:** Fixed in issue #39 — Eric's batch D template now uses the REST labels endpoint (`POST .../labels` for apply, per-label `DELETE .../labels/<name>` for strip) instead of `gh pr edit --add-label` / `--remove-label`. Entry retained as a record of the upstream `gh` CLI / Projects Classic deprecation in case the same symptom surfaces in other contexts (other repos, other tooling, other `gh` subcommands that route through the affected GraphQL path).

## Don't `replace_all` on text where the old value also appears as evidence

**Why:** 2026-05-23 (Wave 2 PR 2 Briar review followup) — Clove ran `Edit replace_all: true` to change `2026-05-24` → `2026-05-23` in a plan, intending to fix a History date drift. The replace swept the right places (History entry, PR Readiness "Last updated") but also swept the documentation of the bug itself — the prior Review Issue's `Problem:` and `Suggested fix:` lines that quoted `2026-05-24` AS EVIDENCE of the original drift, plus the new History line recording the fix that referenced both dates. After the replace those lines read tautologically ("dated `2026-05-23` but commit timestamped `2026-05-23`"; "drift (`2026-05-23` vs actual session date `2026-05-23`)"). The audit trail anchor was erased; Briar caught it on re-review.

**How to apply:** When a value appears in a document in two roles — (a) the value-in-use that needs correcting and (b) the value-as-evidence that documents the original error — `replace_all` will destroy role (b). Use targeted `Edit` calls with enough surrounding context to distinguish the two. The general test before any `replace_all`: grep for the target string and read the surrounding context for each match. If any match describes the value rather than uses it (Review Issue Problem/Suggested-fix lines, History entries documenting a fix, commit messages quoting prior wording), `replace_all` is the wrong tool. Targeted edits are slightly more work; preserving the audit trail is worth it.

## Self-restructure introduces step-number collisions

**Why:** 2026-05-24 (Wave 2 PR 3 — Eric reviewing his own restructure) — Clove restructured Eric's `prism-code-review-pr/shared.md` Phase 3 from one step to four (6, 7, 8, 9), but left Phase 4 starting at step 7 and Phase 5 starting at step 8 from the pre-restructure numbering. After the change, step numbers 7 and 8 each appeared twice with different meanings, ambiguating every "step N" citation in the procedure. The internal citation at line 551 (originally pointing at "step 12") had no anchor at all. Eric's review of his own restructure caught it — self-applicability verified the new pattern by catching a real defect in itself.

**How to apply:** Whenever a procedure gains or loses steps in any phase, renumber ALL subsequent steps in lockstep — not just the affected phase. Walk the procedure top to bottom after the edit and confirm step numbers run linearly with no duplicates. Internal citations referencing step numbers ("see step 6", "fallback to step 10") need to be re-verified against the new numbering — grep for `step <N>` after every restructure. This is the markdown equivalent of renaming a variable and forgetting to update every caller. The fix is mechanical, but easy to miss when the eye scans phase headers rather than step numbers.

## `gh api` writes error responses to stdout, not stderr

**Why:** 2026-05-23 (issue #39 PR #40 review) — Eric's batch D strip loop wrapped each `gh api ... -X DELETE` call in `2>/dev/null || true`, intending to silence 404 errors when stripping labels that aren't present. The strip ran "successfully" in the sense that labels were removed when present, but every first-review run on a clean PR spammed six `{"message":"Label does not exist","status":"404"}` JSON lines to chat — the redirect caught stderr, but `gh api` writes the error body to stdout. Eric caught it during his own smoke test of the batch D fix.

**How to apply:** When silencing `gh api` errors, use `>/dev/null 2>&1` (both streams), not `2>/dev/null` (stderr only). The `|| true` is still needed to swallow the non-zero exit code. Pattern: `gh api ... >/dev/null 2>&1 || true`. This applies to any `gh api` call where the response body shouldn't surface on failure — including DELETE calls that may 404 on missing resources. Standard `gh` CLI subcommands (e.g. `gh pr ready`, `gh pr view`) follow the normal stdout/stderr split; the inversion is specific to `gh api`.

## "Duplicated across all N skills" is usually partial — verify before extracting

**Why:** 2026-05-26 (lean-skill-architecture Slice 1) — the plan task said the session-close block was "duplicated across all 18 skills" and instructed extracting the whole block (context-reuse + Lessons Check + taxonomy) to a shared reference, leaving only reflex bullets inline. Source check showed otherwise: only 13 skills carried the full block, iris had a partial one, parker/ren/theo had bespoke short close prose, and atlas had none. More importantly, the block was only *partly* shared — the context-reuse paragraph and promotion taxonomy were byte-identical, but the Lessons Check "Required if" conditions were persona-tuned (changelog: commit-parsing; standup: Slack-MCP/`gh`; pixel: UX/cognitive-science). Extracting the whole block would have erased that persona-specific lesson signal. Caught before writing by hashing the candidate-shared paragraphs across skills and dumping each skill's conditions.

**How to apply:** Before any mechanical extraction driven by a "this is duplicated everywhere" claim, verify the claim against source: (a) confirm the count — grep for the markers and list which files actually carry the block; (b) hash the candidate-shared spans across files to separate byte-identical content from near-duplicates; (c) read the per-file content to find persona/instance-specific pieces hiding inside the "shared" block. Extract only the byte-identical subset; keep the instance-specific residue inline (or, if it must move, give each instance its own reference — don't genericize away the signal). This matters directly for the remaining Slice 3 per-skill refactors, which are mostly more extraction. A capture-based regex transform (preserve the variable middle, remove only the shared head/tail) extracts with zero transcription risk to the preserved content.

## Adding a canonical `.prism/` artifact does NOT ship it to consumers — backport to `templates/install/`

**Why:** 2026-05-26 (lean-skill-architecture PR #54, Briar self-review) — Slice 1's `.prism/references/session-close.md` (and the architect pilot's refs, `skill-authoring.md`, ADR-0045) were created in canonical `.prism/` and mirrored to `.claude/.codex/.cursor` by `pnpm prism:build`. But `prism:build` does NOT touch `templates/install/.prism/` — the hand-maintained consumer install seed. So 14 skills shipped a `session-close.md` close-trigger pointing at a file that exists in the dogfood repo but would be absent on a fresh consumer install, making the agent wing the procedure from training (the exact failure ADR-0045 warns about). The dogfood repo was fully green — `prism:build`/`test`/`check` all pass — because canonical resolves locally; only verifying against `templates/install/` exposed it. AC line 206 ("referenced paths resolve … against the shipped `templates/install/.prism/` surface, not just the dogfood repo") was written precisely to catch this and did.

**How to apply:** When a change adds a canonical `.prism/` reference, rule, or ADR that a skill loads at runtime (a trigger target) or that the manifest routes, backport it to `templates/install/.prism/` byte-identically in the same PR — `prism:build` won't do it for you. Close the dependency graph: if the backported file links to another file that's also missing from `templates/install/` (e.g. `plan-mode.md` → `triple-gated-adr-criterion.md`, `skill-authoring.md` → `lazy-artifacts.md`), ship that dependency too, or the link dangles on the consumer seed. If a new rule needs to auto-load for consumers, add its route to `manifest.stub.json` (mirrors the dogfood `manifest.json` rule routes). Verify by resolving each trigger/link target from inside `templates/install/.prism/`, not just the repo root. This recurs for every Slice 3 per-skill refactor — each new `.prism/references/<skill>/` file needs the same backport.

## A rules-only markdown edit is NOT "no build impact" — it regenerates 4 platform surfaces and needs a `templates/install/` backport

**Why:** 2026-05-28 (skill-descriptions-rewrite #65, Clove Slice 1) — edited `.prism/rules/skill-authoring.md` and hand-mirrored to `.claude/rules/`, then committed with "markdown-only; no build impact" and skipped `pnpm prism:build`. Two things were stale after that commit: (1) `prism:build` regenerates `.codex/rules/` and `.cursor/rules/` from canonical `.prism/rules/` — a rule lives on 4 surfaces, not the 2 the plan task named — so the codex/cursor copies didn't carry the new section until the build ran during a later slice; (2) the consumer seed `templates/install/.prism/rules/skill-authoring.md` (which `prism:build` never touches, per the lesson above) was missing the section entirely. The dogfood repo looked fine because canonical + `.claude` resolve locally.

**How to apply:** When you edit a rule under `.prism/rules/`, treat it as a build-affecting change: run `pnpm prism:build` to regenerate the `.codex`/`.cursor` platform copies, and backport the same content to `templates/install/.prism/rules/<rule>.md`. The install seed is often an intentional variant (it strips dogfood-specific sections — e.g. `skill-authoring.md` omits "Persona name vs. slash-command ID" and epic references), so backport the new content without reintroducing the stripped sections — verify with `diff` that only the pre-existing intentional differences remain. "Markdown-only" describes the file type, not the blast radius.

## Re-fetch `origin/main` before committing a long-running port — this repo moves fast enough to invalidate a port mid-session

**Why:** 2026-05-28 (thrive#2039 backport, PR #69) — Winston built the entire backport against `main` at `6488b70`, working from the premise "PRISM keeps review substance inline per-skill, so inline-adapt the lens into both reviewers" and filing follow-up #68 to extract a shared review layer later. Correct at the time. But while the port was being built and verified, the lean-skill-architecture epic (PRs #54–#67) merged to `origin/main`, which (a) created the shared review-reference layer #68 asked for — making #68 already-done — and (b) rewrote the exact skill files the port edited into lean scaffolding. The stale base only surfaced at commit time, when `git fetch origin main` during branch creation showed `6488b70..4e6dde9`. Committing without that fetch would have opened a PR with a large stale-shaped conflict against files that no longer existed in that form. The whole port had to be reset to the new `main` and rebuilt — the rebuild was actually simpler and more faithful, because the new shared layer matched the source PR's structure.

**How to apply:** For any multi-step task that spans many turns — ports, backports, broad refactors, anything where the working set sits unmerged for a while — run `git fetch origin main` at the start AND again right before commit, and diff the range (`git log --oneline <base>..origin/main`, `git diff --name-only <base>..origin/main`). If main moved and touched files in or adjacent to your working set, stop and reassess the plan against the new base before committing — don't force the stale-shaped work through. A premise that was true when the plan was made ("there's no shared layer here") can expire mid-session in an actively-developed repo; the architectural decisions resting on it must be re-checked, not assumed durable. Resetting a clean branch to the new base and rebuilding is cheap when the content is reusable (the remedy menu and lens text ported verbatim); shipping against a stale base is not.

## A generated platform mirror that *exists* is not a mirror that's *honored* — verify the consuming runtime's loading dialect

**Why:** 2026-06-04 (Wave 4 backport planning) — the build's `platformContentCopies` step faithfully mirrors `.prism/rules/` into `.claude/`, `.codex/`, and `.cursor/`, and `prism:check` guards the copies against drift — so the repo was fully green while two of the three runtimes weren't actually loading the rules as designed. Cursor's rules dialect keys on `.mdc` files with `globs:`/`alwaysApply:` frontmatter, so our `.md` copies carrying `paths:` are untiered at best, inert at worst; Codex auto-loads only AGENTS.md and has no rules-directory mechanism at all, so `.codex/rules/` is reachable only via prose pointers. Every existing check validates that the copies *match the canonical* — none validates that the target runtime *consumes* them. The gap was invisible in a Claude-only workflow and surfaced only when the question "do Cursor and Codex honor the tiers?" was asked directly. Routed to issue #73 (dialect-emission subset of Thrive THR-1900).

**How to apply:** When adding a generated artifact for another runtime (rules, skills, configs), verify the consuming runtime's actual loading mechanism against its current docs — file extension, frontmatter keys, discovery directory, auto-load vs instructed-read — before trusting that a syntactically-valid copy does anything. Byte-fidelity checks (`prism:check`) catch drift between copies; they cannot catch a dialect mismatch where the copy is faithful and ignored. When auditing cross-runtime parity, audit per-runtime *consumption*, not per-surface *existence*.

## Skill frontmatter supports exactly two YAML scalar shapes — single-line and folded (`>`); plain multi-line continuation silently truncates

**Why:** 2026-06-04 (Wave 4.2, `/prism-handoff`) — the plan embedded a user-approved `frontmatter.yml` draft whose `description:` used plain multi-line continuation (value starts on the key line, continuation lines indented). Valid YAML — but `parseFrontmatter` (`scripts/ai-skills/utils.ts`) is a deliberate two-shape parser: single-line values and `>` folded scalars only. A plain-continuation value parses as its first line; the continuation lines are silently dropped. Everything downstream of the frontmatter map — the description-length gate, Codex discovery metadata, the agent-adapter description field — would have seen a one-line fragment while the generated SKILL.md (which embeds the raw frontmatter text) carried the full text: a split-brain no check catches because nothing fails. Caught at write-time by reading the parser before shipping the new file — its own doc comment asks for exactly that. Shipped the `>` folded form; it renders the identical string.

**How to apply:** When authoring or porting a skill `frontmatter.yml`, any multi-line value uses the folded (`>`) style — never plain continuation. More generally: PRISM's frontmatter parser is intentionally minimal, not a YAML library; before introducing any new value shape (block literals `|`, quoted multi-line, anchors), read `parseFrontmatter` in `scripts/ai-skills/utils.ts` and either extend it deliberately or reshape the value. Verbatim-ship instructions in a plan cover content, not encoding — when the encoding fights the pipeline, keep the rendered string identical and record the shape change in the plan's Decisions.

## A shared branch can move mid-review — re-verify the PR head before posting or editing

**Why:** 2026-06-05 (wave 4.2, PR #78 gauntlet) — the PR review ran at head `22dcade` while a concurrent session pushed three plan-only commits to the same branch; the move surfaced only when a plan Edit failed with "modified since read" during the fix pass. The delta happened to be plan-only so the code verdict survived — a code-touching push would have silently invalidated the posted review.

**How to apply:** Treat "file modified since read" as a possible branch move, not just a linter touch — check `git log` and `gh pr view --json headRefOid` before re-anchoring. For reviews: re-fetch the PR head right before the GitHub-writes batch; if it moved past the reviewed commit, diff `<reviewed>..<new-head>` and sweep the delta (plan-only → verdict stands with a note; code → re-review the delta). Same class as the "re-fetch origin/main before committing" lesson, applied to a shared feature branch during review.
