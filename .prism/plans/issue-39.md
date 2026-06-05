# Plan: issue-39

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/39

## Goal

Route Eric's batch D label apply/strip through the REST labels endpoint so labels actually land on PRs in this repo (and the documented re-review label-strip behavior actually works).

---

## Implementation Tasks

### Clove (implementation)

1. **Replace `--add-label` invocation in canonical source** — edit `.ai-skills/skills/prism-code-review-pr/shared.md` at the line in `### Applying labels in batch D` (currently line 435):
   - **Current:** `gh pr edit <pr-number> --add-label "<effort-label>" --add-label "<confidence-or-status-label>"`
   - **New:**
     ```bash
     gh api repos/<owner>/<repo>/issues/<pr-number>/labels -X POST --input - <<EOF
     {"labels": ["<effort-label>", "<confidence-or-status-label>"]}
     EOF
     ```
   - Keep the `gh pr ready <pr-number> 2>/dev/null || true` line that follows — `gh pr ready` does not go through Projects Classic.
   - **Verification:** `grep -n "gh pr edit.*add-label" .ai-skills/skills/prism-code-review-pr/shared.md` returns no matches.

2. **Replace `--remove-label` invocation in canonical source** — edit the same file at the line in step 7 of batch D (currently line 239). Use a bash loop over the six review labels, calling `gh api ... -X DELETE` for each. The labels are: `effort:glance`, `effort:quick`, `effort:deep`, `confidence:high`, `confidence:needs-judgment`, `review:has-minors`. Each call must keep the `2>/dev/null || true` wrapper so "label not present" errors stay silenced (that's the intended behavior — we don't want re-reviews to fail because a label wasn't applied last pass).
   - **Suggested pattern** (Clove to validate with one live `gh api` test against any existing PR before committing the prose):
     ```bash
     for label in "effort:glance" "effort:quick" "effort:deep" "confidence:high" "confidence:needs-judgment" "review:has-minors"; do
       gh api "repos/<owner>/<repo>/issues/<pr-number>/labels/$label" -X DELETE 2>/dev/null || true
     done
     ```
   - **URL-encoding check:** verify `gh api` accepts the `:` in label names without manual encoding. If it doesn't, switch to `%3A` in the loop. To confirm: pick any open PR on this repo, add a temporary throwaway label via `gh api ... -X POST` (use a label name containing `:` such as `effort:quick`), then DELETE it with the loop's exact shape. If both succeed, the encoding is fine. Remove the throwaway after testing.
   - **Verification:** `grep -n "gh pr edit.*remove-label" .ai-skills/skills/prism-code-review-pr/shared.md` returns no matches.

3. **Regenerate platform mirrors** — run `pnpm prism:build` from the repo root. This regenerates `.claude/skills/prism-code-review-pr/SKILL.md`, `.codex/agents/prism-code-review-pr.toml`, and `.cursor/skills/prism-code-review-pr/SKILL.md` from the canonical source.
   - **Verification:** `pnpm prism:check` exits 0 (confirms no drift between canonical source and mirrors).
   - **Verification:** `grep -rn "gh pr edit.*-label" .claude/skills/prism-code-review-pr/ .codex/agents/prism-code-review-pr.toml .cursor/skills/prism-code-review-pr/` returns no matches.

4. **Update `.prism/lessons.md` entry** — the `## gh pr edit --add-label fails silently due to GitHub Projects Classic deprecation` entry (lines 45–49) is now obsolete. Replace the **How to apply** section with a closed-loop note pointing at the fix:
   - **Action:** keep the `**Why:**` line intact (it's the historical incident record), rewrite the **How to apply** line to read: `Fixed in issue #39 — Eric's batch D now uses the REST labels endpoint (POST for add, DELETE per-label for strip). Entry retained as a record of the upstream `gh` CLI / Projects Classic deprecation in case it surfaces in other contexts.`
   - **Verification:** `grep -A 3 "gh pr edit --add-label fails" .prism/lessons.md` shows the updated text referencing issue #39.

### No Eli (documentation) tasks

No user-facing or dev docs reference Eric's batch D internals. The skill source IS the documentation for Eric's behavior.

---

## Decisions

- **Fix both `--add-label` and `--remove-label` in the same PR, not just `--add-label`.**
  - **Root cause:** Both invocations hit the same GraphQL code path that touches Projects Classic. The `--remove-label` call is failing silently today because it's wrapped in `2>/dev/null || true`, which means Eric's documented re-review label-strip behavior is broken — labels accumulate stale state on every re-review pass.
  - **Alternatives considered:** Fix only `--add-label` per the issue's literal AC, file a follow-up for `--remove-label`. Rejected: same file, same root cause, same fix shape — splitting would create a second PR for one extra edit, and the issue's AC explicitly says "verify the --remove-label invocation."
  - **Chosen approach:** Both in this PR. Documented here so reviewers see the scope expansion.
  - **Implementation guidance:** See Clove tasks 1 and 2. Each uses a different REST shape (POST with `--input` for add, DELETE per-label in a loop for strip) — they're not symmetric API calls.
  - → no promotion needed (ticket-tactical fix, the architectural pattern is "route label edits through REST" which is now codified in the Eric template itself).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — fix shipped via PR #40 (2026-05-23); REST label pattern codified in Eric's canonical source; plan never closed.

- **Strip-loop uses per-label DELETE, not bulk PUT.**
  - **Root cause:** The REST API has a `PUT /repos/.../labels` endpoint that replaces the entire label set, which would be tempting as a single-call replacement for the multi-`--remove-label` invocation.
  - **Alternatives considered:** `PUT /labels` with the desired post-strip label set. Rejected: PUT replaces all labels, which would strip non-review labels (`bug`, `documentation`, anything project-specific) that PRs legitimately carry alongside review labels.
  - **Chosen approach:** Loop with DELETE per label. Slightly more API calls but preserves non-review labels.
  - **Implementation guidance:** See Clove task 2 — six DELETE calls in a bash loop, each silenced with `2>/dev/null || true` so missing-label errors don't fail the batch.
  - → no promotion needed (ticket-tactical).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — fix shipped via PR #40 (2026-05-23); REST label pattern codified in Eric's canonical source; plan never closed.

- **Mechanical swap only — no behavioral expansion.**
  - **Root cause:** Edits to skill source files invite drive-by "while I'm here" improvements (rewording prose, restructuring bash, adding defensive checks). Those expand review surface and dilute the fix's intent.
  - **Alternatives considered:** Modernize surrounding bash patterns in batch D (single-line `&&` chains → multi-line, add explicit error handling, etc.). Rejected: out of scope; if those patterns are worth improving, they earn a separate ticket.
  - **Chosen approach:** Replace only the two `gh pr edit ... --label` lines and the immediate scaffolding around the swap. Leave the rest of batch D's prose verbatim.
  - **Implementation guidance:** Clove's diff should show exactly two replaced bash blocks in `shared.md` plus the regenerated mirrors and the lessons.md edit. If the diff is bigger than that, something has expanded scope.
  - → no promotion needed (this is a scope-discipline call, codified in `.prism/rules/code-standards.md § Refactor scope`).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — fix shipped via PR #40 (2026-05-23); REST label pattern codified in Eric's canonical source; plan never closed.

- **Lessons.md entry is updated, not deleted.**
  - **Root cause:** The lessons entry records both the workaround AND the upstream incident (GitHub Projects Classic deprecation). The workaround is obsoleted by this fix, but the incident may surface in other contexts (other repos, other tooling) where the same deprecation bites.
  - **Alternatives considered:** Delete the entry entirely now that the fix is in.
  - **Chosen approach:** Retain the **Why** line (historical record), rewrite the **How to apply** line to point at the fix. Future hits in other contexts can find the entry by symptom.
  - → no promotion needed (lessons.md is the right home for this; not architectural).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — fix shipped via PR #40 (2026-05-23); REST label pattern codified in Eric's canonical source; plan never closed.

---

## History

- 2026-05-23 [hmcgrew/issue-39-eric-batch-d-label-fix]: Plan created — fix Eric's batch D label commands to route through REST instead of `gh pr edit`, covering both add and strip paths.
- 2026-05-23 [hmcgrew/issue-39-eric-batch-d-label-fix]: Implemented label-apply fix in canonical `shared.md` (POST for add, per-label DELETE loop for strip), regenerated three tracked mirrors via `tsx scripts/ai-skills/build.ts`, updated lessons.md entry to point at issue #39. URL-encoding test confirmed `gh api` handles `:` in label paths natively; no manual encoding needed.
- 2026-05-23 [hmcgrew/issue-39-eric-batch-d-label-fix]: Briar caught a leaked `pnpm-workspace.yaml` artifact from the failed pnpm install attempt during build. Deleted before commit; not part of the fix's intentional diff.
- 2026-05-23 [hmcgrew/issue-39-eric-batch-d-label-fix]: Eric's PR-#40 batch D smoke test surfaced a Minor — `2>/dev/null` on the strip loop's DELETE call didn't catch `gh api`'s stdout error output, leaking 404 JSON on first-review runs. Patched to `>/dev/null 2>&1 || true`, mirrors regenerated, lessons.md entry added for the `gh api` stdout/stderr inversion.

---

## Acceptance Criteria

### Behavioral

- [ ] Given Eric runs against a PR on this repo, When batch D applies the two review labels, Then both labels appear on the PR (verifiable via `gh pr view <num> --json labels`).
- [ ] Given Eric runs against a PR that already has review labels from a previous pass, When batch D strips old labels, Then the previous review labels are removed and only the current-pass labels remain afterward.
- [ ] Given Eric runs against a PR with non-review labels (e.g. `bug`, `documentation`), When batch D strips and applies labels, Then non-review labels remain untouched.

### Non-behavioral

- [ ] `.ai-skills/skills/prism-code-review-pr/shared.md` contains no `gh pr edit --add-label` or `gh pr edit --remove-label` invocations.
- [ ] All three platform mirrors (`.claude/`, `.codex/`, `.cursor/`) are regenerated and contain no `gh pr edit --add-label` or `gh pr edit --remove-label` invocations.
- [ ] `pnpm prism:check` exits 0.
- [ ] `.prism/lessons.md` entry for the workaround references issue #39 in its **How to apply** line.

### AC Adjustments

(none yet)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-23 | Winston | Generated AC from issue body and scope expansion (remove-label) | created | N/A (GitHub issue) |

---

## Review Issues

### `2>/dev/null` doesn't silence `gh api` 404 errors on the strip loop

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-pr/shared.md:240`
- **Problem:** The DELETE call in the strip loop was wrapped in `2>/dev/null || true`, intending to silence "label not present" 404 errors. But `gh api` writes its error responses to stdout, not stderr — so the redirect didn't catch them. Verified by Eric in his batch D smoke test on PR #40: six 404 JSON lines printed to chat before the loop completed.
- **Suggested fix:** Replace `2>/dev/null || true` with `>/dev/null 2>&1 || true` to catch both streams while still swallowing the non-zero exit code via `|| true`.
- **Fixed in:** Canonical edit at `.ai-skills/skills/prism-code-review-pr/shared.md:240`, mirrors regenerated via `tsx scripts/ai-skills/build.ts`. Also added a lessons.md entry codifying the `gh api` stdout/stderr inversion so future agents writing `gh api` calls don't trip on the same wire.

### `pnpm-workspace.yaml` artifact left in working tree

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `pnpm-workspace.yaml` (repo root, untracked)
- **Problem:** A `pnpm-workspace.yaml` file containing placeholder text (`allowBuilds: esbuild: set this to true or false`) was created in the worktree during the failed `pnpm install` step. It's not gitignored. If Clove commits with `git add -A` (or stages the file by accident), the artifact lands in the PR as a non-fix file with literal placeholder text — confusing for reviewers and not part of the actual fix.
- **Suggested fix:** Delete `pnpm-workspace.yaml` before committing. Stage only the five intentional file changes.
- **Fixed in:** Working tree cleanup before commit. The file was an artifact from pnpm's failed install attempt and had no functional purpose. Considered adding to `.gitignore` as a follow-up but kept the PR mechanical per the plan's scope-discipline Decision; flagging for separate consideration.

---

## Debugged Issues

(none — root cause verified upstream during Phase 1.5f, no investigation needed)

---

## Cleanup Items

- ~~`pnpm-workspace.yaml` (repo root) — delete before commit; pnpm install artifact, not part of the fix.~~ Deleted.

---

## PR Readiness

- [x] No critical or major issues — Briar's `pnpm-workspace.yaml` finding resolved; Eric's `2>/dev/null` Minor resolved
- [x] No `gh pr edit --add-label` or `--remove-label` invocations remain in canonical source or mirrors — verified via grep across `.ai-skills/`, `.claude/`, `.codex/`, `.cursor/`
- [x] `pnpm prism:check` exits 0 — confirmed via `tsx scripts/ai-skills/build.ts --check`; `prism:test` passes 116/116
- [x] `.prism/lessons.md` updated to reference the fix and codify the `gh api` stdout/stderr inversion
- [x] No stray artifacts — `pnpm-workspace.yaml` deleted from working tree
- [x] PR description up to date — opened as draft: https://github.com/HunterMcGrew/PRISM/pull/40
- [x] All debugged issues resolved (no `open` entries)
- [x] Mirror sync — three tracked mirrors regenerated and verified against canonical (drift check passes)
- [x] Scope discipline — diff is mechanical swap only, no drive-by changes
- [x] Strip loop redirect fixed — `>/dev/null 2>&1 || true` catches both streams

**Last updated:** 2026-05-23 (Clove post-Eric redirect fix)
