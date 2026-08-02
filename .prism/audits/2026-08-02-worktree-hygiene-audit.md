# PRISM Audit — 2026-08-02 (worktree hygiene lane)

> Mode: `worktrees` only — explicit-invocation lane. Plans, lessons, ADRs, and architect docs were not walked this pass.
> Classification only. Nothing was removed, pruned, or deleted: the batch confirmation Procedure E requires has not been given, and a build lane is verifying `scripts/worktree-setup.sh` against this repo, which creates and removes a throwaway probe worktree mid-run.

## Summary

- 120 worktrees classified; 22 GREEN, 39 RED, 59 YELLOW, 0 unreadable.
- `git worktree list --porcelain` reports zero prunable entries — every path has a live directory, so this is not stale-metadata cleanup.
- 28 of the 117 worktrees under `.claude/worktrees/` carry `node_modules`; 89 do not. Recorded per worktree below as a property, never as a removal criterion — an unusable worktree is not an abandoned one (follow-up `task_31112904`).
- The main working tree (`PRISM`) is the tree this audit session runs from. It is listed for completeness and is excluded from any removal set by construction.

## Predicate used

`.prism/rules/worktree-git.md` § Removing a worktree, executed through its code implementation `scripts/ai-skills/worktree-classify.ts` — the same `classifyWorktree` function the lane calls, so no second copy of the predicate was written for this pass. Conditions are checked in order: tracked changes → detached HEAD → upstream ahead-count → merged-PR containment.

Because PRISM squash-merges, a plain `git merge-base --is-ancestor` check against `main` returns the wrong answer for every shipped branch. The predicate instead compares HEAD against the merged PR own `headRefOid` (`git rev-list --count <headRefOid>..HEAD == 0`).

One deviation from a literal per-worktree CLI run, made for cost and equivalent in result: the merged-PR lookup was pre-fetched once (`gh pr list --state merged --limit 800 --json number,headRefName,headRefOid,mergedAt`, 279 PRs) and injected through the classifier own `ClassifyDeps.fetchMergedHeadOid` seam, keyed newest-first per head ref — the same value `gh pr list --head <branch> -q .[0].headRefOid` returns per call. The predicate itself was not reimplemented.

## Worktrees — 22 green, 39 red, 59 yellow

### GREEN — removal-safe, pending batch confirmation (22)

Clean trees whose content is durably on `origin`. Removing the directory leaves the branch and its commits intact in the repo (`git worktree remove` deletes only the directory).

| Worktree | Branch | Evidence | node_modules |
| --- | --- | --- | --- |
| `PRISM-skill-improvements` | `hmcgrew/wave-2-epic-closeout` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #46 | yes |
| `PRISM/.claude/worktrees/seed-twin-install-layout-fix` | `huntermcgrew/prism-followup-seed-twin-install-layout` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #443 | no |
| `PRISM/.claude/worktrees/wf_018538aa-eb3-3` | `huntermcgrew/prism-429-linear-literals` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #433 | yes |
| `PRISM/.claude/worktrees/wf_1e6d0e19-737-1` | `huntermcgrew/prism-review-loop-self-audit` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #447 | no |
| `PRISM/.claude/worktrees/wf_2aeed14a-a08-1` | `huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #442 | no |
| `PRISM/.claude/worktrees/wf_2aeed14a-a08-4` | `pr442-fix` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-1` | `huntermcgrew/prism-followup-dangling-manifest-routes` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #440 | no |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-8` | `pr440-work` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_73ebd82b-07b-1` | `huntermcgrew/prism-430-bom-guard-whole-buffer` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #432 | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-3` | `huntermcgrew/prism-completeness-check` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #437 | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-7` | `clove-fix-437` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-8` | `pr437-review` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-5` | `huntermcgrew/prism-427-428-verdict-wiring` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #435 | no |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-1` | `huntermcgrew/prism-cli-multimain-dispatch` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #436 | no |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-5` | `clove-fix-436` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-7` | `pr436-fix` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_dd696691-8a6-1` | `huntermcgrew/prism-445-response-shape-contract` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #446 | yes |
| `PRISM/.claude/worktrees/wf_dd696691-8a6-2` | `huntermcgrew/prism-445-persona-ordering` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-12` | `pr443-review-fix` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-14` | `clove-fix-443` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin | no |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-1` | `huntermcgrew/prism-port-2196-worktree-lifecycle` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #439 | no |
| `PRISM/.claude/worktrees/wf_f269891d-39d-1` | `huntermcgrew/prism-port-2197-surface-decisions` | pushed — clean tree; upstream configured and `rev-list --count @{u}..HEAD` is 0 — content is on origin — merged PR #438 | no |

### RED — preserve, never auto-remove (39)

| Worktree | Branch | Evidence | node_modules |
| --- | --- | --- | --- |
| `PRISM` | `huntermcgrew/prism-w2-01-worktree-node-modules-setup` | unpushed-commits — clean tree, but commits ahead of upstream not contained in any merged PR shipped commit — open PR #451 | yes |
| `PRISM/.claude/worktrees/agent-a2911611588d6c852` | `worktree-agent-a2911611588d6c852` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/agent-a4d94637f8f13f80d` | `worktree-agent-a4d94637f8f13f80d` | tracked-changes — tracked uncommitted changes present | yes |
| `PRISM/.claude/worktrees/agent-a50cbf64f3b03e323` | `worktree-agent-a50cbf64f3b03e323` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/agent-a8386bb7ddd4d164a` | `hmcgrew/epic-a-pr2-adr0058` | unpushed-commits — clean tree, but commits ahead of upstream not contained in any merged PR shipped commit — merged PR #182 | yes |
| `PRISM/.claude/worktrees/ecstatic-lumiere-0f885d` | `claude/ecstatic-lumiere-0f885d` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/issue-52-manifest-array` | `hmcgrew/issue-52-manifest-array-routing` | tracked-changes — tracked uncommitted changes present — merged PR #87 | yes |
| `PRISM/.claude/worktrees/wf_09f60f5a-015-1` | `worktree-wf_09f60f5a-015-1` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-13` | _detached_ | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-14` | `worktree-wf_48c9f289-e5d-14` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-15` | `worktree-wf_48c9f289-e5d-15` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-17` | `worktree-wf_48c9f289-e5d-17` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-21` | _detached_ | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-22` | _detached_ | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-25` | `worktree-wf_48c9f289-e5d-25` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_48c9f289-e5d-9` | `worktree-wf_48c9f289-e5d-9` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_4cc640e3-0a5-2` | `huntermcgrew/prism-445-task12-coldread` | unpushed-commits — clean tree, but commits ahead of upstream not contained in any merged PR shipped commit | no |
| `PRISM/.claude/worktrees/wf_5d9ea4f8-fa9-5` | `huntermcgrew/prism-425-dist-lifecycle` | unpushed-commits — clean tree, but commits ahead of upstream not contained in any merged PR shipped commit — merged PR #434 | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-1` | `huntermcgrew/prism-completeness-check` | tracked-changes — tracked uncommitted changes present — merged PR #437 | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-10` | `worktree-wf_80dd0dd3-81f-10` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_b71becb1-6e8-5` | `worktree-wf_b71becb1-6e8-5` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_b71becb1-6e8-9` | `worktree-wf_b71becb1-6e8-9` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_c729250e-716-2` | `worktree-wf_c729250e-716-2` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_c729250e-716-3` | `worktree-wf_c729250e-716-3` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_ca27bfc6-cd6-10` | `worktree-wf_ca27bfc6-cd6-10` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_ca27bfc6-cd6-12` | `worktree-wf_ca27bfc6-cd6-12` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_ca27bfc6-cd6-14` | `worktree-wf_ca27bfc6-cd6-14` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_ca27bfc6-cd6-6` | `worktree-wf_ca27bfc6-cd6-6` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_ca27bfc6-cd6-9` | `worktree-wf_ca27bfc6-cd6-9` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-1` | `huntermcgrew/prism-427-428-verdict-wiring` | tracked-changes — tracked uncommitted changes present — merged PR #435 | no |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-2` | _detached_ | tracked-changes — tracked uncommitted changes present | yes |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-1` | `huntermcgrew/prism-followup-seed-twin-install-layout` | tracked-changes — tracked uncommitted changes present — merged PR #443 | yes |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-2` | _detached_ | tracked-changes — tracked uncommitted changes present | yes |
| `PRISM/.claude/worktrees/wf_f1bbe5dd-08b-10` | `worktree-wf_f1bbe5dd-08b-10` | tracked-changes — tracked uncommitted changes present | yes |
| `PRISM/.claude/worktrees/wf_f1bbe5dd-08b-19` | `worktree-wf_f1bbe5dd-08b-19` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_f1bbe5dd-08b-7` | `worktree-wf_f1bbe5dd-08b-7` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_f1bbe5dd-08b-8` | `worktree-wf_f1bbe5dd-08b-8` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wf_f269891d-39d-8` | `worktree-wf_f269891d-39d-8` | tracked-changes — tracked uncommitted changes present | no |
| `PRISM/.claude/worktrees/wonderful-shtern-06c0c8` | `claude/wonderful-shtern-06c0c8` | tracked-changes — tracked uncommitted changes present | no |

### YELLOW — ask, naming what is at risk (59)

| Worktree | Branch | Evidence | node_modules |
| --- | --- | --- | --- |
| `PRISM-eve` | `hmcgrew/docs-personas-business-layer` | untracked-only — clean tree with untracked-only files — nothing tracked at risk, but the untracked files would be lost — merged PR #241 | yes |
| `PRISM/.claude/worktrees/agent-a0744faa37a466743` | `hmcgrew/epic-a-pr4a-refs-theo` | untracked-only — clean tree with untracked-only files — nothing tracked at risk, but the untracked files would be lost — merged PR #184 | yes |
| `PRISM/.claude/worktrees/agent-a165e1437659d4526` | `hmcgrew/prism-188-wire-check-types` | untracked-only — clean tree with untracked-only files — nothing tracked at risk, but the untracked files would be lost — merged PR #204 | yes |
| `PRISM/.claude/worktrees/agent-a9c800ed8e3a01548` | `hmcgrew/epic-a-pr4b-flatten` | untracked-only — clean tree with untracked-only files — nothing tracked at risk, but the untracked files would be lost — merged PR #183 | yes |
| `PRISM/.claude/worktrees/agent-ac92d5782e0e24482` | `hmcgrew/prism-163-crossref-lint` | untracked-only — clean tree with untracked-only files — nothing tracked at risk, but the untracked files would be lost — merged PR #175 | yes |
| `PRISM/.claude/worktrees/issue-5-ghost-adrs` | `hmcgrew/issue-5-ghost-adrs` | untracked-only — clean tree with untracked-only files — nothing tracked at risk, but the untracked files would be lost — merged PR #88 | yes |
| `PRISM/.claude/worktrees/prompt-self-refinement-hook-fa6cb6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/thr-1198-review-comments-74c636` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_018538aa-eb3-4` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_018538aa-eb3-5` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_018538aa-eb3-6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_2aeed14a-a08-2` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_2aeed14a-a08-6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_2f89f3cf-931-1` | `huntermcgrew/prism-backport-thrive-analysis` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_4cc640e3-0a5-1` | `local-445` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_5d9ea4f8-fa9-6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_5d9ea4f8-fa9-7` | `worktree-wf_5d9ea4f8-fa9-7` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_5d9ea4f8-fa9-8` | `worktree-wf_5d9ea4f8-fa9-8` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-10` | `worktree-wf_73b02f8c-a0c-10` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-3` | `worktree-wf_73b02f8c-a0c-3` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-4` | `worktree-wf_73b02f8c-a0c-4` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-7` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_73b02f8c-a0c-9` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_73ebd82b-07b-3` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_73ebd82b-07b-4` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-2` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-4` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-5` | `briar-review-prism-completeness-check` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_80dd0dd3-81f-9` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-10` | `worktree-wf_cc749247-0b0-10` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-11` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-2` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-7` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_cc749247-0b0-8` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-10` | `worktree-wf_cef3d8b0-571-10` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-3` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_cef3d8b0-571-9` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-10` | `worktree-wf_e5414887-ce9-10` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-13` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-3` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-4` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-5` | `worktree-wf_e5414887-ce9-5` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-6` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-7` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_e5414887-ce9-8` | `worktree-wf_e5414887-ce9-8` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-10` | `worktree-wf_efda123b-fe9-10` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-3` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-4` | `port-2196-fix` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-5` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-7` | `worktree-wf_efda123b-fe9-7` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | yes |
| `PRISM/.claude/worktrees/wf_efda123b-fe9-9` | `worktree-wf_efda123b-fe9-9` | no-upstream — no upstream configured and no merged PR — nothing proves the commits exist anywhere else | no |
| `PRISM/.claude/worktrees/wf_f269891d-39d-4` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_f269891d-39d-5` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/wf_f269891d-39d-7` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | yes |
| `PRISM/.claude/worktrees/wf_f269891d-39d-9` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |
| `PRISM/.claude/worktrees/winston-445-coldread` | _detached_ | detached-referenced — HEAD is detached; the commit is still reachable from a ref | no |

## Deferred

- Removal of the GREEN set — deferred pending the single batch confirmation from the human. Each GREEN entry is re-classified immediately before removal when that confirmation arrives; a worktree can flip away from GREEN between this listing and the confirm.
- Branch cleanup — out of scope for this lane. Leftover local branches after a worktree removal are a separate, lower-stakes concern.
