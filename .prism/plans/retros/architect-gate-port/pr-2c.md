# Retro — PR 2C (Writing guides, stub routes, and the doc splits the deny depends on), run `architect-gate-port`

**Target:** `.prism/plans/opus5-port.md` § PR 2C (tasks C1–C8); PR [#463](https://github.com/HunterMcGrew/PRISM/pull/463)
**Grain:** per-pr
**Generated:** 2026-08-19

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
|---|---|---|---|---|
| 1 | Did we do what we said we'd do? | yes | § PR 2C tasks C1–C8, `## Decisions` (guide placement, `curated` classification, `spec-editing.md` deferral), branch diff `5b6fd401^..30dc4b09` | — |
| 2 | Issues / bottlenecks? | not evaluated at this grain | — | per-pr grain covers items 1/4/5/6 |
| 3 | Actionable improvements? | not evaluated at this grain | — | surfaced below as findings and two action items rather than scored |
| 4 | Followed code standards? | yes | `## Review Issues` (11 entries scoped to 2C + 3 Angle Coverage blocks), PR issue-comment on #463 | — |
| 5 | Anything wrong? Better path? | yes | `## Review Issues`, `## Sessions` (5 lines, all `close: scope held`), two self-reported process misses | — |
| 6 | Tests passing (CI record)? | **partially** | `gh run list` — 3 `PRISM Check` runs, all `success`, newest at `d5416271`; `pnpm prism:check` exit 0 reported locally at HEAD | **CI never ran at HEAD.** `gh pr checks 463` reports no checks; `statusCheckRollup` is empty. The last three commits are unexercised by CI — see Finding 5 |

Evidence counts: 11 `## Review Issues` entries scoped to 2C (10 `fixed`, 1 `deferred` with a stated reason), 3 Angle Coverage blocks (one per review round), 5 `## Sessions` lines on branch `huntermcgrew/opus5-port-writing-guides`, 3 new `## Decisions` entries. Diff `5b6fd401^..30dc4b09`: 114 files, +4548/−1533 — 29 files outside the plan itself. PR-thread surface: 1 issue-comment (Eric's clean-pass summary; earlier round summaries are edited in place per his convention). Labels at HEAD: `confidence:high`, `effort:quick`. Still draft.

## Fidelity gap

**Shipped vs. said — met on C1–C8, with one task reversed on purpose.** C1's four-way split shipped (`skills-ecosystem.md` 404 → 159 lines canonical, twin split the same way), C2's five guides shipped at 75–85 lines each against a 120-line bar, C3's genericizing pass reached both SPEC surfaces (`grep -c '\.claude/'` returns `0` on each), C4/C5's routes landed in all four manifests, C6's `.gitignore` correction and § Hook runtime landed in canonical and twin, C7 classified the eight new files, C8's sweep returns nothing. C2's and C4's *stated path* was reversed — see Finding 3; the plan's own fork clause pre-authorized the reversal, and both tasks now carry a supersede marker pointing at the Decision.

**Review-clean — three rounds each side, converging on one defect class.** Briar: 4 findings (1 major) → 4 findings (1 major) → 1 minor. Eric: 4 minors → 2 minors → clean. Every entry carries a disposition; the one `deferred` states its reason and names PR 2E as its home.

**CI — green through `d5416271`, absent thereafter.** Not a failure; an absence. Finding 5.

## Findings — evidence, not conclusions

### 1. Four verify-text defects in one PR, on three distinct axes — and the class is not the axis

**Evidence.** C6's grep was scoped wider than the task it gated: six hits remained, all inside `.prism/plans/` append-only text that cannot be edited out, so the literal command could never return empty (`| grep -v '/plans/'` was the fix, and C8 already carried that exclusion). C3's `grep -c '\.claude/' .prism/SPEC.md` measured canonical only while the task also edits the curated twin — which is *why* the `SPEC.md.tmpl` major read green (Finding 4). C1's `wc -l` had the same canonical-only shape on a twin the same task splits. C2's `wc -l .prism/references/guides/*.md` named a directory this PR deliberately never created, so run literally it errors on a nonexistent glob.

**The class named correctly is broader than any one axis: the verify line was not re-derived when the task changed underneath it.** C6 changed because the plan itself accumulated quoted history; C3 and C1 because the task's reach included a twin; C2 because the placement Decision moved the target. Same cause, four different surfaces.

**The enumeration failure is its own finding.** Briar's third pass enumerated every remaining C1–C8 verify line by walking `seed-curation.json`'s `curated` list and declared C1 the last survivor. That method can only see one axis — canonical-measured-while-a-curated-twin-goes-unmeasured — and it was presented as exhaustive. Eric refuted it and found C2, which fails on a different axis entirely (a superseded path; the guides are not `curated` at all, so the walk structurally could not reach them). A single-axis enumeration is a valid sweep and an invalid completeness claim, and the distinction is not visible in the sweep's own output. The corrected sweep in `7c336bea` re-derives against the class rather than any list, and its table is the artifact worth reusing.

### 2. A gate that could not detect its own violation

**Evidence.** C7 requires every new file to carry an entry in `seed-curation.json`, and its verify read: `pnpm prism:build` prints no unclassified-file warning. `build.ts:713-718` emits that warning only when `seedFileIsNew` — once per artifact lifetime, not once per run. The five guides were in fact unclassified (`grep -c "guides/"` on `seed-curation.json` returned `0`) and the build was silent. The gate reported green over the exact state it existed to forbid.

**Why this outranks the other three verify defects.** The others measured the wrong thing; this one measured a thing that cannot fail twice. A first-run-only signal is not a gate — it is a notification, and any re-run passes vacuously. The fix replaced it with a re-runnable per-path loop over `seed-curation.json` and states in the task text that the build warning is not the gate and why, which is the part that survives the next reader.

**The adjacent instance is worth naming.** The route-integrity test C4 added was scoped to `manifest.stub.json` alone, while the seed's `manifest.base.json` routed to `output-guards.md` — a doc C7 excludes from the seed. It fails safe (`filterDocsOnDisk` drops it), but the test asserted exactly the property that entry violates and could not see it. Per Eric's call the test changed rather than the entry, and it was negative-controlled by removing `output-guards.md` from `excluded`, which turns exactly that test red.

### 3. The most consequential design call reversed the plan's instruction for a reason the plan never considered

**Evidence.** C2 and C4 place the guides at `.prism/references/guides/` and route to them as `../references/guides/<guide>.md`. C4's fork clause authorizes a fallback *only if the `../` form fails to resolve through `filterDocsOnDisk`*. Measured against the live resolver, it resolves — `path.join` normalizes the `../` away. Eli took the fallback anyway, on a different mechanism: `extractArchitectDocPath` credits a read only when the path starts with `.prism/architect/`, so a guide under `.prism/references/` would announce and never credit, and the deny gate PR 2D clears against the `read` array would be unsatisfiable.

**The shape of the miss is in the plan, not the execution.** The fork's condition tested route *resolution* and stopped there. Credit is a second, independent condition on the same placement, and every check inside PR 2C — `verify-manifest`, `crossref-lint`, the new route-integrity test, `prism:check` — passes under the wrong placement. The defect would have surfaced in PR 2D as a gate nobody could clear, one PR downstream of the branch that created it.

**Both reviewers verified the mechanism rather than the claim.** Briar traced `filterDocsOnDisk` and `extractArchitectDocPath` independently and confirmed the fallback is correct *and correctly reasoned*, adding one wording correction: announce-once bookkeeping means such a guide announces once per session, not forever. Eric's Correctness axis re-derived the same. A reversal of a written instruction is the single highest-risk call in a content PR, and it received the heaviest verification in the run.

### 4. A major reached round 2 because a verify measured one side of a two-sided change

**Evidence.** `templates/install/.prism/SPEC.md.tmpl` — the file `adopt` installs as the consumer's own `.prism/SPEC.md` — received none of C3's pass. Eight divergent hunks, every one a C3 change absent from the twin: Tier 4 still hardcoded `.claude/skills/<skill>/SKILL.md`, the non-spec list still named `.claude/worktrees/`, the Promotion clause still said "Then delete the plan — git history preserves it" against ADR-0047, and the Plan Section Ownership pointer still named `skills-ecosystem.md` — the identical major fixed at `.prism/SPEC.md:71` one commit earlier, unfixed on the surface that ships. `grep -c '\.claude/'` returned 6 on the twin, 0 on canonical.

**The gap has a second, structural half that outlived the fix.** `SPEC.md` appears in `seed-curation.json` only under `renames`, never `curated` / `excluded` / `seedOnly`. A plain renamed mirror reads as build-maintained, but `pnpm prism:build` on a clean tree writes nothing and `pnpm prism:check` reports no drift across an 8-hunk divergence — verified empirically, not inferred. That is what let a hand-forked twin ship silently. Correctly deferred: the honest fix is a per-entry `mirrored`-vs-`curated` policy on `renames`, a `build.ts` schema change outside a content-only PR's lane, with `manifest.json` → `manifest.stub.json` as the legitimately-divergent case a blanket compare would flag forever. The semantics are now written into `lib/seed-curation.ts` and the specific twin is gated by C3's widened verify.

**Note the same trade landed again in this PR.** The five guides went to `curated` rather than a new `mirrored` bucket, and the Decision states the accepted cost in measured terms: `build.ts:708` skips every `curatedSet` member before `writeFileIfChanged`, so a later canonical edit never reaches the seed and nothing mechanical says so — demonstrated by appending a blank line and observing an unchanged twin hash with `prism:check` exit 0. Same gap, now deliberate for five more files, with the `mirrored` bucket recorded as follow-up on E5.

### 5. CI has not run at HEAD, and the green claim is local

**Evidence, and it is new here rather than carried from the brief.** Three `PRISM Check` runs exist on this branch, all `success`, at `5b6fd401`, `5d5cea80`, and `d5416271`. Nothing ran for `d9beb9ff`, `7c336bea`, or `30dc4b09`. `gh pr checks 463` prints "no checks reported"; `statusCheckRollup` is empty. The workflow triggers on bare `pull_request`, so no path filter explains it.

**What is and is not proven.** `pnpm prism:check` exit 0 and 717/717 are reported at HEAD from a local run, and the fix range `7c336bea..30dc4b09` is two prose blocks in the plan. So the risk is small and the *record* is the problem: the branch's CI evidence stops three commits short of what would merge, and Eric's readiness checklist cites the local run for the type-check line. PR 2B's retro could cite both `prism-check` legs green at its exact HEAD; this one cannot. The Windows leg in particular has never seen `d9beb9ff`, which is the commit that rewrote `SPEC.md.tmpl`.

### 6. What worked: every pass re-ran the other side's control rather than accepting the report

**Evidence.** Briar's third pass ran `build.ts`'s 597-before-609 ordering, the shipped ADR set, the `shipping-flow.md` heading absence, and all six twin diffs directly, and explicitly recorded `pnpm prism:check` exit 0 as *the user's ratification, not my own run* — an evidence-provenance distinction most reports collapse. Eric re-derived the `curated` cost claim against `build.ts:708` and confirmed the seven-line gap to `writeFileIfChanged`, and caught that his own count in the prior pass was wrong, which is what made the count-rules-not-numbers remedy the right one rather than a style note. The `SPEC.md.tmpl` drift-gate premise was established by running `prism:build` on a clean tree and re-checking `git status`, not by reading the schema.

**Twice this caught a reasoning error rather than an implementation one** — Briar's single-axis enumeration (Finding 1) and Eli's fallback rationale (Finding 3, upheld). Both are failures a re-read of the diff cannot surface, because the code was right and the argument about it was the artifact under test.

**Eli's own re-derivation sweep produced two amendments nobody asked for**, both the same class as the four reported defects: C5 had no route-existence check at all (`verify-manifest` is structural only and never checks that a route's doc exists), and C8's grep never reached `templates/`, where a curated twin never regenerates from canonical. A fix pass that finds more than it was sent to fix, on the class rather than the list, is the behavior the corrected sweep in Finding 1 is asking for — and it happened in the same commit that named the class.

### 7. Two process misses, both volunteered rather than caught

**Evidence.** Eli `rm -rf`'d the pre-existing `.prism/references/` tree during a probe of the route fork, caught it on the next `git status`, and restored from HEAD before anything was committed — verified byte-clean by hash across all 67 blobs. Eric folded his opening battery into the mode line, so Bounds was stated after the work rather than before it.

**Both were self-reported, and that is the load-bearing fact.** Neither is visible in the diff: the restore was verified clean, and a battery stated late still produces the same four answers. A run where the only record of a destructive probe is the actor's own note is a run whose honesty is doing the work a check would otherwise do. The `rm -rf` is the more serious of the two — the recovery worked because the tree was committed and the probe was noticed within one command, and neither of those is a property of the procedure. Eric's is a sequencing miss with a real cost only when Bounds would have changed the work; stated after, it can only ratify.

## Action Items

- [ ] Before PR 2D's verify lines are written, adopt the class test from `7c336bea`'s re-derivation table as the standard: for each **Verify:** line, ask what the task's reach is *now* — canonical plus twins, the shipped path after any supersede, the plan's own quoted text — and whether the command can fail on a re-run. Four defects in one PR across three axes, plus two self-found amendments, is the evidence; a per-axis walk is not the remedy. — proposed owner: winston
- [ ] Establish CI evidence at HEAD before #463 leaves draft — push or re-run `PRISM Check` on `30dc4b09`, both legs. The branch's newest CI evidence is three commits stale and the readiness checklist currently rests on a local run. — proposed owner: clove

## Promotion cautions

- **"Guide placement resolves to `.prism/architect/guides/`, not `.prism/references/guides/`."** Upheld by the execution record and verified by both reviewers against the resolver and the credit channel. The caution is not about the decision but about what a closer promotes *with* it: tasks C2 and C4 still carry `.prism/references/guides/` as recorded intent behind supersede markers. Anything lifted from those task bodies into a durable surface must carry the shipped path. The durable content worth promoting is narrower than the Decision's headline — **a doc's placement is constrained by the credit channel, not only by route resolution: `extractArchitectDocPath` credits reads under `.prism/architect/` only.** That belongs with the hook-runtime architect context, not with the guides.

- **"The five writing guides are classified `curated` in `seed-curation.json`, not left to auto-mirror."** Not refuted — the Decision is correct and its accepted cost is stated in measured terms. Flagged because the cost is a live drift risk on five shipped files with no mechanical detector, and its remedy (a `mirrored` bucket) is recorded only as a follow-up on E5. If E5 does not land it, this Decision should be promoted with the cost clause intact, never with the headline alone.

- **The `SPEC.md`-under-`renames` gap is a config-states-a-guarantee-it-does-not-provide finding, deferred, not resolved.** Its `## Review Issues` entry is the only record besides a comment in `lib/seed-curation.ts`. A closer promoting anything about seed curation should carry this forward rather than read the twin's current parity as a working gate.

## Citations

### Plan evidence
- `.prism/plans/opus5-port.md` § PR 2C tasks C1–C8 (lines 348–430)
- `.prism/plans/opus5-port.md` § Decisions — guide placement (line 700), the five guides as `curated` (line 152), the `spec-editing.md` deferral to PR 2E (line 146)
- `.prism/plans/opus5-port.md` § Review Issues — 11 entries scoped to 2C, plus 3 Angle Coverage blocks and the C1–C8 re-derivation table
- `.prism/plans/opus5-port.md` § Sessions — 5 lines, branch `huntermcgrew/opus5-port-writing-guides`, all `close: scope held`
- `.prism/plans/retros/architect-gate-port/pr-2a.md`, `pr-2b.md` — precedent shape; 2B's finding 2 (cross-side control re-runs) recurs here as Finding 6

### Execution record
- `git log 5b6fd401^..30dc4b09` — 8 commits; diff 114 files, +4548/−1533
- `gh run list --branch huntermcgrew/opus5-port-writing-guides` — 3 `PRISM Check` runs, all `success`, newest at `d5416271`
- `gh pr checks 463` — no checks reported at HEAD `30dc4b09`; `statusCheckRollup` empty
- `gh pr view 463` — draft, base `main`, labels `confidence:high` + `effort:quick`
- `gh api repos/HunterMcGrew/PRISM/issues/463/comments` — 1 comment, Eric's clean-pass summary (zero open findings, both prior minors re-derived against source, 9 axes)
- `.github/workflows/prism-check.yml` — triggers on bare `pull_request`; no path filter explains the missing runs
