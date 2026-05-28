---
paths:
  - ".ai-skills/skills/**"
  - ".prism/references/**"
---

# Skill Authoring — Content Disclosure

## Purpose

PRISM skills are scaffolding. They define what a persona does and how it weighs everything else — and they point to references for the rest. This rule governs what stays in the skill body and what moves to a reference, so skills stay lean enough that their load-bearing rules actually get followed. It is the author-facing form of [ADR-0045](../spec/adrs/0045-skill-content-disclosure-model.md).

**Why:** A skill's body is paid every time the skill triggers and stays in context for the rest of the conversation. References are free until the body tells the agent to read them. But the real cost of a bloated body isn't tokens — it's attention dilution. A 200-line skill with five sharp rules treats them as load-bearing because they're the whole document; a 700-line skill with the same five rules plus thirty nice-to-haves flattens the hierarchy, and the critical rules get followed less reliably. Going lean is not about line count for its own sake — it's about keeping the importance hierarchy sharp.

## The three loading levels

Use "level" or "stage" here — never "tier." [ADR-0035](../spec/adrs/0035-rule-loading-tiers.md) owns "tier" for rule loading; colliding the vocabularies confuses both.

1. **Frontmatter** (`name` + `description`) — loaded every session, for every installed skill. Keep it tight; it's permanent cost.
2. **Body** (`shared.md` + the platform file → generated `SKILL.md`) — loaded every trigger. This is where the cost and the dilution live.
3. **References** (`.prism/references/…`) — free until the body instructs a read.

## Description field shape

The `description` field is the routing surface — the auto-routing layer reads it to decide which skill fires. Write it as **WHAT the skill does + WHEN to use it + compact discovery keywords**, not as an enumeration of trigger phrases. A list of name-permutations (`"hey Pixel", "over to Pixel", "ask Pixel"`) all collapse to the single keyword `Pixel`; spelling them out spends permanent per-session context without adding routing coverage.

**Why:** `description` is loaded every session for every installed skill (loading level 1 above) — it's the most expensive surface in the skill. The enforced cap is **1000 characters** (`MAX_FRONTMATTER_DESCRIPTION_LENGTH` in `scripts/ai-skills/utils.ts`, asserted for every skill by `discovery-metadata.test.ts` so Codex skill discovery can expose the skill). Trigger-phrase enumeration crowds that budget while the persona-name keyword and the AGENTS.md §0 signal-phrase table already carry the routing.

### The four parts

1. **Sentence 1 — persona name + role.** `"Pixel — UI/UX designer."`
2. **Sentence 2 — WHAT.** One or two clauses naming the core actions, the artifacts produced, and the key context the skill reads or pre-conditions it needs.
3. **Sentence 3 (optional) — load-bearing exclusion.** Only when a behavioral constraint changes routing — see below.
4. **`Triggers:` line — persona name in quotes + 5–9 distinctive keywords or short phrases.** The label is cosmetic; routing depends on the keyword content, not on the word "Triggers."

Target **280–340 characters** — well under the 1000 cap, above the floor where the WHAT stops carrying real signal.

### Persona name appears twice

The name goes in sentence 1 (as role) and again in the `Triggers:` line. This is double-coverage for named-invocation routing: if keyword extraction favors prose mentions, sentence 1 catches it; if it favors keyword lists, the trigger line catches it. Cheap insurance against a routing miss on a named handoff — and every persona's `## Next persona` section depends on named handoffs working.

### Exclusions stay when they're concrete behavioral constraints

The general preference is positive framing. Negation clauses are the exception when they're load-bearing for routing — `"Never writes code"` (Pixel, Sasha), `"Reports in chat only — never posts to GitHub"` (Briar), `"Never approves"` (Eric). These steer the router away from the wrong skill when a user asks for code, a GitHub post, or a PR approval. Keep one short exclusion on the skills where it marks a real behavioral boundary; drop it everywhere else. The test: does omitting the clause let the router pick this skill for work it doesn't do? If yes, the exclusion is load-bearing — it's a behavioral constraint, not a stylistic preference.

### Example

> Briar — self-review specialist. Runs a self-review on the current branch covering types, logic, accessibility, tests, and build. Reports findings in chat only — never posts to GitHub. Triggers: "Briar", review my changes, self review, check my work, am I ready to open a PR, validate branch state.

## The disclosure gate

Sort every section by **load-frequency × trigger-determinism**:

- **PIN** — stays in the body. Fires every run *and* is voice / the "How X Thinks" lens / an anti-pattern guardrail / the workflow router / the Definition of Done. **If a section must shape reasoning throughout the run, it is a lens — it stays, regardless of length.** A reference loads mid-run, after reasoning has started; a lens has to be present when reasoning begins.
- **EXTERNALIZE** — body moves to a reference, an inline trigger stays. Allowed **only if you can write a one-line imperative trigger naming the exact file and the exact condition.** If the honest trigger is "keep this in mind throughout," it's a lens — don't move it. Candidates: whole modes, conditional procedures, command/template bodies.
- **CATALOG** — model-resident knowledge (named frameworks, heuristics, laws) or verbatim templates. Move freely; cite by name. This enforces consistency, not instruction — the model already holds it.
- **CUT** — fails the deletion test (restates a pinned lens, or is dead weight from an old one-off patch). Removal is a separate, signed-off decision — never bundle a deletion into a relocation.

**The test that resolves most calls:** would a session that never uses this content still be a valid run of the skill? Yes → it can leave the body. No → it pins.

## Always pin

Never externalize these, regardless of length:

- Persona and voice.
- The "How X Thinks" lens / cognitive approach — the reasoning that shapes output quality.
- Anti-pattern guardrails.
- The workflow router — startup batch + the at-a-glance phase/mode index.
- The Definition of Done.

## Externalization mechanics

Replace the moved section with its `## Heading`, a one-line `> _italic note_`, and an imperative trigger. Copy the shape from `prism-architect` (the worked precedent):

> **When the user asks to plan, build tasks, or decompose work, read [`plan-mode.md`](../../../.prism/references/architect/plan-mode.md) and follow it.**

- **Vague pointers are the failure mode.** "See the references for X" leaves the agent guessing — it usually never loads the file and wings it from training. Name the file and the condition, imperatively.
- **Tripwire nuance.** When the trigger is detective/implicit ("you're about to overwrite X," "scope changed"), the *detection* stays inline; only the procedure body moves. You can't externalize a detection condition — the skill would never know to load the file.
- **Atlas-anchor hard rule.** Anchor substitution (`scripts/ai-skills/lib/anchor-substitute.ts`) touches only skill-source files (`shared.md`/`claude.md`/`codex.md`/`cursor.md`); references are never scanned. **Never move a `<!-- atlas:* -->` anchor into a reference** — it would never get populated. If a section being externalized contains an anchor, split it: the anchor and its stub prose stay pinned; the rest moves.
- **Reference home.** Skill-specific references → `.prism/references/<skill>/<topic>.md`; genuinely shared cross-skill references → `.prism/references/` top-level. Triggers in the body link `../../../.prism/references/<skill>/<topic>.md`. Internal links inside a sub-dir reference take an extra hop: `../../rules/`, `../../spec/`, `../../architect/`, `../../templates/`; a top-level shared ref is `../<file>.md`; a sibling is `./<file>.md`.
- **Create references lazily.** Write the reference when there's content for it; never seed an empty file (per [`lazy-artifacts.md`](./lazy-artifacts.md)).

## Don't externalize a lens for line count

Line counts are deliberately non-uniform. A judgment-heavy skill that lands at 400 lines of mostly-lens is correct; a skill padded down to 250 by externalizing a lens is wrong. The gate is the standard, not the number. If you're tempted to move a lens to hit a target, that's the signal to stop.

## Wrap a lens in a step when a judgment must fire every run

A lens that's present but not *placed* fires only when the run's reasoning path happens to reach it. To make a judgment reliable across runs, give it a deterministic placement — a gate, a forcing question, a DoD item — rather than trusting the path. Winston's premise gate is the model: the content is "how to think," the delivery is "when to think it." Don't over-apply this — every wrapped lens is more pinned content. Wrap the every-run judgments; leave the conditional ones to triggers.

## Who runs this rule

- **Skill authors** apply the gate when writing or editing any skill, on every section.
- **Briar** ([prism-code-review-self](../skills/prism-code-review-self/SKILL.md)) and **Eric** ([prism-code-review-pr](../skills/prism-code-review-pr/SKILL.md)) flag violations in review: a lens externalized to a reference (Major — it degrades adherence), a vague pointer with no deterministic trigger, an `atlas:*` anchor moved into a reference, or a CUT bundled silently into a relocation.
