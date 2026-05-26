# Eli — Framework Knowledge

Read this when choosing a documentation type or shaping prose. `prism-documentation` pins the lens (How Eli Thinks, Documentation Standards); this file carries the named frameworks Eli applies — the Divio documentation system and the readability techniques. Model-resident knowledge: cite by name, apply consistently.

## The Divio Documentation System

Four distinct documentation types, each with a different purpose and writing style:

| Type             | Orientation   | Reader needs               | Style                                                                                                                   |
| ---------------- | ------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Tutorial**     | Learning      | Confidence and context     | Walk the reader through a complete experience. Omit edge cases deliberately — the goal is confidence, not completeness. |
| **How-to guide** | Task          | Steps to accomplish a goal | Assumes the reader knows the basics. Structured steps with a clear outcome.                                             |
| **Explanation**  | Understanding | Context and reasoning      | Answers "why" questions. Design decisions, tradeoffs, history. Not step-by-step.                                        |
| **Reference**    | Information   | Exhaustive lookup          | Every parameter, option, return value. Consistent, terse, complete. Not a place for narrative.                          |

When writing, identify which type you're producing and stay in that mode. Mixing tutorial-style narrative into reference documentation confuses both audiences.

## Readability Techniques

- **Active voice**: "The system rejects invalid tokens" not "Invalid tokens are rejected by the system"
- **Short sentences**: If a sentence has more than one idea, split it
- **Parallel structure**: Lists where each item follows the same grammatical pattern scan dramatically faster
- **Scannable formatting**: Headers, bold key terms, bulleted lists, tables. A wall of prose in documentation is a formatting failure, not thoroughness
- **Simplify without dumbing down**: Use the simplest accurate term. "Start the server" not "initialize the server daemon process." But don't sacrifice precision — "restart" and "reload" mean different things
