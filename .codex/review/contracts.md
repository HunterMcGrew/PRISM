# Contracts pass

Is the change a durable foundation, rather than are its lines correct? Trigger: the diff adds a migration or an ADR, or changes a stored or exported shape. Contracts here include a migration, an ADR, a stored record shape, an exported type or API, a config key, and a file other tools read. Renaming, removing, or changing the type or meaning of one fires the pass, and so does introducing a new one. Adding an optional field to an existing shape doesn't, and neither does changing code behind a contract without changing what gets read or stored.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

**Why it exists:** a correctness review asks the same questions on every pass, so a loop that converges on zero findings has exhausted those questions and said nothing about the others. A single pass asking the questions below, with the growth horizon in hand, finds the data shape that needs repairing on every write, the check that lives in one app only, and the invariant the code holds for two of four columns. All of those get more expensive to undo once real data exists.

## Establish the horizon first

Questions 1 and 6, and the severity call, are measured against what is coming. Before sweeping, answer three things:

- **What will multiply?** Templates, tenants, writers, content volume. Use the stated numbers.
- **Who will write this data besides today's caller?** Imports, AI generation, sync jobs, end users, a public API.
- **What becomes hard to change?** Stored data shapes, exported contracts, config keys, migrations, accepted ADRs. These get the closest reading.

Resolve the horizon in this order and stop at the first source that answers:

1. **Stated.** `intent.md`'s `## Proposed outcome` (a legacy flat plan's `## Goal`), the ticket, or a horizon the dispatch passed in. A stated plan beats what the code shows, because "ten more templates next quarter" isn't visible in the repo.
2. **Inferred from the repo.** The diff alone can't show future plans, but the repo shows current scale and growth rate. Count the existing siblings of what the diff adds: entries in the registry, array, or union it extends, templates or types of the same kind. Read that set's git history for how fast it has grown, and check architect docs and other plans that mention it. Report an inferred horizon as inferred, with its evidence, such as "inferred: 38 entries today, 9 added in the last 6 months", so a human can correct it at a glance.

**A missing horizon doesn't block the sweep.** Questions 2 to 5, 7, and 8 don't depend on one. With nothing stated or inferable, sweep anyway and record `horizon: none stated, judged at current scale` in the enumeration. The pass reads `swept`, not `not reached`.

**Ask only when the diff adds to something that multiplies and neither source resolved it**, because that's the one case where judging at current scale can be badly wrong. The signals: a new entry in a registry, array, or union, a new file shaped like existing siblings, or something the plan or ticket calls a "type" or "template". When unsure whether something multiplies, ask rather than guess. Offer a default so the question is cheap, such as "Assuming current scale unless more are coming." A dispatched reviewer that can't reach the user reports `not reached: no growth horizon stated` in this case only.

## The questions

Cite `file:line` at source for every answer.

1. **Is this the simplest thing that meets the stated need?** Two scales. At the scope scale, does the change carry work its problem didn't need, and does its size argue for a split per `.prism/rules/followup-scope.md`? At the mechanism scale, list the non-trivial machinery, such as reconcilers, rebasers, fallbacks, flags, and data migrations, and name the one upstream choice that makes each necessary. When one choice accounts for several, propose the shape that removes it and list what that deletes. `.prism/review/simpler-paths.md` § `Checklist` is the per-abstraction lens. This question adds the trace back to the choice, which that lens doesn't reach when the cost is spread across files. A data shape that has to be repaired on every write is the usual culprit.
2. **Does every claimed invariant hold in every cell?** Collect the claims from the PR body, ADRs, docs, and doc comments, such as "every write is checked", "always valid", "can't be skipped". For each, build the grid of every column or field against every entry point (create, update, rollback, import, CLI) and check each cell. A claim that holds for the cases the author tested is not the claim.
3. **Can the next writer reach the policy?** For each rule that decides validity or permission, ask whether a writer outside today's app can use it without importing from that app or reimplementing it. Look for escape hatches in production exports, such as an accept-anything helper.
4. **What happens on the path nobody planned for?** An unknown key, a missing definition, an unregistered type, a null. A guard that allows what it can't judge is a hole.
5. **Does each guard cover the population it protects?** For each registry test, golden file, and CI check, ask what it iterates. Does the next instance join automatically, or only when someone remembers to add it? Is detection a naming convention?
6. **What does the Nth addition cost?** Walk through adding the next template, tenant type, or entry: every file touched, every hook written, every convention to know. Say where a declaration could replace code.
7. **Does each rule have one home, and can a mid-level engineer find it?** List the validation and enforcement points, where each is implemented, and where each is documented. The same rule enforced in two places, such as a handler check beside a write guard, or described in several docs, is a finding, because the copies drift, and any drift already found between them is its evidence. Line-level duplication is the Architecture and standards pass's job (`.prism/review/architecture.md` § `Checklist`). This question is about duplicated sources of truth. No single map of the points is a finding too.
8. **What does the user see when it still fails?** For the failure the change fixes, follow each remaining failure path to what the user sees, and ask whether they can act on it.

## Reporting

Severity is reversibility times blast radius, judged against the horizon: say whether each cost is cheap now, expensive once real data exists, or irreversible. A shape change that is cheap while every stored row is seed data and costly after launch is a Major now even though nothing breaks today. `.prism/review/simpler-paths.md` § `Severity` already makes "compound real maintenance cost" a Major, and the horizon is what makes that cost measurable.

A finding that is a design call rather than a defect says so and names who decides. Each finding takes the usual shape, `REVIEW.md` § `Finding shape`.

Name what is strong and should be kept, in the same report. A reshape recommended without that list tends to throw out the parts that were right.

Stack checks for this pass, when the repo has them: `.prism/review/stack/contracts.md`.
