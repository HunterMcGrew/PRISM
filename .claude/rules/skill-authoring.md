---
load: paths
paths:
  - ".ai-skills/skills/**"
  - ".prism/references/**"
---

# Skill Authoring

A PRISM skill is a function a session runs. It holds the policy the model would not apply on its own, in a body short enough to follow, and nothing else. This rule is the author-facing form of [ADR-0080](../spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md).

**Why:** the baseline for PRISM-499 found most skill text was persona voice, engineering method the model already applies, or copies of rules every session already holds. That text cost every run and diluted the few lines that mattered. Moving it into references only moved the cost, because a run that is told to read a reference pays for it anyway.

## The four tests

Every line of a skill passes all four, or it is cut:

- **Policy.** It encodes something the model would not do unprompted: a PRISM format, gate, lane boundary, or owner. Voice, generic method ("write tests," "read before you edit"), and restatements of an always-on rule fail.
- **Trigger.** The `description` fires the skill on the requests it serves and not on others.
- **Length.** The body plus every file it tells a run to read fits in 120 lines: references, step files, the skill's own `lib/` files, other skill sources, cited templates and architect docs, and `load: skill` rules. `scripts/ai-skills/skill-loaded-lines.test.ts` measures it.
- **Enforcement.** Anything that must always hold is a hook or a check. Prose that says "always" or "never" without one behind it is a request, not a guarantee.

**How to apply:** cut content that fails a test. Do not move it into a reference or a step file, since the cap counts those too. When a cut removes a judgment the model would genuinely miss, keep it as one plain policy line, not as a lens or a persona.

## Description field shape

The `description` is loaded every session for every installed skill, so it is the most expensive text a skill owns. The enforced cap is 1,000 characters (`MAX_FRONTMATTER_DESCRIPTION_LENGTH` in `scripts/ai-skills/utils.ts`).

- **Sentence 1 — what it does.** Name the action and the artifact.
- **Sentence 2, optional — the boundary.** Include it only when it steers routing away from work the skill does not do, such as "Reports in chat only; never posts to GitHub."
- **`Triggers:` line.** List the old persona name in quotes, plus a few distinctive phrases. A request by the old name must still route here.

Multi-line values use the YAML folded (`>`) scalar. `parseFrontmatter` reads single-line and folded values only, so a plain multi-line value parses as its first line.

## Names

A skill ID is a verb with the `prism-` prefix: `prism-self-review`, `prism-implement`. `prism update` rewrites only `prism-*` skills, so a bare verb would collide with a consumer's own skill of the same name. A consumer's skills use their own prefix and are never touched by an update. `tdd` is the one exception and keeps the bare name it shipped under.

## Utility skills

A skill whose `roles.json` entry declares `type: "utility"` is an action any skill can run. It generates no Codex agent adapter. Everything else in this rule applies unchanged ([ADR-0046](../spec/adrs/_toolkit/0046-persona-vs-utility-skill-type.md)).

## Atlas anchors

Anchor substitution (`scripts/ai-skills/lib/anchor-substitute.ts`) reads skill source files only (`shared.md`, `claude.md`, `codex.md`, `cursor.md`). An `<!-- atlas:* -->` anchor placed in a reference is never filled.

## Who runs this rule

Skill authors apply it on every edit. Self-review and PR review flag a line that fails a test, content moved into a reference instead of cut, and a renamed skill whose description lost its old persona name.
