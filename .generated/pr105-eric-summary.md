## Eric's review — PR #105 (Sol conductor engine)

Two-axis review, in-branch mode, run at head `6205eb1`. This is Group 2 (Engine) of the Sol/Conductor epic: nine prose step files, the report-back contract with the folded gate registry, the fleet contract, the byte-identical "When dispatched by Sol" note across nine dispatched personas, the `shared.md` Workflow overview rewrite, and the worktree-isolation Sol extension (both canonical copies). All content/spec — no executable code in the diff.

Briar's self-review already swept this clean after one fix pass (`6205eb1`: step-05 verdict list + two stale ACs). I re-verified the fix and ran both axes fresh.

### Standards findings

Clean. Specifics worth calling out:

- **Cite-don't-restate is consistent across all nine step files and both lib docs.** Every step that touches the routing table, the goal-state schema, the fleet contract, or the `claude.md` dispatch mechanism cites the path instead of restating it. This is exactly the discipline that keeps the canonical doc and its citers from drifting — really clean.
- **Routing-table coherence restored.** `step-05-route.md` now lists all five primary verdicts (`done`, `needs-replan`/`blocked`, `needs-stronger-model`, `needs-human`), matching the canonical table in `lib/report-back.md`. The pre-fix omission of `needs-stronger-model` is gone.
- **No mandate voice, no session-context leakage, no stray count claims.** The `"4 lanes parked at merge, 2 need you, 2 running"` string is an illustrative report shape, not a spec count — exempt. The "dry run surfaced a `done` dispatch" line in `report-back.md` is legitimate design provenance (recorded in the plan's History + Decisions), not leakage.
- **Removal completeness clean.** The only `gates.md` reference is the intentional "why one file, not two" provenance note — no dangling pointer to the rejected split file.
- **Byte-identity holds.** `worktree-isolation.md` is `diff`-identical across canonical + install template; the "When dispatched by Sol" note is byte-identical across all nine personas; `prism:check` reports generated mirrors in sync.

### Spec findings

Clean. The diff conforms to the plan (Group 2 tasks 13–28):

- **AC conformance** — the fleet conflict-gate AC (overlapping blast radius → serialize) maps to `fleet.md`/`step-08`; the batched-merge-report AC maps to `fleet.md`/`step-08`; the report-back AC (primary verdict + secondary signals) maps to `report-back.md` + `step-05`. The two stale non-behavioral ACs Briar caught (step-file frontmatter, `.cursor/agents/` emit) are now corrected to match shipped reality.
- **`## Decisions` respect** — the refuse-to-parallelize default is encoded *with* its rejected fan-out-then-serialize alternative and the one-line reason, per the plan Decision and the branch-plan rule. The two-channel model, gate-owner-writes-resolutions, autonomy-between-gates, and the conditional-gate auto-clearable model are all faithfully encoded. Nothing in the diff contradicts a Decision.
- **No scope creep** — every changed canonical file maps to a Group 2 task; nothing touched outside the engine scope.

### Cross-cutting observations

- **`atlas-dogfood.test.ts` Windows path-separator flake** fails at head — but it fails identically on `origin/main`, isn't touched by this PR, and is a known non-blocker. Not a finding against this PR.
- **Agent-def relative links** (`.claude/agents/<persona>.md`) — the `../../../` links in the agent-def bodies (including the new Sol note) overshoot the repo root from the 2-deep agent-def location, while resolving correctly from the 3-deep skill-mirror location. This is a pre-existing whole-class property of the agent-def emit target (every `../../../` link in those files behaves this way, not just the Sol note) — it belongs to the Group 1 build emitter, not this content PR. Worth a follow-up on the emitter, but out of scope here.

### PR Readiness

Both axes ran clean. No critical, major, or minor findings on this PR. Ready for a human to approve and merge — PR stays draft until you flip it. Labels: `effort:quick`, `confidence:high`.
