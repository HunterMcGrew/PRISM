# Architectural Decision Records

This folder holds ADRs for durable, cross-cutting decisions — skill ecosystem, codebase architecture, spec structure. Each ADR captures the context, the decision, and the consequences so the reasoning survives future reorganizations.

See [`.prism/SPEC.md`](../../SPEC.md) for the tier hierarchy that these ADRs govern.

---

## When to Write an ADR

Write an ADR when the decision:

- **Crosses multiple skills, rules, or tiers.** "Authors ship, reviewers review" affects Clove, Eli, Sage, Reese, Briar, and the AGENTS.md routing layer. That's an ADR.
- **Reverses or supersedes a prior decision.** The old decision's Status becomes `superseded` and its `Superseded-by:` frontmatter field names the successor; the new ADR gets a fresh number, a `Supersedes:` field pointing back, and a Context section explaining what changed.
- **Describes a pattern that future agents need context to apply correctly.** If an agent reading only the rule could misapply it, the reasoning belongs in an ADR the rule can link to.
- **Encodes a tradeoff the team evaluated.** "We chose A over B because [reason]" — without the reasoning, the decision looks arbitrary and gets re-litigated.

## When NOT to Write an ADR

- **Ticket-tactical decisions.** Those belong in the ticket's plan file under `## Decisions`. Plans decay; ADRs are durable.
- **Implementation choices with no cross-cutting impact.** "We used `useMemo` here because profiling showed a 40ms cost" is a code comment, not an ADR.
- **Minor wording tweaks.** Rewording a rule for clarity doesn't need an ADR. Changing what the rule enforces does.
- **Obvious decisions.** "We use TypeScript" doesn't need an ADR. "We mirror WP types instead of importing them from `@wordpress/*` because the frontend doesn't depend on WP npm packages" does.

---

## Numbering

ADRs are numbered `NNNN-kebab-case-slug.md`, four-digit zero-padded, starting at `0001`. The next ADR takes the next unused number — never reuse numbers, never renumber to fill gaps.

Four digits gives comfortable headroom past the point we'd need a new scheme.

---

## Status Lifecycle

Every ADR has a `Status` field in its frontmatter. Valid values:

| Status       | Meaning                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `proposed`   | Drafted but not accepted. The decision is under discussion.                                                                              |
| `accepted`   | Active. The decision is in force and agents should apply it.                                                                             |
| `deprecated` | No longer recommended, but not yet replaced. Keep for historical context; avoid citing in new work.                                      |
| `superseded` | A newer ADR replaces this one. The `Superseded-by:` frontmatter field names the successor. Do not delete — historical context has value. |

When an ADR is superseded: set Status to `superseded`, populate the `Superseded-by:` frontmatter field with the successor's number, and keep the body intact. The successor references the original in its `Supersedes:` frontmatter field. Status carries the state; frontmatter carries the link — one mechanism each, no duplication.

---

## Cross-Reference Pattern

ADRs are the canonical source for a decision's _rationale_. Other documents (AGENTS.md, skill files, architect context, rules) describe the _narrative_ — how the decision shows up in day-to-day work.

- **Source docs link to ADRs.** `AGENTS.md § 0` has a one-line summary of "authors ship, reviewers review" plus a pointer to ADR-0003.
- **ADRs do not link back to every source.** An ADR may cite a source doc for context (the Round 10 audit for ADR-0003), but it doesn't enumerate every skill file that applies it.
- **Updating a decision:** change the ADR first, then update the source docs to match. This keeps the ADR as the authoritative entry point.

This direction matters: if source docs were canonical, a decision would live in multiple files and drift. ADRs collapse the reasoning to one place.

---

## Writing an ADR

Copy `TEMPLATE.md`, fill in the frontmatter, and write the four sections:

1. **Context** — what forces led to this decision? What problem does it solve?
2. **Decision** — what was decided, in plain language.
3. **Consequences** — what follows from the decision? Both positive and negative. What becomes harder? What becomes easier?
4. **References** — links to plans, prior ADRs, source docs, or lessons that informed the decision.

Keep it under ~60 lines unless the decision genuinely needs more space. A short ADR that gets read beats a long ADR that gets skimmed.

---

## Index

ADR files are sorted by number on disk. Every ADR from 0022 onward gets a row here — a new ADR landing without one is a visible gap to fix. Gaps in the sequence (e.g. 0025–0028) are unused numbers, not missing rows. ADRs 0001–0021 predate this index and are discoverable by listing the directory.

| Number | Title                                                                                                          | Status   | Summary                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0022   | [Encounter Protocol for Out-of-Scope Anti-Patterns](0022-encounter-protocol-for-out-of-scope-anti-patterns.md) | accepted | When implementation work touches out-of-scope wrong code, choose migrate / ticket / never silent — and log the choice. |
| 0023   | [Architect Docs Source-Verified Review](0023-architect-docs-source-verified-review.md)                         | accepted | Architect docs and paired dev docs require source-verification review by author and reviewer — glance is not sufficient. |
| 0024   | [Branch Plan Decisions Record the Why](0024-branch-plan-decisions-record-the-why.md)                           | accepted | Verified fixes and non-trivial decisions in `## Decisions` use sub-bullets covering root cause, alternatives, chosen approach, and implementation guidance. |
| 0029   | [Rules Self-Declare Their Applicability; Skills Don't Reference Per-Team Rule Files](0029-rules-self-declare-applicability.md) | accepted | Skills don't name per-team rule files; rules declare their own applicability and the agent applies them when relevant. |
| 0030   | [Token Substitution at Build Time](0030-token-substitution-at-build-time.md)                          | accepted | `${...}` tokens are substituted to per-team literals at build time in `build.ts` from `.ai-skills/config.json`, with a drift guard. |
| 0031   | [Bifurcated Install Layout — `.prism/` Canonical with Platform-Dir Build Copies](0031-bifurcated-install-layout.md) | accepted | Platform-agnostic content is canonical at `.prism/<area>/`; platform dirs hold build-time copies; agent-written plans/lessons live only at canonical. |
| 0032   | [Canonical Skill Content Is Generic; Onboarding Writes Per-Team Specializations](0032-canonical-skill-content-is-generic.md) | accepted | Canonical skills describe process and persona shape only; Atlas writes per-team stack, domain, and examples into stub anchors at onboarding. |
| 0033   | [Implementation Task Detail Bar](0033-implementation-task-detail.md)                                  | accepted | Implementation-driving artifacts (Winston's tasks, Pixel's mode 2 specs) front-load every decision; failing the bar is at least Major in review. |
| 0034   | [Pixel Always Routes Through Winston](0034-pixel-always-routes-through-winston.md)                    | accepted | Pixel always routes mode 2 specs through Winston; the direct-to-Clove path is removed, and mode 1 sketches keep direct-back-to-Clove. |
| 0035   | [Rule Loading Tiers](0035-rule-loading-tiers.md)                                                      | accepted | Rules load via three tiers: Tier 1 always-loaded, Tier 2 path-scoped by `paths:` frontmatter, Tier 3 skill-internal referenced by path. |
| 0036   | [Security as a Distributed Rule](0036-security-as-distributed-rule.md)                                | accepted | Security is a distributed reviewer-skill pattern; PRISM ships no security body, and Atlas generates per-stack `security-<stack>.md` at onboarding. |
| 0037   | [Cadence-Driven Personas as a Separate Axis](0037-cadence-driven-personas.md)                         | accepted | Cadence-driven personas form a second axis: schedule/demand-invoked, operate over the whole `.prism/` surface, write dedicated state files — Zoe is first. |
| 0038   | [Paired Dev Doc Gates for Architect Docs](0038-paired-dev-doc-gates.md)                               | accepted | Every architect doc ships with a one-to-one paired dev doc at `docs/content/dev/architecture/`, cross-cited and enforced by a build-time gate. |
| 0039   | [`.ai-*` Prefix Namespace Validates PRISM's `.prism/` Choice](0039-ai-prefix-namespace.md)           | accepted | `.prism/` (canonical content) and `.ai-skills/` (skill source) are locked, matching the `.<toolname>/` and `.ai-*` conventions without top-level collisions. |
| 0040   | [Atlas as a Dedicated Onboarding Persona](0040-atlas-as-onboarding-persona.md)                        | accepted | Atlas is a standalone cadence-driven onboarding persona that detects the stack, generates per-team rules, and writes config — resumable across sessions. |
| 0041   | [Theo as the Architect-Doc Walker Persona](0041-theo-architect-doc-walker.md)                         | accepted | Theo is a separate persona that walks the codebase via an 8-phase step machine, applies the Deletion Test, and drafts architect plus paired dev docs. |
| 0042   | [Ren as the Refactor Scout Persona](0042-ren-refactor-scout.md)                                       | accepted | Ren is a separate read-only persona that walks code, ranks refactor candidates, grills the pick through five passes, and writes a refactor plan for Winston/Clove. |
| 0043   | [Parker as the PRD Persona](0043-parker-prd-persona.md)                                               | accepted | Parker is a dedicated persona above Mira on grain, writing initiative-grain PRDs in greenfield (interview) and brownfield (code-walk) modes. |
| 0044   | [Direct-Write Tool Outputs; Commit `.cursor/skills/`](0044-direct-write-tool-outputs.md)             | accepted | Build outputs direct-write to tool namespaces (no `.generated/` staging); `.cursor/skills/` is committed while per-user Codex config stays gitignored. |
| 0045   | [Skill Content Disclosure Model](0045-skill-content-disclosure-model.md)                              | accepted | Each skill section sorts by load-frequency × trigger-determinism into PIN / EXTERNALIZE / CATALOG / CUT; lenses stay in the body, references need imperative triggers. |
| 0046   | [Persona vs Utility Skill Type](0046-persona-vs-utility-skill-type.md)                                         | accepted | `roles.json` entries may declare `type: "utility"` — no persona, no Codex agent adapter; skill adapters still generate for all runtimes. |
| 0047   | [Plans Are Preserved at Close, Not Deleted](0047-plans-are-preserved-at-close.md)                              | accepted | At close, plans are marked closed (`> Closed: YYYY-MM-DD`) and preserved in `.prism/plans/` — promotion + verdict gate unchanged; no deletion for any plan class. |
| 0048   | [Conductor — Autonomy Between Gates](0048-conductor-autonomy-between-gates.md)                                  | accepted | Sol orchestrates the lifecycle on a third axis; drives autonomously between human gates but never clears one — the gate's owning persona clears or escalates under a human-set autonomy policy. |
| 0049   | [Conductor — Teams Are Lane-Groups, Not Sub-Conductors](0049-conductor-teams-are-lane-groups.md)               | accepted | A team is a `team` field on the flat `lanes[]`, not a nested Sol — the Workflow engine forbids deeper nesting and shares the parent's cap/budget, so sub-conductors are structurally blocked and buy zero throughput. |
| 0050   | [Conductor — Growth via Between-Segment Reconcile, Governed by a Two-Axis Convergence Brake](0050-conductor-growth-loop-and-convergence-governor.md) | accepted | The fleet grows itself between Workflow segments via a reuse-once reconcile-delta primitive; Sol holds the registry and structurally dedups; runaway is braked on dispatch budget (primary), generation cap K=3 (soft gate), and a breadth gate. |
| 0051   | [Conductor — Container Lanes Are Non-Dispatchable Status-Rollup Nodes](0051-conductor-tree-dispatch-semantics.md) | accepted | A lane with children is a container (epic/issue): never dispatched, `currentPhase: null`, `status` rolled up from children; only leaf lanes run a phase chain. A planned tree is all generation 0 — tree depth is not generation depth, so the governor's generation cap never fires on planned depth. |
| 0052   | [Conductor — Greenfield Decompose Extends the Reconcile Primitive; the Ratification Gate Is the Breadth Gate's Human Review](0052-conductor-greenfield-decompose-and-ratification-gate.md) | accepted | Greenfield mode runs a Parker→Winston→Nora chain whose tree output enters the lane set via an additive `parentId`-shape path on the Phase A reconcile primitive (not a fork); the ratification gate is the human review the breadth gate exists to force, so a ratified tree skips the breadth gate, with the gate armed at `hobby` as the loophole backstop. |
| 0053   | [Conductor — Integration Lane Marker Is a Nullable `type` Field; No Default Integration Persona](0053-conductor-integration-lane-type-marker.md) | accepted | The integration lane is marked by a nullable `type: "integration" \| null` field (not a `role` field, not a named-lane convention); the gate triggers on `type === "integration"` AND cross-team `dependsOn`. Persona assignment stays explicit in the lane's scope statement — no default integration persona mapping. |
| 0054   | [Conductor — The Integration Gate Is an Unconditional Human Gate, Including at `hobby`](0054-conductor-integration-gate-always-human.md) | accepted | The integration gate is `needs-human` at every autonomy level including `hobby` — it never auto-clears, making it the second unconditional human gate alongside merge (ADR-0011) and a categorical exception to the confidence-gated autonomy pattern (ADR-0048). The risk asymmetry — two teams' work merging and testing unreviewed — favors always-human. |
