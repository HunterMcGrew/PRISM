# Writing a Rule

A rule in `.prism/rules/` is a standard that binds work across tickets. It is
the most expensive place to put content — rules load into sessions whether or
not the session needs them — so the first question is never "how do I word
this" but "does this belong here at all."

---

## The placement test

Three homes, three different jobs. [`.prism/SPEC.md`](../../SPEC.md) defines
the tiers; this is how to pick between them.

| Put it in | When the content is | Loaded |
| --- | --- | --- |
| A rule (`.prism/rules/`) | A standard that applies across tickets, regardless of what you are touching | Every session, or per its declared paths |
| An architect doc (`.prism/architect/`) | A pattern that matters only when you work on a particular area | When a manifest route matches the path |
| An ADR (`.prism/spec/adrs/`) | A one-time decision and the reasoning behind it — alternatives, what lost, why | Read on purpose, not loaded automatically |

The distinction that gets missed most: **rules and architect docs encode
behavior; ADRs explain reasoning.** When you find yourself writing a rule whose
body is mostly justification, the justification is an ADR and the rule is the
one paragraph that survives.

If the content is only true for the ticket in front of you, it is a plan
Decision, not a rule.

## The shape

Lead with the rule. Then a `**Why:**` line, then a `**How to apply:**` line.

- **The rule** — what to do, in the imperative, without a mandate prefix.
- **Why** — the reason, usually a cost someone already paid. This is the part
  that survives contact with a situation the author did not anticipate: a
  reader who knows the reason can judge whether it still applies; a reader who
  only has the directive cannot, and will skip it in exactly the edge case it
  existed for.
- **How to apply** — when the rule fires, and what it looks like in practice.

## Onboarding voice, not mandate voice

Write like you are onboarding a teammate you already trust, not drafting a
contract for someone who needs controlling. `NON-NEGOTIABLE`, all-caps `MUST`,
`FAILURE STATE` — these read as coercion, and coercive framing gets ignored or
inverted more often than it gets obeyed. The constraint does not change; the
framing changes how it lands.

Reframe prohibitions as consequences. "Fabricating a search erodes trust faster
than admitting uncertainty" does the same work as "do not fabricate searches"
and gives the reader a reason to agree.

Lowercase "must" inside a sentence is fine. The problem is mandate voice as
framing, not the word.

## Count rules, not numbers

When a rule refers to a collection that grows — docs, personas, registered
endpoints — state the rule that defines membership rather than today's count.
"One per block" stays true next month; "14 files" goes stale the moment
someone adds a fifteenth, and a reader who spots the mismatch stops trusting
the rest of the document.

Counts earn their place in three cases only: a genuinely closed set ("all four
HTTP verbs we accept"), an order-of-magnitude signal written with a `+`, and a
historical snapshot in a changelog or a plan's history where the number is a
frozen fact about a moment.

## Keep it short enough to be read

Every word costs every future session. Lead with the point, cut the framing
sentence, use lists for parallel cases and prose for connected reasoning. When
a rule needs many sub-cases, that is a signal to split it — or to accept it is
long and structure it for scanning.

The full voice standard is [`.prism/rules/writing-voice.md`](../../rules/writing-voice.md).

---

## Route-verify

When you edit a doc this guide governs, confirm the route still names it: check
the pattern in `.prism/architect/manifest.json` that should
match the path you touched, and run `prism doctor` if you are unsure whether it
still resolves.
