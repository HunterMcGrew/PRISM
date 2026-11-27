<!-- prism:review — prism update refreshes this file while this line is here. Delete the line to keep your own version. -->
# Review

How a review runs in this repo. `prism-review` reads this file. It holds severity, the finding shape, the coverage line, the exit rule, and the passes. A pass is a checklist, not a separate run. Pass files live in `.prism/review/`, not under `.prism/references/`.

## Severity

| Level        | Meaning                                                                          | Action                  |
| ------------ | -------------------------------------------------------------------------------- | ----------------------- |
| **Critical** | Will cause production bugs, data loss, security issues, or crashes               | Must fix before merge   |
| **Major**    | Significant problem — wrong approach, missing edge case, accessibility violation, departure from an architect doc | Fix before the exit     |
| **Minor**    | Real improvement — naming, small optimization, documentation                     | Fix in the rounds       |
| **nit**      | Real but optional improvement                                                    | Fix or decline          |

A Minor no longer rides to a follow-up. It is fixed inside the rounds when it can be, and it never earns a round of its own.

**Impact times likelihood sets severity, not the bug class.** A null reference in a rarely called admin function is lower severity than the same bug in the inventory display, because the blast radius differs.

**A departure from a manifest-matched architect doc is Major, never a nit.** The fix either brings the code in line or changes the doc in the same PR, with the reason. Architect docs are this repo's standards, so a departure logged as a nit gets declined and the next reader copies it.

**Formatting is never a finding, at any severity.** That covers formatting, markdown style, formatter drift, and cosmetic phrasing such as grammar or register, anywhere in the diff. Fix it silently where you can and leave it where you can't. The git pre-commit hook and the verify stage's `format` check cover it, so the reviewer runs neither.

Two things are not cosmetic. A claim whose accuracy changes what a reader does stays a finding at its own severity, such as prose contradicting its source, a citation that no longer matches its section, or an instruction that routes a reader wrong. A behavioral lint or type error is correctness the tool happened to find, so it is reported at its own severity too.

**Why:** a formatting finding buys a full round trip for no behavioral gain, and the formatter's fix mode already resolves most of it.

## Finding kinds

Every finding carries one kind. Pick the most specific that fits.

- **bug** — wrong behavior at runtime, or a test that can't catch the regression it claims to.
- **security risk** — a trust boundary weakened: injection, auth bypass, secret exposure, unsafe deserialization, or missing validation at an input edge.
- **standards violation** — breaks a rule this repo states in its own docs, lint config, or architect docs. Cite the rule.
- **out-of-scope change** — work the plan didn't specify, with no stated reason in the plan, the PR body, or the code, that belongs in its own PR. A stated reason moves it to a nitpick at most.
- **code smell** — a structural problem that works today: one file changed for unrelated reasons, a function reaching into another module's data, a wrapper that only delegates, or a name that says nothing true about the thing.
- **nitpick** — real but small, such as a comment that drifted. Formatting and cosmetic phrasing never qualify.

## Finding shape

Each finding carries these parts:

- severity and kind
- `file:line` where the fix lands
- the triggering input or path that produces the wrong behavior
- `Class:` — the defect pattern in searchable general terms, never the instance restated. "Quoted rule text that drifted from its source" is a class. "Line 84 quotes the old wording" is the instance.
- `Sweep:` — the literal pattern or command run, where it searched, and what else it found. `— none found` and `— NOT swept: <reason>` are both legitimate values, and both stay visible.
- the fix
- for a regression, the command that shows it and its output

**One cause is one finding.** Compose it at the location where the fix lands, and list every other site under it. Splitting per location leaves each piece reading smaller than the defect, and then nothing states the defect.

Quote the command rather than describing its scope — `grep -rn 'orientation-battery' .ai-skills/`, not "searched the skills tree." Prefer the narrowest stable token over a phrase, because a phrase probe wraps at a line break and comes back clean against a defect sitting right there.

**Why both lines:** a reviewer who finds one instance has no reason to look for its siblings, and with nothing recorded, a reviewer who swept and one who didn't produce identical output. `Class` is what makes the sweep possible, since you can grep for a pattern but not for an instance. This is the review-side form of `.prism/rules/code-standards.md` § Removal and rename completeness.

## Read widely, report narrowly

A reviewer may read outside the diff. A finding names a diff line that causes it. Anything else is an observation: it goes on one line under "Out of scope" per the exit rule below, and `.prism/rules/followup-scope.md` picks its vehicle if it needs one.

## The plan is the yardstick

The review reads `intent.md`, `spec.md`, and `plan.md` to judge the diff and raises no finding on their prose. The PR body is never reviewed. Published docs, code comments, and the changelog earn a finding only when they are wrong about the code. Paths `reviewIgnore` names are never reviewed, and `review/record.mjs` refuses a finding that cites one.

## Coverage line

Each round reports exactly one token per pass:

- **`swept — <enumeration>`** — the pass ran over the pinned range, and it lists its unit from the enumeration table below, each item with a verdict. `swept — no items` is legitimate, and a reader can check it against the diff.
- **`n/a: <reason>`** — the pass doesn't apply to this diff. There was nothing of that kind to find.
- **`not reached: <reason>`** — the pass applies, and this round didn't run it. Nobody looked.

**A bare `swept` is unfinished.** Nothing separates a missing enumeration from a sweep that stopped partway, so every consumer reads it as unfinished.

**The reason on `not reached` is one of two kinds.**

- **Pass-bounded** — the reason names this round: time, diff size, an exhausted budget. A later round can reach the pass, so the status is pending.
- **Structural** — the reason names this diff: the pass can't run on this PR at all. It reads the same on round 1 and round 2, so it is terminal. "No `intent.md` and no `## Acceptance Criteria` in `plan.md`" is structural.

**Why three tokens:** collapse `n/a` and `not reached` into one and an incomplete round reads as clean, because the reader can no longer tell a decided skip from an unrun check.

## Sweep, then filter

Sweep every pass and collect every finding it turns up, whatever its size. Asking the sweep itself to be conservative produces under-reporting, because a model follows that instruction literally and skips real findings.

Filtering by severity is a separate, later pass over what the sweep collected, never a narrowing of the sweep. The report carries both halves, so they have to agree. A filtered table missing a finding the sweep record lists is the same conflict as one carrying a finding the sweep never found.

## Exit rule

The exit rule is zero Critical and zero Major findings apart from decision items, with every pass reading `swept` or `n/a`.

**A decision item is a finding only the person can settle,** such as a design tradeoff or a change to one of their rulings. Record it with its options and a recommendation, and let the run continue to the PR, where the session posts it as an inline comment through `review/post.mjs`. It goes under "Still open". Stopping mid-run for it stalls the whole workflow on a call the person can make just as well on the draft PR.

**An observation outside the ticket is not a finding.** It goes on one line under "Out of scope", with no severity and no ask, because nothing in this PR acts on it.

A declined nit carries its reason on one line.

**What is left after round 2.** Minors, decision items, and any Critical or Major still open are listed in the PR body. A Critical or Major is also posted inline through `review/post.mjs`, and the run goes on.

**Verdict cap.** While any pass is unfinished — `not reached`, or a bare `swept` — the review reports no unqualified ready label. The best available verdict names the pass and the check still owed. This caps the label, not the review: a round that reached eight passes still reports its eight passes' findings.

## Rounds and range

- **Range.** Docs and citations, and Regressions, cover the full PR range every round. The other passes cover the new-commit diff, and widen only when a finding needs it.
- **Where the new-commit diff starts.** It starts after the review's own last round.
- **Rounds.** At most two rounds. What is left after round 2 goes to the PR body, per the exit rule.
- **Subagents.** The parent splits files and passes across subagents within the limits in the workflow rule, `.prism/rules/workflow.md`. It removes duplicate findings, and it confirms every subagent finding against the file before reporting it.
- **Subagent briefs don't steer.** Each brief carries a one-line TL;DR, such as "review PR #N" or "review the commits since `<sha>`", plus the pinned range, the subagent's files or passes, and hard limits. It never says which angles to check, what to conclude, or what to skip. Grouping files or passes per subagent is fine, because the grouping is the brief. **Why:** a subagent handed a hypothesis tends to return it confirmed, and one told what to skip never reports what sits there.
- **Record.** The review records each of its rounds with `review/record.mjs <plan.md> <report.json>`, which writes `- review round <n> at <short sha>[ (part <k> of <m>)]: <verdict>` under `## Review` and nothing else. `<verdict>` is `clean`, `clean, <d> decision(s)` when the round is clean and `<d>` decision items wait on the person, or `<crit> critical, <maj> major, <min> minor, <nit> nit`. Only a bare `clean` meets the merge bar, so a call only the person can make never lets the session merge. A legacy flat plan records under `## Review Issues` instead. Older `self-review` and `pr-review` lines stay valid wherever a script reads them.

  On a stacked ticket, every PR shares one plan folder, so a line written on a PR that is not the last carries ` (part <k> of <m>)` after the sha, where `<k>` is that PR's place in the stack and `<m>` is the stack's size, and a line whose `<k>` is less than `<m>` is never a final verdict.

**When a round is `clean`.** A round's verdict is `clean` exactly when zero Critical and zero Major are open apart from decision items and every pass reads `swept — …` or `n/a: …`.

**The final verdicts.** The review is final when its last line is `clean`, is `clean, <d> decision(s)`, or is round 2.

### After a fix

Fixes are new code, so every fix commit is verified and reviewed before the run moves on. One sequence covers it, on whichever round the fix lands:

1. **Re-verify before the next push.** When a commit made after `## Verification` changes a file a verify check covers, verify runs again before the push. That means source, tests, and any spec-surface file. The verify stage decides which checks re-run, and it writes the new head into `## Verification`.
2. **Re-review the fix commits.** The review runs again with the commits since its last round as the new-commit diff. Under the cap, that run is the next finding round.

**The last round is the final pass over the final diff.** It pins the head the PR ships, and its full-range passes read the whole PR there. The retro runs after it.

## When a review pauses

A review pauses to ask the person only when the diff, or the fix a finding needs, does one of four things:

- touches a file outside the plan
- adds a dependency
- changes a shared type or a public API
- needs destructive git, as `.prism/rules/worktree-git.md` defines it

A file outside the plan is a scope change the person can veto, per the workflow rule. A dependency, a shared type, and a public API need a heads-up before they change, per `.prism/rules/code-standards.md` § General. Destructive git can discard work nobody can get back. A dispatched review with no route to the person returns the question in its report, and the session asks.

**A review never pauses on a finding, at any severity.** Findings go to the PR, per the exit rule. A loop at its two-round cap is not a pause either, because what is left goes to the PR as an open item.

## The passes

| #   | Pass                         | Trigger                                                                                                                                              | Detail file                         |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Correctness                  | always                                                                                                                                               | `.prism/review/correctness.md`      |
| 2   | Regressions                  | always                                                                                                                                               | `.prism/review/regressions.md`      |
| 3   | Security                     | the diff changes executable code, or the intent's Security surface is not "none"                                                                     | `.prism/review/security.md`         |
| 4   | Architecture and standards   | always                                                                                                                                               | `.prism/review/architecture.md`     |
| 5   | Intent conformance and scope | always. Structural `not reached` when no `intent.md` and no `## Acceptance Criteria` in `plan.md` exist                                              | `.prism/review/intent-scope.md`     |
| 6   | Simpler paths                | always                                                                                                                                               | `.prism/review/simpler-paths.md`    |
| 7   | Accessibility                | the diff changes UI                                                                                                                                  | `.prism/review/accessibility.md`    |
| 8   | Docs and citations           | the diff touches the spec surface (paths under `.prism/` other than `.prism/plans/`, `.ai-skills/`, `REVIEW.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`), or behavior a `docs/` file describes | `.prism/review/docs-citations.md`   |
| 9   | Contracts                    | the diff adds a migration or an ADR, or changes a stored or exported shape                                                                           | `.prism/review/contracts.md`        |
| 10  | Performance and cost         | the diff changes a render path, data fetching, a query, a loop over external data, or a shipped bundle                                               | `.prism/review/performance.md`      |

Each pass also runs the checks in `.prism/review/stack/<pass>.md` when that file exists. Onboarding writes them, and `prism update` never touches them.

## Enumeration units

A `swept` pass lists each item of its unit found in the pinned range, with a verdict.

| Pass                         | Unit enumerated                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Correctness                  | each changed entry point whose runtime behavior differs, and each external identifier the diff introduces or relies on |
| Regressions                  | each new or changed behavior paired with the test that fails if it regresses, and each caller of a changed export      |
| Security                     | each trust boundary touched                                                                                            |
| Architecture and standards   | each manifest-matched architect doc, and each new helper                                                               |
| Intent conformance and scope | each acceptance criterion, and each Decision that leaves code unchanged                                                |
| Simpler paths                | each structural change                                                                                                 |
| Accessibility                | each interactive or focusable element added or changed                                                                 |
| Docs and citations           | each cited line, sha, path, quoted rule, or code name, and each touched doc                                            |
| Contracts                    | each foundation question, with a verdict                                                                               |
| Performance and cost         | each changed hot path                                                                                                  |
