# Retro — PR 2E (`prism doctor` route integrity and the ship-surface trim), run `architect-gate-port`

**Target:** `.prism/plans/opus5-port.md` § PR 2E (tasks E1–E5); PR [#464](https://github.com/HunterMcGrew/PRISM/pull/464)
**Grain:** per-pr
**Generated:** 2026-08-19

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
|---|---|---|---|---|
| 1 | Did we do what we said we'd do? | yes | § PR 2E tasks E1–E5, 4 new `## Decisions` entries, branch diff `34f0db16..6acd6fb4` | — |
| 2 | Issues / bottlenecks? | not evaluated at this grain | — | per-pr grain covers items 1/4/5/6 |
| 3 | Actionable improvements? | not evaluated at this grain | — | surfaced below as findings and three action items rather than scored |
| 4 | Followed code standards? | yes | 16 `## Review Issues` entries scoped to 2E, 2 Angle Coverage blocks, PR issue-comment on #464 | — |
| 5 | Anything wrong? Better path? | yes | `## Review Issues`, `## Sessions` (6 blocks, all `close: scope held`), 2 self-reported misses | — |
| 6 | Tests passing (CI record)? | yes | `gh pr view 464 --json statusCheckRollup` — both legs `SUCCESS` at HEAD `6acd6fb4`; 8 `PRISM Check` runs on the branch, all `success` | — |

Evidence counts: 16 `## Review Issues` entries scoped to 2E — 4 majors and 12 minors, all `fixed`, none deferred — across 2 Angle Coverage blocks. 6 `## Sessions` blocks on branch `huntermcgrew/opus5-port-doctor-shipsurface`, every one closing `scope held`. Diff `34f0db16..6acd6fb4`: 28 files, +1871/−345. PR-thread surface: 1 issue-comment, Eric's confirming-pass summary, edited in place across his four passes per his convention. Labels at HEAD: `confidence:high`, `effort:glance`. Still draft.

## Fidelity gap

**Shipped vs. said — met on E1–E5, with two tasks whose text was rewritten to match what they became.** E1's orphan check and E2's dead-route check landed and now read both shipped routing tables; E3's hook-registration check landed and parses `settings.json` rather than regexing it; E4's `ship-closure.ts` is wired into `pnpm prism:check` and reports four directions over 336 reachable files, all lists empty; E5's trim excludes what E4's report named, with `_toolkit/spec-editing.md` resolved by keeping it in the seed rather than dropping it. E4's Roots bullet and E1's and E5's verify lines were **re-derived mid-PR** because the tasks changed shape underneath them — Finding 3.

**Review-clean — Briar twice, Eric four times, converging on the closure's root set.** Briar round 1: 2 majors, 6 minors. Eric round 1: 2 majors, 2 minors. Briar's 3 round-2 minors and Eric's 1 round-2 minor followed, then a confirming pass on the plan repair. Every entry carries a `Fixed:` disposition with the control that proves it; nothing was deferred.

**CI — green at HEAD on both legs.** The gap PR 2C's retro recorded as Finding 5 (newest CI evidence three commits stale, readiness resting on a local run) does not recur: eight runs, the newest exercising `6acd6fb4` itself on ubuntu and windows.

## Findings — evidence, not conclusions

### 1. Every major in this PR was invisible to the checks the PR itself adds

**Evidence.** Four majors, two per round, and none of them was found by `checkArchitectRoutes` or `ship-closure`. Round 1: E5 removed `_toolkit/spec-editing.md` from the seed while the shipped `manifest.base.json` kept ~40 routes naming it — `ship-closure.ts` read only `CONSUMER_STUB_PATH` as a routing root and `checkArchitectRoutes` read only `architect/manifest.json`, so neither of the two tables that were actually wrong was in either check's field of view. Same round: the orphan check reported `[WARN] architect-route: 6 architect doc(s) on disk are named by no manifest route` against a freshly materialized consumer seed — the product's own default install state, warned about by the product's own new check. Round 2: `resolveDefaultRoots` seeded manifest **keys** as closure roots, making `docs/`, `AGENTS.md`, `build.ts`, `path-guard.ts`, `paths.json`, and `.prism/SPEC.md` roots and inflating the closure from 336 files to 372 — and that function had **zero test coverage**, all ten tests passing an explicit `roots:` array.

**The two round-2 majors are one defect and its reason.** The key-root bug lived entirely inside the one function nothing exercised, and round 1's class fix — read both shipped routing tables — had also landed inside it. A manual negative control was the only thing that had ever touched it. Untested code is not merely unverified; here it was the single place where two rounds of fixes accumulated, which is exactly the concentration that makes an absence of tests expensive rather than tidy.

**What generalizes is narrower than "new checks miss things."** A route-integrity check whose root set omits one of the two surfaces it is checking, and a closure whose root resolver is the only untested function in its module, are both the same shape: **the check's own definition of its input was never itself a subject of verification.** The assertions all pointed downstream of the roots.

### 2. The tracked-dangling list was silently dishonest, and PR 3's exit condition would have read as met

**Evidence.** `SHIP_CLOSURE_TRACKED_DANGLING_REFS` ships seeded with 14 entries, and its Decision states what keeps it a gate: "a tracked entry the closure stops reaching fails as stale so the set cannot outlive its cause." Under the key-root defect, `0035-rule-loading-tiers.md` and `0045-skill-content-disclosure-model.md` stayed reachable only through `docs/workflow.md:59` and `docs/personas.md:360` — files that were in the closure only because a manifest *key* named the `docs/` directory and the walk expanded it whole. The stale-detection property the whole tracked-set design rests on was false for those two entries.

**The consequence lands one PR downstream, which is why it is worth naming here.** The tracked set's follow-up names PR 3 as the home for emptying it, and PR 3's exit condition is that the set empties as the citations are swept. Two entries would have reported "still reached" — indistinguishable from an unfinished sweep — with no mechanism to tell the difference. A gate that fails open reports the same string as a gate that is working. The fix removed both entries after the roots were corrected, and the closure re-ran clean at 336 files.

### 3. A gate whose verify claims more than the gate performs — three instances in one PR, seven across two

**Evidence, three distinct surfaces.** E1's verify read "expected non-empty until E5 runs," assuming E5 would empty the orphan set; E5 trims the *seed*, not canonical routing, so the emptying it assumed was structurally impossible. E4's Roots bullet still described a fixed six-item list after round 1 turned root resolution into a computation, and its Verify line was satisfiable without touching the roots at all — which is the direct reason `resolveDefaultRoots` went untested and the round-2 major survived. `ship-closure` silently dropped a route naming an absent doc (`collectManifestRoutedPaths` yields it, `expandRoot` returns nothing for a missing path) while E5's prose claimed the reachable-but-excluded direction caught that case — a direction that only fires on a doc that is reached, which an absent doc never is.

**This is the class named in the 2C retro, and the count is now seven across two PRs.** Four in 2C, three here. The 2C action item asked winston to re-derive each verify line against the task's current reach before PR 2D's lines are written; PR 2E was written before that item was actioned, so this is not evidence the remedy failed — it is evidence the remedy has not yet been applied to a PR. What 2E adds is a third axis the 2C table did not carry: **a verify line can go stale because the task's own implementation changed shape mid-PR**, not only because the task's reach was mis-scoped at authoring time. E4's Roots bullet was correct when written and false three commits later. A one-time re-derivation at authoring cannot catch that; a re-derivation at each fix pass can.

### 4. Two tests passed for reasons other than the ones they named, and a third suspicion was refuted by mutation rather than by reading

**Evidence.** `ARCHITECT_MANIFEST_BASENAMES` was unreachable: the walk filters `entry.name.endsWith(".md") && !ARCHITECT_MANIFEST_BASENAMES.has(entry.name)`, and neither routing table ends in `.md`, so the second clause is always true and the test titled for the basename set was green on the `.md` filter alone. The relative-link closure fixture named `.prism/references/reached.md` as its subject while the file that actually discriminates is `.prism/rules/sibling.md` — the assertion was sound, the fixture read as testing something else. The third case, E5's verify line pointing at `hook-gate.test.ts:558` as its enforcer, was resolved by measuring: the property genuinely holds, enforced by `ship-closure`'s reachable-but-excluded check in a different file, so the verify line was re-pointed rather than the test rewritten.

**The discipline is the finding.** Five mutations across the PR, all killed: reinstating `routed.push(key)` kills only the key-vs-value test; dropping `manifest.base.json` from the roots kills only the both-tables test; reverting the hook check to a raw-text scan kills only its test; stubbing the base manifest read kills exactly the two new doctor tests; stubbing `unbackedRoutes` to `[]` takes the suite 15/15 to 14/15. Reading a test and judging whether it discriminates is a guess with good odds; mutating the implementation and watching which test dies is a measurement. Every one of the three suspected instances was settled that way, and one of the three turned out not to be an instance.

### 5. A review round found a defect in the plan file rather than in the code

**Evidence.** `658255f6` appended a session-battery line into the middle of a `## Decisions` entry's Evidence bullet. The edit anchored on the literal string `## History` — and the bullet it landed inside *quotes* that heading as part of its text. The result was two `^## History` headings in one file and a Decision's supporting proof destroyed. Eric caught it in a confirming pass whose nominal subject was a one-line code fix, and `6acd6fb4` restored the Evidence bullet character-for-character (verified by diff against `d2fc6334`, landing on the same line number, with `grep -c "^## History"` back to `1`).

**Two things make this worth a finding rather than a footnote.** The corruption was in the plan, and the plan is the run's working memory — a destroyed Evidence bullet is the loss of the reasoning a future promotion decision depends on, and unlike a code defect no test would ever have surfaced it. And it was caught only because the confirming pass re-read the whole file rather than the one-line diff it was sent to confirm. A pass scoped to its stated subject would have signed off.

**Eric's remedy was tested before it was recommended.** He checked the newline-padded anchor (`\n## History`) across all 27 plan files and found it unambiguous today, then rejected it anyway: `.prism/rules/branch-plan.md` carries a matching plan-template block, so a plan about plan tooling could carry two matches — the same shape as the failure that just happened. The recommendation that survives is structural: locate the next `^## ` heading and insert before it, never anchor on a heading string.

### 6. A conductor routing miss cost one round

**Evidence.** Three of Briar's round-2 minors were named to Eric as already-filed so he would not re-derive them, but were never routed to clove. They landed in `d2fc6334`, a round after Eric's pass, rather than alongside the fixes for his own findings.

**The failure is in the seam, not in either persona.** Naming a finding to the reviewer and routing it to the implementer are two different messages, and the first one reads as if it has done the second — a finding that has been *mentioned* to someone downstream feels handled. Cost here was small (three minors, one extra commit, no defect shipped). The shape is what to watch: a suppress-duplicate-work instruction to a reviewer is not a work order to an implementer, and nothing in the run distinguished them.

### 7. What worked: fixes were controlled rather than asserted, and two changes were declined on the merits

**Evidence, verification side.** Every fix pass was mutation-checked or negative-controlled. Round 1's class fix was gated by re-adding the dropped base route and observing `output-guards.md` report as reachable-but-excluded — proof the class is closed, not merely the instance repaired. Reviewers re-ran the other side's controls instead of accepting the reports: Briar materialized a fresh consumer install (`cli.ts init` + `cli.ts adopt` into `/tmp/briar-mat`) to re-verify a fix she had herself reported, then parsed both shipped tables in that install and confirmed every route value resolves on disk. Both are the behavior PR 2B's and 2C's retros recorded, now on its third consecutive PR — this is a run property, not a streak.

**Evidence, judgment side.** Clove twice declined a change rather than deferring by default. The `mirrored` bucket, nominated by 2C's own follow-up as belonging to E5, was judged on arrival and declined with a reason that distinguishes the two questions: E5 asks *which files ship*, the bucket asks *how a shipping file's twin is kept honest* — a shared config file, not a shared mechanism, and PR 2E already changes what that same `build.ts` code classifies. The prettier sweep was declined the same way. A declined change with a written reason is a stronger artifact than a deferred one, because the next reader inherits the argument rather than the queue position.

**One honest gap worth keeping visible.** The `unbackedRoutes` failure path is exercised by fixture only — no real shipped route is currently unbacked — and clove recorded exactly that in the session close rather than letting the green suite imply otherwise.

## Action Items

- [ ] Apply the 2C verify-line action item to PR 2D's lines **and add the mid-PR axis**: re-derive each **Verify:** line at every fix pass, not only at authoring, because E4's Roots bullet was true when written and false three commits later. Seven instances across two PRs is the evidence. — proposed owner: winston
- [ ] When a check's roots or inputs are computed rather than passed, cover the resolver directly before the checks that consume it. `resolveDefaultRoots` carried two rounds of fixes with no test and produced the PR's most consequential defect. — proposed owner: clove
- [ ] Split the reviewer-suppression message from the implementer work order in the run protocol: telling Eric a finding is already filed must not stand in for routing it to clove. — proposed owner: sol

## Promotion cautions

- **"`SHIP_CLOSURE_TRACKED_DANGLING_REFS` ships seeded with 14 entries rather than empty."** The Decision's gate clause — "a tracked entry the closure stops reaching fails as stale so the set cannot outlive its cause" — was **false as recorded** and became true only after the round-2 key-root fix. Two entries were held alive by `docs/` files that were in the closure by accident. Promote only in the corrected form, with the values-only root rule attached as the condition that makes the clause true; the headline alone re-asserts a guarantee the execution record refuted once already. The follow-up (empty the set in PR 3) inherits the same caution — see Finding 2 for why a fail-open tracked set and a finished sweep report identically.

- **"The ship surface is four things plus dependency closure, enforced mechanically."** Upheld and now genuinely enforced, but the Decision's own supporting clause "`SPEC.md` … routed by the stub's first key" was false, and it is **still live in the plan at line 167** — the key-branch removal corrected task E5's copy of the phrase, not the Decision's. Promote the corrected reasoning — `SPEC.md` earns its place through the shipped `code-standards.md` citation, verified reached at 336 files — never the key-route clause. A closer lifting this Decision's text verbatim would carry the defect back out in prose.

- **"`ship-closure.ts` measures reachability over the bytes a consumer receives."** Correct and well-evidenced; the caution is on one sub-bullet. "Each rule has a named unit test in `ship-closure.test.ts`" overclaimed at the time it was written — the relative-link rule had no fixture using a relative form — and was made true during the PR. Anything promoted from this Decision should carry the rules, not the coverage claim, since the coverage claim is a property of the test file and drifts independently.

- **The `mirrored` bucket follow-up is now homeless, and 2C's caution on it has come due.** PR 2C's retro flagged that if E5 did not land the bucket, the `curated`-classification Decision must be promoted with its cost clause intact. E5 considered and declined it, on good reasoning. So the accepted cost stands unmitigated: `build.ts:708` skips every `curatedSet` member before `writeFileIfChanged`, five guide twins drift silently, and `ship-closure`'s twin-scanning catches link drift only, not prose drift. The follow-up has no named PR. Promote the classification Decision only with the cost clause, and treat the bucket as open work rather than as scheduled.

## Citations

### Plan evidence
- `.prism/plans/opus5-port.md` § PR 2E tasks E1–E5 (lines 548–568), including the re-derived E4 Roots bullet and E1/E5 verify lines
- `.prism/plans/opus5-port.md` § Decisions — the ship surface as closure (line 167), `spec-editing.md` deferral to 2E (line 190), the `mirrored` bucket declined (line 205), `ship-closure.ts` fidelity rules (line 211), the seeded tracked-dangling set (line 218)
- `.prism/plans/opus5-port.md` § Review Issues — 16 entries scoped to 2E (4 majors, 12 minors, all `fixed`) plus 2 Angle Coverage blocks and Eric's re-review header on `c19e03a2..f0f3dc3a`
- `.prism/plans/opus5-port.md` § Sessions — 6 blocks on `huntermcgrew/opus5-port-doctor-shipsurface`, all `close: scope held`; § History — 6 entries
- `.prism/plans/opus5-port.md` § PR Readiness (PR 2E, #464) — all eight boxes checked, last updated 2026-08-19
- `.prism/plans/retros/architect-gate-port/pr-2c.md` — Finding 1 (the verify-text class, four instances) and Finding 5 (CI stale at HEAD); this retro is the follow-on measurement for both

### Execution record
- `git log 34f0db16..6acd6fb4` — 11 commits; diff 28 files, +1871/−345
- `gh pr view 464 --json statusCheckRollup` — `prism-check (ubuntu-latest)` and `prism-check (windows-latest)` both `SUCCESS` at HEAD `6acd6fb4`
- `gh run list --branch huntermcgrew/opus5-port-doctor-shipsurface` — 8 `PRISM Check` runs, all `success`
- `gh pr view 464` — draft, base `main`, labels `confidence:high` + `effort:glance`
- `gh api repos/HunterMcGrew/PRISM/issues/464/comments` — 1 comment, Eric's confirming-pass summary on `658255f6..6acd6fb4`: repair verified character-for-character against `d2fc6334`, `grep -c "^## History"` returns `1`, zero standards and zero spec findings
