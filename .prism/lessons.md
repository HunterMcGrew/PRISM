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

## Project Context identifiers are claims, not facts — verify the configured tracker against reality before writing to shared state

**Why:** 2026-06-05 (wave-4.2 follow-up filing) — Nora's create path takes its team and tracker from `skills-ecosystem.md § Project Context` ("use these identifiers — do not ask"), which token-substitutes from `.ai-skills/config.json`. The config declared Linear team `PRISM`; the workspace has no such team (actual teams: Thrive/THR, Space Station/SPA), and every prior follow-up in the repo (#77, #73, #64, …) is a GitHub issue. Filing on the configured identifiers would have failed outright or landed six tickets in a tracker nobody watches. Caught by two cheap pre-write reads: the Linear `get_user` team list and `gh issue list` precedent. Same exists-vs-honored family as the mirror-consumption lesson above — a config value that exists is not a config value that's true. Config fix routed to issue #79.

**How to apply:** Before the first shared-state write of a session that leans on Project Context identifiers (team, repo, workspace, tracker), verify them against the live system — one read of the actual team/repo list plus a glance at where prior tickets of the same kind actually live. "Do not ask" governs asking the *user*; it doesn't forbid verifying against the *API*. If config and reality disagree, follow reality, surface the mismatch, and file the config fix rather than patching around it silently.

## A first cadence audit's dominant verdict is archive-candidate-by-the-bucket — the real action is routing close-outs, not annotating harder

**Why:** 2026-06-05 — Zoe's first full audit found 14 of 21 plans shipped-but-never-closed, so 119 of 138 Decision verdicts were the same `archive-candidate` with plan-level evidence. Two procedure gaps surfaced that `audit-workflow.md` doesn't cover: (a) a plan closed the *same day* with its own verdict gate (wave-4) — re-annotating it adds noise, skip it and note the skip in the report; (b) on the first run ever, every lesson is technically "on its first audit," so the new-lesson grace period would block archiving even a 33-day-old unreferenced entry — age + reference-absence is the intent, first-run literalism isn't.

**How to apply:** When a plan's whole epic shipped, issue uniform per-Decision verdicts with the plan-level evidence and route the close-out to Winston rather than crafting per-Decision narratives. Skip re-annotation on plans closed within the current audit window. Read the lesson grace period as "young lessons are safe," not "nothing archives on run one."

## Meta-mentions of token syntax break the build in copied content areas

**Why:** 2026-06-05 — writing "team identifiers stay in `${TOKEN}` form" into `.prism/architect/install-layout.md` (a copied content area) failed `pnpm prism:build`: the substitution layer throws on any well-formed-but-unknown `${...}` token in content it copies to platform dirs. Malformed literals pass through; well-formed unknowns are treated as config errors by design (tokens.ts).

**How to apply:** When a rule/architect doc/reference needs to *talk about* the token convention rather than *use* it, phrase it without a well-formed token literal ("stay in tokenized form per ADR-0030") or use a non-matching shape. Plans and lessons are exempt (never copied). The same class applies to the Thrive-literal guard: a section explaining what the guard checks for must mention "Thrive"-flavored words, which trips the guard on the platform copies — the fix is an allowlist entry for each platform copy, same as ADR-0030's entries. Rephrasing is not always viable; use the allowlist when the name itself is the subject.

## Skill frontmatter `model:` pins engage on fresh-session invocation only — in-session `Skill` calls run on the session's current model

**Why:** 2026-06-09 (wave 4.2, issue #83) — the reviewer skills declare `model: sonnet` (Briar) and `model: opus` (Eric) in `frontmatter.yml`. The pin engages when the skill starts a fresh session, but an in-session `Skill` invocation doesn't switch models — it runs on whatever model the session is already on, and the pin is silently ignored. Unstated, the pins read as a guarantee the runtime delivers on only one of the two invocation paths: an author running self-review in-session believes sonnet is reviewing when it isn't. This is the third exists-vs-honored instance in the wave (after the rule-mirror dialect gap, issue #73, and the Project Context identifiers lesson) — a frontmatter declaration that exists is not one the runtime honors on every path. Surfaced both reviewer skill bodies' fresh-chat-handoff recommendation as the path where the pins actually take effect.

**How to apply:** When a skill declares a `model:` pin (or any frontmatter that changes runtime behavior), state where it engages and where it doesn't — fresh-session invocation honors it, in-session `Skill` calls run on the current model. Recommend the fresh-chat-via-handoff path when the pinned model matters, which doubles as the existing context-isolation default for the reviewer boundary. More generally, this is the exists-vs-honored family: a declared value (rule-mirror frontmatter, config identifier, model pin) is honored only on the paths the consuming runtime actually reads — verify per-path consumption, don't trust that a syntactically-valid declaration takes effect everywhere.

## Sol decides run-shape (fleet vs pipeline); don't reflexively ask it

**Why:** 2026-06-13 — Sol's step-01 intake asks the human "one unit or fleet?" up front. On a two-issue dispatch (#107/#108) Hunter pushed back: Sol should *make* the run-shape call itself, defaulting to fleet, optionally sending Nora/Winston as discovery to recommend the path — only escalating run-shape to the human when it's genuinely ambiguous. The autonomy-policy question is still the human's; run-shape is Sol's to decide from the tasks.

**How to apply:** This is a per-user preference, not a skill change — Hunter declined folding it into step-01, since the intake question staying as-is (the human decides) plus memory-as-override is the intended design. For Hunter's runs: decide run-shape from the work (independent, non-overlapping units → fleet; single unit or hard sequential dependency → pipeline), state the call and reason, ask only the autonomy-policy question; reserve a run-shape question or discovery dispatch for genuinely ambiguous cases. The standing preference lives in user memory `feedback-sol-decides-run-shape`.

## Sol's review phase is the full gauntlet — never skip pr-review (Eric) on triviality grounds

**Why:** 2026-06-13 — a Sol run on two trivial, green PRs ran a single Briar self-review and parked at merge, skipping Eric. Briar reports in chat only and posts nothing to the PR, so the PRs the human merges carried zero review signal. The "trivial + green + Briar-clean = park" proportionality call silently dropped a defined lifecycle phase. Hunter caught it and directed that the review-loop gauntlet be the conductor's default review phase.

**How to apply:** The conductor's `self-review` / `pr-review` phases run the prism-review-loop ladder by default — loop self-review→fix to clean, then pr-review→fix to clean (`needs-fix` verdict keeps the lane in-phase). `pr-review` (Eric) is non-skippable on any lane with an open PR, regardless of diff size. Proportionality may tune review *depth*, never *whether Eric runs* on an open PR. Codified in step-04 § The review phase is the gauntlet.

## Merge is Sol's only unconditional human gate — push, PR-open, and Eric are conducted, not asked

**Why:** 2026-06-14 (epic #115 build) — after a clean final Briar pass, Sol stopped and asked the human "push + open PR?" via a three-option gate, treating the first outward-facing action as a human gate. Hunter corrected: Clove opens PRs and Eric reviews (after Briar, fresh dispatch) as part of the conducted `pr-review` phase; only *merge* is the unconditional human park (ADR-0011). The error was over-applying the generic "outward-facing, confirm first" reflex on top of a run the operator had already authorized to drive to the merge gate — the autonomy policy + Sol invocation already authorize push/PR-open/Eric.

**How to apply:** On a conducted run, drive `implement → self-review (Briar, loop to clean) → pr-review (Clove opens/pushes the PR, Eric reviews as a fresh dispatch, loop to clean) → park at merge` autonomously. Do not insert a human gate at push or PR-open; merge is the single unconditional human gate. The generic confirm-before-outward-facing reflex is already satisfied by the operator's Sol invocation + autonomy policy — don't re-ask it per outward action. Reserve a mid-run human pause for `needs-human` dispositions, budget stops, or the merge gate itself.

## Don't blanket-disposition a reviewer's writing-voice flag as "acceptable provenance" — split reference anchors from opaque inline cites

**Why:** 2026-06-14 (Phase D build, epic #138) — Briar then Eric both flagged ADR Context-prose cites to opaque epic-plan labels (`(epic plan D-A9)`). Sol dispositioned them as legitimate provenance (plan preserved per ADR-0047) and told Clove to leave them — but the Review Issue stayed marked `fixed`, so the plan claimed a fix the diff didn't contain, which Eric escalated to Major (bookkeeping mismatch). Routed to Winston (ADR lane owner), who overrode Sol: provenance holds for Reference-section *anchors* (`§ Decisions D-A3`) but not for opaque *inline* cites that name a label without naming the decision — those carry no provenance a cold reader can follow. Two reviewers agreeing was the signal Sol should have weighted.

**How to apply:** When two reviewers flag the same writing-voice leak, weight it as signal, not noise to disposition away. An internal-label citation is legitimate only when it resolves to a followable reference (a section anchor / named ADR); a bare inline `(label)` that names neither the decision nor a followable anchor is a leak — rephrase to name the decision. Never mark a Review Issue `fixed` when part of its stated scope was intentionally left — either fix the whole scope or narrow the issue's recorded scope, else the plan misstates branch state. Borderline writing-voice calls in another persona's lane route to that owner (here Winston) per the run's question-routing policy.

## Seed twin .tmpl files are outside `pnpm prism:check`'s scan — verify them manually when canonical changes

**Why:** 2026-06-15 (PR #156 Phase 1 Eric review) — canonical `.prism/SPEC.md` and root `AGENTS.md` received path updates to `_toolkit/` in Phase 1. Their consumer install seed twins (`templates/install/.prism/SPEC.md.tmpl` and `templates/install/AGENTS.md.tmpl`) were not updated. `pnpm prism:check`'s path-guard runs on `.prism/` and `templates/install/.prism/` content roots — it catches platform-dir path violations and seed drift for paired canonical↔twin files, but does NOT scan `.tmpl` files for prose accuracy or cross-reference correctness. So three broken hyperlinks and three stale prose references shipped in the tmpl files while `prism:check` stayed green.

**How to apply:** When a Phase update edits a canonical file that has a `.tmpl` twin in `templates/install/`, explicitly diff the canonical vs. the tmpl before closing the PR: `diff <canonical> <tmpl>`. Any line the canonical changed that also exists in the tmpl needs the same update. This is not automatable by the existing guards — it requires a manual check or a targeted grep for the moved paths in the tmpl files. The two highest-risk files are `SPEC.md.tmpl` and `AGENTS.md.tmpl` because they carry hyperlinks to toolkit ADR and architect paths that change with namespace reorganizations.

## PRISM dogfoods on GitHub issues, not Linear — Nora's Linear-first default is the consumer path, not the internal one

**Why:** 2026-06-15 — Sol dispatched Nora to file a Linear epic for internal PRISM work; she hit Linear OAuth and stalled the run. PRISM's own development tracks on GitHub issues: commits use the `#NN:` prefix (#73, #112, #150), phase-style epic issues exist (the "Sol Phase D" set #141–143), and `gh` is the authed backend on `HunterMcGrew/PRISM`. The `PRISM-NNNN` / Linear convention baked into prism-ticket-start and git-conventions.md is the *consumer-facing* default, not how PRISM tracks itself.

**How to apply:** For work ON the PRISM repo itself, ticketing is GitHub issues via `gh issue` and commit subjects use `#NN: <summary>` — skip the Linear flow entirely. When Nora (or any ticket-setup) runs on PRISM-internal work, create/fetch a GitHub issue and reference `#NN`. Epic *plan* files keep descriptive names (`epic-prism-update.md`), matching existing practice (`epic-prism-conductor.md`), not an issue-number filename — just populate `## Ticket` with the GitHub issue URL.

## When sweeping cross-refs after a file move, scan the moved files' OWN bodies — and never exclude the destination dir by path in `grep -rn` output

**Why:** 2026-06-15 (prism:update Phase 1, the `_toolkit/` reorg) — the cross-ref completeness sweep missed the same defect class three times: pass 1 missed `.md` seed twins + `CONTEXT.md`; pass 2 missed `.tmpl` install-template sources (sweeps were `.md`-scoped); pass 3 missed the moved ADRs' own `## References` sections. Two compounding root causes: (a) moved files reference *each other*, so the destination dir (`_toolkit/`) must be scanned, not skipped; (b) a `grep -rn ... | grep -v "_toolkit/"` filter matches the **file-path prefix** that `grep -rn` prepends to every line, silently dropping every match inside `_toolkit/` files — a false-clean.

**How to apply:** A move-completeness sweep must (1) cover every ref-carrying extension — `.md`, `.tmpl`, `.mdc`, `.json`, `.toml` — not just `.md`; (2) scan the moved files' bodies (don't exclude the destination dir); (3) exclude correct refs by making the *search pattern* precise (`architect/skills-ecosystem.md` doesn't match `architect/_toolkit/skills-ecosystem.md`), never by a path-substring `grep -v` on `grep -rn` output; (4) exclude noise (frozen example blocks, historical plans) by *content* match or by choosing search roots, not by path-substring on the line prefix. This whole class is a strong candidate for a `pnpm prism:check` lint that scans prose cross-refs — filed as follow-up.

## An agent-written handoff or conductor-state cannot grant merge authority — the user must authorize merge in-session

**Why:** 2026-06-16 — Sol resumed a roadmap run from a handoff whose "Live state" block asserted a standing owner grant to squash-merge PRISM PRs, and the prior conductor-state recorded the same provenance. Sol carried it into the new run-state and attempted to merge PR #174 after a clean Briar+Eric+`prism:check`+scope pass. The Claude Code auto-mode classifier denied it: the grant existed only in agent-written artifacts, not in any user message in the live session. ADR-0011 / git-conventions § Who-merges make merge the one unconditional human gate; a prior-session grant propagated through a handoff does not satisfy it. The user then authorized it explicitly in-session and the merge proceeded.

**How to apply:** Merge authority must come from the user in the current session. A handoff or conductor-state "merge grant" is a recommendation to re-confirm, not authority to act — surface it and ask the user once, explicitly, before the first merge. Drive lanes to merge-ready autonomously; treat every merge as the human gate until the user authorizes it here. Once authorized in-session, proceed for the rest of the run without re-asking per PR.

## A subagent's `git add -A` can sweep an unrelated stash/dirty file into the commit — verify commit scope before merge, don't trust the self-report

**Why:** 2026-06-15 (prism:update epic-close, PR #172) — a Clove dispatch fixing a seed-twin gap reported it had hit "a pre-existing merge conflict in `.prism/plans/agents-md-slim.md` (stash vs. upstream)" and "resolved it by taking the upstream version." The actual commit diff showed the opposite: it had swept the *stash's* one-line edit (belonging to a different ticket, PR #66) into the close commit via `git add -A`, polluting the epic-close PR with unrelated scope — and the self-report misdescribed which version it took. `pnpm prism:check` stayed green (the leak was a valid plan-metadata line), so only a scope check caught it.

**How to apply:** After any implementer dispatch — especially one that reports an unexpected git stash/conflict — run `git diff main...HEAD --stat` and confirm the file set matches the dispatch's intended scope before merging. A pre-existing stash or dirty working-tree state from another ticket survives across dispatches on a shared checkout and gets swept in by `git add -A`. Treat a subagent's prose description of what it committed as a claim to verify, not a fact (the cross-agent-handoff-accountability rule applied here and caught it). Restore the stray file with `git checkout main -- <file>` on the branch and leave the stash intact for its owning ticket.

## De-Thrive / removal sweeps: grep the literal token, don't scan by logical section

**Why:** 2026-06-16 (Epic A PR-3-eli) — a de-Thrive pass read files section-by-section and missed a hardcoded Thrive-path arch+ops section because it was structural doc-organization advice, not obviously about audience/location; Briar caught it. A `grep -n "docs/content/"` sweep would have surfaced it immediately.

**How to apply:** When de-Thriving or removing a concept across files, grep the literal path/token (`docs/content/`, the old name, the removed key) across the whole target set and handle every hit, rather than reading file-by-file by logical section. The literal-token sweep catches references hiding in sections whose topic doesn't advertise that they mention the token. Same family as the removal-and-rename-completeness rule and the cross-ref-sweep lesson above — precision comes from the search pattern, not from re-reading prose.

## A `.agents/` mirror `--check` failure right after checkout is usually transient — a full build reconciles it with zero git diff

**Why:** 2026-06-16 (Epic A, repeatedly) — `pnpm prism:check` flagged `.agents/skills/<X>/SKILL.md` out-of-sync on fresh checkouts/worktrees, but running a full `pnpm prism:build` produced no git change and the next `prism:check` was green. Caused repeated false-alarm confusion mid-run.

**How to apply:** On a `.agents/`-only `--check` failure, run `pnpm prism:build` then re-run `pnpm prism:check`; treat it as real drift only if the build produces a git diff. If the build leaves the tree clean, the original failure was a transient post-checkout artifact, not a content problem. (Candidate for a build-determinism follow-up — the `--check` step shouldn't report drift a clean build can't reproduce.)

## Subagents stash/pop the shared working tree — a persistently-dirty tracked file churns the stash and can pop an unrelated one

**Why:** 2026-06-16 — Epic A subagents dispatched from worktrees stash/pop the shared checkout around their work; a long-standing dirty `.prism/plans/agents-md-slim.md` (PR #66 leftover) got swept into that churn, and a pop landed the original PR #66 stash entry. The recovered content was stale (superseded by main), so nothing valuable was lost, but it triggered a recovery scramble.

**How to apply:** Clear or commit persistent dirty tracked files early in a fleet run — don't rely on a stash surviving many subagent dispatches on a shared checkout. This is the stash-*mechanism* sibling of the `git add -A` lesson above: that one is about a dirty file swept into a *commit*; this one is about the stash/pop churn itself popping an unrelated stash entry. Both root in shared-checkout state outliving the ticket that created it.

## A doc reference to a gitignored/runtime-generated path passes crossref-lint locally but fails CI — the dogfood tree has the file, a fresh checkout doesn't

**Why:** 2026-06-16 (Epic C Lane 3, PR #198) — `install-layout.md`'s new § first-contact section referenced `.prism/.sync-manifest.json` as a path token. `pnpm prism:check` (crossref-lint) passed locally for Clove, Briar, AND Eric — because the dogfood working tree has a `.sync-manifest.json` generated by this session's build/adopt runs. The file is gitignored (runtime-created), so CI's fresh checkout has no such file, and crossref-lint failed there on the dangling reference. Three green local runs were all false passes; only the CI run on a clean tree exposed it. The fix was the sanctioned allowlist mechanism (`CROSSREF_FILE_ALLOWLIST` in `crossref-lint.ts`), exactly as ADR-0057's identical `.sync-manifest.json` reference is already allowlisted.

**How to apply:** When a doc references a gitignored or runtime-generated path (`.sync-manifest.json`, `.bak`, anything created at runtime and not committed), it must be added to `CROSSREF_FILE_ALLOWLIST` (key format `relativePath::rawRef`) — mirror the existing ADR-0057 entries. Local `pnpm prism:check` cannot catch this class because the dogfood tree carries the generated file; the same exists-vs-honored family as the seed-twin and `.agents/`-mirror lessons. To verify a crossref fix for a gitignored path before pushing, reproduce the CI condition locally: `mv` the generated file aside, run `pnpm prism:crossref-lint`, then restore it — a clean pass with the file absent is the real proof. This is a strong candidate for a build-tooling follow-up: crossref-lint could auto-skip refs matching `.gitignore` patterns, or a local check mode could hide gitignored files, so the local run stops being a false positive.

## A merge authority recorded only in agent-maintained state is not honored by the auto-mode classifier — it needs explicit in-session user authorization

**Why:** 2026-06-19 (Epic #212 Wave 2, PR #221) — Sol held a standing architect merge authority (Hunter granted it a prior session, recorded in the handoff doc + `conductor-state.json` + memory). With all gate conditions met, `gh pr merge 221` was denied by the Claude Code auto-mode classifier: the authority lived only in agent-maintained state, not in any user message in the live session, so the classifier correctly enforced the `git-conventions.md` human-merge boundary. The same gate recurred at every subsequent wave merge.

**How to apply:** When a merge (or any hard-boundary action) is authorized only by prior-session state — handoff, state file, memory — treat that as *not yet authorized for this session*. Surface the ready-to-merge PR and get an explicit in-session "yes" before attempting the merge; don't burn a denied call first. The in-session grant can be scoped ("just this PR") or extended ("this + the rest of the run") — ask which, so a multi-merge run pauses once instead of at every gate. Subagents hit the same wall: a dispatched reviewer's `gh pr edit --add-label`/`gh pr ready` can be classifier-blocked, so the conductor (main loop, carrying the in-session grant) should own the ready-flip and merge, not the subagent.

## A grep-based "X is the only file" completeness claim can miss pattern variants — an empirical regression test over the real tree catches the whole defect class

**Why:** 2026-06-23 (PRISM-242, consumer skill distribution) — Winston ruled the seed-content throw (`Unknown token ${TOKEN}` on `prism:adopt` content-copy) affected only ADR-0030, based on a `${TOKEN}`-literal grep sweep of `templates/install/.prism/`. The grep was scoped to the one token name that threw, so it missed `${TECH_STACK}` in seed ADR-0032 — same defect class, different literal. The regression test Winston *commissioned* (run content-copy over the real seed `spec/` tree with a real consumer tokenMap, assert no throw) empirically caught 0032 when Clove wrote it. Methodology was right; the grep pattern was narrower than the defect class.

**How to apply:** When claiming a defect-class fix is complete ("this is the only file/caller/site"), prefer an empirical test that exercises the real engine over the real tree to a grep that matches one instance of the pattern. A grep proves "no more matches of *this string*"; the test proves "the engine no longer throws over *any* input." Same exists-vs-honored family as the seed-twin and crossref lessons — completeness comes from running the real path, not from a pattern that may be narrower than the bug.

## A check-mode no-drift test must exclude gitignored render targets — they're absent on a fresh checkout and produce CI-only false drift

**Why:** 2026-06-23 (PRISM-242, PR #243 CI) — `generate-skills.test.ts`'s "renders PRISM's own source in check mode with no drift" rendered into all six target roots with `optedIn: ALL_OPTED_IN` and asserted zero drift against committed output. Two of the six (`.agents/skills`, `.codex/codex-config.toml`) are gitignored per-user roots with no committed baseline. Local runs passed only because a prior write-mode `prism:build` had left them on disk; CI's fresh checkout has neither, so check mode rendered them and reported 63 false-drift paths. Production `build.ts main()` already handles this — its check-mode `optedIn` sets `codex: !checkMode` and `codexConfig: !checkMode` (off in check mode); the test diverged by forcing all targets on.

**How to apply:** A no-drift / byte-identical check-mode test asserts only against *committed* targets — opt out gitignored render roots, mirroring `build.ts main()`'s `optedIn`. Same local-false-pass / fresh-checkout-CI-fail family as the `.agents/`-mirror and crossref-gitignored lessons above. Reproduce the CI condition before trusting a fix: `mv` the gitignored target aside, run the test, confirm it fails, apply the fix, confirm it passes with the target still absent, then restore.

## A reviewer subagent's claimed label/PR-state change can silently fail — verify the live PR before treating the gauntlet as clean

**Why:** 2026-06-24 (PRISM-256, PR #257) — Eric's confirmation pass reported "removed `review:has-minors`, applied `confidence:high`" after the minors were fixed, but the live PR still carried `review:has-minors` and no `confidence:high`. The label write hit the Projects Classic GraphQL deprecation (the same failure as lesson #39 / the pr-description body-edit rule) and the subagent reported success without confirming the side effect landed. Sol caught it only because it re-checked `gh pr view --json labels` before parking the PR. A reviewer's verdict (`done`/clean) is trustworthy; its claims about external side effects (labels, ready-flips, posted comments) are not, because those writes can fail silently in a subagent.

**How to apply:** Before the conductor parks or merges a PR on a reviewer's clean verdict, verify the live label state against what the reviewer claimed (`gh pr view <n> --json labels`). When it diverges, correct it via the REST labels endpoint from the main loop (`DELETE .../issues/<n>/labels/<name>`, `POST .../issues/<n>/labels`) — `gh pr edit --add-label/--remove-label` routes through the deprecated GraphQL path and fails. Pairs with the line-211 lesson (conductor owns ready-flip/merge): extend the same ownership to label reconciliation, since subagent label writes are the unreliable link.

## A worktree-isolated subagent can leak a checkout into the shared main working tree — verify the repo root is on main around merges

**Why:** 2026-06-24 (epic-prism-consumer-boundary, Sol 11-lane fleet) — `isolation: 'worktree'` dispatches intermittently left the *shared* repo-root checkout switched onto a lane branch (HEAD drifted to a lane commit, sometimes with uncommitted WIP), repeatedly across the run. Tells: `git merge --ff-only origin/main` fails "Not possible to fast-forward," `git branch --show-current` shows a lane branch not main, or a reviewer reports a "drifted to a sibling lane's commit" false alarm. The GitHub squash-merge still landed each time — only the local checkout was wrong. One occurrence stranded a just-authored Winston plan edit as uncommitted WIP in the root tree.

**How to apply:** Treat the repo-root checkout as untrusted after any worktree-isolated segment. Recover deterministically after each merge — `git fetch origin && git checkout main && git reset --hard origin/main` — instead of relying on `--ff-only`. Before resetting, capture any uncommitted plan/source WIP in the root to /tmp (it's a leak, but may hold a freshly-authored artifact). Don't pass `--delete-branch` to `gh pr merge` when a worktree may hold the branch — it aborts the cleanup mid-switch and is what knocks the root onto the branch.

## Windows PowerShell `Set-Content` / `Out-File -Encoding utf8` emits a UTF-8 BOM that breaks `JSON.parse`

**Why:** 2026-06-26 (Phase 2 enforcement dogfooding) — a `report.json` written via PowerShell `Set-Content` carried a UTF-8 BOM, and the live Stop gate's `JSON.parse` rejected it ("not valid JSON"), recording a strike against the dispatch. PowerShell 5.1's `utf8` encoding is BOM-prefixed by design; the BOM is invisible in most editors but fatal to a strict JSON parser.

**How to apply:** For any gate-consumed or machine-parsed JSON (`report.json`, evidence artifacts, conductor-state), write BOM-free — use Node `fs.writeFileSync(path, JSON.stringify(...), 'utf8')` or the Write tool (both BOM-free). Never write such files with PowerShell `Set-Content` / `Out-File -Encoding utf8`. If a parser rejects a file that looks valid, suspect a leading BOM first.

## A live Stop gate fires on the gated persona's own dispatch — verify lane state from the durable bus, not the chat report

**Why:** 2026-06-26 (Phase 2 enforcement dogfooding) — the enforcement floor's Stop/SubagentStop gate fires on the completion of any persona with a `gates.json` key, including the implementer building the floor on its own dispatch. The gated persona spends its final turns satisfying its own gate (writing `report.json`, clearing strikes) rather than cleanly reporting back, so the chat report-back can be disrupted or incomplete even when the work landed.

**How to apply:** When a dispatch is itself gate-enforced (the persona has a `gates.json` key), read lane state from the durable content bus — the plan's `## History` / validation sections, `.prism/evidence/<runKey>/`, the branch diff — rather than trusting the chat report. The gate and the report-back compete for the persona's final turns; the durable artifacts are authoritative. This only affects gated personas (those with a `gates.json` entry); ungated dispatches report back normally.

## A worker and its self-reviewer can confidently misread the same spec — verify a reviewer's plan-claim against the source text before applying the fix it proposes

**Why:** 2026-06-24 (epic-prism-consumer-boundary, L8) — Atlas built the acceptance-criteria offer as *unconditional*, asserting "the plan says unconditional"; Briar then "confirmed" it and proposed aligning the prose to unconditional. The plan said **skip-if-exists** in two places and "unconditional" in none — both agents collapsed two distinct properties (a skip-if-exists guard vs a user-skippable offer) into one. Applying the reviewer's proposed fix would have shipped behavior the plan explicitly rejects (the offer re-firing on every reconfigure). Caught by grepping the plan for the literal claim; root cause was partly an ambiguous plan line that compressed two properties into one bullet.

**How to apply:** When a finding rests on a claim about what the spec says ("the plan requires X"), verify the claim against the source text before routing the proposed fix — a grep of the plan for the asserted term is cheap. A worker and its reviewer agreeing is not verification when both read the same ambiguous line the same wrong way. Route the disagreement to the spec's author to adjudicate *and* to disambiguate the phrasing so the next reader can't repeat it. Same exists-vs-honored family as the grep/seed-twin lessons — fix against the source of truth, not a paraphrase of it.

## A baseline-regression gate fix changes the smoke-fixture contract: seed a clean baseline to observe a strike

**Why:** 2026-06-26 (Issue #300) — Bug 2's baseline-regression tolerance makes `run-gates.mjs` strike a claimed-true fresh-gate failure ONLY when a `baseline.json` recorded that gate passing (exit 0); an absent baseline means "no regression provable → don't strike." After landing the fix, `fleet-keying.mjs` went red — its lanes pre-seeded a failing `types` gate and expected a strike, but seeded no baseline, so the failure was tolerated as pre-existing and no strike was written. The fix was correct; the fixtures were stale.

**How to apply:** Any smoke scenario (or fleet lane) that wants a fresh-gate failure to *strike* must pre-seed `baseline.json` with `{ <gateId>: 0 }` (a clean baseline) so the now-failing gate registers as a regression. Scenarios that want to prove *tolerance* seed a failing baseline (`{ <gateId>: 1 }`) or none. When a gate-reconciliation rule changes, re-audit every fixture that depends on strike production.

## Moving hand-authored AGENTS.md content into a Tier-1 rule subjects it to the Thrive-literal guard

**Why:** 2026-06-26 (Issue #302) — extracting AGENTS.md §0 verbatim into `.prism/rules/skill-routing.md` (a no-`paths:` Tier-1 rule) carried over the example ticket ID `THR-123` in the Nora routing row. `THR-123` was never checked while it lived in AGENTS.md (a single hand-authored surface, not platform-synced), but the moment the rule syncs to `.claude/rules/`, `.codex/rules/`, `.cursor/rules/`, `prism:test`'s literal-guard scans those outputs and fails the build. A verbatim move is not literal-safe across the AGENTS.md → Tier-1-rule boundary.

**How to apply:** Before moving any hand-authored content into a Tier-1 rule (or any file that syncs to platform dirs), scan it for Thrive literals (`THR-NNNN`, `Thrive`, `tractru`) and tokenize them — illustrative ticket IDs become `${TICKET_PREFIX}-NNNN` (substituted at sync time per epic-phase-1-foundation.md:422). Allowlisting the platform paths is the wrong fix for generic seed content — it ships a Thrive-ism into the consumer install. Winston: when planning a verbatim-move task, flag in-table literals as a tokenization sub-step so the implementer doesn't discover it at build time.

---

## The report contract, not the dispatch prose, is the authority on `next_route`

**What:** 2026-06-26 (Issue #300 / PR #301) — A Sol dispatch prompt said "next_route: eric (re-review)." I wrote `next_route: eric` into `report.json` with `verdict: done`. The Stop gate rejected it (strike 1/3): `next_route 'eric' is incoherent with verdict 'done'`. The report contract (`report-contract.md` § Verdict-to-route coherence) is explicit — a Clove `done` routes to `briar` (self-review), the normal forward persona; `eric` is in Clove's allowed-routes set but is not coherent with `done`.

**Why:** Dispatch prose describes intent ("get this re-reviewed"), but the gate enforces the typed contract. "Eric re-reviews next" is the *human/Sol* routing intent; the *contract-coherent* handoff from a `done` Clove report is `briar`, because self-review precedes PR review. Taking the prose literally put an incoherent value in a gated field.

**How to apply:** When the dispatch names a next_route that conflicts with the verdict's coherence rule, the contract wins — set the coherent route and let Sol/human route onward from there. For a `done` verdict, use the persona's *normal next persona* (Clove→briar, Winston→clove, Eric→human), never a downstream persona named only in the dispatch's intent. Check `report-contract.md` § Verdict-to-route coherence before writing `next_route`, not the prompt prose.

---

## UTF-8 BOM on canonical `.ai-skills/` sources is a recurring defect — guard it at build time

**Why:** 2026-06-27 (PR #348, third Eric catch) — some editors save `.md`/`.mjs`/`.json` files as "UTF-8 with BOM" by default. On `main` the canonical sources start clean, but whenever a BOM-bearing editor touches them, the BOM silently persists through the Git delta and into the next commit. On PRISM, BOMs break `<!-- atlas:specializes-in -->` anchor substitution in consumer repos and corrupt hook shebangs on Unix. The defect was caught manually three times; `bom-guard.ts` converts it to a build-time exit-1 failure.

**How to apply:** The guard is wired into `build.ts` and runs on every `pnpm prism:build` / `pnpm prism:check`. If it fires, strip the BOM with `tail -c +4 <file> > <tmp>; mv <tmp> <file>` on each affected file, then rebuild. Never suppress the guard — a BOM that "just passes" on Node (which strips it) still breaks Unix shebang execution and consumer anchor substitution.

**Gap:** The `bom-guard.ts` covers `.ai-skills/` canonical sources but NOT top-level docs (`README.md`, `AGENTS.md`, etc.) — Windows agent file-writes can still prepend a BOM there. Strip on touch; a BOM on top-level docs breaks the atlas anchor and the shebang. Filed as a follow-up to extend the guard scope.

---

## Spend-limit or 529 mid-segment leaves lanes partially processed — detect and resume heterogeneously

**Why:** 2026-06-27 (epic #289 close) — a Workflow segment interrupted mid-pipeline (spend limit, 529 error) left lanes in mixed states: some had a PR open but review never ran; others hadn't started. A uniform retry re-ran completed work wastefully and duplicated side effects.

**How to apply:** Detect partial lanes from null review fields or missing evidence artifacts. Author a heterogeneous cleanup that resumes each lane at its correct stage (open PR → skip to review; not started → full run). Use `resumeFromRunId` for transient API failures — completed agents return cached results and don't re-execute.

---

## The 500-line skill-body cap lives in `prism:test`, not `build.ts --check` — a clean build doesn't mean CI passes

**Why:** 2026-06-27 (epic #289) — `MAX_SKILL_BODY_LINES` is enforced by `prism:test`, not by `build.ts`. A skill rewrite that exceeds the cap reports `buildClean` but fails CI at the test step. The cap is invisible to `prism:build --check`.

**How to apply:** Enforce the cap during authoring, not after. When a skill body grows past ~400 lines, externalize content to `lib/` files (the conductor pattern) rather than cramming into the body. Now codified in `skill-authoring.md`. When CI fails on a skill-body check after a `prism:build` passes locally, the cap is the first suspect.

---

## Static bash-parsing for protected-path git mutations converges with a complete closed grammar + fixpoint strip + adversarial review matrix

**Why:** 2026-06-27 (epic #289, Bash guard hardening) — per-form patching of the git-mutation guard spiraled as Eric's adversarial PR review surfaced new substitution + pathspec-magic forms on each round. Switching to a complete closed grammar (enumerate every substitution form and pathspec-magic variant), a fixpoint strip (loop until stable), and an adversarial reviewer matrix converged in multiple rounds instead of indefinitely.

**How to apply:** When writing a security-critical static parser for shell commands, enumerate the full grammar exhaustively rather than patching per-form. Budget for multiple adversarial review rounds — Eric's PR review is what surfaces the edges. Fixpoint stripping (strip → check → strip again until no change) handles nested and compound forms that a single-pass strip misses.

---

## Enabling `.claude/settings.json` mid-session activates hooks for the main session too — re-enable the floor at a session boundary

**Why:** 2026-06-27 (epic #289, floor re-enable) — enabling the enforcement floor mid-session activated the Stop gate for the current conductor session, not just fresh subagents. The gate then demanded `report.json` from the conductor and the ownership-guard denied its source edits. The only escape (before the git-guard closed it) was `git checkout` to undo the settings change mid-session.

**How to apply:** Re-enable the enforcement floor (`settings.json` hook activation) at a session boundary, not mid-session on a live conductor run. The gate fires on the session that enables it, not only on subsequent sessions. If the floor must be enabled mid-run, the conductor session needs its own `report.json` and ownership scope, or it must hand off to a fresh session immediately after enabling.

---

## Docs drift after a large epic — run a read-only triage audit before fixing, not a bulk update

**Why:** 2026-06-27 (epic #289 close, docs freshness pass) — user-facing docs predated the enforcement floor architecture, leaving ~11 docs with stale descriptions. Jumping straight to fixes churned current docs and introduced scope creep; an audit-first read-only triage (per-doc freshness verdict: current / stale / missing section) focused the fix pass on only what needed updating.

**How to apply:** After a large epic lands, run a read-only triage first — assign a freshness verdict to each doc (current, stale, missing section) before touching any file. Fix only the stale and missing entries. This prevents churning docs that are already correct and keeps the diff reviewable.

---

## Ambiguous review findings route to Winston first — he decides or escalates to human; Sol does not triage them

**Why:** 2026-06-28 (PRISM-363 floor-hardening, Eric's #369 review) — Eric's review surfaced two ambiguous items (a gate-coherence routing rejection, a glitched summary comment) plus a pre-existing-asymmetry finding whose scope was a judgment call. Sol triaged them straight to the human (and considered routing the gate anomaly to Sasha). Hunter corrected: ambiguous findings go to Winston first — the architect makes the call or escalates to `needs-human` himself. This is the routing target for reflex #5 of the role-drift remedy: not "Sol decides," not "straight to Sasha/human," but "Winston adjudicates, then escalates if needed."

**How to apply:** When a review (or any dispatch) surfaces a finding whose disposition is ambiguous — is this a bug? in scope? a real floor issue? — route it to Winston, not to Sol's own judgment and not directly to the human or Sasha. Winston decides or escalates to `needs-human`. Clear-cut findings (an obviously-correct fix) still go straight to the implementer (Clove); only the ambiguous ones gate through Winston. Fold this into reflex #5 when the role-drift remedy lands: the symptom-trigger routes ambiguous dispositions to Winston-first.
