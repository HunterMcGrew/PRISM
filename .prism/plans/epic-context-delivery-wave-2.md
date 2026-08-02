# Plan: epic-context-delivery-wave-2

## Ticket

No tracker ticket — Wave 2 of the work scoped in [`context-delivery-mechanism.md`](./context-delivery-mechanism.md), split out at epic grain on 2026-08-02. That plan keeps Wave 1 (the two hook PRs and the A/B harness) and the audit criterion; this plan owns every Wave 2 row, its lane assignments, its sequencing, and its dispatch order.

Source material for the ported rows is [`thrive-port.md`](./thrive-port.md) tasks 4–17. That file was recovered from `stash@{0}` on 2026-08-02 — see `## Decisions` § the recovery entry.

## Goal

Land the sixteen Wave 2 changes as small single-concern PRs that can be dispatched concurrently without lane-to-lane contention, in a dispatch order that fits the run's budget.

---

## Decisions

- **Wave 2 gets its own plan file, and lanes record into their own block inside it rather than into shared `## History` and `## Sessions`.**
  - **Root cause:** two separate contentions were being conflated. The first is cross-wave — Wave 1's PR 1 lane is live in `context-delivery-mechanism.md` right now, and every Wave 2 lane appending to that same file would collide with in-flight work that has nothing to do with it. The second is intra-wave — eleven Lane B worktrees each appending a line to the *end* of one `## History` section conflict on every merge, because git's three-way merge has no way to order two independent appends at the same anchor. Unlike an `AGENTS.md` collision, which resolves by taking either side and re-running `pnpm prism:build`, there is no mechanical resolution: both lines are wanted and their order is arbitrary.
  - **Alternatives considered:** (a) one plan file with a per-lane convention and no split — fixes the intra-wave contention but leaves Wave 2 lanes writing into a file Clove holds open; (b) one plan file per lane, sixteen files — removes all contention and shreds the shared Decisions, lane model, and dispatch order that make the wave coherent; (c) keep one file and serialize plan writes through Sol — re-institutionalizes the manual recovery `branch-plan.md § Landing a plan-only commit` exists to avoid.
  - **Chosen approach:** both halves. The split is correct on grain independent of convenience — sixteen PRs crossing rules, skill bodies, `scripts/`, templates, ADRs, and docs is an epic by any reading of `branch-plan.md § One Plan Per Ticket`, which scopes plans to "tickets **or epics**." Convenience is a second reason, not the reason. The per-lane block is what actually removes the contention, and it is needed whether or not the file is split: git merges edits in *distinct* regions of a file cleanly, so giving each lane its own anchor turns sixteen conflicting appends into sixteen independent ones.
  - **Implementation guidance:** every Wave 2 lane appends its opening and closing battery line and its change record to its own `### W2-NN` block under `## Lane records` below — never to `## Sessions` or `## History`. Those two sections stay, and carry one line per *merged* lane, written after the merge; merges are serialized by definition, so that anchor has one writer at a time. Wave 2 lanes touch `context-delivery-mechanism.md` not at all.
  - **→ promotion verdict pending close.**

- **`.prism/plans/thrive-port.md` existed only in `stash@{0}` and has been restored to the tree.** Eleven Wave 2 rows cite "`thrive-port.md` task N" as their entire content specification.
  - **Root cause:** the file was written untracked during the 2026-07-30 conductor run (`.prism/plans/conductor/thrive-port-triage.md` log, 2026-07-30 verdict entry: "224 lines, untracked"), then swept into a stash during branch work. `git cat-file -e origin/main:.prism/plans/thrive-port.md` fails — it is on no branch. The conductor log's claim that the dropped plan files were "verified present on `origin/main`" does not hold for this one.
  - **Alternatives considered:** inline every task's content into this plan and let the stashed file stay lost — rejected, it duplicates 290 lines and loses the verdict table, the AC, and the review record; leave it stashed and cite the stash — rejected, a stash is not a durable content bus and is lost on any `git stash clear`.
  - **Chosen approach:** `git show 'stash@{0}:.prism/plans/thrive-port.md' > .prism/plans/thrive-port.md`, non-destructively — the stash entry is untouched, so nothing is lost if the restore is wrong. The file is now untracked in the working tree and is committed by whichever lane lands first.
  - **Implementation guidance:** the restored file is the 2026-08-01 snapshot, which carries the inventory History entry from the thrive-port branch. Do not re-stash it. `context-delivery-mechanism.md` links it as `./thrive-port.md` from `.prism/plans/`, which now resolves.
  - **→ promotion verdict pending close.**

- **The worktree `node_modules` gap is a hard precondition for fanning out at all, not a low-priority tail item.** It moves from last in `thrive-port.md`'s suggested order to first in this wave's.
  - **Root cause:** every Wave 2 row's verification is `pnpm prism:build` then `pnpm prism:check`. Both run `tsx` from `node_modules/.bin`, and a fresh `git worktree` has none. Verified on disk 2026-08-02: of 117 worktrees under `.claude/worktrees/`, 28 carry `node_modules` and 89 do not — the 28 are hand-installed. `scripts/worktree-setup.sh` does not exist. So a worktree-isolated lane today cannot verify its own change, which means either the lanes run sequentially in the main checkout — defeating the fan-out this wave is organized around — or they report unverified work.
  - **Alternatives considered:** run all lanes sequentially in the main checkout and accept the serialization; have each lane run `pnpm install` in its own worktree (minutes per lane, duplicated disk, and a lockfile race against concurrent lanes).
  - **Chosen approach:** W2-01 lands first and alone. It is the only row whose payoff is the wave's own throughput, so it is the only row that earns going first on something other than urgency.
  - **Implementation guidance:** `thrive-port.md` task 16 has two halves. Only the repo-local half is W2-01; the Atlas-generates-per-team half is split out as W2-16 and deferred, because it buys consumers nothing this run and doubles the row's review surface.
  - **→ promotion verdict pending close.**

- **Sixteen lanes do not fit the run's budget, so eight ship this run and eight defer.** The cut is by what unblocks or corrects something, not by size.
  - **Root cause:** the global dispatch budget is 100 and a lane runs a six-phase chain with review-gauntlet loops that re-dispatch on findings — 8–10 dispatches per lane. Sixteen lanes is 128–160 against a budget already partly spent on Wave 1.
  - **Alternatives considered:** shrink the per-lane chain by skipping the review gauntlet on content-only rows — rejected, the review firewall is what makes an unattended lane trustworthy, and PR #449's history in `thrive-port.md § Review Issues` is two majors Briar's clean pass missed; raise the budget — not Winston's call.
  - **Chosen approach:** eight lanes this run (W2-01 through W2-09, less the deferred W2-08), eight deferred to a follow-on run. Three of the original sixteen rows were merged into siblings first, so the deferral is eight rows and not eleven — see `## Row re-cut` for what merged into what.
  - **→ promotion verdict pending close.**

- **Three Wave 2 rows merge into siblings; nothing is dropped.**
  - **Chosen approach:** (1) *Git remote discipline* and *Sweep depth* merge into W2-03 — both are Tier-1 rule-prose promotions from the same thrive source family, both Lane A, and Lane A is serial anyway, so merging shortens the serial chain rather than widening a PR. (2) *Sol intake* and *Dispatch shape* merge into W2-09 — the plan already sequenced them because both edit `lib/report-back.md`; merging dissolves the dependency instead of managing it. (3) The audit's new orphan-tmpl row, its consumer-`adopt` end-to-end check, and the ADR-0035 stale-body follow-up merge into W2-06 — all three are the same concern, a document asserting something the code contradicts.
  - **→ promotion verdict pending close.**

- **The audit confirms no Wave 2 row needs retiering and no row changes lane.** Recorded explicitly so a later reader does not re-run the audit to find out.
  - **Chosen approach:** [`.prism/audits/2026-08-02-always-on-rule-audit.md`](../audits/2026-08-02-always-on-rule-audit.md) § 3 graded all 22 `load: always` rules: 20 keep, 1 convert (`pre-compaction-checkpoint.md` — already Wave 1 PR 2), 1 retire (`context-window-handoff-check.md` — W2-05). Zero self-measurement hits beyond the two the plan's premise already named. Two near-misses (`session-orientation.md § Mid-flight Re-anchors`, `self-improvement-loop.md`'s session-start lessons read) are mechanizable but not self-measuring; they fail the criterion and are named in the audit so they are not re-litigated.
  - **Implementation guidance:** the generated `AGENTS.md` Tier-1 block's membership changes exactly twice this wave — `pre-compaction-checkpoint.md` leaves it (Wave 1 PR 2), `context-window-handoff-check.md` leaves it (W2-05), and `dev-servers.md` joins it (W2-04). Every other Lane A row edits a rule body already in the block.
  - **→ promotion verdict pending close.**

- **The consumer-distribution finding is graded Deduced, and W2-06 carries the task that makes it Confirmed.** The audit read the seed surface and the consumer-side build path but ran no `adopt` end-to-end.
  - **Root cause:** Wave 2's shape rests on the deduction. If consumers do not in fact receive Tier 1, auditing Tier 1 is moot and half this wave's rule rows change value. Leaving a load-bearing premise at Deduced when the confirming step is one command is the gap.
  - **Chosen approach:** W2-06 runs `prism adopt` into a scratch repo and asserts the resulting `AGENTS.md` Tier-1 block against the canonical rule set. The row already touches the tmpl and the distribution docs, so the check lands where its subject matter is.
  - **→ promotion verdict pending close.**

---

## Lane model

Inherited from [`context-delivery-mechanism.md`](./context-delivery-mechanism.md) § Lane model, restated here as the operative rule for this wave because Wave 2 lanes read this file and not that one.

**Lane A — the PR's diff includes any `.prism/rules/*.md` file carrying `load: always`.** Editing such a file re-generates the `AGENTS.md` Tier-1 block, which inlines every Tier-1 rule body. Lane A merges one at a time. A conflict there is in generated output: resolve by taking either side and re-running `pnpm prism:build`, never by hand-editing `AGENTS.md`.

**Lane B — everything else.** Skill bodies, `.prism/templates/`, `scripts/`, `load: paths` and `load: skill` rules, ADRs, docs, reports. No serialization.

**Wave 1's PR 1 is itself Lane A** — its task 4 edits `.prism/rules/context-reuse.md` (`load: always`, verified 2026-08-02). Every Lane A row in this wave queues behind PR 1's merge. Lane B rows do not.

**Every lane in this wave also depends on W2-01** for its verification commands to run in a worktree. See `## Decisions` § the worktree entry.

---

## Row re-cut

Eighteen candidate rows — the plan's original sixteen plus the two the audit added — re-cut to sixteen. Nothing is dropped.

| Original row | Outcome |
| --- | --- |
| Voice gate | W2-02, unchanged |
| Retire handoff check | W2-05, sweep surface widened per the audit; now sequenced after W2-06 |
| Git remote discipline | merged into W2-03 |
| Sweep depth | merged into W2-03 |
| Dev servers rule | W2-04, unchanged |
| Claim verification | W2-08, unchanged; deferred |
| Gate predicates | W2-10, lane confirmed B (`verification-commands.md` is `load: paths`); deferred |
| Ticket types | W2-11, lane confirmed B (`ticket-types.md` is a template, not a rule); deferred |
| Citation gates | W2-12, unchanged; deferred |
| Skills sweep | W2-07, unchanged |
| Sol intake | merged into W2-09 |
| Dispatch shape | merged into W2-09 |
| PR descriptions | W2-13, unchanged; deferred |
| Lilac standup | W2-14, unchanged; deferred |
| Repo orientation | W2-15, unchanged; deferred |
| Worktree setup | split — repo-local half is W2-01 and goes first; Atlas half is W2-16 and defers |
| *(new, from audit)* orphan tmpl + doc corrections | merged into W2-06 |
| *(new, from audit)* consumer `adopt` confirmation | merged into W2-06 |
| *(new, from audit follow-up)* ADR-0035 stale body | merged into W2-06 |

---

## Implementation Tasks

Every task below is `[AFK]` unless tagged. Verification for every row is `pnpm prism:build` then `pnpm prism:check`, run from the lane's worktree, unless the task says otherwise. A row that reports a verification it could not run is a failed row — W2-01 exists so that never happens.

### Clove (implementation)

**W2-01 — worktree `node_modules` setup** · Lane B · **no dependencies; blocks every other row** · runs in the main checkout, not a worktree

1. **Port `worktree-setup.sh` and `guard-worktree-node-modules.sh` from thrive.** Fetch exact contents with `gh pr diff 2192 --repo TracTru/thrive`. Write the setup script to `scripts/worktree-setup.sh` and the guard hook to `.claude/hooks/guard-worktree-node-modules.sh`. Adjust the link set to PRISM's own layout — this repo has a single root `package.json` with no workspace packages, so the link set is the root `node_modules` alone; do not carry thrive's per-package link loop. `chmod 755` both files (thrive #2206's lesson — a generated hook shipped `644` and never fired). In `.gitignore`, change the entry `node_modules/` to `node_modules` so the symlink form is ignored as well as the directory form.

   **Verification:** `git worktree add /tmp/w2-01-probe HEAD`, then `bash scripts/worktree-setup.sh /tmp/w2-01-probe`, then `cd /tmp/w2-01-probe && pnpm prism:check` — expect exit 0. Then `git worktree remove /tmp/w2-01-probe --force`. Also `ls -l scripts/worktree-setup.sh .claude/hooks/guard-worktree-node-modules.sh` and confirm both read `-rwxr-xr-x`. The Atlas half of thrive-port task 16 is **not** in this row — it is W2-16.

**W2-02 — voice gate** · Lane A (also Lane B for the script) · after PR 1 merges

2. **Add `scripts/ai-skills/voice-guard.ts`.** Four checks, each returning file, line, and a one-line reason: (i) mandate-voice tokens — `NON-NEGOTIABLE`, `FAILURE STATE`, `HARD RULE`, and standalone all-caps `MUST` — anywhere under `.prism/rules/`, `.prism/architect/`, `.prism/spec/adrs/`, `.ai-skills/skills/`; (ii) a file under `.prism/rules/` with no `**Why:**` line; (iii) a bare integer immediately preceding or following a glob or directory reference on the same line, per `writing-voice.md § Count rules, not numbers`; (iv) session-leakage phrases — `so far`, `in this batch`, `in the loop`, `next up` — in the same four trees, per `writing-voice.md § Anti-pattern: Session-context leakage`. Wire it into `prism:check` by appending `&& pnpm run prism:voice-guard` to the `prism:check` script in `package.json` and adding `"prism:voice-guard": "tsx scripts/ai-skills/voice-guard.ts"` beside it. Exit non-zero on any hit.

3. **Shrink `.prism/rules/writing-voice.md` to what the gate cannot check.** [Lane A] Every section the gate now enforces mechanically keeps its `**Why:**` and loses its enumerated token list — the gate holds the list. Sections affected: § Onboarding voice not mandate voice, § Count rules not numbers, § Anti-pattern Session-context leakage. Leave § Explain the why, § Plain language over jargon, and § Answer first one offer at a time untouched — none is mechanically checkable.

4. **Add thrive #2260's overflowing-container detector to the same file.** [Lane A] New subsection under § Keep it short enough to be read: when a section has grown past the shape its heading promises — a "rule" that has become a taxonomy, a list that has become a table of cases — that is the signal to split it, not to keep appending. Same PR as tasks 2–3 because all three touch `writing-voice.md` and splitting them would put two Lane A merges where one does.

**W2-03 — Tier-1 rule prose ports** · Lane A · after PR 1 merges

5. **Add three clauses to `.prism/rules/git-conventions.md`.** [Lane A] Under § Keeping a Branch Current: (i) *fetch is not updating* — `git fetch` moves the remote-tracking ref and nothing else; a branch is not current until the merge or rebase runs; (ii) *the checked-out branch is user-mutable between turns* — re-read `git branch --show-current` at the start of any turn that acts on branch identity rather than trusting a value read earlier in the session. Under a new § Reviving a dormant branch: (iii) *rebuild rather than resurrect* — the trigger is structural dependency drift, not commit count; when the branch's dependencies, generated surfaces, or the rules it edits have moved underneath it, branch fresh from `origin/main` and re-apply the change rather than reconciling.

6. **Add the sweep-depth clauses to `.prism/rules/code-standards.md`.** [Lane A] Under § Removal and rename completeness: build the search matcher from the *concept*, not the literal token, plus a context filter to keep the hit count workable; a rename sweep covers three reference shapes — the symbol itself, prose naming it, and paths or string literals containing it.

**W2-04 — dev-servers rule** · Lane A · after PR 1 merges

7. **Create `.prism/rules/dev-servers.md`.** New Tier-1 rule, `load: always` frontmatter, roughly 20 lines in the Purpose / `**Why:**` / `**How to apply:**` shape every sibling rule uses. Content, generic core only: anything outliving a tool call — a dev server, a tunnel, a watcher — is declared when started and reaped when done. Check the port before binding: `lsof -i tcp:<port> -sTCP:LISTEN`, or `curl -s -o /dev/null --max-time 2 http://localhost:<port>` where exit 7 means free. Reuse the running process when observing *through* it; kill it when it blocks a verification, announcing first because it may be the user's; report it when neither applies. `**Why:**` — a leaked server does not just waste memory, it turns a verification green against nothing. Carry no thrive incidents and no `concurrently -k` advice. Add a `## Who runs this rule` section per ADR-0029.

   **Verification:** in addition to build and check, `grep -c "Dev Servers" AGENTS.md` returns a non-zero count — the new rule joined the generated Tier-1 block — and `ls .claude/rules/dev-servers.md .cursor/rules/dev-servers.mdc .codex/rules/dev-servers.md templates/install/.prism/rules/dev-servers.md` finds all four mirrors.

**W2-06 — stale-claim cleanup** · Lane B · **blocks W2-05**

8. **Delete `templates/install/AGENTS.md.tmpl` and its lint registration.** No code path reads it — verified 2026-08-02, the only non-prose reference is the `looseFiles` list in `scripts/ai-skills/crossref-lint.ts` at the repo-root entry. It ships anyway, because `templates/install/` is in `package.json` `files`. Delete the file, and remove the `"templates/install/AGENTS.md.tmpl",` line from that `looseFiles` array. Its § 0 routing table and § 9 ownership table list eleven personas against a much larger live roster; its § 8 and § 12 are hand-written duplicates of the two rules this epic retires and converts. There is nothing in it to preserve — `.prism/rules/skill-routing.md` is the generated source of truth for routing, and the checkpoint bullets survive in `.prism/rules/pre-compaction-checkpoint.md` after Wave 1 PR 2.

9. **Correct the two doc claims that describe the tmpl as live.** In `docs/distribution.md`, delete the table row whose Source cell is `` `templates/install/AGENTS.md.tmpl` `` (the row mapping it to `consumer/AGENTS.md`, "Cross-platform constitution; tokens substituted") from the § Top-level anchor files table — no code performs that mapping. In `docs/parameterization.md`, in the § Two layers bullet beginning "**Generation-time tokens**", remove `` `templates/install/AGENTS.md.tmpl`, `` from the parenthetical list of canonical sources, leaving the `.ai-skills/skills/<id>/shared.md` example.

10. **Correct ADR-0035's stale tier discriminator.** In `.prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md`, the § Decision paragraph beginning "Rule authors classify a new rule by tier on creation" still states the pre-ADR-0070 discriminator — that Tier 1 "has no frontmatter and lives in the manifest's universal section" and Tier 2's classification "is the `paths:` field itself." ADR-0070 replaced that with an explicit `load: always|paths|skill` key, and the References section already records the amendment while the body still asserts the superseded version. Replace the parenthetical with a pointer: the classification is the rule's `load:` frontmatter key, per ADR-0070. Leave the three tier definitions and every other paragraph alone — the model is unchanged, only the discriminator moved.

11. **Confirm consumer Tier-1 delivery end to end.** [Elevates the audit's Deduced finding to Confirmed.] In a scratch directory outside this repo, `git init` a fresh repo, run `prism adopt` from this working tree against it, then `prism update`. Assert that the resulting root `AGENTS.md` carries a Tier-1 block whose `<!-- source: ... -->` markers match the canonical `load: always` set — `grep -l '^load: always' .prism/rules/*.md` in this repo, minus `context-window-handoff-check.md` and `pre-compaction-checkpoint.md` if their rows have already merged, plus `dev-servers.md` if W2-04 has. Record the observed marker count and the diff result in this plan's `### W2-06` lane record. If the assertion fails, stop and report `needs-replan` — half this wave's value rests on it.

    **Verification for W2-06:** `pnpm prism:build` then `pnpm prism:check`, plus `grep -rn "AGENTS.md.tmpl" --exclude-dir=node_modules --exclude-dir=worktrees .` returning hits only in `.prism/plans/`, `.prism/audits/`, and `.prism/lessons.md`.

**W2-05 — retire the context-window handoff check** · Lane A · after PR 1 merges **and** after W2-06

12. **Delete `.prism/rules/context-window-handoff-check.md` and sweep every reference.** The build removes the platform mirrors; four surfaces it does not touch, each verified present on 2026-08-02:
    - `templates/install/.prism/rules/context-window-handoff-check.md` — the seed twin, byte-identical to canonical. Delete it.
    - `AGENTS.md` line 33, the pointer-table row beginning `| 8 |`. This row sits **outside** the generated block, is hand-maintained, and `pnpm prism:build` will not remove it. Delete the row and renumber the rows below it.
    - The per-skill reflex-bullet citations the rule's own § Who runs this rule implies. Sweep with `grep -rln "context-window-handoff-check\|Context Window Handoff Check" .ai-skills/ .prism/skills/ .prism/references/` and remove each citation, leaving the surrounding closing-message guidance intact. Do not trust an enumerated list here — grep it.
    - `templates/install/AGENTS.md.tmpl § 8` — **already gone** if W2-06 merged first, which is why this row is sequenced after it. If the grep in the verification below still finds the tmpl, W2-06 has not landed and this row waits.

13. **Flip the rule's ADR to deprecated and move the remedy.** If an ADR encodes the check — find it with `grep -rln "handoff check\|handoff-check" .prism/spec/adrs/` — set its `Status:` to `deprecated` and add a Consequences bullet recording that the three numeric signals were the defect, preserving them in the body so the reasoning survives. Then add one line to `prism-handoff`'s invocation guidance in `.ai-skills/skills/prism-handoff/shared.md`: the active persona may suggest a handoff on session length or self-observed drift, and is never auto-routed into one off a phrase.

    **Verification:** `grep -rn "context-window-handoff-check\|Context Window Handoff Check" --exclude-dir=node_modules --exclude-dir=worktrees .` returns hits only under `.prism/plans/`, `.prism/audits/`, and `.prism/spec/adrs/` (the deprecated ADR's own body). Then build and check.

**W2-07 — skills sweep** · Lane B · **blocks W2-08**

14. **Normalize the batteries to a one-pointer shape across every skill.** `thrive-port.md` task 4 is the full spec. Across `.ai-skills/skills/*/shared.md`: each skill references `session-orientation.md` exactly once at open and once at close; delete battery restatements elsewhere in the body, and delete Definition-of-Done items that restate the batteries ("Opening battery answered", "Closing battery answered") or restate default model behavior ("Type checks pass", "No stray console.logs", "Full diff read"). Keep DoD items carrying skill-specific policy — "No implementation code written", "AC synced to tracker". The per-item test is the deletion test: does this item tell the model something its defaults or an already-cited rule do not? Expect a wide but mechanical diff.

15. **Add the anti-meta-loop clause and `Meta` severity to the review loop.** `.ai-skills/skills/prism-review-loop/shared.md`: a meta finding — a PR body describing the change wrong, a readiness line reporting a closed finding as open, plan hygiene — is real and gets fixed, but never drives another review pass; only subject-surface findings count toward the zero-findings exit. Cite thrive's measured incident in the `**Why:**`: five of nine passes spent on meta churn.

16. **Add Sol's operator-communication contract.** `.ai-skills/skills/prism-conductor/shared.md`, new `## Talking to the operator` section: interim updates are one line; plain words, no coined run-vocabulary; every handle redeemed at first mention; evidence cells one clause. Cite `.prism/rules/response-shape.md` rather than restating it — this section covers only Sol's run-report register.

**W2-09 — Sol intake and dispatch shape** · Lane B

17. **Remove the autonomy dial from canonical Sol.** `thrive-port.md` task 7 is the full spec. Surfaces: `.ai-skills/skills/prism-conductor/shared.md` (lines 29, 31, 73, 116, 133 reference the policy); `.prism/skills/prism-conductor/step-01-init.md` — the intake question is a compound one, keep the run-shape half and drop the autonomy-policy half; `lib/goal-state.md` and `lib/decision-box.md` — drop the `autonomyPolicy` field from the schema and rewrite "the autonomy gate clears" as "the commit is trivial"; `lib/report-back.md` if any gate-disposition row references the policy. Replacement semantics, phrased positively: gates are judged by their owning persona on the merits — the owner self-clears the simple cases and escalates on judgment. Do **not** touch `features.conductorMayMerge` in `.ai-skills/config.json`; it is a separate flag, PRISM sets it `true`, and removing the dial does not touch it.

18. **Add Iris to Sol's tiering table.** `.ai-skills/skills/prism-conductor/shared.md`, the tiering table around lines 88–98: add the row `| **Iris (retro)** | **top, default** | n/a — reading plan intent against the execution record is the same judgment class as review |` immediately above the worker catch-all row. Do not touch `CLAUDE_AGENT_MODEL_DEFAULTS` in `scripts/ai-skills/generate-skills.ts` — an `OPEN` Decision in `thrive-port.md` owns that call.

19. **Add the declaration line and the four-part dispatch shape.** `thrive-port.md` task 9. In `.prism/skills/prism-conductor/step-04-dispatch.md` and `lib/report-back.md`: every dispatch prompt opens with the literal line `Conductor run: dispatched by Sol.` — copied verbatim, never paraphrased, because a paraphrase reads as its absence. Prompt-mode dispatches follow four parts: the declaration line, the task pointer, the report-back schema pasted in full from `lib/report-back.md § Canonical dispatch schema`, and the handoff-context path. Add the invariant: a dispatch may add facts and scope; it may never countermand or suspend a step of the dispatched persona's skill. Label context-file facts **copied** or **composed**.

20. **Resolve the reviewer verdict-enum gap surfaced during the PR #449 run.** Same PR because it edits `lib/report-back.md`, which tasks 17 and 19 already open. The conductor log records Eric returning `needs-fix`, which is not in the five-value enum — `done` / `needs-replan` / `needs-stronger-model` / `needs-human` / `blocked` — so the current contract makes a reviewer report `done` while listing defects. Add a sixth value `needs-fix` to the enum in `lib/report-back.md`, defined as: the reviewed work has findings the reviewer expects the authoring lane to fix, and the lane continues rather than escalating. Update any routing table in `lib/report-back.md` or `.prism/skills/prism-conductor/step-05-*` that enumerates the verdicts, so the new value routes back to the authoring persona.

    Sol's *intake* changes here, and Sol's *merge capability* does not. `thrive-port.md`'s draft-hold task (task 10) is deliberately **not** in this row — this epic's parent plan records it as not ported.

    **Verification:** `grep -rn "autonomyPolicy\|autonomy policy" --exclude-dir=node_modules --exclude-dir=worktrees .` returns hits only under `.prism/plans/` and `.prism/spec/adrs/`. Then build and check.

### Deferred to a follow-on run

Tasked at row grain here, not to the detail bar. They get the bar when their run opens — writing exact edits now would produce text stale before it is read, and three of the six depend on files this run's rows are rewriting.

| Row | Lane | Content | Dependency |
| --- | --- | --- | --- |
| W2-08 | B | Claim verification — claim-you-author, re-test-a-recorded-conclusion, enumerate-before-removing, added to Briar's, Eric's, and Winston's skill bodies (`thrive-port.md` #2247 family) | after W2-07 — both edit skill bodies |
| W2-10 | B | Gate predicates — `.prism/rules/verification-commands.md` (`load: paths`, so Lane B) states what each command actually proves | none |
| W2-11 | B | Ticket types — `.prism/templates/ticket-types.md` (a template, so Lane B): DX defined by layer not by the invisibility test, one type label per ticket, and the dealer-vocabulary leak that ships to consumers | none |
| W2-12 | B | Citation gates — `scripts/ai-skills/crossref-lint.ts` gains an unqualified-`§` rule and a `see Decision:` resolver | after W2-06, which edits the same file's `looseFiles` list |
| W2-13 | B | PR descriptions — `thrive-port.md` task 12, problem-first headings plus the Register section | none |
| W2-14 | B | Lilac standup — `thrive-port.md` task 13 plus thrive #2255: two-shape render, labels running into their bullets | none |
| W2-15 | B | Repo orientation — `thrive-port.md` tasks 14–15 | after Wave 1 PR 2, which also edits `CLAUDE.md` |
| W2-16 | B | Atlas generates the worktree setup per consumer team — the second half of `thrive-port.md` task 16 | after W2-01, the worked example it cites |

### Eli (documentation)

21. **Run the docs grep on every row in this wave.** Before a PR opens, `grep -rn "<changed concept>" docs/`. No hits — record that in the lane's block and proceed. Hits — the docs edit lands in the same PR, never a later one. The concept is the thing the row renamed, retired, or redefined, not the filename it lives in. W2-06 already carries its own docs edits and does not need this pass repeated.

---

## Recommended dispatch order and batch width

**Batch width: three Lane B lanes concurrent, Lane A serial.** The budget is the reason and it is arithmetic, not taste. Eight lanes at 8–10 dispatches is 64–80 against a global budget of 100 already partly spent on Wave 1. A wider batch does not finish sooner — it raises the chance that the budget is exhausted with several lanes mid-gauntlet and none merged, which is strictly worse than fewer lanes finished. Three keeps roughly 27 dispatches in flight, so an overrun surfaces with two batches still to place.

| Batch | Lanes | Why here |
| --- | --- | --- |
| 0 | W2-01 alone | Nothing else can verify itself in a worktree until this lands. Runs in the main checkout. |
| 1 | W2-06, W2-07, W2-09 | All Lane B, so none waits on PR 1. W2-06 unblocks W2-05 and confirms the premise the wave rests on; W2-07 unblocks W2-08; W2-09 fixes Sol's own contract while a Sol run is live to exercise it. |
| 2 | W2-02, W2-03 | Lane A opens as soon as PR 1 merges. Serial within the batch: W2-02, then W2-03. W2-02 first because the voice gate it adds then guards W2-03's prose. |
| 3 | W2-04, W2-05 | Serial. W2-05 last of the Lane A set — it is the only row whose sweep surface depends on another row having merged (W2-06). |

**Budget checkpoint after batch 1.** If the three lanes there consumed more than 30 dispatches between them, batch 3 drops to W2-05 alone and W2-04 defers — the dev-servers rule is the one row in the ship-now set that neither unblocks anything nor corrects a false claim.

**If a row must be dropped to fit, drop W2-04 first, then W2-02.** W2-04 is a new rule with no dependents. W2-02 is the largest ship-now row and its value — mechanizing what `writing-voice.md` already says in prose — is a cost reduction, not a correction. Everything else either unblocks a lane, corrects something the code contradicts, or closes an audit verdict.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a freshly created git worktree, When `scripts/worktree-setup.sh` has run against it, Then `pnpm prism:check` completes there with exit 0 (REQ-1)
- [ ] Given a rule file under `.prism/rules/` with no `**Why:**` line, When `pnpm prism:check` runs, Then it fails and names that file (REQ-1)
- [ ] Given a fresh consumer repo, When `prism adopt` then `prism update` have run, Then its root `AGENTS.md` Tier-1 block lists exactly the canonical `load: always` rule set (REQ-1)
- [ ] Given a reviewer finishes a pass with fixable findings, When it reports back, Then a verdict value exists that says so without claiming the work is done (REQ-1)
- [ ] Given a run starts, When the operator is asked to configure it, Then no question about launch, internal, or hobby stakes is asked (REQ-1)

### Non-behavioral

- [ ] `pnpm prism:build` regenerates every mirror with no drift after each row; no mirror and no generated `AGENTS.md` region is hand-edited (REQ-1)
- [ ] Repo-wide grep for `AGENTS.md.tmpl` returns hits only under `.prism/plans/`, `.prism/audits/`, and `.prism/lessons.md` after W2-06 (REQ-1)
- [ ] Repo-wide grep for `context-window-handoff-check` and `Context Window Handoff Check` returns hits only under `.prism/plans/`, `.prism/audits/`, and the deprecated ADR body after W2-05 (REQ-1)
- [ ] Repo-wide grep for `autonomyPolicy` returns hits only under `.prism/plans/` and `.prism/spec/adrs/` after W2-09 (REQ-1)
- [ ] `dev-servers.md` appears in the generated `AGENTS.md` Tier-1 block and in all four mirrors after W2-04 (REQ-1)
- [ ] Every Wave 2 lane's record lives in its own `### W2-NN` block under `## Lane records`; `## History` and `## Sessions` carry only post-merge lines (REQ-1)

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-02 | Winston | AC created with the Wave 2 split; no tracker ticket exists for this work | ✓ | N/A |

---

## Lane records

Each lane writes here and nowhere else in this file. Append your opening and closing battery line and your change record under your own heading. Do not add a heading for a lane that is not yours, and do not write into `## Sessions` or `## History` — those carry post-merge lines only.

### W2-01

- 2026-08-02 [huntermcgrew/context-delivery-mechanism-w2-01-worktree-setup] open: Intent — port the repo-local half of thrive's worktree `node_modules` setup (script + guard hook) so a fresh `.claude/worktrees/` checkout can run `pnpm prism:check` unattended; Bounds — `scripts/worktree-setup.sh`, `.claude/hooks/guard-worktree-node-modules.sh`, `.gitignore`'s `node_modules` entry only, no touching the 89 pre-existing bare worktrees, no W2-16 (Atlas half); Approach — fetch thrive PR #2192's exact script and hook, adapt the link set from thrive's five-package loop down to PRISM's single root (verified via `pnpm-workspace.yaml`'s `packages: ["."]`), then prove it on a real throwaway worktree rather than reasoning about one · close: scope held — `.claude/settings.json` PreToolUse wiring for the guard hook was blocked by the permission classifier (security-settings edit) and is left for the user to add by hand; see `## Decisions` and the PR body.
- Ported `scripts/worktree-setup.sh` and `.claude/hooks/guard-worktree-node-modules.sh` from `gh pr diff 2192 --repo TracTru/thrive`, adapted for PRISM's single-root layout (no per-package link loop — `pnpm-workspace.yaml`'s `packages` key exists only to satisfy pnpm v9's `store path` check, not to declare real workspace members). Both `chmod 755`. Changed `.gitignore`'s `node_modules/` to `node_modules` so the symlink form is ignored too.
- **Proved on a real worktree, not by reasoning about one.** `git worktree add .claude/worktrees/w2-01-probe HEAD` → `bash scripts/worktree-setup.sh .claude/worktrees/w2-01-probe` (exit 0, created `node_modules -> ../../../node_modules`) → `cd` in and `pnpm prism:check` → exit 0 (578 pass, 1 skipped — the RED unpushed-commits self-measurement subtest that skips outside CI, unrelated to this change) → `git worktree remove .claude/worktrees/w2-01-probe --force`. No trace left behind.
- Did not touch any of the 89 pre-existing worktrees under `.claude/worktrees/` that lack `node_modules` — see `found-followup-work` signal below; that backfill is out of scope for this row per the dispatch instructions.
- `.claude/settings.json` PreToolUse registration for the guard hook was attempted and blocked by the harness's own permission classifier (settings/hook config is treated as a security-sensitive edit). The script and hook both exist and both work when invoked directly; only the auto-fire wiring is missing. Flagged in the PR body for the human to add the four-line PreToolUse block.
- `pnpm prism:build` and `pnpm prism:check` both exit 0 at repo root, both before and after the worktree probe. `docs/` grep for "worktree" returns five pre-existing hits (Zoe persona docs, `.ai-skills` compatibility notes, Sol conductor doc) — none describe the node_modules setup mechanism this row introduces, so no doc edit is in scope per the per-PR docs gate.

### W2-02
### W2-03
### W2-04
### W2-05
### W2-06
### W2-07
### W2-09

---

## Sessions

Post-merge and planning entries only. In-flight lanes record under `## Lane records` above.

- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — make Wave 2's sixteen rows dispatchable in parallel by resolving the plan-file contention, re-cutting the row set against the always-on audit, and tasking each row to the detail bar; Bounds — plan files only, no code, no `.prism/rules/`, no `conductor-state.json`, append-only on the parent plan Clove holds open; Approach — verify every lane assignment against the target file's actual `load:` value on disk, and check the fan-out premise itself before organizing a wave around it · close: scope held — two deliberate additions beyond the tasked output: `thrive-port.md` restored from `stash@{0}` because eleven rows cite it and it was on no branch, and the worktree row promoted from last to first because the fan-out cannot verify itself without it

---

## History

Post-merge entries only. In-flight lanes record under `## Lane records` above.

- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Split Wave 2 out of `context-delivery-mechanism.md` at epic grain and tasked its rows to the detail bar, re-cut against the always-on audit — eighteen candidate rows merged to sixteen, eight shipping this run and eight deferred to fit the dispatch budget. Recovered `.prism/plans/thrive-port.md` from `stash@{0}`, where it was the sole copy despite eleven rows citing it. Promoted the worktree `node_modules` row from last to first after verifying 89 of 117 worktrees cannot run `pnpm prism:check`; see Decisions.
