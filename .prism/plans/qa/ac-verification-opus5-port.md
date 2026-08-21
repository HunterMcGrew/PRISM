# AC Verification — `opus5-port.md`, PR 2D (the deny gate)

- **Graded at SHA:** `edb05927` (head). The prior full pass ran at `3e2fba3a`; five commits have landed since, four of them touching graded ground.
- **Branch:** `huntermcgrew/opus5-port-deny-gate` (PR #470, draft)
- **Date:** 2026-08-20
- **Environment:** worktree `.claude/worktrees/agent-a507b79a93c90415f`, macOS (darwin 25.5.0), node via `pnpm`. `git status --porcelain` empty before and after; `pnpm prism:build` and `pnpm prism:check` both left it empty. The only artifact either produced is `dist/`, which `.gitignore:22` excludes.
- **Scope:** the criteria PR 2D is responsible for — tasks D0–D10 — **plus AC-25**, which the earlier pass excluded as another PR's and which belongs here: this is the PR that narrows the routing tables in all three manifests and ships the computed route-anchoring rejection. AC-6, AC-8 through AC-18, AC-22 through AC-24, and AC-26 through AC-29 belong to other PRs in the stack and are not graded here.

Two things in this report were wrong when it was written at `3e2fba3a` and are corrected here rather than quietly overwritten — see § Corrections to the prior pass. Every verdict below was re-derived at head and every citation resolves in the tree as it now stands. The prior grading ran at `de3d3430` with a targeted re-check at `9a7d1ebd`, and its citations pointed into a suite that has since been restructured — the write parser it was built around was deleted, the shell arm was inverted to refuse-unless-provable, and a tree-safe git subcommand set was added. Those verdicts are preserved in the re-check log at the bottom as history; nothing above the log is carried forward from them.

## Verdict table

12 criteria: **12 MET, 0 UNMET, 0 UNGRADEABLE.** Every verdict rendered at `edb05927`. No verdict moved under the five commits since `3e2fba3a`; what moved is AC-25's evidence, which is now mechanism as well as population, and two frozen numbers inside AC-31's prose.

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-1 | MET | executed | `pnpm prism:test` exit 0, 822/822, 0 skipped. `hook-gate.test.ts:1247` asserts the deny message by full equality — path, instruction sentence, and `cat .prism/architect/<doc>` remedy — across every entry in `WRITE_TOOL_NAMES`. |
| AC-2 | MET | executed | `hook-gate.test.ts:1336` (`Read`) and `:1343` (`cat`), both running `assertRemedyClearsTheGate` (`:1305`), which denies first and clears only through the announce arm — it never seeds. Positive control at `:1352` pins the rejection to the `"the write is denied before the remedy"` assertion. |
| AC-3 | MET | executed | `hook-gate.test.ts:1534` loops `Write`, `Edit`, and `Bash` over an unrouted path; all three return `null`. |
| AC-4 | MET | executed | `hook-gate.test.ts:1592` — a payload with no `session_id` returns `null` on a routed write. |
| AC-5 | MET | executed | `hook-gate.test.ts:1627` (announced-but-unread still denies) plus the ported credit-on-read cases in `architect-route.test.ts:157`, `:194`, `:244`, all passing against the `.mjs` runtime. |
| AC-7 | MET | executed | `hook-gate.test.ts:359` (with session id, state deleted and the doc re-announces), `:386` (subagent state files clear with the parent), `:418` (a prefix-sibling is spared), `:445` (no session id — seeds real state, asserts the file survives, then asserts suppression still holds). |
| AC-19 | MET | executed (derived filter) | ADR-0072 present at `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md`; `pnpm prism:check` runs `crossref-lint` green; D6's corrected grep across all five roots returns nothing. See § Note on AC-19's evidence line. |
| AC-20 | MET | executed | `pnpm prism:build` exit 0; `pnpm prism:check` exit 0. |
| AC-21 | MET | executed | `pnpm prism:check` exit 0; no drift reported outside the curated set. |
| AC-25 | MET | executed (population + mechanism) | `pnpm prism:verify-manifest` exit 0 over all three manifests; zero wildcard-only keys across all ten `manifest*.json` in the tree; and a brute-force sweep of 1,043,910 anchored route spellings finds no route that clears `checkRouteIsAnchored` and still matches every path, against 141 such routes at the pre-fix parent. **Re-graded — see below; the prior MET rested on population evidence alone and was refuted on the mechanism axis.** |
| AC-30 | MET | executed | `hook-gate.test.ts:1505` asserts both directions. The deny arm resolves its key through `spec.scopeId(payload)` (`hook.mjs:1117`), the same resolver the announce arm uses at `:964`, not `session_id` directly. |
| AC-31 | MET | executed | Two dated sweep tables in `## History` (D0 at plan line 1051, D10 at 1071), one row per task D0–D10. Every row's command re-run literally reproduces its recorded result. See below. |

## AC-25 — MET (re-graded on the mechanism axis)

**Criterion:** No manifest route matches every path, and the rejection is computed rather than blacklisted.

**Why this criterion is being graded twice.** The prior pass graded AC-25 MET at `3e2fba3a` on evidence that was correct and incomplete: every `manifest*.json` in the tree was parsed and none carried a wildcard-only route. That is the population half. The criterion's second clause is that *no route can* match every path, and a route that clears the computed test while matching everything satisfies the first clause and falsifies the second. A parallel review found exactly that — `compileMatcher` escaped twelve regex metacharacters but not `?`, so `a?**` compiled to `/^a?.*$/` and matched every path in the repo while `checkRouteIsAnchored` read the `?` as the required literal, and `?*/**` compiled to a regex `RegExp` rejects, which the hook swallowed as a fail-open. Clove escaped `?` in `ee0fa46b`. The MET below is re-derived against the mechanism, not re-asserted from the population.

**Half one — population, re-run at head.** `pnpm prism:verify-manifest` exit 0 over the three manifests `verify-manifest-coverage.ts` names — `.prism/architect/manifest.json`, `.prism/architect/_toolkit/manifest.base.json`, and `templates/install/.prism/architect/manifest.stub.json`. `prism doctor` runs the same two structural checks at severity `error`, importing from the shared `lib/manifest-routes.ts`, so the shipped surface and the development gate answer identically. Parsing all ten `manifest*.json` in the tree directly — the three checked plus their seven build-managed mirrors — finds zero wildcard-only first segments.

**Half two — the rejection is computed.** `checkRouteIsAnchored` is two lines: take the first path segment, strip `*`, require what remains to be non-empty. No spelling list, so there is no enumeration for the next catch-all spelling to walk past.

**Half three — mechanism, the half the refutation demanded.** A route defeats the gate when the anchor test reads a character as literal that the matcher compiles as a wildcard. The escape set is the whole of what stands between those two readings, so the check is whether any string in the route language can split them. Every pattern of length 1–5 over the alphabet `* ? . + ^ $ { } ( ) | [ ] \ / a` was enumerated and, for each of the 1,043,910 that cleared `checkRouteIsAnchored`, `compileMatcher` was built and run against a corpus of 21 real repo paths spanning five top-level directories plus four synthetic ones:

| Tree | Anchored routes | Matches every corpus path | Throws on compile |
| --- | --- | --- | --- |
| head (`edb05927`) | 1,043,910 | **0** | **0** |
| pre-fix parent (`ee0fa46b^`) | 1,043,910 | 141 | 16,424 |

The pre-fix column is the positive control: the same probe, unchanged, finds the defect this criterion was refuted on — `**?`, `a?**`, and 139 siblings match everything, and 16,424 spellings throw `SyntaxError: Nothing to repeat` into the hook's catch. Zero of each at head is a measurement, not an absence of looking.

**One residual, named rather than folded into the verdict.** The sweep covers the printable route language. It does not cover the sentinel `compileMatcher` uses internally to protect `**` during escaping — a NUL character, the string `DOUBLE_STAR`, and a second NUL. A manifest key whose first segment is that exact 13-character sentinel followed by `*` clears the anchor test (13 literal characters survive the `*` strip) and compiles to `^.*[^/]*$`, which matches every path. It is the same failure shape as `?` one layer up: the anchor test reads the sentinel as literal, the matcher splits on it as a wildcard, and ADR-0072's stated principle — *"the test reads a character as literal when the matcher compiles it as one"* — is what breaks.

The verdict stays MET because the input is not reachable from the surfaces the criterion is about. Architect-manifest keys are hand-authored JSON; nothing under `scripts/` generates a route key from free text, and a NUL reaches a key only through a hand-written JSON escape for the NUL codepoint, which no editor emits by accident. All ten manifests in the tree were checked for a NUL in any key: clean. A reader who takes the second clause as an absolute rather than as a bound on authorable routes should treat this as the counterexample and overrule the verdict — the evidence is here to do that with. The one-line hardening that would make the reading true rather than accidental is to reject any manifest key containing a control character, alongside the existing catch-all and brace-glob checks in `lib/manifest-routes.ts`.

**What the MET does and does not say about the narrowing.** This PR narrowed `.prism/**` in all three routing tables. `.prism` is a literal first segment, so that route was anchored and this gate would never have rejected it — the narrowing and this criterion are adjacent, not the same work. One visible consequence, chosen deliberately per the plan's Decision on narrowing and not graded here: the `fallthrough` scope now resolves to `[]`, so a path matching no route loads no architect doc and is not denied (AC-3).

## AC-31 — MET

**Criterion:** Every task in PR 2D ships a verify line that was re-derived against the implementation as it landed, not inherited from the task as it was authored.

**Structural half — passes.** Two dated sweep tables sit in `## History`: D0's, dated 2026-08-19 and pre-implementation, at plan line 1051; D10's, dated 2026-08-19 and post-implementation, at 1071. Each carries one row per task across D0–D10, a superset of the required D1–D10, with a `held` / `fixed` / `amended` disposition on every row.

**Command half — every row reproduces.** Each non-`held` row's corrected command appears in its task's **Verify** line and was re-run literally from the repo root:

| Row | Recorded | Observed at `edb05927` |
| --- | --- | --- |
| D3 (`fixed`) | five mirrors named, exit 0 | five paths listed, exit 0 — `.cursor/rules/context-reuse.mdc` among them |
| D5 (`amended`) | `1` for both | `seed-curation.json:1`, `ship-closure.ts:1` |
| D9 (`amended`) | `1` for both pairs | `## Write gate` → `1` and `1`; `PRISM_HOOK_DENY_DISABLE` → `1` and `1` |

**Positive control — two `held` rows re-run, both reproduce.** D6's row records *"The re-derived grep returns nothing"*: the five-root grep with the plans filter returns no output, exit 1. D1's row records *"→ `1` and `1`"*: `grep -c '"PreToolUse"' .claude/settings.json templates/install/.claude/settings.json` returns `1` for each. The table is not a table of commands nobody ran.

**Where the D10 table has gone out of date, and why it does not flip the verdict.** D7's `held` row records `pnpm prism:test` at *"798 tests / 798 pass / 0 fail, 0 skipped"* and *"`hook-gate.test.ts` alone: 57 cases"*. Today the suite is 822/822 with 0 skipped and `hook-gate.test.ts` carries 76 cases. The disposition the row rests on — exit 0, the command reaching the whole surface the task changes — still holds; the frozen counts do not.

That divergence is inherent to what AC-31 asks for. Task D10 places its sweep *"before the PR goes up for review"*, and nine review rounds have landed since, so a dated snapshot that still reproduced its counts exactly would mean review changed nothing. The criterion grades verify lines, and every verify line still reaches what its task changes and returns what its row claims.

**Named limitation, carried forward rather than graded.** The D10 sweep's commentary describes machinery that review has since replaced — D3's row credits a `segmentHasInPlaceFlag` segment scanner that the round-3 inversion deleted along with the whole write parser, and the shell probe the sweep ran against was rebuilt again in `e831a250` to require exit codes and carry an `unproven` bucket. No third sweep was run after either rewrite. AC-31 does not ask for one; the axis-3 concern D10 exists to catch (the implementation changing shape mid-PR) did recur after the sweep's window, and a reader should know the tables predate the current design even though the lines they certify still hold.

## Note on AC-19's evidence line

AC-19 grades MET, and its evidence line as written still does not do what its own prose says. Run literally at head it returns two hits:

```
.prism/plans/issue-408.md:60
.prism/plans/opus5-port.md:599
```

Both are plan files quoting the retired string — exactly what the filter `grep -v "^\./\.prism/plans/"` is meant to remove. It does not remove them: `grep -rn` over the roots `.ai-skills/ .prism/` emits paths with no `./` prefix, so the anchor never matches. AC-14 in the same plan handles this with `grep -vE "^(\./)?\.prism/(plans|audits)/"`, and D6's own verify line uses the unprefixed anchor and works.

The invariant AC-19 asserts holds, proven by D6's broader command over all five roots returning nothing at this SHA. The defect is in AC-19's evidence line and belongs to Winston rather than to this PR's diff. This finding is unchanged from the earlier pass and was re-executed here rather than carried over.

## Corrections to the prior pass

Two claims this report made at `3e2fba3a` were wrong. Both are corrected in place above; they are restated here so a reader who saw the earlier version knows what moved and why.

**AC-25's MET rested on population evidence and was refuted on the mechanism axis.** The refutation and the re-grade are in § AC-25 above. The generalizable shape: a criterion with two clauses needs evidence for both, and "I enumerated every instance and found none" answers only the clause about instances. The clause about what the mechanism *permits* needs an attack on the mechanism.

**A live `**` catch-all did ship in the consumer-facing stub — the prior pass said it never had.** The earlier version carried an "Observation outside this PR's diff" claiming that the JSDoc in `verify-manifest-coverage.ts` — *"the `**` catch-all this gate exists to reject shipped in the consumer-facing stub"* — described history that never happened. It happened. Replaying every first-parent commit on `origin/main` and parsing `manifest.stub.json` at each one finds a literal `"**": "_toolkit/skills-ecosystem.md"` route present continuously through `536a01d3` (2026-08-18), removed by `34f0db16` — PR 2C, a sibling in this same stack, already on `main`. The JSDoc is accurate and needs no fix.

What produced the wrong claim: the prior pass replayed only the `origin/main..HEAD` range, saw `.prism/**` in every commit it looked at, and generalized to "ever." The range it searched could not contain the counterexample, and the sentence it wrote did not carry that bound. This also corrects the AC-25 caveat that read *"the MET is not evidence that a live catch-all was caught and removed"* — a live one was caught and removed, by PR 2C, and PR 2D ships the computed enforcement that keeps it out.

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
- 2026-08-20 — **re-grade at `edb05927` (head)** after AC-25's MET was refuted by a parallel review. 12 criteria: 12 MET, 0 UNMET, 0 UNGRADEABLE — no verdict flipped. AC-25 re-derived on the mechanism axis with a brute-force sweep and a pre-fix positive control; one residual named (the matcher's internal sentinel). Two prior-pass claims corrected — see § Corrections to the prior pass. Every other criterion re-checked against the four commits that landed after the `?` fix: `hook-gate.test.ts` citations for AC-1 through AC-5, AC-7, and AC-30 all still resolve to the same test names at the same lines; `pnpm prism:test` 822/822; `pnpm prism:build` and `pnpm prism:check` exit 0; AC-19's evidence-line defect reproduces unchanged; every AC-31 sweep row re-run and still reproducing.
- 2026-08-20 — full re-grade at `3e2fba3a`, all machine evidence re-run at one SHA. 12 criteria: 12 MET, 0 UNMET, 0 UNGRADEABLE. AC-25 graded for the first time. No verdict from the two earlier passes flipped; every citation above was re-derived against the current tree rather than carried forward, because the suite the earlier citations indexed no longer exists in that shape.
