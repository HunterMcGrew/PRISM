# AC Verification — `opus5-port.md`, PR 2D (the deny gate)

- **Graded at SHA:** `3e2fba3afaa3e5cbb1da5e54f7338114d2925a25` (last code commit `22f98196`; the two commits above it are plan-only)
- **Branch:** `huntermcgrew/opus5-port-deny-gate` (PR #470, draft)
- **Date:** 2026-08-20
- **Environment:** worktree `.claude/worktrees/agent-a507b79a93c90415f`, macOS (darwin 25.5.0), node via `pnpm`. `git status --porcelain` empty before and after; `pnpm prism:build` and `pnpm prism:check` both left it empty. The only artifact either produced is `dist/`, which `.gitignore:22` excludes.
- **Scope:** the criteria PR 2D is responsible for — tasks D0–D10 — **plus AC-25**, which the earlier pass excluded as another PR's and which belongs here: this is the PR that narrows the routing tables in all three manifests and ships the computed route-anchoring rejection. AC-6, AC-8 through AC-18, AC-22 through AC-24, and AC-26 through AC-29 belong to other PRs in the stack and are not graded here.

This is a full re-grade, not a patch of the earlier pass. Every verdict below was re-derived at this SHA and every citation resolves in the tree as it now stands. The prior grading ran at `de3d3430` with a targeted re-check at `9a7d1ebd`, and its citations pointed into a suite that has since been restructured — the write parser it was built around was deleted, the shell arm was inverted to refuse-unless-provable, and a tree-safe git subcommand set was added. Those verdicts are preserved in the re-check log at the bottom as history; nothing above the log is carried forward from them.

## Verdict table

12 criteria: **12 MET, 0 UNMET, 0 UNGRADEABLE.** Every verdict rendered at `3e2fba3a`.

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-1 | MET | executed | `pnpm prism:test` exit 0, 818/818, 0 skipped. `hook-gate.test.ts:1247` asserts the deny message by full equality — path, instruction sentence, and `cat .prism/architect/<doc>` remedy — across every entry in `WRITE_TOOL_NAMES`. |
| AC-2 | MET | executed | `hook-gate.test.ts:1336` (`Read`) and `:1343` (`cat`), both running `assertRemedyClearsTheGate` (`:1305`), which denies first and clears only through the announce arm — it never seeds. Positive control at `:1352` pins the rejection to the `"the write is denied before the remedy"` assertion. |
| AC-3 | MET | executed | `hook-gate.test.ts:1534` loops `Write`, `Edit`, and `Bash` over an unrouted path; all three return `null`. |
| AC-4 | MET | executed | `hook-gate.test.ts:1592` — a payload with no `session_id` returns `null` on a routed write. |
| AC-5 | MET | executed | `hook-gate.test.ts:1627` (announced-but-unread still denies) plus the ported credit-on-read cases in `architect-route.test.ts:157`, `:194`, `:244`, all passing against the `.mjs` runtime. |
| AC-7 | MET | executed | `hook-gate.test.ts:359` (with session id, state deleted and the doc re-announces), `:386` (subagent state files clear with the parent), `:418` (a prefix-sibling is spared), `:445` (no session id — seeds real state, asserts the file survives, then asserts suppression still holds). |
| AC-19 | MET | executed (derived filter) | ADR-0072 present at `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md`; `pnpm prism:check` runs `crossref-lint` green; D6's corrected grep across all five roots returns nothing. See § Note on AC-19's evidence line. |
| AC-20 | MET | executed | `pnpm prism:build` exit 0; `pnpm prism:check` exit 0. |
| AC-21 | MET | executed | `pnpm prism:check` exit 0; no drift reported outside the curated set. |
| AC-25 | MET | executed | `pnpm prism:verify-manifest` exit 0 over all three manifests (`verify-manifest-coverage.ts:272`); the rejection is a computed leading-literal test (`lib/manifest-routes.ts` `checkRouteIsAnchored`); `verify-manifest-coverage.test.ts:147` covers all five wildcard-only spellings and `:169` is the leading-literal negative control. See below. |
| AC-30 | MET | executed | `hook-gate.test.ts:1505` asserts both directions. The deny arm resolves its key through `spec.scopeId(payload)` (`hook.mjs:1117`), the same resolver the announce arm uses at `:964`, not `session_id` directly. |
| AC-31 | MET | executed | Two dated sweep tables in `## History` (D0 at plan line 1051, D10 at 1071), one row per task D0–D10. Every row's command re-run literally reproduces its recorded result. See below. |

## AC-25 — MET (first grading)

**Criterion:** No manifest route matches every path, and the rejection is computed rather than blacklisted.

**Evidence procedure followed, in the order the Evidence line names it.**

*Half one — `pnpm prism:verify-manifest` green across all three manifests.* Exit 0. The three the structural checks run against are named at `scripts/ai-skills/verify-manifest-coverage.ts:272`: `.prism/architect/manifest.json`, `.prism/architect/_toolkit/manifest.base.json`, and `templates/install/.prism/architect/manifest.stub.json` — the set the Evidence line asks for, not a subset. The same two structural checks run inside `prism doctor` at `doctor.ts:494`, at severity `error`, importing from the shared `lib/manifest-routes.ts` so the shipped surface and the development gate answer the question identically.

*Half two — the rejection is computed, not enumerated.* `checkRouteIsAnchored` (`lib/manifest-routes.ts`) is three lines:

```ts
const firstSegment = pattern.split("/")[0];

return firstSegment.replaceAll("*", "").length > 0;
```

That is the property "the route constrains something" stated directly. It carries no spelling list, so there is no enumeration for the next catch-all spelling to walk past — which is the criterion's UNMET signature.

*Half three — the unit case covers every wildcard-only opening segment plus a leading-literal control.* `verify-manifest-coverage.test.ts:147` loops all five spellings the Evidence line names — `**`, `*`, `**/*`, `*/**`, `**/**` — and asserts each produces exactly one failure. It then pins why a probe is insufficient, asserting that `compileMatcher("**/*")("")` is `false` while `compileMatcher("**/*")("scripts/ai-skills/build.ts")` is `true`: the spelling an empty-string probe accepts still matches every nested path. `:169` is the negative control — three routes opening with a literal segment, including `.prism/**` and `scripts/**/*.ts`, produce zero failures. Both pass inside the 818.

*Independent check of the invariant itself.* Rather than trusting the gate to police its own tree, every `manifest*.json` in the repo was parsed and its keys tested for a wildcard-only first segment directly. Zero across all ten, the three checked manifests and their seven build-managed mirrors included.

**Two things a reader should not take from this MET.**

The narrowing this PR performed and the property this criterion asserts are adjacent, not identical. What the three tables carried before was `.prism/**`, and `.prism` is a literal first segment — `checkRouteIsAnchored` returns `true` for it. Replaying every commit from `origin/main` through head against the anchoring test confirms no wildcard-only route has ever existed in the three checked manifests on either main or this branch. So AC-25's first clause held before this PR as well; what this PR contributes is the second clause, the computed enforcement that keeps it holding, plus the separate narrowing of an over-broad-but-anchored route. Grading this criterion here is still right — the enforcement is this PR's code, and it is what makes the clause consequential rather than incidental — but the MET is not evidence that a live catch-all was caught and removed.

One consequence of the narrowing is visible in the verify-manifest output and is worth naming: the `fallthrough` scope now resolves to `[]`. A path matching no route loads no architect doc, which is the intended shape under a deny gate — an unrouted write is not denied (AC-3) and now also announces nothing. It is a behavior change from `.prism/**`'s blanket coverage, chosen deliberately per the plan's Decision on narrowing, and it is not something AC-25 grades.

## AC-31 — MET

**Criterion:** Every task in PR 2D ships a verify line that was re-derived against the implementation as it landed, not inherited from the task as it was authored.

**Structural half — passes.** Two dated sweep tables sit in `## History`: D0's, dated 2026-08-19 and pre-implementation, at plan line 1051; D10's, dated 2026-08-19 and post-implementation, at 1071. Each carries one row per task across D0–D10, a superset of the required D1–D10, with a `held` / `fixed` / `amended` disposition on every row.

**Command half — every row reproduces.** Each non-`held` row's corrected command appears in its task's **Verify** line and was re-run literally from the repo root:

| Row | Recorded | Observed at `3e2fba3a` |
| --- | --- | --- |
| D3 (`fixed`) | five mirrors named, exit 0 | five paths listed, exit 0 — `.cursor/rules/context-reuse.mdc` among them |
| D5 (`amended`) | `1` for both | `seed-curation.json:1`, `ship-closure.ts:1` |
| D9 (`amended`) | `1` for both pairs | `## Write gate` → `1` and `1`; `PRISM_HOOK_DENY_DISABLE` → `1` and `1` |

**Positive control — two `held` rows re-run, both reproduce.** D6's row records *"The re-derived grep returns nothing"*: the five-root grep with the plans filter returns no output, exit 1. D1's row records *"→ `1` and `1`"*: `grep -c '"PreToolUse"' .claude/settings.json templates/install/.claude/settings.json` returns `1` for each. The table is not a table of commands nobody ran.

**Where the D10 table has gone out of date, and why it does not flip the verdict.** D7's `held` row records `pnpm prism:test` at *"798 tests / 798 pass / 0 fail, 0 skipped"* and *"`hook-gate.test.ts` alone: 57 cases"*. Today the suite is 818/818/0 with 0 skipped and `hook-gate.test.ts` carries 75 cases. The disposition the row rests on — exit 0, the command reaching the whole surface the task changes — still holds; the frozen counts do not.

That divergence is inherent to what AC-31 asks for. Task D10 places its sweep *"before the PR goes up for review"*, and nine review rounds have landed since, so a dated snapshot that still reproduced its counts exactly would mean review changed nothing. The criterion grades verify lines, and every verify line still reaches what its task changes and returns what its row claims.

**Named limitation, carried forward rather than graded.** The D10 sweep's commentary describes machinery that review has since replaced — D3's row credits a `segmentHasInPlaceFlag` segment scanner that the round-3 inversion deleted along with the whole write parser. No third sweep was run after that rewrite. AC-31 does not ask for one; the axis-3 concern D10 exists to catch (the implementation changing shape mid-PR) did recur after the sweep's window, and a reader should know the tables predate the current design even though the lines they certify still hold.

## Note on AC-19's evidence line

AC-19 grades MET, and its evidence line as written still does not do what its own prose says. Run literally at head it returns two hits:

```
.prism/plans/issue-408.md:60
.prism/plans/opus5-port.md:599
```

Both are plan files quoting the retired string — exactly what the filter `grep -v "^\./\.prism/plans/"` is meant to remove. It does not remove them: `grep -rn` over the roots `.ai-skills/ .prism/` emits paths with no `./` prefix, so the anchor never matches. AC-14 in the same plan handles this with `grep -vE "^(\./)?\.prism/(plans|audits)/"`, and D6's own verify line uses the unprefixed anchor and works.

The invariant AC-19 asserts holds, proven by D6's broader command over all five roots returning nothing at this SHA. The defect is in AC-19's evidence line and belongs to Winston rather than to this PR's diff. This finding is unchanged from the earlier pass and was re-executed here rather than carried over.

## Observation outside this PR's diff

`verify-manifest-coverage.ts`, in the JSDoc above the three-manifest list, states that *"the `**` catch-all this gate exists to reject shipped in the consumer-facing stub."* No wildcard-only route has ever been in that stub — what shipped there was `.prism/**`, which is anchored and which this gate does not reject. The sentence predates this PR (it is present at `origin/main` and untouched by the diff), so it is not this PR's to fix and is recorded here only because a reader arriving at AC-25 through that comment would take the wrong history from it.

## Criteria awaiting human verification

No criterion in the plan's AC set is tagged `human`, and none is contingent on task D8.

**D8 is unrun and stays unrun.** The `[HITL]` end-to-end run against a live Claude Code host cannot happen in a dispatched session — there is no live host. Clove states this in the PR body under **What is not proven** and in `## PR Readiness (PR 2D)`, and the D10 sweep records D8 as `held` with "unrun in this lane." This is an accurate report of an outstanding item, not a gap papered over.

Its significance is real and unchanged by the green suite: every leg in `hook-gate.test.ts` synthesizes its own payload, so none of them can catch a payload-shape mistake, which is the one thing D8 exists to catch. Claude's `permissionDecisionReason` shape comes from a live measurement recorded in `## Decisions`, not from a run of this code.

**Merge-gate checklist for a human at a live host:**

- [ ] A `Write` or `Edit` to a routed path is denied, and the denial appears in the transcript.
- [ ] The message renders legibly — the path, one `cat` line per unread doc, no escaping artifacts.
- [ ] A full `Read` of each named doc clears the deny; the retried write lands.
- [ ] A `cat` of each named doc also clears it.
- [ ] A subagent doing routed work is denied on its own budget after the parent has already read the doc.
- [ ] A write to an unrouted path is not denied.
- [ ] A shell command the read-arm cannot prove is a read is rerouted rather than credited, and the reroute message is legible.

## Re-check log

- 2026-08-19 — initial grading at `de3d3430`. 11 criteria: 9 MET, 2 UNMET (AC-7, AC-31), 0 UNGRADEABLE.
- 2026-08-19 — targeted re-check of AC-7 and AC-31 at `9a7d1ebd`. Both MET. AC-7: the no-session `PostCompact` case gained real seeded state and a survival assertion. AC-31: D3's verify line was corrected to `.cursor/rules/context-reuse.mdc` and its D10 row moved from `held` to `fixed`.
- 2026-08-20 — **full re-grade at `3e2fba3a`**, all machine evidence re-run at one SHA. 12 criteria: 12 MET, 0 UNMET, 0 UNGRADEABLE. AC-25 graded for the first time. No verdict from the two earlier passes flipped; every citation above was re-derived against the current tree rather than carried forward, because the suite the earlier citations indexed no longer exists in that shape.
