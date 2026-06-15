# CONTEXT — PRISM Ubiquitous Language

This is the shared glossary for the PRISM skill roster — the domain-driven-design "ubiquitous language" that every persona, rule, ADR, and plan draws on. When a term recurs across the roster, it gets one definition here so it can't drift into several near-meanings spread across `AGENTS.md`, the rules, and the ADRs.

Each entry carries:

- **Definition** — what the term means, grounded in the file that owns the concept.
- **Avoid** — synonyms or near-misses that mean this term but shouldn't be used for it, so the same concept doesn't sprout three names.
- **Relationships** — how the term connects to others, with cardinality where it matters.

The [Flagged ambiguities](#flagged-ambiguities) section at the end records overloaded words that were genuinely ambiguous and the resolution that settled them.

**Why this file exists:** PRISM skills are getting leaner and leaning harder on shared references (the lean-skill-architecture epic). A single source of truth for the vocabulary becomes _more_ valuable as the skills shrink, not less — the words have to carry weight the prose used to. This glossary is additive: it names the existing vocabulary, it doesn't change it.

**Scope of authority:** this file is a reference, not a tier. When a definition here and the source file it cites disagree, the source file wins — fix the glossary. The owning file for each term is named in its Definition so the trace is one hop.

---

## Plan

A living working-memory document scoped to one ticket or epic, stored at `.prism/plans/<ticket-id>.md`. It preserves goal, decisions, implementation tasks, history, and review findings across sessions and persona handoffs, so a decision made in one session isn't re-litigated or accidentally undone in the next. Plans live on `main`, persist through the work, and are preserved (never deleted) after close — only Zoe's cadence audit may later move one to an archive (ADR-0047). Owned by `.prism/rules/branch-plan.md`.

- **Avoid:** "ticket file", "spec doc", "design doc", "task list". A plan is the one document that holds all of those sections; don't name it by a single section.
- **Relationships:**
  - One plan per ticket or epic (`.prism/rules/branch-plan.md` § One Plan Per Ticket). Many branches and PRs may reference the same plan.
  - The plan is Tier 5 in the [spec tier hierarchy](#rule-loading-tier). Its `## Decisions` are promoted up to Tier 2/3 at close.
  - Sections are owned by specific personas — see `.prism/architect/_toolkit/skills-ecosystem.md` § Plan Section Ownership and ADR-0014.

## Branch plan

The same artifact as a [plan](#plan). The term "branch plan" is the historical name still used in the rule filename (`branch-plan.md`) and in skill prose; it predates the move from branch-scoped to ticket-scoped plans. Plans are scoped to **tickets or epics, not branches** — multiple branches can reference one plan — so "plan" is the precise term and "branch plan" is the legacy label for the identical thing.

- **Avoid:** treating "branch plan" as a distinct object from "plan". They are one concept. Prefer "plan" in new prose; "branch plan" survives only where it's already embedded (the rule filename, existing skill text).
- **Relationships:** see [Plan](#plan). The naming overlap is recorded under [Flagged ambiguities](#flagged-ambiguities).

## Persona

A named character a skill embodies — Winston the architect, Clove the implementer, Eric the PR reviewer. A persona carries a voice, a thinking lens, and a defined lane of ownership. Most skills are personas; the roster lives in `.prism/architect/_toolkit/skills-ecosystem.md` § Skill Roster. Personas split on two orthogonal axes: **ticket-flow** (invoked for a specific ticket, read/write a plan, hand off along the lifecycle) and **cadence-driven** (invoked on a schedule or on demand, operate over the whole `.prism/` surface, write to a dedicated state file) — see ADR-0037.

- **Avoid:** "agent", "bot", "assistant", "role" as a synonym. "Agent" is the runtime (the model running a skill); "role" is the ownership lane, not the character. A persona is the character a skill puts on.
- **Relationships:**
  - One persona per persona-type [skill](#skill). A [utility skill](#skill) has no persona and runs in the invoking persona's voice (ADR-0046).
  - Each persona owns a [lane](#lane-persona-lane) of work — see `AGENTS.md` § Ownership & Handoff.
  - The persona ↔ skill mapping is declared in `.ai-skills/definitions/roles.json`.

## Skill

An invokable capability in the ecosystem — `prism-architect`, `prism-code-dev`, `prism-handoff`. A skill is authored once in canonical form and built into per-runtime adapters (Claude, Codex, Cursor). Two kinds exist, set by the `type` discriminator in `roles.json` (ADR-0046):

- **Persona skill** (the default) — carries a [persona](#persona) with a voice and lens; the build generates a Codex agent adapter.
- **Utility skill** — `type: "utility"`; an action any persona can run (`prism-handoff`, `prism-review-loop`). No persona, no voice of its own, no agent adapter — it runs in the invoking persona's voice.

Owned by `.prism/rules/skill-authoring.md` and the Tier 4 definition in `.prism/SPEC.md`.

- **Avoid:** "command" (a slash-command is how a skill is _invoked_, not the skill itself), "tool" (a tool is a single function call; a skill orchestrates many), "plugin".
- **Relationships:**
  - A persona skill has exactly one [persona](#persona); a utility skill has none.
  - Skills auto-route from user intent (`AGENTS.md` § Skill Auto-Routing, ADR-0002) and hand off to one another along workflows.

## Rule

A durable engineering standard under `.prism/rules/`, loaded as agent context to govern how work is done — `code-standards.md`, `accessibility.md`, `branch-plan.md`. Rules are spec Tier 2: they bind any work touching the rule's domain. Each rule self-declares its applicability via a "Who runs this rule" section (ADR-0029) and loads through a [rule-loading tier](#rule-loading-tier) (ADR-0035). Owned by `.prism/SPEC.md` § Tier 2 and `.prism/rules/`.

- **Avoid:** "guideline" (too soft — rules are the default authority for project-specific decisions), "convention", "policy" (mandate voice; see `writing-voice.md`), "standard" used loosely (a rule encodes a standard, but "standard" alone is ambiguous with code-style).
- **Relationships:**
  - Many rules; membership is "every durable engineering standard the team has codified" — not a fixed count.
  - A [lesson](#lesson) is promoted to a rule when it fires more than once and is process-shaped (`.prism/architect/_toolkit/skills-ecosystem.md` § Lesson promotion taxonomy).
  - A rule differs from an [ADR](#adr): the rule encodes behavior; the ADR records the reasoning behind a one-shot decision.

## Architect doc

A pattern guide under `.prism/architect/<topic>.md` that carries the durable reasoning behind an architectural choice — coupling boundaries, data-flow assumptions, abstraction trade-offs. Architect docs are spec Tier 3: loaded into agent context via the routing table in `.prism/architect/manifest.json` when a session touches a matching path. They're written for the agent reader, with agent-context idioms (manifest hooks, persona references). Owned by `.prism/SPEC.md` § Tier 3 and ADR-0023.

- **Avoid:** "design doc", "architecture doc" used to mean the human-facing version (that's the [dev doc](#dev-doc)), "context doc" (ambiguous with this glossary).
- **Relationships:**
  - One architect doc pairs one-to-one with one [dev doc](#dev-doc) (ADR-0038).
  - Routed by `.prism/architect/manifest.json`; the catch-all `**` always loads `skills-ecosystem.md`.
  - Every claim in an architect doc is source-verified in review (ADR-0023, `architect-doc-verification.md`).

## Dev doc

The human-facing companion to an [architect doc](#architect-doc), stored at `docs/content/dev/architecture/<topic>.md`. Same topic, adapted prose, audience-appropriate framing — written for an engineer onboarding or tracing a decision through git history, without loading agent context. The architect doc carries the agent context; the dev doc carries the human narrative. The two cite each other near the top. Owned by ADR-0038.

- **Avoid:** "user doc" (dev docs are for engineers, not end users; user-facing docs live elsewhere in `docs/`), "human doc", "public doc".
- **Relationships:**
  - One dev doc per architect doc — exactly one-to-one, enforced by a build-time gate (ADR-0038).
  - Authored and synced by Theo (`prism-doc-walker`); Winston pairs manually until Theo runs.

## ADR

An Architecture Decision Record under `.prism/spec/adrs/NNNN-<slug>.md` — a numbered, durable record of a one-shot, cross-cutting decision and the reasoning behind it: the alternatives considered, what got rejected, why the chosen path won. ADRs explain _why_; [rules](#rule) and [architect docs](#architect-doc) encode _behavior_. Owned by `.prism/SPEC.md` and `.prism/spec/adrs/`.

- **Avoid:** "decision doc" (ambiguous with a plan's `## Decisions`), "RFC" (an RFC proposes; an ADR records an accepted decision), "spec" used to mean a single ADR.
- **Relationships:**
  - Many ADRs, numbered sequentially; membership is "every durable cross-cutting decision the team needs to remember the reasoning for."
  - A [decision](#decision-plan-decision) in a plan that proves durable is promoted to an ADR (decision-class) at close (`skills-ecosystem.md` § Lesson promotion taxonomy).
  - Distinct from a plan's `## Decisions` — see [Decision](#decision-plan-decision) and [Flagged ambiguities](#flagged-ambiguities).

## Lesson

A short, cheap, append-only note in `.prism/lessons.md` capturing a pattern worth remembering — usually after a correction. Lessons are working notes, not durable record; they're exempt from the full writing-voice bar. A lesson earns promotion to a durable home (rule, architect doc, or ADR) when it fires a second time, routed by type per the lesson promotion taxonomy. Owned by `AGENTS.md` § Self-Improvement Loop and `.prism/architect/_toolkit/skills-ecosystem.md` § Lessons.

- **Avoid:** "note", "gotcha" (a gotcha is one kind of lesson, not the category), "learning", "retro item" (retro actions route to Nora; lessons live in `lessons.md`).
- **Relationships:**
  - Promotion is recurrence-triggered, not speculative — see the taxonomy in `skills-ecosystem.md`.
  - Process lessons → [rule](#rule); architectural lessons → [architect doc](#architect-doc); decision-class lessons → [ADR](#adr); ephemeral lessons stay in `lessons.md`.
  - Zoe's cadence audit classifies each lesson `live` or `archive-candidate` and moves archive-candidates to `.prism/lessons-archive.md` on confirmation.

## Decision (plan decision)

An entry in a plan's `## Decisions` section: a choice made during a ticket, recorded with its reasoning so it acts as an implicit do-not-undo. Decisions are spec Tier 5 — load-bearing for _that_ ticket. At close, durable decisions are promoted up to a [rule](#rule), [architect doc](#architect-doc), or [ADR](#adr); ticket-tactical ones stay in the closed plan. Owned by `.prism/rules/branch-plan.md` § Decisions.

- **Avoid:** "ADR" as a synonym (an ADR is the durable, promoted form; a plan decision is ticket-scoped), "note", "rationale" used standalone.
- **Relationships:**
  - Many decisions per [plan](#plan); written by Winston, read by all (ADR-0014).
  - Each decision carries a verdict at close (promoted / no-promotion-needed) — the Decision verdict gate (`branch-plan.md`). Not to be confused with a [Zoe verdict](#zoe-verdict).
  - The open-question variant (`OPEN — TBD, needs <name> input`) records a decision that can't yet resolve, with a default path.

## Mode

A distinct operating shape a single [skill](#skill) switches between, selected from prompt words, input shape, or flags. The skill is one persona; the mode is which job it's doing this run. Examples: Pixel's mode 1 (inline sketch) vs mode 2 (saved mock spec); Eric's in-branch vs worktree mode; Reese's four QA modes (Release / Sprint-Group / Feature-PR / Bug-fix Verification); Parker's greenfield vs brownfield. Owned by each skill's source; the roster summarizes modes in `.prism/architect/_toolkit/skills-ecosystem.md` § Skill Roster.

- **Avoid:** "phase" (a phase is a step within one run; a mode is which run-shape you're in), "variant" used loosely, "state" (Eric's review states are a different concept).
- **Relationships:** a skill has one [persona](#persona) and may have multiple modes. The mode gate runs at session start and the chosen mode is announced in the greeting.

## Lane (persona lane)

The set of work a [persona](#persona) owns — Clove owns implementation, Eli owns documentation, Sasha owns debugging. In a plan, `## Implementation Tasks` is grouped under persona headings (`### Clove`, `### Eli`); the heading is the source of truth for who owns that task. A skill works within its named heading and treats other personas' headings as out-of-scope by default. Crossing a lane is allowed only via skip, documented absorption (a `## Decisions` entry), or an explicit handoff — silent cross-lane edits are the failure mode. Owned by ADR-0018 and `AGENTS.md` § Ownership & Handoff.

- **Avoid:** "role" used interchangeably (a role names the persona; a lane names the work the persona owns), "domain" used loosely, "scope" (scope is broader — a lane is a persona-bounded scope).
- **Relationships:**
  - One lane per [persona](#persona); the ownership table in `AGENTS.md` § Ownership & Handoff is authoritative.
  - Distinct from a [slice](#slice) — a lane is _who_ owns work; a slice is a _when_-shaped stage of an epic. See [Flagged ambiguities](#flagged-ambiguities).

## Slice

An ordered implementation stage of an epic — a self-contained chunk of work that ships on its own branch and PR, sequenced so each slice de-risks the next. Used in epic plans (e.g. the lean-skill-architecture epic ran Slices 0–6). A slice is a unit of _sequencing_ over time; it may contain work across several [lanes](#lane-persona-lane). The term is plan-local vocabulary, not a tier or a routed surface. Owned by the epic plan that defines its slices.

- **Avoid:** "phase" (a phase is finer-grained, within a run or a single skill; a slice is an epic-level stage), "stage" used loosely, "milestone", "task" (a task is a single unit within a slice).
- **Relationships:**
  - Many slices per epic [plan](#plan); ordered.
  - A slice may span multiple [lanes](#lane-persona-lane) — the two are orthogonal (one is sequencing, one is ownership).

## Manifest

The routing table at `.prism/architect/manifest.json` that maps file-path patterns to the [architect docs](#architect-doc) a session should load. When a skill touches a path, the manifest tells it which architect context to pull in; the catch-all `**` always loads `skills-ecosystem.md` so the persona roster is available every session. Owned by `.prism/SPEC.md` § Tier 3 and ADR-0035.

- **Avoid:** "config" (the manifest is one specific routing file, not general config), "index", "registry" used loosely (`roles.json` is the skill registry — a different file).
- **Relationships:**
  - One manifest per install; populated per consumer team during onboarding (Atlas, Phase 3).
  - Routes paths → [architect docs](#architect-doc) (spec Tier 3) and registers Tier 1 / Tier 2 [rules](#rule) per the [rule-loading tiers](#rule-loading-tier) (ADR-0035).

## Canonical vs mirror

**Canonical** content is the single source of truth, authored under `.prism/`, `.ai-skills/`, `templates/`, `docs/`, and root files. A **mirror** is a build-time copy of canonical content placed in a platform directory so each runtime's auto-load mechanism can find it: read-only canonical content (rules, ADRs, architect docs) mirrors into `.claude/`, `.codex/`, and `.cursor/`, while generated skills land in `.claude/`, `.cursor/`, and `.agents/` (the per-user Codex skills root). Mirrors regenerate via `pnpm prism:build`; editing a mirror directly is drift, caught by `pnpm prism:check`. Edit canonical, never the mirror — across every platform directory, including `.agents/`. Owned by ADR-0031 (bifurcated install layout) and `.prism/architect/_toolkit/install-layout.md`.

- **Avoid:** "source" vs "copy" used without the canonical/mirror framing (too generic), "generated" used as a noun for the mirror, "platform dir" used to mean the mirror content (the dir holds both mirrors and platform-specific files).
- **Relationships:**
  - One canonical file → one mirror per platform directory; mirrors are byte-identical after token substitution (ADR-0030).
  - Agent-written content (plans, `lessons.md`) lives only at canonical and is never mirrored — mirroring it would create write conflicts (ADR-0031).
  - Each mirrored area carries an `.ai-skill-generated` marker.

## Rule-loading tier

The three-tier model that governs _when_ a [rule](#rule) loads into a session, to keep per-session context cost proportional to the work (ADR-0035):

- **Tier 1 — always loaded.** Universal rules registered in the manifest with no path filter (`code-standards.md`, `branch-plan.md`, `writing-voice.md`).
- **Tier 2 — path-scoped.** Registered in the manifest, but the rule's own `paths:` frontmatter governs when it fires (`accessibility.md` on UI paths, `architect-doc-verification.md` on doc paths).
- **Tier 3 — skill-internal.** No manifest entry; referenced by one skill's `shared.md` and loaded lazily when that skill runs.

This is distinct from the five-tier **spec hierarchy** in `.prism/SPEC.md` (Constitution → Durable Rules → Architectural Context → Skill Behavior → Plans). The rule-loading tiers describe how rules load; the spec tiers describe what binds whom. Owned by ADR-0035.

- **Avoid:** "tier" unqualified — say "rule-loading tier" or "spec tier" so the two systems don't collide (see [Flagged ambiguities](#flagged-ambiguities)), "load level".
- **Relationships:** the rule author classifies a new rule into one of the three loading tiers at creation. Tier 2's `paths:` frontmatter is the machine-readable counterpart to ADR-0029's "Who runs this rule" self-declaration.

## Zoe verdict

A per-Decision classification Zoe (`prism-surface-audit`) issues during her cadence audit, written as a sub-bullet directly on a plan's `## Decisions` entry. Exactly one verdict applies per Decision, in increasing severity: `open-stale` < `archive-candidate` < `overdue-archive`, plus `live` for decisions still in effect. The verdict carries a date and a one-line reason (the evidence trail). Owned by `.prism/architect/_toolkit/audit-workflow.md`.

- `live` — still in effect; no action.
- `archive-candidate` — no longer load-bearing; candidate for promotion or archival.
- `overdue-archive` — references work shipped >90 days ago and the plan is still open.
- `open-stale` — an `OPEN` open-question variant unresolved for >30 days.

- **Avoid:** "audit verdict" used ambiguously with the Decision verdict gate, "status" (a Decision's own status is separate), "Zoe's call".
- **Relationships:**
  - One Zoe verdict per [plan decision](#decision-plan-decision) per audit run; verdicts age across runs.
  - Distinct from the **Decision verdict gate** at plan close (promoted / no-promotion-needed), which Winston runs — see [Flagged ambiguities](#flagged-ambiguities).

---

## Flagged ambiguities

Overloaded words that genuinely collided across the roster, and how each was resolved. New collisions land here as they're settled.

- **"plan" vs "branch plan"** — one artifact, two names. "Branch plan" is the legacy label (still in the `branch-plan.md` filename and older skill prose) from when plans were branch-scoped; plans are now scoped to tickets or epics, so multiple branches reference one plan. **Resolution:** "plan" is the precise term; "branch plan" is the identical thing under its historical name. Prefer "plan" in new prose.

- **"decision" — plan Decision vs ADR** — both record a choice with reasoning, and the word "decision" appears in both. **Resolution:** a [plan decision](#decision-plan-decision) is ticket-scoped (spec Tier 5), lives in a plan's `## Decisions`, and is an implicit do-not-undo for that ticket. An [ADR](#adr) is the durable, promoted, numbered form of a cross-cutting decision. A plan decision graduates _into_ an ADR at close when it proves durable; they are not the same record.

- **"verdict" — Zoe verdict vs Decision verdict gate** — both attach a verdict to a plan's `## Decisions`. **Resolution:** the **Decision verdict gate** runs at plan _close_ (Winston), recording whether each decision was promoted or intentionally stays local. A **[Zoe verdict](#zoe-verdict)** runs on _cadence_ (Zoe's audit), classifying each decision `live` / `archive-candidate` / `overdue-archive` / `open-stale`. Different actor, different trigger, different vocabulary.

- **"tier" — rule-loading tier vs spec tier** — two unrelated tier systems. **Resolution:** the [rule-loading tier](#rule-loading-tier) (ADR-0035) is a three-level model for _when a rule loads_. The **spec tier** (`.prism/SPEC.md`) is a five-level hierarchy for _what binds whom_ (Constitution → Durable Rules → Architectural Context → Skill Behavior → Plans). Always qualify which one you mean.

- **"role" — persona vs lane** — "role" gets used both for the character and for the work it owns. **Resolution:** a [persona](#persona) is the character (Clove, Eric); a [lane](#lane-persona-lane) is the work the persona owns (implementation, PR review). The `roles.json` filename uses "role" for the persona↔skill mapping; in prose, prefer "persona" for the character and "lane" for the owned work.

- **"slice" vs "lane"** — both partition epic work, but on different axes. **Resolution:** a [slice](#slice) is a _sequencing_ stage (Slice 0, Slice 1, …) that ships on its own branch; a [lane](#lane-persona-lane) is a _persona-ownership_ partition (`### Clove`, `### Eli`). One slice can span several lanes — the two are orthogonal.

- **"doc" — architect doc vs dev doc** — "doc" alone is ambiguous between the agent-facing and human-facing versions of the same topic. **Resolution:** an [architect doc](#architect-doc) (`.prism/architect/`) is agent-facing context; its paired [dev doc](#dev-doc) (`docs/content/dev/architecture/`) is the human-facing companion. One-to-one, enforced at build time (ADR-0038). Name which surface you mean.
