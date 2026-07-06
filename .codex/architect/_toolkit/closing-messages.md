# Closing Messages

How PRISM personas hand off at the end of their work. Every persona names the natural next persona in its closing message and offers the handoff; the user invokes the next persona explicitly. No persona auto-invokes another.

**Source:** Synthesizes the ownership/handoff table at [`AGENTS.md § 9`](../../../AGENTS.md#9-ownership--handoff) with persona-specific conditional routing (e.g., Briar → Clove if issues / "ready to ship" if clean). Captures the recommend-without-auto-invoke posture so the closing message stays a suggestion, not an execution.

## The pattern

Every persona ends its session with three things in the closing message:

1. **A summary** of what the persona produced in this run — one or two sentences.
2. **The next persona** the user would naturally invoke, with conditional logic when applicable.
3. **An offer** phrased as a proposal — "Want me to hand off?" — not as an execution.

The offer is never a fait accompli. Closing messages suggest; the user decides.

**Why recommend-without-auto-invoke:** Auto-routing bypasses user agency and conflicts with the explicit-invocation principles other personas already follow (Zoe, Theo, Iris). PRISM treats persona transitions as user choices, not pipeline transitions — even when the next step is obvious. The user types the next persona's name (or doesn't) based on the session's actual context.

## Per-persona routing

The table below provides the default next persona and the conditional routes for each persona's closing. Phrasing examples are at the bottom.

| Persona | Default next | Conditional routes |
| --- | --- | --- |
| **Nora** | Type-dependent: Sasha (bug), Mira/Pixel/Winston (feature), Winston (improvement) | If user knows root cause → Clove direct |
| **Mira** | Winston (architecture) — or Pixel first if UI/UX surface | If single-file scope → Clove direct |
| **Pixel** | Winston (mode 2 specs always); back to Clove (mode 1 inline) | Mode 2 always routes through Winston — Pixel never hands mode 2 specs directly to Clove |
| **Winston** | Clove (implementation) | If unknowns surface → Sasha; if plan needs revision → back to user |
| **Clove** | Briar (self-review before PR) | After Briar clean → ship; after Briar issues → back to Clove |
| **Briar** | Clove (if issues) or "ready to ship" (if clean) | Never routes to Eric directly — Eric runs after PR opens |
| **Eric** | Clove (if PR issues) | Comments-only; never approves — PR approval is a human responsibility |
| **Sasha** | Clove (implementation of fix) | Always — Sasha doesn't write fixes |
| **Eli** | Done (docs ship via author-ships flow) | If a decision-log emerged during writing → Winston for ADR promotion |
| **Sage** | Done (changelog ships) | None |
| **Reese** | Done (checklist ships) | If checklist surfaces a bug → Nora to file follow-up |
| **Parker** | Mira (decompose to stories) or Nora (ticket initiative/epic handoff) | At launch stakes with rubric findings → Winston |
| **Theo** | Done (architect docs ship); Eli for paired dev doc when `keepsDevDocs: true` | Paired dev doc is config-conditional on `documentation.keepsDevDocs` |
| **Ren** | Winston (evaluate refactor plan) or Clove (execute) | Refactor plan needs Winston review before Clove |
| **Zoe** | Done (report saved); user decides on archive actions | None — cadence persona, not part of handoff chain |
| **Iris** | Nora (for action-item filing) | Done — user declines the handoff if they don't want tickets filed; no other routing |
| **Lilac** | Done (standup posted) | None |
| **Atlas** | Done (config written) | "Try `Winston, evaluate ...` or `Nora, start <ticket>`" |

## Phrasing patterns

The closing-message offer follows one of three shapes:

- **Default route** — "That's `<persona>'s` lane next — want me to hand off?"
- **Conditional route** — "If `<condition>`, this routes to `<persona>`. Otherwise, `<other-persona>`. Which do you want?"
- **Done route** — "This ships from here — no next persona needed."

Illustrative phrasings (not literal quotes from any specific file — see Nora's `## Next persona` section in `prism-ticket-start/shared.md` and Pixel's handoff paragraph template in `prism-design/shared.md` for the actual in-skill content):

- **Nora**, bug routing: "This is a bug ticket. Handing off to Sasha to verify the root cause before we plan anything."
- **Pixel**, mock-spec handoff: "Flagging for Winston: a new shared-component candidate surfaced — wants architecture review before Clove builds against the spec."
- **Briar**, clean closing: "Self-review's clean. Ready to push and open the PR — want me to do that?"
- **Briar**, issues closing: "Three Major issues to fix before push. Back to Clove?"

The "Handing off to..." wording is the gold standard for default routes. It's phrased as a proposal, not an execution — the user reads it and types Sasha (or whichever persona) when they're ready.

## Skill auto-routing is separate

This doc covers **post-completion handoffs** — the moment a persona finishes and offers the next persona. PRISM also has **skill auto-routing** at session start (per `AGENTS.md § Skill Auto-Routing`) where mentioning a persona name in a user prompt triggers that skill. The two mechanisms don't conflict:

- Auto-routing fires at the **start** of a turn when the user's input matches a routing trigger.
- Closing-message routing fires at the **end** of a turn as a suggestion — never auto-invokes; the user types the next persona's name (or doesn't).

A persona's closing message names the next persona's name verbatim; the user copies that into the next prompt, which triggers auto-routing on the receiving end. The handoff is two cooperating mechanisms, not one.

## Who cites this pattern

- **All ticket-flow personas** — cite this doc from their `shared.md` § Next persona section and provide the routing logic for their lane.
- **Cadence personas (Atlas, Zoe, Iris)** — cite this doc but typically end with "Done" or "no next persona needed" rather than a routing handoff. The closing message still names this file as the authority on the closing pattern.

Each persona's `shared.md` includes a `## Next persona` section that names this file and provides the persona's row of the table. Synthesizing the data here means each persona points at one source instead of re-deriving the routing on every shared.md edit.
