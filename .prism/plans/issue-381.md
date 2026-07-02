# Plan: issue-381

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/381 — Remove hardcoded model tiers; make persona model selection config-driven. Lane L381 of epic #373.

## Goal

Strip unconditional Claude model names out of platform-shared canonical prose, live conductor step files, and rules; replace them with abstract tiers (`top` / `worker`); add an optional `modelTiers` config seam so each consumer maps tiers to their own runtime's models.

---

## Design

Owner decision: canonical prose speaks in abstract tiers only; the end user picks models via `.ai-skills/config.json`. Platform overlays (Claude/Codex/Cursor) may show model names as clearly-marked examples of that runtime's per-dispatch override mechanism.

**Key architectural finding (drives the whole plan):** the run-control layer already carries per-persona and per-team model tiers as literal model-name strings — `lanes[].models` (`{ "winston": "opus", "clove": "sonnet" }`), `teamConfig[].modelTier`, and root `conductorModel`. `goal-state.md` line 79 currently *defines* that vocabulary by pointing at `shared.md § Model tiering`. So the config seam is not a new read path — it is the **install-time default source** the `models` map has never had. And abstracting the shared table means the goal-state cross-reference must be re-anchored, or its `opus`/`sonnet` string values lose their defined vocabulary.

**KEEP (not prose defaults — do not touch):**

- Claude overlay `model: 'opus'` / `model: 'sonnet'` in `.ai-skills/skills/prism-conductor/CLAUDE.md` — these are the Claude-runtime per-dispatch override *mechanism*, illustrative per design point 3.
- Run-control string values in `goal-state.md` (`models`, `modelTier`, `conductorModel` examples) — runtime state, not prose defaults. Their vocabulary gets re-anchored (task 6), not removed.
- All ADR references to models — historical records, exempt.
- `config.schema.json` example values (`opus`, `sonnet`) added in task 4 — illustrative schema examples, allowed.

---

## Implementation Tasks

### Clove (implementation)

Sequence matters: do task 1 first (it establishes the abstract vocabulary every later task references), then 2–7 in any order, then task 8 (verify) last.

**1. Rewrite the tier table in `.ai-skills/skills/prism-conductor/shared.md` (lines 85–94, `## Model tiering`) to abstract tiers.**

Replace the table body and the paragraph under it. The table must name **no** model. Exact replacement for the section (keep the `## Model tiering` heading):

```markdown
## Model tiering

Every dispatch runs at a **tier**, not a hardcoded model. There are two tiers — **top** and **worker** — plus a per-persona override for personas that must always run top-tier regardless of the tier→model mapping.

| Role | Default tier | Escalation |
| --- | --- | --- |
| **Sol (Conductor)** | **top** | n/a — already top tier |
| **Winston (architect / plan)** | **top, never lower** | n/a — the firewall never runs cheap |
| **Eric (PR review)** | **top, never lower** | n/a — high-judgment review task, top tier by default |
| Worker personas (Clove, Sasha, Briar, …) | **worker** | → top on signal (worker tier stalled the unit twice / strike 2) |

Each consumer maps tiers to concrete models in `.ai-skills/config.json` under `modelTiers` (`top`, `worker`, and optional per-persona `overrides`) — see the config schema. The tier per dispatch is read off the goal-state lane's `models` map (seeded from `modelTiers`) and applied via the runtime's per-dispatch model override; `claude.md` documents the Claude Code mechanism and shows model names only as examples of that mechanism. A Plan Readiness Gate failure means *re-plan harder* (Winston is already top tier), not *escalate the model*.
```

Verify no model literal remains in the file after the edit: `grep -nE 'Opus|Sonnet|Haiku|Fable' .ai-skills/skills/prism-conductor/shared.md` must return nothing. (Note: line 54 — "Sol-on-Opus" — is also a hit; rewrite that phrase to "Sol at top tier" in the same pass. It is prose in the shared body describing the conductor's model, so it is a CHANGE.)

**2. Fix the `.ai-skills/skills/prism-conductor/codex.md` line 7 model-name reference.**

Current phrase: "the Sonnet→Opus tiering is applied by the human selecting the model at handoff". Replace the two model names with tier names: "the worker→top tiering is applied by the human selecting the model at handoff". No other change to the file. Verify: `grep -nE 'Opus|Sonnet|Haiku|Fable' .ai-skills/skills/prism-conductor/codex.md` returns nothing.

**3. Fix the `.ai-skills/skills/prism-conductor/cursor.md` line 7 model-name reference.**

Identical change to task 2: "the Sonnet→Opus tiering" → "the worker→top tiering". Verify: `grep -nE 'Opus|Sonnet|Haiku|Fable' .ai-skills/skills/prism-conductor/cursor.md` returns nothing.

**4. Add the `modelTiers` object to `.ai-skills/config.schema.json`.**

Insert a new property under `properties` (alphabetical placement is not enforced in this schema; place it after `features` for locality with the other conductor-read config). Do **not** add it to the top-level `required` array — it is optional. Exact JSON to insert:

```json
"modelTiers": {
	"type": "object",
	"description": "Optional per-persona model selection for Sol's conductor dispatches. Maps PRISM's abstract tiers (top / worker, defined in prism-conductor shared.md) to this runtime's concrete model names, plus optional per-persona overrides. Read by Sol to seed each lane's goal-state `models` map; absent means the conductor uses its run-wide default model for every dispatch. Model-name strings are examples only — a consumer on a non-Claude runtime supplies that runtime's model identifiers.",
	"properties": {
		"top": {
			"type": "string",
			"description": "Model for the top tier (Sol, Winston, Eric, and any escalated worker).",
			"examples": ["opus", "gpt-5"]
		},
		"worker": {
			"type": "string",
			"description": "Model for the worker tier (Clove, Sasha, Briar, and other default worker personas).",
			"examples": ["sonnet", "gpt-5-mini"]
		},
		"overrides": {
			"type": "object",
			"description": "Optional per-persona model pins keyed by lowercase persona name (e.g. `eric`, `winston`). An override wins over the persona's default tier — the seam for cross-model review, where a team pins Eric to a different family than the workers. A value here is a concrete model name, not a tier name.",
			"additionalProperties": { "type": "string" }
		}
	}
}
```

Verify the schema still parses: `node -e "JSON.parse(require('fs').readFileSync('.ai-skills/config.schema.json','utf8'))"` exits 0.

**5. Add one sentence to the review-loop three-strike survival rule in `.ai-skills/skills/prism-review-loop/shared.md` (the `- **Three-strike survival rule.**` bullet, lines 49–53).**

Append to the end of that bullet's text (before the next `- **Disagreement fast-path.**` bullet), matching the file's existing ~72-char wrap and indentation (continuation lines indented two spaces under the bullet):

```markdown
  When the reviewer and fixer run the same model, their strike votes are
  correlated — a blind spot one misses, the other likely misses too — so the
  mandatory one-sentence diagnosis (Procedure A) is the arbiter of whether a
  re-raise is real progress, not the strike count alone. Honor a configured
  Eric `overrides` entry (`.ai-skills/config.json` `modelTiers.overrides.eric`)
  when present — a cross-model reviewer restores the independent second opinion.
```

Do not restructure the Procedures; this is additive prose only.

**6. Re-anchor the tier-vocabulary cross-reference in `.prism/skills/prism-conductor/lib/goal-state.md` (line 79).**

Line 79 currently reads: "`modelTier` is one of the valid model tier values defined in `shared.md § Model tiering` (e.g. `opus`, `sonnet`); `null` means use the run-wide conductor model." Because `shared.md § Model tiering` no longer names models after task 1, re-point the vocabulary source to config. Replace that clause with:

```markdown
`modelTier` is a concrete model name for this runtime — the same value space as `.ai-skills/config.json` `modelTiers` (`opus`, `sonnet`, or a non-Claude runtime's model id); `null` means use the run-wide conductor model.
```

Leave the `models` example on line 31 (`{ "winston": "opus", "eric": "opus", "clove": "sonnet" }`) as-is — it is a run-control state example, not a prose default. Verify goal-state.md has no dangling pointer to the (now abstract) tier table: confirm no remaining phrase says model values are "defined in shared.md."

**7. No changes needed to the two live conductor step files for model *names* — but verify the abstract-tier language reads cleanly.**

`step-03-plan-readiness.md` line 10 and `step-06-escalate.md` lines 5–6 reference "Winston is already Opus" and "bump `models.<persona>` to `opus`". These are CHANGE hits (prose in live step files). Apply:

- `step-03-plan-readiness.md` line 10: "Winston is already Opus, so the fix is re-plan-harder" → "Winston is already top tier, so the fix is re-plan-harder".
- `step-06-escalate.md` line 5: "Winston is already Opus." → "Winston is already top tier."
- `step-06-escalate.md` line 6: "bump `models.<persona>` to `opus` for that persona's next dispatch" → "bump `models.<persona>` to the top-tier model for that persona's next dispatch". Keep the `models.<persona>` field name — that is a real run-control field.

Verify: `grep -rnE 'Opus|Sonnet|Haiku|Fable' .prism/skills/prism-conductor/` returns nothing except any `.md` line inside code-fence examples that are run-control state (there should be none in the two step files).

**8. Handle `.prism/rules/implementation-task-detail.md` line 11 — this is a KEEP with a judgment call; confirm before editing.**

Line 11 reads: "Sonnet, low-effort Opus, ChatGPT, Cursor — they all hit ambiguity differently, but they all hit it." This is an **illustrative list of models/runtimes that vary**, not a prose tier default assigning a model to a persona. Per design point 2 (abstract-tier rewrite targets prose *defaults*), this is borderline. Decision (see `## Decisions`): **rewrite it** to remove the specific Claude model names so the rule doesn't hardcode a vendor's model lineup, but keep the cross-LLM-variance point. Replace with: "Different models and effort levels — a smaller model, a low-effort run of a larger one, a different vendor entirely — all hit ambiguity differently, but they all hit it." Verify: `grep -nE 'Opus|Sonnet|Haiku|Fable' .prism/rules/implementation-task-detail.md` returns nothing.

**9. Update `docs/parameterization.md` — add the tradeoff paragraph and a config field-reference row.**

- Add a `modelTiers` row to the field-reference table (after the `rules.optIn` row, before `slackChannel`): `| \`modelTiers\` | object | optional | Optional per-persona model selection for Sol's conductor dispatches. Maps abstract tiers (top / worker) to concrete models, plus per-persona \`overrides\`. See § Model tiering below. |`
- Add a new `## Model tiering` section near the end (after `## Feature flags`, before `## Future: ticket-system providers`). One paragraph on the tradeoff design point 5 names:

```markdown
## Model tiering

Sol dispatches every persona at an abstract tier — **top** (Sol, Winston, Eric) or **worker** (Clove, Sasha, Briar, …) — never a hardcoded model. The optional `modelTiers` object in `.ai-skills/config.json` maps those tiers to your runtime's concrete models (`top`, `worker`) and pins individual personas via `overrides`. Absent, the conductor uses its run-wide default model for every dispatch.

One tradeoff is worth naming. If the reviewer (Eric) and the workers run the same model, the review loop loses some family-level blind-spot coverage — a mistake the model's family is prone to can slip past a reviewer of the same family. A team that wants cross-model review sets Eric's tier explicitly:

```json
{
  "modelTiers": {
    "top": "opus",
    "worker": "sonnet",
    "overrides": { "eric": "gpt-5" }
  }
}
```
```

Verify: `grep -nE 'Opus|Sonnet|Haiku|Fable' docs/parameterization.md` returns nothing (the doc uses lowercase `opus`/`sonnet` as JSON example values, which is fine — the grep is case-sensitive on capitalized prose names; if the doc introduces a capitalized prose name, rewrite it).

**10. Verify the whole lane green.**

Run `pnpm prism:check` (or `pnpm prism:build` if `prism:check` is not the aggregate) and confirm exit 0. Then run the sweep: `grep -rnE 'Opus|Sonnet|Haiku|Fable' .ai-skills/skills/prism-conductor/shared.md .ai-skills/skills/prism-conductor/codex.md .ai-skills/skills/prism-conductor/cursor.md .prism/skills/prism-conductor/step-03-plan-readiness.md .prism/skills/prism-conductor/step-06-escalate.md .prism/rules/implementation-task-detail.md` — must return nothing. The literal guard (parameterization.md § How tokens propagate) runs in the build; a green build confirms no model-name literal leaked into platform outputs.

---

## Decisions

- **`modelTiers` schema shape: tier-named buckets (`top` / `worker`) + optional per-persona `overrides`.** Considered: a flat per-persona map (`{ "eric": "opus", "clove": "sonnet", … }`). Rejected: the flat map forces a consumer to enumerate every persona to change one model, has no place to express "the worker default," repeats the same string across every worker persona, and requires a config edit whenever a persona is added. The bucket shape holds the default in one place and treats per-persona pins as the exception — which matches the actual tiering (two tiers, two always-top personas, everyone else default). Deletion test on `overrides`: removing it makes cross-model review impossible without corrupting the `worker` bucket's meaning, so it carries real weight. The two buckets map 1:1 onto the abstract vocabulary `shared.md` now uses, so config and prose speak the same language with no translation layer. Mirrors the L380 `ticketSystem` object-shape precedent (same team, same abstraction-lever decision).
  - → no promotion needed (schema shape is documented in config.schema.json + parameterization.md, which are the durable surfaces; not an architect-context pattern).
- **The config seam is a default *source*, not a new read path.** The run-control layer already reads `lanes[].models` and `teamConfig[].modelTier` (step-04) to set the per-dispatch override. `modelTiers` seeds those run-control values at install time; it does not add a second place Sol reads tier-per-dispatch from. This keeps the read path single (goal-state `models` map) and avoids config/run-control divergence.
  - → no promotion needed (ticket-tactical framing of an existing run-control mechanism).
- **Run-control model-name strings are KEEP, not CHANGE.** `goal-state.md` `models`/`modelTier`/`conductorModel` values (`opus`, `sonnet`) are runtime state, and the Claude overlay `model: 'opus'` is the Claude per-dispatch mechanism (illustrative per design point 3). Only *prose defaults in platform-shared bodies, live steps, and rules* are CHANGE. The goal-state.md:79 cross-reference is re-anchored (task 6) rather than removed, because abstracting the shared table would otherwise leave its `opus`/`sonnet` vocabulary undefined.
  - → no promotion needed (self-evident from the KEEP/CHANGE classification recorded here and in `## Design`).
- **`implementation-task-detail.md` line 11 rewritten despite being example-adjacent.** The line lists specific Claude model names ("Sonnet, low-effort Opus") as an illustration of cross-LLM variance. Considered leaving it (it is not a persona→model default). Rejected: a rule that hardcodes a vendor's model lineup in prose ages badly and contradicts the lane's done condition ("no unconditional model names in … rules"). Rewritten to keep the variance point without naming models.
  - → no promotion needed (ticket-tactical edit).

---

## History

- 2026-07-02 [hmcgrew/381-config-model-tiers]: Winston planned the lane — chose tier-named-buckets + overrides schema for `modelTiers`; classified CHANGE vs KEEP across conductor body/steps/rules/docs; re-anchored the goal-state tier-vocabulary cross-reference. See Decision: modelTiers schema shape.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a Codex or Cursor platform build, When the generated `prism-conductor` body is read, Then it names no Claude model (Opus/Sonnet/Haiku/Fable) — only the abstract tiers `top` and `worker`.
- [ ] Given a consumer's `.ai-skills/config.json` with a `modelTiers` object, When the config is validated against `config.schema.json`, Then it passes (the field is optional and its `top`/`worker`/`overrides` shape is accepted).
- [ ] Given a consumer sets `modelTiers.overrides.eric` to a model in a different family from the workers, When they read the review-loop three-strike survival rule, Then it tells them a configured Eric override restores the independent second opinion.
- [ ] Given `docs/parameterization.md`, When a reader reaches the `## Model tiering` section, Then it explains the same-model review tradeoff and shows how to set Eric's tier explicitly.

### Non-behavioral

- [ ] The sweep `grep -rnE 'Opus|Sonnet|Haiku|Fable'` over the six canonical CHANGE surfaces (conductor `shared.md`/`codex.md`/`cursor.md`, `step-03`/`step-06`, `implementation-task-detail.md`) returns nothing.
- [ ] `goal-state.md` has no dangling pointer claiming tier model values are "defined in shared.md § Model tiering."
- [ ] ADR references to models are unchanged (historical records preserved).
- [ ] The Claude overlay `model: 'opus'` / `model: 'sonnet'` examples in `CLAUDE.md` are preserved (illustrative mechanism).
- [ ] `pnpm prism:check` (or `pnpm prism:build`) exits 0, and the literal guard passes.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-02 | Winston | Authored AC | issue-381 | N/A (GitHub issue #381) |
