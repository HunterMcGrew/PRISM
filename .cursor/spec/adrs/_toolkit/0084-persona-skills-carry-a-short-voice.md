---
Number: 0084
Title: Persona Skills Carry a Short Voice
Status: accepted
Date: 2026-11-19
---

## Context

[ADR-0080](./0080-skills-are-function-shaped-and-held-to-four-tests.md) cut persona voice together with the "How X Thinks" lenses, under its Policy test. It also rejected "keep persona voice as a thin opening line" by name. Only the lenses repeated rules. The voice held a name, a tone, and a few signature lines, and no rule.

The amended PRISM-499 intent (2026-11-17) brings the voice back, on thrive's finding that voice is what makes a persona recognizable across a long session, at about a dozen lines. Counting the block against the 120-line cap would charge skills that sit near it for tone alone.

## Decision

A persona skill carries one `## Voice` block. This reverses only the voice half of ADR-0080's Policy test and its rejected alternative.

The block is the first `## ` section of the skill's `shared.md`, below the job statement and any `<!-- atlas:... -->` anchor that comes before the first `## ` heading, and it runs about 12 lines. It holds, in order:

- the `## Voice` heading
- an identity line, `You are **<Persona>** (<pronouns>), ...`
- an optional scene line
- a tone line, starting `**Tone, in chat`
- three or four signature lines
- one greeting line, which names an example greeting and tells the skill to skip it when it runs as a subagent

The block holds no rule, because a line that restates a rule from the body drifts from the original. It is chat only: it never appears in a PR comment, a plan entry, a tracker write, or a Slack post. The greeting is skipped as a subagent because its reader is the dispatching session, not a person.

Every role in `.ai-skills/definitions/roles.json` with a `persona` has a block, `prism-pr-review` (Eric) included. Utility and agent roles have none.

What happens to each part of ADR-0080:

| ADR-0080 part | Disposition |
| --- | --- |
| Policy test, "voice fails" | Reversed for the Voice block only |
| "How X Thinks" lenses cut | Kept |
| Persona names as trigger words only | Narrowed. The name may also appear in the Voice block |
| Length test and the 120-line soft cap | Kept. `measureSkillLoad` leaves the first 16 lines of each `## Voice` section in a skill body out of the count |
| Enforcement test | Kept. `scripts/ai-skills/persona-voice.test.ts` checks the block's shape |
| Content is cut, not moved | Kept. A Voice block never moves to a reference |
| Skill IDs and names | Kept |

Alternatives that lost:

- **Leave persona names in the description alone.** Rejected because it loses the voice.
- **Count the block against the 120-line cap.** Rejected because it charges near-cap skills for tone.
- **No check on the shape, as thrive has.** Rejected because PRISM's Enforcement test asks for a check where one is cheap.

## Consequences

- Positive: each persona reads as itself again, and the cap still flags a skill whose policy grows past 120 lines.
- Negative: the 12-line target and the no-rule line are a reviewer's to hold, and the check sees only the shape.
- Negative: chat only depends on the skill knowing which surface it writes to. A PR comment or a Slack post drafted in chat is where voice is likeliest to leak.
- Neutral: two ADR-0080 notes no longer hold: that a persona answers in the session's own voice, and that persona and utility skills differ only in routing and in agent-adapter generation.

## References

- [ADR-0080](./0080-skills-are-function-shaped-and-held-to-four-tests.md), the decision this reverses in part
- [ADR-0046](./0046-persona-vs-utility-skill-type.md), the persona and utility split the Voice block follows
- `.prism/rules/skill-authoring.md`
- `scripts/ai-skills/lib/skill-loaded-lines.ts`
- `scripts/ai-skills/persona-voice.test.ts`
- `.prism/plans/prism-499/spec.md`
- thrive's ADR-0054 (`.ai-spec/adrs/0054-persona-skills-carry-a-short-voice.md`), the source this ports
