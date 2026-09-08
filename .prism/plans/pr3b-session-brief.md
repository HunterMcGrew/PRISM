# PR 3B session brief — the foreclosure pass

Read-only judgment work. No edits, no branch, no commits. The output is a table this
session hands to the implementation session that follows it.

## Why this session exists separately

PR 3B edits all 31 skill bodies. Two of them — `prism-code-review-self/shared.md` and
`prism-code-review-pr/shared.md` — are being rewritten right now by PR #471, and a third,
`prism-conductor/shared.md`, is touched by PR #470. Branching 3B before both land means
hand-resolving conflicts in exactly the files whose restructure is still in flight.

The judgment half has no such constraint. Deciding what survives the cut produces no diff,
so it runs now and the implementation session starts from a finished decision table.

## Read first

- `.prism/plans/opus5-port-pr3-redesign.md` — the whole proposal, not only the PR 3B
  section. The deletion criterion, the risk table, and the commit-boundary rules are the
  reasoning the task list rests on.
- `.prism/plans/opus5-port.md` § Implementation Tasks → PR 3, for the original tasks 20–29
  the proposal revises.
- `/Users/hunter/Documents/portable-skills/SLIMMING-GUIDE.md` and `ROSTER-AUDIT.md` — the
  reference implementation Hunter reports works well.

## The criterion

Before deleting a block, write one sentence naming the alternative behavior it forecloses.

- A sentence comes out → the block stays, **compressed to that sentence**.
- No sentence → delete.

Two clauses that change the outcome:

- **One sentence per bound, not per block.** A block foreclosing three alternatives yields
  three sentences. Picking the strongest looks compliant and loses two.
- **The sentence is the block.** Not the sentence plus the paragraph kept for warmth, not
  the sentence plus the `**Why:**`. Hunter's standing instruction is to cut prose as hard
  as the criterion allows.

### Where the criterion over-fires

The test for an exception is checkable, not a feel call: **can a reader act on the sentence
alone, or does acting require the block's contents?** Three known cases:

- **Typed contracts.** Replacing a schema with "forecloses paraphrasing a shape something
  parses" performs the exact failure the sentence forbids.
- **Reference sets the bound points at.** You cannot cite Nielsen #4 from "forecloses
  citing an unnamed vibe." This is Hunter's Pixel ruling in general form.
- **Verbatim calibration strings the evidence names as the thing that worked.**
  Paraphrasing a measured string discards the measurement.

### The reversal list is the control

`.prism/plans/opus5-port.md` § PR 3 carries content a previous slimming pass deleted and a
reviewer had to restore — the opening battery, Briar's diff-only reading, closing
ceremonies, dispatched-runs sections, typed contracts, run-control state, pinned review
ranges, escape conditions, and the `description` frontmatter. **Every item on it yields a
foreclosure sentence immediately.** If your criterion would delete one, the criterion is
being applied wrong. Check against this list before trusting a delete verdict.

## What Hunter wants cut

His framing, verbatim: "The LLMs know what it means to implement code, review code, etc.
The parts that we say, you're a software engineer with 9 years experience, your stack is
typescript, react, etc — we can get rid of all that."

Named targets:

- Credential and experience framing ("senior software engineer with 10+ years").
- `You specialize in` lists — 8 files carry them.
- `## Personality` sections — 26 files carry them.
- Restatements of what a competent model already does when asked to implement or review.

Named keeps: branch-plan handling, `manifest.json` knowledge, knowledge of the other
skills and agents. The rule behind the list: keep what the model cannot infer, cut what it
can.

## The deliverable

One table, one row per deleted or compressed block, with these columns:

| Skill | Section | Verdict | Foreclosure sentence |

`Verdict` is `delete`, `compress`, or `keep`. **An empty foreclosure cell on a `compress`
or `keep` row is a self-contradicting row** — that is the property the table exists to make
visible, and it is why the table ships in the PR body rather than living in someone's head.

Group rows by deletion class, not by file. The implementation session commits one class at
a time, so the table's grouping becomes its commit boundaries.

## Scope of this session

The 31 skill bodies under `.ai-skills/skills/*/shared.md`.

**Read `prism-code-review-self` and `prism-code-review-pr` from PR #471's branch**
(`huntermcgrew/opus5-port-3a-reviewer-scope`), not from `main` — their `main` copies are
about to be replaced and judging the old text wastes the pass.

Out of scope here: the shared `skill-core.md` content, the Step-0 pointer, the two new
utility skills, and Eli's doc pass. Those are implementation tasks with settled specs.

## Two things not to decide

- **Pixel's catalogs stay.** Hunter ruled: keep them, no A/B. The catalogs earn their place
  because they foreclose citing an unnamed vibe. Cut the prose around them; leave the
  catalogs themselves.
- **Do not create the branch.** Base is `origin/main` after both #470 and #471 land.
