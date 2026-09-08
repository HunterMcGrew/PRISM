# Retro — PR 2A (Hook runtime → zero-dependency .mjs), run `architect-gate-port`

**Target:** `.prism/plans/opus5-port.md` § PR 2A (tasks A1–A8); PR [#461](https://github.com/HunterMcGrew/PRISM/pull/461)
**Grain:** per-pr
**Generated:** 2026-08-18

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
|---|---|---|---|---|
| 1 | Did we do what we said we'd do? | yes | plan-AC (A6, A7, A10–A13, A22, A23), `## PR Readiness (PR 2A)`, `## History` | — |
| 2 | Issues / bottlenecks? | not evaluated at this grain | — | per-pr grain covers items 1/4/5/6 only; the run-log evidence (`.prism/plans/conductor/architect-gate-port.md`) shows real bottlenecks (the plan-provenance miss, two persona stalls) but synthesizing them into "bottleneck" findings is epic-grain work |
| 3 | Actionable improvements? | not evaluated at this grain | — | same as above; candidates are surfaced below as lesson candidates rather than scored against this charter item |
| 4 | Followed code standards? | yes | `## Review Issues`, PR issue-comments (`gh api .../461/comments`), `gh pr checks 461` | — |
| 5 | Anything wrong? Better path? | yes | `## Review Issues`, `## Decisions`, `## Sessions` close bullets | — |
| 6 | Tests passing (CI record)? | yes | `gh pr checks 461` (both legs), `## History` test counts | — |

Evidence counts: 1 Decisions block (39 entries touching PR 2A design), 9 Sessions lines for this branch, 9 History entries, 6 Review Issues entries scoped to 2A, `## PR Readiness (PR 2A — Hook runtime, #461)`. PR-thread surface: 1 issue-comment (the final clean summary — earlier round summaries were edited in place rather than appended, per Eric's own convention), `gh pr checks 461` shows 2 CI legs (ubuntu, windows), both `pass`. Merged-diff surface: not applicable — PR #461 is still open/draft, so "merged diff" is approximated by the PR's own diff at HEAD `bc5fe193`, per the plan's own "main-CI is approximated by the PR's own CI" caveat.

## Fidelity gap

**Shipped vs. said — met, with two deliberately-deferred items.** PR 2A's own ACs (A6/A7/A10–A13/A22/A23 — the deny-gate ACs A1–A5 and the range-credit AC-24 belong to 2D/2B, not 2A, per the plan's own task-ownership split) are all evidenced in `## PR Readiness (PR 2A)`: 716/716 tests, 0 skipped, `pnpm prism:check` exit 0, zero-dependency runtime confirmed by grep, no `PreToolUse`/deny code present (grep-confirmed in `## Review Issues` § Angle Coverage). Two `## PR Readiness` boxes are unchecked, both intentionally: "PR description up to date — not synced this pass" and "Lasting decisions promoted to architect context — deferred to plan close per the verdict-gate convention." Neither is a fidelity gap; both are stated deferrals with a named reason, which is what the convention asks for.

**Review-clean — reached, after four review rounds.** Eric's history on this PR: 9 Major + 8 Minor → 3 Minor (re-review) → 1 Major + 1 Minor ("clearing pass" — the M1 fix reintroduced M1's own defect class) → 0/0/0 ("delta pass," branch clean, `effort:deep` + `confidence:high`). The middle regression is real signal, not noise — a fix for one Major introduced a new one of the same shape, caught only because Eric re-measured rather than trusted the new test. See Finding 2 below.

**CI — green on both legs at HEAD.** `gh pr checks 461`: `prism-check (ubuntu-latest)` pass, `prism-check (windows-latest)` pass, both at `bc5fe193`. The Windows leg was itself one of the nine original Majors (a `mode & 0o111` assertion that cannot pass on Windows's `fs.chmod` semantics) — now fixed by skipping the leg with a documented, reasoned-not-run justification, and independently confirmed green in CI rather than only reasoned about.

## Findings — evidence, not conclusions

### 1. A conductor routing failure cost a full implementation cycle, and the lesson is already captured

**Evidence:** `.prism/plans/conductor/architect-gate-port.md` lines 175–182 — Clove's first 2A dispatch read the amended plan through an absolute path resolving into the shared main checkout's working tree, where the amendment sat uncommitted; the worktree's own branch (from `origin/main`) still carried the pre-split PR 2. Clove built all eight tasks against that content and returned `needs-replan` on discovering the gap — recorded in the plan's own `## Sessions` line as `close: **drifted**`. Sol's fix: a "commit-state check" (worktree clean, local HEAD equals origin, `pnpm prism:check` re-run by Sol) now gates every subsequent ratification in this run.

**Already a captured lesson — no new candidate needed.** `.prism/lessons.md` § "A worktree-isolated lane branches from origin/main…" (2026-07-21, amended 2026-08-18 with this exact incident): *"a lane read the uncommitted amendment through an absolute path that resolved into the shared main checkout, got real content, and built a full PR against it before noticing its own worktree carried the superseded version — so the consuming lane should resolve plan paths relative to its own root and treat a plan absent from `git ls-files` as absent, however a read outside the tree happens to succeed."* The lesson names the exact failure signature the dispatch brief calls out (real content returned, not a missing file). Verified: the lesson's date and PR reference match this lane.

### 2. A fix reintroduced the defect class it was closing — and this lesson is also already captured

**Evidence:** `## Review Issues` § "Prune re-selects its own `.bak`…" — `backupConsumerFile` copies bytes verbatim, so the M1 fix's own backup inherited `HOOK_RUNTIME_MARKER` and landed inside the directory `pruneStaleHookRuntimeFiles` enumerates, with no `.bak` filter. Measured over four consecutive `refreshHookRuntime` calls (conductor log line 230): `my-adapted-hook.mjs.bak` → `.bak.bak` → `.bak.bak.bak` → `.bak.bak.bak.bak`, one spurious `removed-with-backup` per cycle. The docstring at `update.ts:1060` — "a backup is only ever taken of a file that lacked the marker" — was the invariant that made the missing filter safe; the fix invalidated it while leaving the sentence standing.

**Already a captured lesson.** `.prism/lessons.md` § "A safety net that writes into the directory it scans will re-select its own output" (2026-08-18, opus5-port PR 2A, PR #461) states this incident nearly verbatim, including the "walk the scan against the artifact before writing the fix" remedy and the invariant-sentence-as-part-of-the-change guidance. No new candidate.

### 3. Announce-once/truncate cross-step invisibility — genuinely new, no existing lesson

**Evidence:** conductor log line 207 — "the highest-value find is a behavioral drift no prior pass caught — announce-once marked docs announced that `formatNag` then truncated away, so those docs are silenced for the session without ever being named." `## Review Issues` § "Eric's PR #461 review" table, finding P3, and the paired History entry measures the fan-out precisely: before, 382 named but 500 marked announced (118 silenced, never emitted, and a repeat read of one returned `null`); after, 382 named, 382 marked, 0 silenced. Briar (self-review), Eli (doc-staleness audit), and Sol (ratification) all passed over this — it is only visible reading `hook.mjs`'s announce step and `architect-route.mjs`'s `formatNag` truncation step against each other, not either function read alone.

**Lesson candidate (recommend, not written):** *"A behavioral contract that spans two functions — one that names items, one that later truncates the emission — is invisible to a review pass that reads each function on its own. Check cross-step invariants by reading the producing step and the consuming step side by side, specifically where one step's full output feeds a second step with a byte or count cap."* `grep -n "invisible\|cross-step\|read against each other\|silenc" .prism/lessons.md` returns nothing — this pattern is not yet in the lessons file.

### 4. Two persona stalls at worker tier, both resolved by escalating tier — partially new

**Evidence:** conductor log lines 198–200 (tagged `[strike]`, explicit) — Eli dispatched its own background sweep and stopped without collecting it, twice, producing no findings either time; the third dispatch, top tier with delegation forbidden, completed inline in one turn and found eight false claims. Line 206 — Eric's review verdict notes "Both axis agents did report in the end," which implies a wait on axis agents that had not yet reported, consistent with the dispatch brief's characterization, though Eric's stall is not `[strike]`-tagged the way Eli's is — the evidence for Eric's half of this finding is weaker (inferential from phrasing, not an explicit strike log entry) and should be read with that caveat.

**Related side-finding not in the original five, worth flagging:** conductor log line 223 — Eric separately escalated a claim that his install was "degraded" (`_shared/core.md` reading empty), which Sol checked and found false; the actual cause was likely a dispatch-prompt path-resolution gap (Sol's `p-*` agent-type dispatches may not carry the absolute skills-root path). Sol's own note: *"the fix belongs to Sol's dispatch prompts, not to any PR in this stack."* No existing lesson names this dispatch-prompt gap (`grep` for "skills-root", "_shared", "degraded" in `lessons.md` returns nothing).

**Lesson candidate (recommend, not written) — the strike pattern only, since it is the well-evidenced half:** *"When a worker-tier dispatch stalls twice on the same brief with zero output either time, the third attempt escalates tier and forbids sub-delegation rather than repeating the same dispatch shape a third time — that shape change, not persistence, is what resolved both 2A stalls (Eli's doc audit)."* This is a process pattern about dispatch-shape recovery, not about the underlying work.

### 5. Verification asymmetry — negative and before-state evidence outweighed passing-test evidence

**Evidence:** conductor log — Eric confirmed the settings-merge fix by reverting it and watching seven tests including the clobber/wrapper cases turn red (line 220), rather than trusting the new tests; Clove reproduced the M1 four-cycle backup loop on the unfixed tree before writing the filter (line 230's before/after table); the delta-pass confirmation ran the pre-fix `update.ts` side by side as a throwaway probe rather than reading the test (line 241, "eric confirmed the loop by running the pre-fix update.ts side by side… rather than reading the test"). The cold-start leg's negative control was explicitly upgraded from tautological to falsifiable (`## Review Issues` P2: "negative control is a tautology" → "control now breaks real delivered state").

No existing lesson names this pattern generally (as opposed to the two specific incidents already captured under findings 1 and 2). Whether it rises to its own lesson or is better read as the methodological throughline connecting findings 1, 2, and 3 is a judgment call for whoever reviews these candidates — flagged, not resolved, here.

## Action Items

- [ ] Sync PR #461's description before the human ready/merge gate — the `## PR Readiness` checklist has this box unchecked, and it is the one item on the list without a stated reason for staying open. — proposed owner: clove

## Promotion cautions

None. Every `## Decisions` entry touching PR 2A that the execution record tested was either upheld on its merits (content-keyed ownership, the anchored settings predicate, the name-matching `.bak` filter — all confirmed by Eric's delta-pass re-verification) or already self-corrected within the same lane before this retro ran (the prune-loop Decision and its `## PR Readiness` claim were rewritten in the same commit that fixed the code, per the plan's own `## History`). No refuted-but-unchanged Decision was found.

## Lesson candidates

1. **New — cross-step behavioral contracts** (Finding 3): a producer/truncator pair reviewed separately hides a drift neither function shows alone. Not yet in `.prism/lessons.md`.
2. **New — worker-tier stall recovery** (Finding 4, well-evidenced half): two zero-output stalls on the same brief resolve by escalating tier and forbidding delegation on the third attempt, not by repeating the dispatch. Not yet in `.prism/lessons.md`.
3. **Flagged, not resolved — dispatch-prompt path resolution** (Finding 4, side-finding): Sol's `p-*` agent dispatches may not carry the absolute skills-root path, producing a false "degraded install" escalation. Sol's own log names this as Sol's fix to make, not a lesson for the roster generally — routing question, not a lesson-file candidate as written.
4. **Already captured, verified current** (Findings 1 and 2): both lessons matched the incident precisely on inspection; no edit needed.

## Citations

### Plan evidence
- `.prism/plans/opus5-port.md` § PR 2A task list (A1–A8), lines 269–323
- `.prism/plans/opus5-port.md` § Acceptance Criteria — AC-6, AC-7, AC-10–AC-13, AC-22, AC-23 (2A-scoped)
- `.prism/plans/opus5-port.md` § Review Issues — "Eric's PR #461 review — 9 Majors, 8 Minors"; "Eric's re-review pass — 3 Minors"; "Prune re-selects its own `.bak`…"; "Standalone-spawn micro-test discards the output…"
- `.prism/plans/opus5-port.md` § PR Readiness (PR 2A — Hook runtime, #461)
- `.prism/plans/opus5-port.md` § Sessions (9 entries, branch `huntermcgrew/opus5-port-hook-runtime`)
- `.prism/plans/opus5-port.md` § History (9 entries, same branch)
- `.prism/lessons.md` §§ "A worktree-isolated lane branches from origin/main…", "A safety net that writes into the directory it scans will re-select its own output"

### Execution record
- `gh pr checks 461` — `prism-check (ubuntu-latest)` pass, `prism-check (windows-latest)` pass, both at HEAD `bc5fe193`
- `gh pr view 461` — draft, `MERGEABLE`, labels `effort:deep` + `confidence:high`
- `gh api repos/HunterMcGrew/PRISM/issues/461/comments` — 1 comment, the final clean-pass summary
- `.prism/plans/conductor/architect-gate-port.md` § Log, lines 174–241 (dispatch/verdict pairs for 2A, both `[strike]` entries, the commit-state ratification notes)
