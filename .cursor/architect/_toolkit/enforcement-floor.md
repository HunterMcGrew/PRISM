# Enforcement Floor — Gate-Strength Taxonomy

Every PRISM persona gets an enforced **floor**: a typed report contract plus an ownership matrix, and — scaled by what its claims can actually be proven against — a set of evidence gates. The floor is what makes a persona's reported completion trustworthy to whoever consumes it (Sol or a human) without depending on how capable the model is. This doc names the three classes a persona can fall into, what every persona gets regardless of class, and what each class adds on top.

The principle behind the floor lives in [ADR-0067](../../spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md): the runtime ratifies verdicts; the model only proposes them. This doc is the taxonomy that ADR operates over — read the ADR for *why* the floor exists, read this for *which floor each persona gets*.

The manifest routes this doc into any edit that touches a skill body (`.claude/skills/**`, `.ai-skills/skills/**`), because that is where ownership matrices and gate-pointer Definition-of-Done sections get authored (Phases 5–6 of the enforcement-layer epic).

---

## The universal primitives — every persona, every class

Three things are universal. They do not scale by class; a Class C business persona gets them exactly as a Class A implementer does.

**1. The typed report contract.** Every persona's final act is to emit a structured report — `reasoning`, `persona`, `checklist`, `verdict`, `verdict_reason`, `next_route`, `payload`. The `verdict` is one of the values from the authoritative enum in [`report-back.md`](../../skills/prism-conductor/lib/report-back.md) (`done` / `needs-fix` / `blocked` / `needs-replan` / `needs-stronger-model` / `needs-human`) — this doc does not re-enumerate it; the enum is owned there. `next_route` is **required** and shape-checked at the gate for coherence with the verdict (`done` → normal next persona; `needs-replan` → Winston/user; `blocked` → human; `needs-fix` → implementer). A persona cannot stop without declaring where it hands off, and the declared route cannot contradict its own verdict. This is the positive half of handoff enforcement; the ownership matrix is the negative half.

**2. The ownership matrix.** Every persona declares two lanes:

- `may_write[]` — the glob set of paths the persona is allowed to write. Enforced before the write by the `PreToolUse` ownership guard; an out-of-lane write is denied before it happens.
- `may_not_run[]` — the command substrings the persona may never run (e.g. `gh pr merge`, `git merge`, `git push -f` for an implementer; merge commands for every reviewer and for Sol). Enforced before the command runs.

The matrix is what forces handoff negatively: Briar can't write source, so she must hand to Clove; Clove can't merge, so he must hand to a human. Handoff is the only remaining move, not a trusted nicety. The ownership globs are assigned by role in the taxonomy below, then verified against the actual skill body in Phase 5 — `may_write` must match what the skill genuinely writes, `may_not_run` must encode real boundaries.

**3. Protected paths — the floor's self-protection.** The enforcement runtime and the gate's own state sit outside every persona's writable scope, regardless of class. A persona blocked by a gate must not be able to edit the code that computes the verdict, reset the strike counter that bounds the loop, or rewrite the audit record — otherwise the floor's whole guarantee unwinds (a verdict from an exit code is only un-arguable if the gated party can't disable the runtime). The protection is a global denylist the ownership guard checks **before** it consults any persona's `may_write`, so no `may_write` entry can grant a protected path back. The protected set is the enforcement code (the hook scripts, their shared `lib/`, the gate configuration, the settings that wire them) and the gate state (the per-run strike counter, the evidence ledger, the audit record). The single carve-out is the persona's own report file — the persona writes its proposed verdict there as its final act, and the gate reads it; that is the channel being hardened, not a runtime the persona controls.

This is structural, not a discipline rule, for the same reason the verdict itself is computed and not trusted: it was a gated persona reaching for the forbidden path *because the gate was in its way* that surfaced the hole. The protection lives in the guard code, which is itself one of the protected paths — self-protecting by construction. One edge stays softer and is named rather than hidden: shell-based *deletion* of gate state (an `rm`, not a write tool) is forbidden by `may_not_run` and backstopped by the security hook, but the airtight guarantee covers the lawful write path; shell deletion is defended in depth. The consequence the floor accepts in return: hooks are authored in canonical source (outside the protected runtime path) and emitted into the runtime by the build pipeline — never edited live in place. See [ADR-0067](../../spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md) § Gate non-circumventability for the principle and the originating incident.

---

## The three classes

Class membership is assigned by **role** — what the persona's job lets the runtime prove. The defining question per class: *what can be checked from evidence, versus what stays structurally trusted?*

### Class A — hard evidence gates

A persona is Class A when its core claim maps to a **runnable check with a real exit code or a structural validation**. The gate runs the check; the exit code, not the model's report, decides the verdict.

Membership rule: a persona is Class A when "did it work?" reduces to a command's exit code or a schema validation.

- `prism-code-dev` (Clove) — typecheck / test / lint gates (`tsc`, the test runner, the linter).
- `prism-changelog` (Sage) — tags resolve + the changelog file was written.
- `prism-onboarding` (Atlas) — `config.json` validates against `config.schema.json`.

**Floor:** universal primitives + full evidence gates. A claimed `done` is overridden if any gate's check fails.

### Class B — procedural / structural gates

A persona is Class B when its **act is provable but its quality is not**. The gate can confirm the persona did the work and that its report is internally coherent — it cannot confirm the work is *good*. Quality rides on structural independence (a fresh dispatch, a constrained `may_write` lane), not on a gate that judges quality.

Membership rule: a persona is Class B when the runtime can prove "the procedure ran and the report is coherent" but cannot prove "the output is correct."

Class B is the intermediate class — between Class A's hard evidence gates and Class C's ownership-only floor. It covers every analysis, review, planning, and documentation persona that isn't Class A and isn't a business persona:
`prism-architect`, `prism-code-review-self`, `prism-code-review-pr`, `prism-debugger`, `prism-ticket-start`, `prism-user-stories`, `prism-qa-test-plan`, `prism-documentation`, `prism-doc-walker`, `prism-surface-audit`, `prism-design`, `prism-prd`, `prism-refactor-scout`, `prism-retro`, `prism-standup-summary`.

**Floor:** universal primitives + procedural / structural preconditions and coherence checks. The canonical shape is **Briar's gate**: it proves she *worked* (the check-gates fired) and is *coherent* (a `needs-fix` verdict is shape-validated against a real critical/major finding), never that she is *right*. A review-quality gate cannot exist — see [ADR-0067](../../spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md) § the Briar caveat. Do not build one in any later phase.

For the 8 deterministic-target Class B personas (sasha, mira, eli, pixel, zoe, iris, reese, theo), the deliverable precondition is **run-scoped**: the persona writes a `deliverable.json` sidecar into its run-keyed evidence dir (`.prism/evidence/${runKey}/deliverable.json`) naming the path it produced, and a second precondition confirms that path is new or modified this run via a union diff against `origin/main`. Both checks are `on_fail: needs-replan` preconditions — they do not consume a gate strike. The evidence dir is git-ignored and created fresh per run, so it cannot hold a stale committed artifact; this makes it the run-scope anchor that closes the repo-global staleness hole.

### Class C — structurally trusted only

A persona is Class C when there is **no runnable check for its output at all** — its value is judgment expressed as prose, and the only enforceable floor is *where it may write* and *that it returns a contract*.

Membership rule: a persona is Class C when its output is judgment-as-prose with no exit code and no structural validation — the floor is ownership + contract, nothing more.

- The business-layer personas: `prism-founder`, `prism-market-research`, `prism-finance`, `prism-marketing`, `prism-sales`, `prism-data`, `prism-customer-success`, `prism-recruiting`, `prism-legal`.
- `prism-conductor` (Sol) — the verdict *consumer*. Its floor is heavily ownership: Sol may not write code or tickets and may not run a merge. It carries no evidence gate because it produces no work artifact to gate; it routes the gated verdicts of others.

**Floor:** universal primitives only — the ownership matrix (the load-bearing half for this class) + the typed report contract + the persona's existing procedural prose. No evidence gate.

### Utilities — ceiling only, no gate entry

`prism-handoff`, `prism-review-loop`, and `prism-skill-forge` are utilities, not personas. They carry no verdict of their own and inherit the active persona's ownership lane, so they get **no `gates.json` entry**. They receive the ceiling-prose pass only (vague lines → named procedures with typed escapes), never a floor entry.

---

## The factual-grounding bar — the ceiling every class shares

The floor checks claims; the ceiling makes the model stronger at producing them. Both layers hold every instruction to one bar: a procedure must name a concrete action the agent genuinely needs to take (a command to run, a file to read, an artifact to write, a decision to make), with a precise trigger and a typed escape.

- The **typed escape** is the anti-loop mechanism — a sanctioned exit verdict (`needs-replan`, `needs-human`, …) instead of spinning.
- The **precise trigger** is the anti-over/under-reasoning mechanism — it calibrates how much to think and when to stop.

A procedure that does not correspond to a real, factual action is aspiration, not instruction — and belongs in neither layer. Aspiration dressed as procedure is worse than honest prose, because it invites the model to perform compliance with a step that has no real referent. The test during the ceiling pass (Phase 6) is one question per rewritten line: *does this correspond to a real action the agent must do?* If not, cut it or ground it.

This bar applies to all three classes and to the utilities. It is the co-equal partner of the floor: the floor tells whoever-consumes-the-verdict that the claim is true; the ceiling tells the model how to make it true without looping, over-reasoning, or under-reasoning.

---

## Cross-references

- [ADR-0067](../../spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md) — the inversion principle, channel-hardening, handoff enforcement, and the Briar ceiling caveat this taxonomy operates over
- [`report-back.md`](../../skills/prism-conductor/lib/report-back.md) — the authoritative verdict enum and Sol's deterministic routing; the report contract carries this verdict
- [ADR-0011](../../spec/adrs/_toolkit/0011-eric-never-approves-prs.md) — the human merge boundary; `may_not_run` encodes the merge prohibition for reviewers and Sol, but a human still merges
- `.prism/plans/epic-prism-enforcement-layer.md` — the epic plan; the report contract schema (Phase 0) and `gates.json` schema + per-persona population (Phases 0, 5) realize this taxonomy as data
