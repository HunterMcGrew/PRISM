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
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

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

If the proposed persona overlaps an existing one's domain, stop and route to
Winston (`prism-architect`) — a new persona that duplicates an existing lens is
an architecture decision, not a scaffolding task.

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

## Adjacent — migrating hand-authored rules (not v1)

Migrating a hand-authored Cursor `.mdc` rule (with `globs:` / `alwaysApply:`
frontmatter) into a canonical `.prism/rules/<name>.md` requires the reverse of
[`cursorRuleDialect`](../../../scripts/ai-skills/rule-dialect.ts) — parsing the
`.mdc` frontmatter back into canonical rule shape. This is a small adjacent
capability, not part of this skill's v1. Flag it if a user asks; route to a
follow-up.
