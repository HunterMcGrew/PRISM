---
name: prism-skill-forge
description: >
  Scaffold a new PRISM skill from scratch, or migrate an existing platform skill
  into canonical source. Create mode walks the persona-vs-utility decision
  (ADR-0046), collects a non-prism-* ID, and writes frontmatter.yml + shared.md +
  the roles.json entry. Migrate mode decomposes a generated .claude/.cursor/.agents
  SKILL.md or .codex agent .toml back into canonical source, strips generated
  headers and markers, and normalizes the ID to the consumer namespace. Runs
  pnpm prism:build and confirms discovery/literal/path tests green. No persona —
  runs in the current voice. Triggers: create skill, scaffold skill, new skill,
  add persona, migrate skill, decompose skill, import skill.
argument-hint: "[create | migrate] [skill id or source path]"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-skill-forge -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Scaffold a new PRISM skill, or migrate an existing platform skill back into
canonical source. This skill writes canonical source under
`.ai-skills/skills/<id>/` and the matching `.ai-skills/definitions/roles.json`
entry, then lets `pnpm prism:build` regenerate every platform copy. It never
hand-edits a generated platform file — the canonical→multi-runtime pipeline is
the single source of truth, and a hand-authored copy drifts the moment the
pipeline evolves.

Two modes. Pick by the argument or by asking: **Create** (new skill from
scratch) or **Migrate** (decompose an existing generated skill into source).

This is a utility skill — it carries no persona. It runs in the active persona's
voice and adds no identity of its own (per
[ADR-0046](../../../.prism/spec/adrs/_toolkit/0046-persona-vs-utility-skill-type.md)).

## Opening Orientation Battery

Run this battery once, immediately after the mode is determined and before any
file is written, so the scope and intent are clear before the first edit.

1. **Intent** — in one sentence, what is the user asking to create or migrate
   (the outcome, not the literal words)?
2. **Ambiguity** — what is unclear, under-specified, or readable two ways? For
   each: load-bearing (must resolve before starting) or non-load-bearing (proceed
   on a documented default)? **Calibration:** there is no user available
   mid-dispatch — do not stall; for each load-bearing gap pick a defensible
   default, state the assumption, and proceed. Escalate only by the floor's
   verdicts (`needs-replan` / `blocked` / `needs-human`) when a gap genuinely
   blocks — never by a question into the void.
3. **Bounds** — what does "done" look like, and what must I not touch?
4. **Approach** — what is the smallest correct approach; is there a simpler
   framing than the obvious one?

## Shared conventions (both modes)

- **Skill ID namespace.** PRISM owns `prism-*` IDs and the sync regenerates only
  those. A skill authored for a consumer repo never uses `prism-*` — it defaults
  to the org token from `.ai-skills/config.json` (`<org>-<role>`, lowercased) or
  a `custom-<role>` prefix when no org token is set. This is the Phase 5
  consumer-skill-namespace convention — see
  [`ownership.ts`](../../../scripts/ai-skills/ownership.ts) JSDoc on
  `PRISM_OWNED_GLOBS`. The only skill that legitimately ships a `prism-*` ID is
  one being contributed back to the PRISM toolkit itself.
- **Authoring rules.** Every skill body and `description` obeys the content
  disclosure model — three loading levels, the disclosure gate (PIN / EXTERNALIZE /
  CATALOG / CUT), and the description-shape guidance.

  **Before writing any skill source, read [`lib/skill-authoring.md`](./lib/skill-authoring.md) and apply it.**
- **Hard limits enforced by tests.** The `description` field caps at 1000 chars
  (`MAX_FRONTMATTER_DESCRIPTION_LENGTH`, asserted by `discovery-metadata.test.ts`
  so Codex discovery can expose the skill); the generated SKILL.md body caps at
  500 lines (`MAX_SKILL_BODY_LINES`). Multi-line `description` values use the
  YAML folded (`>`) scalar — a plain multi-line continuation silently truncates
  to its first line.
- **Final step is always the build.** After writing source and the roles.json
  entry, run `pnpm prism:build` and confirm it exits clean (the build runs
  `prism:test`, which includes discovery-metadata, literal, and path-guard
  suites). A red build means the source is wrong — fix the source, never the
  generated output.

## Create mode — guided scaffolding

### Step 1 — Decide persona vs utility

This is the load-bearing fork (ADR-0046). Walk the user through it before
collecting anything else:

- **Persona** — someone you *switch into*. Has a human name, a domain/lens, a
  voice, and named triggers. Generates a Codex agent adapter
  (`.codex/agents/<id>.toml`) and a Claude agent definition. Choose this when the
  skill embodies a role a user addresses by name ("hey Pixel").
- **Utility** — an *action* every persona can run. No name, no voice, no
  "You are X" opener. Runs in the current persona's voice. Generates **no** agent
  adapter. Choose this when the skill is a procedure ("compact this session",
  "run the review loop"), not an identity.

**Procedure A — Domain overlap detected.** When the proposed persona's stated
domain overlaps an existing persona's: read the existing persona's `shared.md`
and confirm whether the domains genuinely collide (same lens, same trigger
phrases, same artifact type) or merely touch (adjacent subject matter). **Escape:**
if genuine collision is confirmed, emit `needs-replan` — name both personas, the
overlapping domain, and why a new persona is an architectural decision for
Winston, not a scaffolding task. Do not proceed to Step 2 until this is resolved.

### Step 2 — Collect inputs

- **Skill ID** — function-descriptive (describes what the skill does, so a user
  who doesn't know the persona name can still find it). Apply the namespace
  convention above: never `prism-*` for a consumer skill.
- **Persona type only:** human name, voice/lens one-liner, domain, and 3–8
  distinctive trigger keywords.
- **Utility type:** function trigger keywords only (no name to route on).

### Step 3 — Write the source files

Write under `.ai-skills/skills/<id>/`:

- **`frontmatter.yml`** — `name: <id>` plus a `description` using the 4-part
  shape from `skill-authoring.md` § Description field shape (≤1000 chars, folded
  `>` scalar). Persona descriptions carry the name twice (sentence 1 + Triggers
  line); utility descriptions drop the name and carry function keywords only.
  Add an `argument-hint` line when the skill takes arguments.
- **`shared.md`** — the skill body, sorted through the disclosure gate.
  - *Persona:* PIN the voice, the "How X Thinks" lens, anti-pattern guardrails,
    the workflow router, and the Definition of Done. Externalize whole
    modes/procedures to `.prism/references/<id>/<topic>.md` with a named,
    conditional trigger (never a vague "see the references").
  - *Utility:* procedure-first. No voice section, no lens, no "You are X" opener.
    The body opens with the procedure; the active persona supplies the voice.
- **Optional `claude.md` / `codex.md` / `cursor.md`** — per-platform additions.
  Create one only when a platform genuinely needs extra content; otherwise omit
  it (per [`lazy-artifacts.md`](../../../.prism/rules/lazy-artifacts.md) — no
  header-only placeholder files).

### Step 4 — Register the role

Add an entry to `.ai-skills/definitions/roles.json` under `skills`:

- **Persona:** `{ "id": "<id>", "persona": "<Name>" }`
- **Utility:** `{ "id": "<id>", "type": "utility" }` — note: no `persona` key;
  `buildRoleMap` throws if a utility entry carries a persona.

### Step 5 — Build and verify

Run `pnpm prism:build`. Confirm it exits clean and the bundled `prism:test`
passes. For a **utility** skill, confirm the build wrote **no**
`.codex/agents/<id>.toml` (the adapter gate is `roleDefinition.type !== "utility"`
in `build.ts`). For a **persona** skill, confirm the adapter *was* written. Then
run `pnpm prism:check-types` clean.

**Procedure B — Build fails after source is written.** Run `pnpm prism:build`
and read the first error line. Form one hypothesis about the cause (YAML syntax
error in the skill body, line-count limit exceeded, missing `roles.json` entry,
broken link where the target file exists but the path is mistyped). Make the
smallest edit that tests the hypothesis. If wrong, form the next. Fix the
source — never the generated output. **Escape:** after three hypotheses fail,
emit `needs-human` — name the failing hypothesis, the exact build error, and
which source file is suspect. Do not continue with a broken build.

## Migrate mode — decompose a generated skill into canonical source

**For the mechanical case, run `pnpm prism:migrate-skill <source>` — it handles
the four source shapes automatically. Fall back to the steps below when the CLI
flags ambiguity (persona/utility disambiguation, per-platform delta recovery,
re-tokenization).**

Migrate recovers canonical source from an already-generated platform skill —
useful when a team hand-authored a skill directly in a platform directory and
wants it inside the pipeline. Follow the patterns in
[`bootstrap-from-claude.ts`](../../../scripts/ai-skills/bootstrap-from-claude.ts):
replicate the `splitFrontmatter` pattern (separates `---` frontmatter from body),
the `rewriteSkillIdReferences` pattern (remaps cross-skill ID references), and
the `writeIfMissingOrForce` pattern (skips existing canonical files unless
`--force`, so a re-run never clobbers hand-edited source). These helpers are
module-private and not importable — implement equivalent logic inline or in a new
migration script.

### Step 1 — Detect the source shape

- **Skill-markdown forms** — `.claude/skills/<id>/SKILL.md`,
  `.cursor/skills/<id>/SKILL.md`, `.agents/skills/<id>/SKILL.md`. Each is
  frontmatter + body. Prefer `.agents/skills/<id>/SKILL.md` when several exist —
  it is the least platform-dialected.
- **Codex agent adapter** — `.codex/agents/<id>.toml`. Use only when no
  skill-markdown form exists; the TOML wrapper is lossier to unwrap.

### Step 2 — Extract canonical source

- **Skill-markdown:** apply the `splitFrontmatter` pattern to the file — split
  on the `---` frontmatter delimiters; frontmatter becomes `frontmatter.yml`,
  body becomes `shared.md`.
- **Codex `.toml`:** a TOML-aware extractor strips the `buildCodexAgentToml`
  wrapper — drop the generated header lines, the `name`/`description` TOML keys,
  and the `developer_instructions = """ … """` fencing. Inside the fence, drop
  the leading `You are <Name>.` opener (persona identity → `roles.json`, not
  body), the `Canonical skill source:` and `Follow this generated skill
  definition:` scaffolding lines. What remains is the skill body → `shared.md`.
  Recover the persona name from the `You are <Name>.` line and the description
  from the TOML `description` key for the new `frontmatter.yml`.

### Step 3 — Strip generated artifacts

- Remove the `GENERATED_HEADER_LINE`
  (`# AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.`) and the markdown variant from
  any extracted content — canonical source is hand-authored and carries no
  generated header.
- Remove the `MANAGED_MARKER` file (`.ai-skill-generated`) from the source skill
  dir if present — it marks generated output, never canonical source.
- **Re-tokenizing substituted literals** (turning a team's resolved
  `Acme Corp` / `#acme-dev` back into `{{org}}` / `{{slackChannel}}` tokens) is
  best-effort and lossy. Attempt it where a literal clearly maps to a known
  token, but flag every uncertain case for human review — never block the
  migration on it.

**Procedure C — Persona/utility disambiguation is ambiguous.** When the source
skill has no clear type signal (no "You are X" opener, no `type: utility` in any
found TOML), read the skill body: does it name a persona who introduces itself,
have a domain lens, and carry trigger phrases routing to that name? If yes →
persona. If the body opens with a procedure and carries no self-introduction →
utility. **Escape:** if the type genuinely cannot be determined from the source
(body is incomplete, stripped, or conflicted), emit `needs-human` — name the
source file, quote the ambiguous signals, and ask the user to declare the type.
Do not guess and register the wrong type.

### Step 4 — Recover per-platform deltas (nice-to-have)

If multiple platform copies of the same skill exist, diff them to recover
per-platform additions into `claude.md` / `codex.md` / `cursor.md`. When they're
identical (the common case), default everything to `shared.md` and leave the
per-platform files absent. This is best-effort — flag for human review, do not
block.

### Step 5 — Normalize, register, build

- Normalize the ID to the consumer namespace (Step 1 conventions in Shared
  conventions above) unless the skill is being contributed to the PRISM toolkit.
  Apply the `rewriteSkillIdReferences` pattern to fix cross-skill references to the new ID.
- Add the `roles.json` entry (persona or utility, per the recovered shape).
- Run `pnpm prism:build`, confirm clean, then `pnpm prism:check-types` clean.
  Verify the regenerated platform copies round-trip (the source you wrote
  produces the platform output the migration started from, minus team-specific
  literals you re-tokenized).

**Procedure D — Build or round-trip fails after migrate.** Run `pnpm prism:build`
and read the first error. If it is a line-count or description-length limit, the
source extracted more content than the pipeline allows — trim to the limits
(`MAX_SKILL_BODY_LINES` = 500 lines, `MAX_FRONTMATTER_DESCRIPTION_LENGTH` = 1000
chars) and re-run. If the round-trip mismatches, compare the regenerated output
to the original platform copy with a diff; the delta names what the extraction
missed or over-included. Fix the canonical source to produce the correct output.
**Escape:** if the build exits non-zero after three targeted fixes and the error
points to a structural pipeline constraint — a referenced surface that does not
exist in the pipeline at all, a `roles.json` schema field the pipeline does not
support, a YAML shape the pipeline cannot parse regardless of content — emit
`needs-replan`: name the constraint, the exact error, and what pipeline change
would be needed to proceed. Tell: a broken link where the target file exists is a
source typo (Procedure B → `needs-human`); a broken link where the referenced
surface has no pipeline entry is structural (Procedure D → `needs-replan`).
Do not continue with a mismatched or failing build.

## Adjacent — migrating hand-authored rules (not v1)

Migrating a hand-authored Cursor `.mdc` rule (with `globs:` / `alwaysApply:`
frontmatter) into a canonical `.prism/rules/<name>.md` requires the reverse of
[`cursorRuleDialect`](../../../scripts/ai-skills/rule-dialect.ts) — parsing the
`.mdc` frontmatter back into canonical rule shape. This is a small adjacent
capability, not part of this skill's v1. Flag it if a user asks; route to a
follow-up.

## Closing Re-Orientation Battery

Run this battery once, immediately before reporting the skill as complete, so
the scope and correctness are confirmed before stopping.

1. **Scope boundary** — what files did I write or modify; is any of it outside
   what was named (source dir, `roles.json`, build verification)? What adjacent
   files did I notice and leave alone? Emit `found-followup-work` per
   [`.prism/rules/followup-scope.md`](../../../.prism/rules/followup-scope.md)
   § worker-emit pre-filter for anything left alone that warranted it.
2. **Unasked assumptions** — what did the request not specify that my work
   nonetheless decided? Name each silent decision (persona vs utility choice,
   namespace prefix, which platform files were omitted).
3. **Edge recall** — what boundary inputs does this skill now handle on purpose:
   empty `$ARGUMENTS`, a `prism-*` ID in a consumer repo, a skill body at the
   line-count limit, a TOML source with no persona opener?
4. **Verification honesty** — for each claim of completion, what is the evidence:
   did `pnpm prism:build` exit clean, did `pnpm prism:build --check` report no
   drift, did `pnpm prism:crossref-lint` pass? Where am I asserting without proof?
