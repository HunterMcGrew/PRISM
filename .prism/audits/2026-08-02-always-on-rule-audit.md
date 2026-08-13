# Always-on rule audit — 2026-08-02

Scope: every canonical rule declaring `load: always`, graded against the self-measurement criterion from [`context-delivery-mechanism.md`](../plans/context-delivery-mechanism.md) § Decisions. Plus the consumer-distribution finding recorded at [`epic-prism-consumer-boundary.md`](../plans/epic-prism-consumer-boundary.md):63, which gates whether auditing Tier 1 means anything at all.

Every claim below is graded **Confirmed** (observed on disk, path cited), **Deduced** (named logical steps), or **Hypothesized** (unverified). All disk observations are from PRISM `huntermcgrew/context-delivery-mechanism`, 2026-08-02.

---

## 1. The consumer-distribution finding — resolved, with two live residues

**The recorded finding no longer holds. Consumers do receive Tier 1.** [Confirmed]

The epic's claim was that the always-loaded behavioral rules "are neither in the install rule surface nor in `AGENTS.md.tmpl`." Both halves of the delivery path check out today:

- **Install rule surface — present.** `templates/install/.prism/rules/` carries all 22 canonical `load: always` rules, each with `load: always` frontmatter intact. The named-as-missing set (core-principles, verification-before-done, demand-elegance, plan-before-building, self-improvement-loop, subagent-strategy, pre-compaction-checkpoint, context-window-handoff-check, cross-agent-handoff-accountability, autonomous-bug-fixing, bash-output-minimization) is present in full. [Confirmed — directory listing plus per-file frontmatter parse]
- **Consumer AGENTS.md block — generated, not templated.** `prism adopt --seed-agents-md` writes a minimal root `AGENTS.md` carrying the begin/end marker pair (`scripts/ai-skills/adopt.ts:229` calling `renderSeededAgentsMd` from `scripts/ai-skills/agents-md-block.ts`). `prism update` then fills it by scanning the *consumer's own* `.prism/rules/` — `scanConsumerRuleLoad` at `scripts/ai-skills/update.ts:594-608` calls `collectTier1RuleBodies` against the consumer content root, and the result feeds the block refresh. [Confirmed — read both files]

So the delivery mechanism is the same one PRISM uses on itself, pointed at the consumer's shipped rule copies. The remedy the epic scoped (ADR-0065's SHIP-kernel mode) landed. **The audit below is not moot.** [Deduced — the seed carries the rules, and the consumer-side build reads the seeded directory; no consumer install was exercised end-to-end in this pass, which is the one step short of direct observation.]

### Residue A — `templates/install/AGENTS.md.tmpl` is orphaned and stale

**No code path reads it.** A repo-wide grep for `AGENTS.md.tmpl` (excluding worktrees and `node_modules`) returns hits only in docs, ADR prose, plans, lessons, and one lint-target list at `scripts/ai-skills/crossref-lint.ts:138`. Nothing in `adopt.ts`, `init.ts`, `update.ts`, `build.ts`, or `bundle.ts` copies or substitutes it. [Confirmed]

It still ships: `templates/install/` is in `package.json` `files`, so every consumer's `node_modules` gets the file. [Confirmed]

Its content is a hand-written §0–§12 constitution that duplicates rule prose in a form nothing regenerates. Two of those sections are the exact rules this plan is retiring and converting — **§ 8 Context Window Handoff Check** and **§ 12 Pre-Compaction Checkpoint**, both reproduced verbatim-ish in the tmpl. [Confirmed — read the file in full]

Two claims in the docs contradict the code:

- `docs/distribution.md:100` maps `templates/install/AGENTS.md.tmpl` → `consumer/AGENTS.md`, "tokens substituted." No code performs that mapping. [Confirmed]
- `docs/parameterization.md:9` names it as a live canonical token source. It carries `${TICKET_PREFIX}` and nothing substitutes it. [Confirmed]

**Size of the fix:** small, content-only, Lane B. Either delete the tmpl and correct the two doc lines, or — if it is meant to be a human-readable reference — mark it as such and stop calling it a distribution source. Either way, PR 2's task 8 ("consolidate the duplicated five bullets to one home") is short a copy: it names `AGENTS.md § 12` and `CLAUDE.md § Context Preservation Rules`, and the tmpl is a **third**. This is the finding with the sharpest edge for the plan as written.

### Residue B — a hardcoded persona roster in the same tmpl

The tmpl's § 0 routing table and § 9 ownership table list eleven personas. The live roster is far larger, and `.prism/rules/skill-routing.md` is the generated Tier-1 source of truth. Same orphan root cause; recorded so the delete/mark decision is made once with both facts in view. [Confirmed]

---

## 2. Tier-1 enumeration and the AGENTS.md cross-check

**22 canonical rules declare `load: always`.** Enumerated by parsing the `load:` key out of the first frontmatter block of every `.prism/rules/*.md`. [Confirmed]

**The generated block inlines exactly that set — no discrepancy.** The 22 `<!-- source: ... -->` markers between `AGENTS.md:38` (BEGIN) and `AGENTS.md:1703` (END) match the 22 canonical files one-for-one, in sorted order, with no extras and no omissions. [Confirmed — marker list diffed against the frontmatter enumeration]

One small correction to the dispatch brief, recorded because a line number stated as verified should stay right: the block ends at **line 1703**, not 1706 (`AGENTS.md` is 1767 lines total). The set is identical either way. [Confirmed]

---

## 3. Per-rule verdicts

The criterion: **does the rule ask the model to measure something about itself — context usage, exchange count, files read, tokens spent — before it can fire?** A trigger that keys on an external event (a user correction, a session start, a plan re-read, a task shape) is not a self-measurement even when it requires judgment.

| Rule | Self-measurement trigger | Verdict | Reason |
| --- | --- | --- | --- |
| `autonomous-bug-fixing.md` | No | **Keep** | Fires on a bug report — an input, not a self-observation |
| `bash-output-minimization.md` | No | **Keep** | Fires per command issued |
| `branch-plan.md` | No | **Keep** | Fires on plan lifecycle events (start, meaningful change, close) |
| `code-comments.md` | No | **Keep** | Fires when writing or reviewing a comment |
| `code-standards.md` | No | **Keep** | Fires on the code being written |
| `context-reuse.md` | No — see note | **Keep** | Trigger is "the same file shows up across steps." Recall of a discrete prior read, not a count; the prior read's content is itself in context, so the trigger is self-evidencing rather than self-measuring |
| `context-window-handoff-check.md` | **Yes** — "5 or more skill invocations in this conversation… 30 or more files read, or 1,000 or more combined insertions and deletions… 100 or more user exchanges" | **Retire** | Three counts the model cannot verify, evaluated at session close when its own text is most faded. Already scoped as `thrive-port.md` task 17 |
| `core-principles.md` | No | **Keep** | Fires on every change; no measurement |
| `cross-agent-handoff-accountability.md` | No | **Keep** | Fires on receiving another agent's diagnosis |
| `demand-elegance.md` | No | **Keep** | "For non-trivial changes" measures the change, not the session |
| `followup-scope.md` | No | **Keep** | Fires when surfaced work needs a vehicle |
| `git-conventions.md` | No | **Keep** | Fires on git operations |
| `lazy-artifacts.md` | No | **Keep** | Fires when creating a file under `.prism/` |
| `plan-before-building.md` | No | **Keep** | "3 or more steps" measures the task, not the model |
| `pre-compaction-checkpoint.md` | **Yes** — "When context usage approaches the compaction threshold" | **Convert to mechanism** | The one measurement the model provably cannot make. Already scoped as PR 2 tasks 6–8: retier to `load: skill`, content becomes the `SessionStart(source: "compact")` hook payload |
| `response-shape.md` | No | **Keep** | Fires on every chat reply |
| `self-improvement-loop.md` | No | **Keep** | Fires after a user correction — an observable transcript event |
| `session-orientation.md` | No | **Keep** | Batteries fire at session start and close; re-anchors fire at enumerated event boundaries (phase transition, review round, plan re-read). "Long sessions drift" is the rationale, not the trigger |
| `skill-routing.md` | No | **Keep** | Fires on user intent |
| `subagent-strategy.md` | No | **Keep** | Fires on task shape |
| `verification-before-done.md` | No | **Keep** | Fires at the done claim |
| `writing-voice.md` | No | **Keep** | Fires on durable prose. Tier stays `always` per the plan's own Decision; the mechanical half moves to the Wave 2 voice gate |

**Result: zero hits beyond the two already known.** [Confirmed — every rule body read, in the generated block and in canonical source]

That is the honest finding, not a shortfall. The criterion is narrow by design, and the two rules it catches are precisely the two the plan's premise identified. A third was not manufactured.

### Two near-misses, recorded so the next auditor does not re-litigate them

- **`session-orientation.md` § Mid-flight Re-anchors** is the closest structural neighbor: it reasons about session length ("Long sessions drift between the opening and closing batteries"), but the firing condition it lands on is an enumerated external event. It fails the criterion. It is, however, the strongest *mechanism* candidate in the set on grounds other than self-measurement — the opening and closing batteries fire at host-exposed events (`SessionStart`, session end), which is the same shape as the checkpoint conversion. Out of scope for this criterion; named as a follow-up.
- **`self-improvement-loop.md`'s "Review lessons at session start"** is likewise a host event with a file read attached — mechanizable, not self-measuring. Same follow-up.

Neither is a verdict change. Both are noted because "why didn't the audit catch this?" is a question a future reader will ask, and the answer is that the criterion is about *measurement*, not about *mechanizability*.

---

## 4. Wave 2 cut-line deltas

The audit changes no lane and deletes no row. Zero further retiers means the generated `AGENTS.md` block's membership is unchanged apart from the two already-scoped rules, so every Wave 2 row keeps the lane the plan assigned it. Three deltas Sol needs when re-cutting:

1. **"Retire handoff check" (Lane A) — the sweep surface is wider than the row implies.** Deleting `.prism/rules/context-window-handoff-check.md` also requires: the byte-identical seed twin at `templates/install/.prism/rules/context-window-handoff-check.md` (verified identical to canonical); the pointer-table row `| 8 |` in `AGENTS.md` § Behavioral norms (hand-maintained, outside the generated block, so `prism:build` will not remove it); the twelve per-skill reflex-bullet citations the rule's own § Who runs this rule implies; and § 8 of `templates/install/AGENTS.md.tmpl` if that file survives finding 1. The generated block itself needs no edit beyond a rebuild.
2. **PR 2 task 8 is short one copy.** It names two homes for the five checkpoint bullets (`AGENTS.md § 12`, `CLAUDE.md § Context Preservation Rules`). `templates/install/AGENTS.md.tmpl § 12` is a third. The AC "the five checkpoint bullets exist in exactly one place after the compaction PR" fails on disk unless the tmpl is handled in that PR or deleted before it. This is a cut-line change to an *already-tasked* PR, not a Wave 2 row — flagged here because it is the one place the audit contradicts the plan as written.
3. **A new Wave 2 row is warranted: orphan-tmpl cleanup (Lane B).** Delete or demote `templates/install/AGENTS.md.tmpl`, and correct `docs/distribution.md:100` and `docs/parameterization.md:9`. Content-only, no build effect, blocks nothing — but it should land *before* the retire-handoff-check row so that row's sweep does not have to special-case a file that is about to disappear.

---

## 5. What this audit did not verify

- **No consumer install was exercised.** Finding 1's conclusion rests on reading the seed surface and the consumer-side build path, not on running `npx @huntermcgrew/prism adopt` into a fresh repo and observing the resulting `AGENTS.md`. That end-to-end check is the one step that would move the claim from Deduced to Confirmed, and it is cheap — worth folding into whichever PR touches the tmpl.
- **No claim is made about whether the 20 `keep` rules are *effective* at 300k tokens.** The criterion asks only whether their trigger is a self-measurement. A rule can pass this audit and still be faded past usefulness — that is the question the Wave 2 voice gate and the hook A/B harness are aimed at, not this one.
