# Retro — PR 2B (Credit channel: Bash reads, `Grep`, full-read-only credit), run `architect-gate-port`

**Target:** `.prism/plans/opus5-port.md` § PR 2B (tasks B1–B3; B4 is `[HITL]` and out of this PR by design); PR [#462](https://github.com/HunterMcGrew/PRISM/pull/462)
**Grain:** per-pr
**Generated:** 2026-08-19

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
|---|---|---|---|---|
| 1 | Did we do what we said we'd do? | yes | § PR 2B tasks B1–B3, AC-24, `## History` (2 entries), branch diff `18961c02^..22c163c6` | — |
| 2 | Issues / bottlenecks? | not evaluated at this grain | — | per-pr grain covers items 1/4/5/6 |
| 3 | Actionable improvements? | not evaluated at this grain | — | surfaced below as findings and one action item rather than scored |
| 4 | Followed code standards? | yes | `## Review Issues` (5 entries + Angle Coverage), PR issue-comment on #462, `gh pr checks 462` | — |
| 5 | Anything wrong? Better path? | yes | `## Review Issues`, `## Decisions` (2 new), `## Sessions` (2 lines, both `close: scope held`) | — |
| 6 | Tests passing (CI record)? | yes | `gh pr checks 462` — both legs pass at `22c163c6`; `pnpm prism:check` exit 0, 733 `ok` | — |

Evidence counts: 2 new `## Decisions` entries, 2 `## Sessions` lines, 2 `## History` entries, 5 `## Review Issues` entries scoped to 2B (4 `fixed`, 1 `deferred`) plus an Angle Coverage block, 1 `## PR Readiness` line appended. Diff: 9 files, +563/−23. PR-thread surface: 1 issue-comment (Eric's final clean pass — earlier round summaries are edited in place per his convention, so the round-1 minor is visible only through the plan's `## Review Issues`, not the thread). CI: `prism-check (ubuntu-latest)` and `prism-check (windows-latest)` both pass at HEAD `22c163c6`. No `## PR Readiness (PR 2B)` block exists — the plan carries blocks for PR 1 and PR 2A only; readiness for 2B is evidenced through `## Review Issues` dispositions and Eric's checklist in the PR comment instead.

## Fidelity gap

**Shipped vs. said — met on B1–B3.** B1 (`Grep` row at kind `search`, `Bash` at `shell`, the five shell read forms parsed), B2 (`Read` credits only with `offset` and `limit` both absent; Bash credits only a flagless `cat`), and B3 (every B1/B2 behavior plus the `Grep` negative control) are all evidenced in `hook-gate.test.ts` (+239 lines) and confirmed by Eric's independent suite run at head. AC-24 — "credit lands only on a read with no range restriction" — is 2B's own acceptance criterion and its named evidence commands are the cases that shipped. The AC checkbox stays unticked in the plan, consistent with how 2A left its own: the plan ticks AC boxes at plan close, not per-PR.

**B4 is not a miss.** It is `[HITL]`, needs a live host, blocks D2 rather than this PR, and both design branches are pre-specified in the plan so the probe selects a branch instead of reopening the design. The `## Sessions` line names it untouched. Graded as out of scope, per the plan's own task marking.

**Review-clean — reached in two rounds each, both reviewers converging on the same defect class.** Briar round 1: 1 major + 2 minors; round 2 clean, verified independently. Eric round 1: 1 minor; round 2 clean, `confidence:high`, `review:has-minors` removed. One finding was deferred with a stated reason rather than fixed (see Finding 3).

**CI — green on both legs.** Both `prism-check` legs pass at `22c163c6`. `pnpm prism:check` exit 0, 733 `ok`.

## Findings — evidence, not conclusions

### 1. Both review rounds found an over-credit — the exact defect class this PR exists to prevent — and the implementation pass found neither

**Evidence.** Round 1, `## Review Issues` § "A newline in a Bash command is a command separator `SHELL_CONTROL_CHARACTERS` does not bail on": the bail set covered `|&;<>` and `` ` ``/`$(` but not `\n` or `#`, so `parseShellReadTargets("cat a.md\ngrep foo .prism/architect/_toolkit/spec-editing.md")` returned four targets, all `credit: true`, including a doc that was only a grep haystack. Round 2, § "Shell targets resolve relative operands against the repo root, not the command's `cwd`": `parseShellReadTargets` returned the raw operand and `resolveArchitectNag` resolved it against the repo root, so a session rooted in a subdirectory issuing a repo-root-relative `cat` **failed the command yet credited the doc** — `PostToolUse` fires regardless of exit code.

**Why this is one finding and not two.** Both are the same shape: the parser reasons about the *token* and never about what the shell would actually have done with it. The newline case treats a separator as an operand; the cwd case treats an operand as resolvable from the wrong base. The PR's own Decision states the invariant plainly — *"an under-credited read costs one re-read, while an over-credited one silently defeats the gate"* — and the implementation shipped two over-credits against it. Neither reviewer found the other's; each surfaced exactly one.

**The structural reading, stated as inference rather than measurement.** The parser's own `## Decisions` entry defends the *bail-set* approach ("bail on `|`, `&`, `;`, `<`, `>`, backtick, and `$(`") — a deny-list. Both defects are deny-list misses: a separator not enumerated, and a resolution base not considered. The self-review named the class precisely in round 1 (*"the operand loop treats every non-flag token as a path, so anything that is not a path but is not flag-shaped is credited as one"*), and the round-2 defect is a second instance of that same class arriving through a different door. Whether an allow-list — credit only an operand that resolves to an existing file under a routed prefix — would have closed both is not something this evidence establishes; it is the question worth asking before 2D consumes the `read` array.

### 2. Both fix passes ran a positive control, and both times the reviewer re-ran it rather than accepting the claim

**Evidence.** Round 1: the plan's `## History` records *"the three new bail forms were control-checked against the old regex"* — all three pass the old regex and bail on the new one. Round 2: the `## Review Issues` fix note states *"control checked by reverting the resolution and confirming the subdirectory leg fails."* Eric then re-ran it himself: *"I re-ran the positive control independently rather than taking it on report — reverting the `path.resolve(cwd, …)` and re-running gives exactly `not ok 26 - runPostToolUseArm: a relative cat resolves against the payload cwd, not the repo root`, with the other 28 still green; tree restored afterward."* His Citation-integrity axis lists the control claim as one of three items enumerated and verified, not assumed.

**What this bought, concretely.** It converts "the test is green" into "the test fails for the right reason and only that reason" — 1 targeted failure out of 29, not a broad red. This is the same practice PR 2A's retro recorded as finding 5 (verification asymmetry), now appearing on both sides of a handoff rather than only on the author's. That closing ceremony judged the pattern already implied by two existing lessons and declined to append it; 2B is a second occurrence, which is worth noting for whoever next weighs that call.

### 3. The deferral was strengthened at the point where deferrals normally leak

**Evidence.** `## Review Issues` § "A `cat` whose output the host truncates still credits in full" is `deferred` with a stated reason — credit is decided from the call shape, never the delivered bytes, so a flagless `cat` of a host-truncated doc credits in full. The same gap is now written into task D5's own text: *"A second Consequences bullet states the credit channel's call-shape gap … Carried from PR 2B's self-review."* Eric's Spec findings confirm every one of the four PR #462 entries carries a disposition, and names this one *"a deliberate, recorded call, not an omission."*

**Why the double-record matters.** A deferral recorded only in `## Review Issues` depends on someone re-reading that section when D5 is written. Writing it into D5's task text makes ADR-0072 pick it up as a named consequence through the task the ADR author is already executing. The failure mode this avoids is the plan-entry-nobody-re-reads, which is a recurring shape in this run — 2A's finding 3 (announce-once truncation) was a cross-step invariant no single reader saw.

### 4. Two cleaner-path calls were made on the "can this over-credit?" axis, both correctly

**Evidence, recorded because a clean outcome is also data.** § "The operand loop carried per-command grammar for two commands that can never credit" removed the `head`/`tail` `-n` skip and `sed`'s `operands.slice(1)`; net −9 lines. Eric verified the safety argument rather than accepting it: `checkRouteIsAnchored` in `verify-manifest-coverage.ts` requires every manifest route to open with a literal segment, so no route can match a bare `20` or `1,20p`. Separately, `less`/`more` were **kept** in `SHELL_READ_COMMANDS` despite no observed traffic, on the reasoning that removing them is a behavior change without a reason (`## Sessions`, silent decisions). Both calls resolve against the same test — does this change what can credit? — which is the right axis for this PR.

One note Eric raised that is not a defect and should not be lost: the new `Glob` test *"pins the write-default path (an unlisted tool announces without crediting) rather than the widened `?? payload.tool_input?.path` fallback itself — removing the fallback leaves it green."* The test guards a real, adjacent claim; it just is not the claim its name suggests.

## Action Items

- [ ] Before D1 consumes the `read` array, decide whether `parseShellReadTargets` keeps its deny-list bail set or moves to an allow-list (credit only an operand resolving to an existing file under a routed prefix). Two over-credits in two review rounds is the evidence; the deny-list is a `## Decisions` entry, so changing it is a Decision-level call, not an implementation tweak. — proposed owner: winston

## Promotion cautions

- **"A shell command carrying any pipeline, redirect, or substitution character parses to zero targets."** Its verdict reads `→ no promotion needed (parser scope for one function; the comment on it is the durable record)`, so it is not a promotion risk in the architect-doc sense. It is flagged here for the *other* half of the ceremony: the entry as written enumerates `|`, `&`, `;`, `<`, `>`, backtick, and `$(` — the pre-fix set. The shipped set also bails on `\n`, `\r`, and `#`. Whoever closes this plan should correct the entry to the shipped predicate before it is read as spec, per `code-standards.md` § Removal and rename completeness ("a changed *behavior* has the same reach as a rename but no token to grep"). Corrected, not demoted — the decision itself held.

- **"Read credit is the caller's judgment, opt-in per call, and `resolveArchitectNag` credits nothing by default."** Verdict `→ promotion pending — PR 2D's ADR-0072`. Upheld by the execution record — the `{ credit }` default-`false` seam is what made both fixes narrow, and neither defect was in the seam. No caution beyond the pending status the plan already carries; the action item above concerns the parser inside it, not the seam.

## Citations

### Plan evidence
- `.prism/plans/opus5-port.md` § PR 2B tasks B1–B4 (lines 349–375)
- `.prism/plans/opus5-port.md` § Acceptance Criteria — AC-24
- `.prism/plans/opus5-port.md` § Decisions — the two 2B entries (credit opt-in; shell control-character bail)
- `.prism/plans/opus5-port.md` § Review Issues — 5 entries scoped to 2B, plus Angle Coverage
- `.prism/plans/opus5-port.md` § Sessions — 2 lines, branch `huntermcgrew/opus5-port-credit-channel`, both `close: scope held`
- `.prism/plans/opus5-port.md` § History — 2 entries, same branch
- `.prism/plans/retros/architect-gate-port/pr-2a.md` — findings 3 and 5, referenced above

### Execution record
- `git log 18961c02^..22c163c6` — `18961c02` (B1–B3), `25787370` (Briar plan record), `0e52d327` (round-1 fix), `22c163c6` (Eric fix); diff 9 files, +563/−23
- `gh pr checks 462` — both `prism-check` legs pass at `22c163c6`
- `gh pr view 462` — draft, labels `confidence:high` + `effort:quick`
- `gh api repos/HunterMcGrew/PRISM/issues/462/comments` — 1 comment, Eric's clean-pass summary (zero findings, independent control re-run, 8 axes swept + 1 `n/a`)
