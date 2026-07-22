# Plan: followup-427-428-verdict-wiring

## Ticket

GitHub issues [#427](https://github.com/HunterMcGrew/PRISM/issues/427) and [#428](https://github.com/HunterMcGrew/PRISM/issues/428) — merged into one lane per `.prism/plans/eval-backlog-triage.md` § "#427 + #428 — do both, as one ticket".

## Goal

Make the conductor's dispatch report-back schema impossible to retype wrong, wire the reviewer skills to the `needs-fix` verdict that already exists, and give Briar's plan-only commits a defined landing path.

---

## User Stories

Not applicable — DX/spec work with no end-user-observable behavior. Neither issue carries product AC; both are verified by the developer.

---

## Design

Not applicable — no UI surface.

---

## Implementation Tasks

Every task names its file, its exact change, its verification command, and its position in sequence. Tasks 1–5 and 12 close #427; tasks 6–10 close #428; task 11 is the shared mirror/verify step and runs last.

**Surface map (read before editing — the canonical vs. mirror split is not uniform):**

| Path | Status |
| --- | --- |
| `.prism/skills/prism-conductor/**` | **Canonical, not mirrored.** `COPIED_CONTENT_AREAS` in `scripts/ai-skills/build.ts:112` covers `rules`, `architect`, `spec`, `templates`, `references` — `skills` is absent. Edit in place. |
| `.prism/rules/*.md` | **Canonical.** Mirrored to `.claude/rules/`, `.cursor/`, and the install seed by `pnpm prism:build`. |
| `.ai-skills/skills/<skill>/{shared,claude,codex,cursor}.md` | **Canonical.** Compiled to `.claude/skills/<skill>/SKILL.md` (and platform twins) by `pnpm prism:build`. |
| `.claude/**`, `.cursor/**`, `templates/install/.prism/**` | **Generated mirrors.** Never hand-edit — regenerate with `pnpm prism:build`. |

### Clove (implementation)

**1. Add the canonical dispatch schema block to `report-back.md`.**

File: `.prism/skills/prism-conductor/lib/report-back.md`. Insert a new `## Canonical dispatch schema` section immediately **before** the existing `## Secondary signals` heading (currently line 51) — it must sit after `## Evidence fields (write lanes)` because it composes those fields.

Section body, verbatim:

~~~markdown
## Canonical dispatch schema

This is the **only** place the dispatch report-back schema is written down. A Sol authoring an autonomous segment copies this block verbatim into the `agent()` / Workflow `schema` field. Never retype the enum from memory and never abbreviate it to "the verdicts that apply to this lane" — a truncated enum silently forbids a persona from returning the correct verdict, and the persona has no way to signal that the schema, not its own judgment, was the constraint.

```
{
  verdict: "done" | "needs-fix" | "blocked" | "needs-replan" | "needs-stronger-model" | "needs-human",
  summary: string,
  signals?: [
    {
      kind: "found-bug" | "found-followup-work" | "observation",
      note: string,
      target?: { file?: string, symbol?: string, scopeSlug?: string, errorSignature?: string }
    }
  ],
  gateDisposition?: "auto-cleared" | "needs-human" | "blocked" | "none",

  // write lanes only — see § Evidence fields (write lanes)
  filesChanged?: string[],
  verificationCommand?: string,
  verificationExitCode?: number,

  // Reese's ac-verify dispatch only — see § `acVerdicts`
  acVerdicts?: [
    {
      id: string,
      criterion: string,
      verdict: "MET" | "UNMET" | "UNGRADEABLE",
      evidenceType: "executed" | "inspected" | "demonstrated",
      evidence: string,
      reason?: "ac-defect" | "harness" | "dead-reference" | "requires-human" | "converted"
    }
  ]
}
```

**Every dispatch carries the full six-value `verdict` enum**, including read-lane and review-lane dispatches. The optional fields are what vary by lane type; the enum never does. A review rung that cannot return `needs-fix` is forced to overstate (`needs-replan` / `blocked`) or understate (`done`) its findings — the exact defect that cost two adjudication rounds in the 2026-07-20 run.

**Why one literal block, not prose.** The prose form ("the report-back verdict shape, including the `needs-stronger-model` verdict") invited reconstruction: an authoring Sol read the named example, retyped a five-value set from memory, and dropped `needs-fix`. A copy-target removes the reconstruction step entirely.
~~~

Also update the doc's opening paragraph (line 3) to end with: `The literal schema a dispatch copies is in § Canonical dispatch schema — copy it, never retype it.`

Verify: `grep -c 'needs-fix' .prism/skills/prism-conductor/lib/report-back.md` returns `≥ 4` (verdict table, routing table, Reese routing row, schema block).

**2. Replace the schema prose in `claude.md` with a copy-verbatim citation.**

File: `.ai-skills/skills/prism-conductor/claude.md`, line 15. Replace the `schema` clause — currently reading `` `schema` (the report-back verdict shape, including the `needs-stronger-model` verdict per `lib/report-back.md` § Primary verdict — for write-phase dispatches, the schema also includes the evidence fields `filesChanged`, `verificationCommand`, `verificationExitCode` per `lib/report-back.md` § Evidence fields; for the `ac-verify` read-phase dispatch, the schema also includes `acVerdicts` per `lib/report-back.md` § Evidence fields) `` — with:

~~~
`schema` (copy the literal block at `.prism/skills/prism-conductor/lib/report-back.md` § Canonical dispatch schema verbatim — the full six-value `verdict` enum on every dispatch, plus the optional evidence / `acVerdicts` fields the lane type calls for; never retype the enum from memory)
~~~

Leave the rest of line 15 (`agentType`, `model`, `isolation`, `budget`) untouched.

Verify: `grep -n 'Canonical dispatch schema' .ai-skills/skills/prism-conductor/claude.md` returns exactly one hit, and `grep -c 'needs-stronger-model' .ai-skills/skills/prism-conductor/claude.md` returns `0` (the named-example enumeration is gone).

**3. Add the no-retype instruction to the dispatch step.**

File: `.prism/skills/prism-conductor/step-04-dispatch.md`. Append this paragraph to the end of the opening section — immediately after the first paragraph (the one ending `...and `budget` (the global dispatch cap).`) and before the `ac-verify` paragraph:

~~~markdown
**Copy the schema; do not author it.** The `schema` field on every `agent()` call is the literal block at `lib/report-back.md` § Canonical dispatch schema, copied verbatim. Do not narrow the `verdict` enum to the values a lane "should" need — the enum is the same six values on every dispatch, and a lane-narrowed enum makes the correct verdict unreturnable rather than merely unlikely. This is the 2026-07-20 defect: hand-authored segment schemas hardcoded a five-value enum without `needs-fix`, so Eric returned `needs-replan` on PR #420 and `blocked` on PR #421 while his own prose said the findings were clear-cut implementation fixes for Clove.
~~~

Verify: `grep -n 'Copy the schema; do not author it' .prism/skills/prism-conductor/step-04-dispatch.md` returns one hit.

**4. Wire Eric and Briar to `needs-fix` by name.**

Files: `.ai-skills/skills/prism-code-review-pr/shared.md` (§ `## When dispatched by Sol`, line 360) and `.ai-skills/skills/prism-code-review-self/shared.md` (§ `## When dispatched by Sol`, line 343).

In **both** files, append this paragraph after the existing single-sentence body of that section (identical text in both — these are parallel review rungs and the distinction they need is the same):

~~~markdown
**The review-rung verdict, spelled out.** Zero findings → `done`. Findings you recorded in `## Review Issues` that a competent implementer can fix without an architecture call → **`needs-fix`** (Sol routes them to Clove and re-dispatches you; the lane stays in the review phase). Reserve `needs-replan` for findings that mean the *plan* is wrong, and `blocked` for a lane you genuinely cannot review — a missing branch, a failed checkout, an absent PR. `needs-human` is for a finding that needs a human's call, not a hard one.

If the dispatch schema you were handed does not offer `needs-fix`, the schema is defective — return the closest verdict, and emit an `observation` signal naming the missing enum value so the run report surfaces it. Do not silently pick a verdict your own prose contradicts.
~~~

Verify: `grep -c 'needs-fix' .ai-skills/skills/prism-code-review-pr/shared.md .ai-skills/skills/prism-code-review-self/shared.md` returns `≥ 2` for each file.

**5. Add the verdict-enum parity test.**

New file: `scripts/ai-skills/verdict-enum-parity.test.ts`. Test discovery is filename-based (`scripts/ai-skills/run-tests.ts` globs `*.test.ts` via `node:fs`), so no registration step is needed. Model the file header and `repoRoot` resolution on `scripts/ai-skills/routing-coverage.test.ts:20-27`.

Assertions — read `.prism/skills/prism-conductor/lib/report-back.md` once and assert:

- **a.** The `## Primary verdict` table's first-column backticked values, in order, are exactly `["done","needs-fix","blocked","needs-replan","needs-stronger-model","needs-human"]`.
- **b.** The `## Canonical dispatch schema` fenced block contains a `verdict:` line whose quoted string literals are the **same set** as (a). Fail with a message naming any value present in one and missing from the other.
- **c.** Every verdict from (a) appears at least once in the `## Routing table (deterministic)` section — no verdict is defined but unrouted.
- **d.** `.ai-skills/skills/prism-conductor/claude.md` contains the substring `Canonical dispatch schema` and does **not** hardcode any `verdict` enum literal — assert no line matches `/'done'\s*,\s*'needs-/` or `/"done"\s*,\s*"needs-/`.

Verify: `pnpm prism:test` passes. Then confirm the test is load-bearing — temporarily delete `needs-fix` from the schema block, re-run, see assertion (b) fail with a named-value message, and restore.

**6. Add the reviewer plan-landing rule to `branch-plan.md`.**

File: `.prism/rules/branch-plan.md`. Insert a new `## Landing a plan-only commit` section immediately **after** `## 6. One Plan Per Ticket` (line 156) and **before** the `# Before Closing` heading (line 167).

Section body:

~~~markdown
## Landing a plan-only commit

A persona that writes plan content but does not own the branch's code lane — a reviewer, a diagnostician — lands its own plan-file commit: stage the plan file alone, commit it, push it. This is a narrow, machine-checkable exception to "authors ship, reviewers review" (`skill-routing.md` § Authors ship, reviewers review), and it is scoped by the *file set*, not by judgment: if the staged set contains anything other than the one plan file, the exception does not apply and the persona stops.

**Why:** a review record that exists only in a torn-down worktree is not a durable plan entry — it defeats `## Review Issues` and `## PR Readiness` as the ticket's working memory. In the 2026-07-20 run a reviewer's plan write was stranded three times (twice committed-but-unpushed, once uncommitted in a worktree) and needed manual conductor recovery each time. Making the conductor the lander was considered and rejected: it re-institutionalizes exactly the manual recovery that failed three times, and it leaves standalone (non-conducted) reviewer sessions with no landing path at all.

**How to apply:**

- Stage only the plan file: `git add <plan-path>`.
- Verify the staged set before committing: `git diff --cached --name-only` must print exactly that one path. Anything else — abort, leave the tree alone, and report the unexpected paths in chat.
- Commit with `chore: <persona> plan record for <ticket-id>` per `git-conventions.md` § Commit Messages.
- Push. From a worktree, use the full-ref form — `git push origin HEAD:refs/heads/<branch>` — per `worktree-mode.md` § Push from detached HEAD; a plain `git push origin HEAD` fails from detached HEAD.
- The exception covers the plan file only. It never extends to source, docs, config, or lockfiles — those stay the author's lane.
~~~

Verify: `grep -n 'Landing a plan-only commit' .prism/rules/branch-plan.md` returns one hit, and the section sits between line-6 (`## 6. One Plan Per Ticket`) and `# Before Closing` in `grep -n '^#' .prism/rules/branch-plan.md` output.

**7. Add the carve-out cross-reference to `skill-routing.md`.**

File: `.prism/rules/skill-routing.md`, § `## Authors ship, reviewers review` (line 80). Append one sentence to the end of that section:

~~~markdown
One narrow exception: a reviewer lands its own plan-only commit — staged set limited to the single plan file, verified mechanically — per `branch-plan.md` § Landing a plan-only commit. Everything else in a reviewer's tree stays the author's to ship.
~~~

Verify: `grep -n 'Landing a plan-only commit' .prism/rules/skill-routing.md` returns one hit. The two rules must not contradict — read both sections back-to-back after editing.

**8. Add the landing step to Briar's spec.**

File: `.ai-skills/skills/prism-code-review-self/shared.md`, § `## After completing the review — write to plan BEFORE chat summary`. The numbered list currently ends at item 7 (`Only after all plan sections are written...`). Renumber the current item 7 to item 8, and insert as the new item 7:

~~~markdown
7. **Land the plan commit.** Your plan write is not durable until it is pushed — a commit that lives only in a worktree dies at teardown. Stage the plan file alone (`git add <plan-path>`), then run `git diff --cached --name-only` and confirm it prints exactly that one path. If anything else appears, abort the commit, leave the tree untouched, and say so in the chat summary. Otherwise commit as `chore: Briar plan record for <ticket-id>` and push — full-ref form (`git push origin HEAD:refs/heads/<branch>`) when you are in a worktree, per [`worktree-mode.md`](../../references/worktree-mode.md) § Push from detached HEAD. This is the scoped exception in [`branch-plan.md`](../../../.prism/rules/branch-plan.md) § Landing a plan-only commit; it covers the plan file and nothing else. If the push fails, report the failure and the local commit SHA in the chat summary rather than retrying blind.
~~~

Also update § `## Definition of Done` (line 335): after `...is the final act before stopping.` add `The plan commit is staged, verified plan-file-only, committed, and pushed per § After completing the review item 7 — an unpushed review record does not count as written.`

Verify: `grep -n 'diff --cached --name-only' .ai-skills/skills/prism-code-review-self/shared.md` returns one hit; `grep -n 'Land the plan commit' .ai-skills/skills/prism-code-review-self/shared.md` returns one hit.

**9. Add Sol's deterministic post-review landing check (conductor lib + step-05).** Part of the #428 cluster; sequenced after task 8 (it ratifies the landing procedure task 8 establishes); independent of tasks 1–5 and 10–12.

This is the "Sol makes sure nothing gets left behind" half of #428. Briar lands her own plan-only commit (task 8); inside a Sol run, Sol deterministically verifies it landed and re-dispatches the reviewer if it did not. Sol's role is **read-only** — it never commits, pushes, or writes the plan. The check reuses the write-lane ratification pattern (`git diff --stat` → verification re-run) in a read-only form: instead of re-running a command, Sol compares the plan blob SHA on the branch before and after the review dispatch.

File A: `.prism/skills/prism-conductor/step-05-route.md`, § `### Deterministic ratification`. Insert a new paragraph immediately **after** the paragraph beginning `Before routing a write-lane `done`:` (the one ending `...**never trust the reported exit code**.`) and **before** the `Doer ≠ checker:` paragraph:

~~~markdown
Before routing a **review lane that writes plan content** (Briar self-review, Reese AC-verify — not Eric, whose findings land on the PR, not the plan): capture the plan blob SHA on the branch at dispatch time (`git rev-parse origin/<branch>:<plan-path>`, or note the file absent), and re-read it after the lane returns. An **unchanged** plan blob behind any review verdict means the reviewer's plan write did not land on the branch — re-dispatch the same reviewer to re-land (bounded by the step-07 strike budget); a landing failure that survives the budget parks the lane at `needs-human` with the reviewer's reported local commit SHA in `pendingHumanReport`. This is read-only evidence-checking, not plan-writing: Sol confirms *that* the write landed, never *what* it says — the same How-Sol-thinks-#3 invariant the write-lane `git diff --stat` check guards. Briar's own procedure (`branch-plan.md` § Landing a plan-only commit) owns the commit, the file-set safety check, and the push; Sol owns only the landing verification, so the file-set judgment that makes the carve-out safe never migrates to the orchestrator.
~~~

File B: `.prism/skills/prism-conductor/lib/report-back.md`, line 30. The sentence `Read-lanes (review, plan, QA-plan) are exempt — no files, nothing to ratify.` is now partially false — review lanes that write the plan land a plan-only commit. Replace that one sentence with:

~~~markdown
Read-lanes (review, plan, QA-plan) write no source files, so the write-lane ratification (diff + verification re-run) does not apply. One carve-out: review lanes that write plan content — Briar self-review and Reese AC-verify — land a plan-only commit per [`branch-plan.md`](../../../rules/branch-plan.md) § Landing a plan-only commit and get a lightweight **landing check** instead: Sol confirms the plan blob changed on the branch, and re-dispatches the reviewer if it did not (`step-05-route.md` § Deterministic ratification).
~~~

Both files are under `.prism/skills/prism-conductor/**` — canonical and unmirrored (surface map above), so this task produces no mirror churn.

Verify: `grep -n 'review lane that writes plan content' .prism/skills/prism-conductor/step-05-route.md` returns one hit and `grep -n 'landing check' .prism/skills/prism-conductor/lib/report-back.md` returns one hit; after task 11's `pnpm prism:build`, `git status --short` shows no `.claude/skills/prism-conductor/` paths.

**10. Confirm no contradiction in Briar's handoff prose.**

File: `.ai-skills/skills/prism-code-review-self/shared.md`, lines 399–410 (the "no PR yet → hand back to Clove/Eli to ship" block, and the `This preserves the "authors ship, reviewers review" separation` sentence at line 410). Read both after task 8 lands. If line 410's sentence reads as forbidding *any* Briar push, append to it: `The plan-only commit in § After completing the review item 7 is the one carve-out — it lands the review record, not the author's work.` Make no other change to that block; PR creation stays out of Briar's lane.

Verify: `pnpm prism:check` passes (includes `prism:crossref-lint`, which resolves the new cross-file links).

**11. Regenerate mirrors and run the full gate.**

Run, in order:

```
pnpm prism:build
git status --short
pnpm prism:check
```

`pnpm prism:build` regenerates `.claude/`, `.cursor/`, and `templates/install/.prism/` from the canonical `.prism/rules/` and `.ai-skills/skills/` edits — **mirrors are never hand-edited**. Expect `git status --short` to show generated changes under `.claude/rules/branch-plan.md`, `.claude/rules/skill-routing.md`, `.claude/skills/prism-code-review-self/SKILL.md`, `.claude/skills/prism-code-review-pr/SKILL.md`, `.claude/skills/prism-conductor/SKILL.md`, and their `.cursor/` and install-seed twins. `.prism/skills/prism-conductor/**` produces **no** mirror churn — it is outside `COPIED_CONTENT_AREAS`. If a mirror you did not expect changes, stop and investigate before committing.

### Eli (documentation)

**12. Fix the truncated verdict enum in the consumer conductor doc.** Runs after task 1 (it cites the new section); independent of tasks 2–11.

File: `docs/ai-skills/conductor.md`, line 44. The sentence currently reads `...returns one *primary verdict* (`done` · `blocked` · `needs-replan` · `needs-human`) that routes the lane...` — a **four**-value enum, missing both `needs-fix` and `needs-stronger-model`. This is the same reconstruct-from-memory failure as the dispatch schemas, on the consumer-facing surface: a reader who learns the enum here learns it wrong.

Replace the parenthetical with all six values in the canonical order, and add one clause naming the review-rung case:

~~~markdown
3. **Report-back — a primary verdict plus optional secondary signals.** Every dispatched persona writes to the plan and returns one *primary verdict* (`done` · `needs-fix` · `blocked` · `needs-replan` · `needs-stronger-model` · `needs-human`) that routes the lane, plus zero or more *secondary signals* (`found-bug` → Sasha, `found-followup-work` → Nora, `observation` → recorded) that each route independently. A review rung returns `needs-fix` when its findings are fixable in-loop — Sol routes them to the implementer and re-dispatches the same reviewer, keeping the lane in the review phase. One enum value can't carry both a completion and an incidental follow-up, so the verdict routes the lane while each signal routes on its own. The full table and the literal dispatch schema: [`lib/report-back.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/report-back.md).
~~~

Then sweep the rest of the file for any other verdict enumeration: `grep -n 'needs-replan\|needs-human\|needs-fix\|needs-stronger-model' docs/ai-skills/conductor.md` — every site that lists more than one verdict must list all six or none.

Verify: `grep -c 'needs-fix' docs/ai-skills/conductor.md` returns `≥ 2`, and `pnpm prism:check` passes.

Extend task 5's assertion (d) to cover this file: assert `docs/ai-skills/conductor.md` contains no verdict enumeration that includes `needs-replan` but omits `needs-fix`. This is the assertion that would have caught the drift, so it belongs in the test rather than in a reviewer's eye.

---

## Decisions

- **One literal schema block in `report-back.md` is the fix for #427 — not a new enum value, and not a JSON definition file.**
  - **Root cause:** `needs-fix` has always existed at `.prism/skills/prism-conductor/lib/report-back.md:14`, and line 61 names the review-rung case outright. The defect was that the Workflow dispatch schemas an overnight Sol authored by hand hardcoded a truncated five-value enum omitting `needs-fix`, so Eric could not return the correct verdict and returned `needs-replan` / `blocked` while his prose said "clear-cut implementation fixes, route to Clove."
  - **Alternatives considered:** (a) add a new enum value — rejected, the value already exists and adding a synonym would make the ambiguity worse; (b) put the enum in `.ai-skills/definitions/verdicts.json` and generate the doc from it — rejected, no code consumes it, so it creates a second source of truth whose only reader is a human copying from the *other* one; (c) leave the prose citation and add a warning — rejected, the prose form is what invited reconstruction in the first place.
  - **Chosen approach:** write the full schema once as a copy-target, remove the prose enumeration in `claude.md` that invited reconstruction, and guard the block against in-repo drift with a parity test. Beats (b) because the artifact Sol actually copies is the doc block; a JSON file Sol never reads adds a surface without removing one.
  - **Implementation guidance:** the enum is the same six values on **every** dispatch — the optional fields vary by lane type, the enum never does. Task 3's step-04 paragraph says this explicitly because "narrow the schema to what this lane needs" is the plausible-sounding instinct that produced the bug.
  - → promoted to `.prism/skills/prism-conductor/lib/report-back.md` § Canonical dispatch schema (the durable surface *is* the conductor lib doc; no separate architect-doc promotion needed).

- **The parity test guards drift inside the repo; it cannot catch a hand-typed runtime schema.**
  - Sol authors segment schemas at run time, so no static check sees the actual failure. What the test does buy: as the enum grows, the schema block and the verdict table cannot silently diverge — and the block is what every future Sol copies. Scoped deliberately narrow (four assertions, one file read) rather than grown into a general skill-doc linter.
  - → no promotion needed (test rationale lives in the test file's header comment, per the repo's existing test-doc convention).

- **Briar pushes plan-only commits; Sol does not become the lander (#428).**
  - **Root cause:** Briar's reasoning not to push is correct under "authors ship, reviewers review," but nothing then lands her plan write — three strandings in one run, one needing manual conductor recovery on PR #420.
  - **Alternatives considered:** Sol takes responsibility for landing reviewer plan commits.
  - **Chosen approach:** Briar lands it. Making Sol the lander re-institutionalizes the manual recovery that already failed three times, and it leaves standalone (non-conducted) Briar sessions with no landing path — Briar runs outside Sol far more often than inside it.
  - **Implementation guidance:** the exception is scoped by *file set*, not judgment — `git diff --cached --name-only` must print exactly the plan path or the persona aborts. That is what makes it a safe carve-out rather than a hole in the ship/review separation.
  - **Revisited 2026-07-22 (Hunter's "Sol makes sure nothing gets left behind" challenge):** the core holds — Briar still lands, Sol is still not the lander — but the verdict was *incomplete*, not wrong. It left a hole a deterministic Sol-side check now closes; see the reopened-#428 decision below.
  - → promoted to `.prism/rules/branch-plan.md` § Landing a plan-only commit.

- **The `branch-plan.md` rule is written by role; only Briar's spec implements it this ticket.**
  - The rule says "a persona that writes plan content but does not own the branch's code lane" rather than naming Briar, per `writing-voice.md` § Count rules, not numbers. Sasha fits the same criterion — she writes `## Debugged Issues` and can strand the same way — but her spec is out of scope here; that gap is emitted as follow-up work rather than absorbed. A rule stated by role with one implementing spec is honest; a rule that names one persona and silently leaves the sibling stranded is not.
  - → no promotion needed (the rule *is* the durable surface).

- **`.prism/skills/prism-conductor/**` is canonical and unmirrored; `.prism/rules/**` and `.ai-skills/skills/**` are canonical and mirrored.**
  - Verified against `scripts/ai-skills/build.ts:112` — `COPIED_CONTENT_AREAS` is `["rules","architect","spec","templates","references"]`; `skills` is absent. Mirrors under `.claude/`, `.cursor/`, and `templates/install/.prism/` are regenerated by `pnpm prism:build` and never hand-edited.
  - → no promotion needed (already documented in the build script's own JSDoc at `scripts/ai-skills/build.ts:107-111`).

- **The truncated enum is a pattern, not a single incident — the guard covers every enumeration site, not just the dispatch schema.**
  - Three independent sites reconstructed the verdict enum from memory and got it wrong or incomplete: the overnight run's hand-authored dispatch schemas (five values, no `needs-fix`), `claude.md`'s prose citation (names `needs-stronger-model` as the example, invites subsetting), and `docs/ai-skills/conductor.md:44` (four values, missing both `needs-fix` and `needs-stronger-model`). The consumer doc was already wrong before the run that surfaced #427, so this is drift with a history, not one bad night.
  - **Implementation guidance:** this is why task 5's assertion (d) checks for *subset* enumerations across files rather than only checking the schema block against the verdict table. Any file that lists more than one verdict lists all six or none — that is the rule the test encodes.
  - → no promotion needed (encoded as an executable assertion in `verdict-enum-parity.test.ts`, which outlives any prose statement of the same rule).

- **A/P/C gate: auto-cleared under the `internal` autonomy policy.**
  - **Stakes reasoning:** the change is spec-and-docs plus one new test file. No runtime code, no public API, no shared type, no consumer-observable behavior. The blast radius is `.prism/rules/`, `.prism/skills/prism-conductor/`, `.ai-skills/skills/`, one `scripts/ai-skills/*.test.ts`, and their generated mirrors — all reversible by revert with no migration. Both directional calls (`needs-fix` already exists → wiring not vocabulary; Briar lands her own plan commit → not Sol) were already made and reasoned in `.prism/plans/eval-backlog-triage.md`, so this plan implements a prior ruling rather than making a fresh one. Nothing here is the operator's call.
  - → no promotion needed (gate disposition is run-scoped, not a durable system decision).

- **Hunter's "#427 has been done" challenge — verified against the tree, the hardening is unbuilt; #427 is not closeable (Question A).**
  - **Root cause of the confusion:** the original issue's premise — "the enum has no value for implementation-level blocking findings" — is moot, because `needs-fix` has always existed (`report-back.md:14`). That is the grain of truth in "it's done": the *value* exists. But this plan reframed #427 to schema-**hardening**, and that work is entirely unbuilt in the tree right now (verified this session, not inferred): `report-back.md` has no `## Canonical dispatch schema` copy-target block; `.ai-skills/skills/prism-conductor/claude.md:15` still carries the reconstruction-inviting prose (`grep -c 'needs-fix'` → 0); `docs/ai-skills/conductor.md` still enumerates a truncated four-value enum, `done · blocked · needs-replan · needs-human`, missing both `needs-fix` and `needs-stronger-model` (`grep -c 'needs-fix'` → 0).
  - **Alternatives considered:** (a) close #427 as done because the enum value exists; (b) build the hardening.
  - **Chosen approach:** build. "It's been done" is false against the tree — three drift sites are still wrong at this moment. Deletion test on the copy-target block (task 1): if removed, every future Sol reconstructs the dispatch schema from the prose-plus-table form, which is exactly the run-time reconstruction that dropped `needs-fix` in the 2026-07-20 run — a failure no static check can catch, because Sol authors the schema at run time. The block is the only thing that removes the reconstruction step, so it earns its place. The recurrence (three independent wrong sites in one session) is the evidence the hardening matters, not gold-plating.
  - **Implementation guidance:** tasks 1–5 and 12 stand exactly as scoped; Question A changes no task. What closes #427 is landing those tasks, not a status flip.
  - → no promotion needed (the reconsideration is ticket-scoped; the durable content is the `report-back.md` § Canonical dispatch schema block that task 1 produces).

- **Reopened #428 under Hunter's "Sol makes sure nothing gets left behind" framing — option (a): Briar lands, and Sol deterministically ratifies the landing (Question B).**
  - **Root cause:** the prior verdict (Briar lands alone) is correct but *incomplete*. Inside a Sol run, if Briar's push fails silently — auth, network, a wrong detached-HEAD ref — nothing catches it and the lost-at-teardown failure recurs one level up. Task 8 already tells Briar to report the local commit SHA on push failure, but in a Sol run that report needed a router and had none. Hunter's framing spotted exactly this hole.
  - **Correcting Hunter's premise, partially:** #428 is *not* "only relevant when Sol is orchestrating." The severe lost-at-teardown form is worktree-specific (the Sol case, `isolation: 'worktree'`), but a standalone Briar on a shared checkout still leaves the write *uncommitted* — a handoff hazard per `git-conventions.md` § When to Commit. So Briar must land her own commit in **both** cases; only the Sol case has an orchestrator available to check it, which is why the check is Sol-side-only and Briar's landing procedure is universal.
  - **Alternatives considered:** (b) make Sol/the ratification stage the lander — rejected again, on a firmer basis than "three failed manual recoveries": doing so migrates the file-set safety check (staged set must be exactly the plan path or abort) out of Briar's deterministic procedure and into the orchestrator, re-creating the judgment step the carve-out was designed to eliminate, and it still strands standalone Briar. (c) prior verdict unchanged — rejected because it leaves the silent-push-failure hole open.
  - **Chosen approach:** option (a). Briar always lands her own plan-only commit (tasks 6/7/8/10 unchanged); inside a Sol run, Sol runs a **read-only** deterministic landing check — the plan blob SHA on the branch must differ from the pre-dispatch baseline; if unchanged, the reviewer's write did not land → re-dispatch the reviewer to re-land (strike-budget-bounded), park at `needs-human` if it survives. This escapes the "manual recovery that failed three times" objection cleanly because it is a *deterministic* check — the exact ratification pattern Sol already runs on write lanes (`git diff --stat`) — not manual worktree inspection plus hand-push. Sol never commits, pushes, or writes the plan; it confirms *that* the write landed, never *what* it says.
  - **Implementation guidance:** new **task 9** edits `step-05-route.md` § Deterministic ratification (adds the review-lane landing check) and `report-back.md:30` (amends the now-partially-false "read-lanes are exempt — no files" claim). Both files are canonical and unmirrored, so the check adds no mirror churn — AC-8 still holds. The check is persona-agnostic by construction (a blob-SHA diff), so it covers Briar self-review and Reese AC-verify uniformly without per-persona code; Eric is out of scope because his findings land on the PR, not the plan.
  - → promoted to `.prism/skills/prism-conductor/step-05-route.md` § Deterministic ratification.

---

## Sessions

- 2026-07-21 [main] open: Intent — merge #427 and #428 into one implementable plan that makes the dispatch schema uncopyable-wrong and gives Briar's plan commits a landing path; Bounds — write `.prism/plans/followup-427-428-verdict-wiring.md` only, no code, no branch, no commit, no tracker writes; Approach — one copy-target schema block plus a parity test for #427, a role-stated rule plus a file-set-scoped procedure for #428 · close: scope held
- 2026-07-22 [main] open: Intent — reconcile the merged plan against two operator challenges (is #427 done? should Sol ensure Briar's plan-writes land?); Bounds — this plan file only, no code, no build, no tracker writes; Approach — verify both premises against the tree, then adjust tasks/decisions/AC · close: scope held — Question A confirmed unbuilt (three drift sites still live), Question B resolved to option (a) adding one conductor task

---

## History

- 2026-07-21 [main]: Winston merged issues #427 and #428 into this plan under a Sol dispatch. Corrected #427's filed premise — `needs-fix` already existed in the verdict enum; the defect was hand-authored dispatch schemas truncating it — and scoped the remaining work to a single copy-verbatim schema block, reviewer-side wiring, and a parity test. See Decisions.
- 2026-07-22 [main]: Winston reconciled the plan against two operator challenges under a Sol dispatch. Question A — verified against the tree that the hardening is unbuilt (three drift sites still live), so #427 is not closeable; tasks unchanged. Question B — resolved to option (a): Briar still lands her own plan commit, and new task 9 adds a read-only Sol-side deterministic landing check, closing the silent-push-failure hole the prior verdict left open. See Decisions.

---

## Debugged Issues

None — no debugger session ran on this work.

---

## Review Issues

None yet.

---

## Acceptance Criteria

Verified by the developer. Every criterion carries a stable ID and a falsifiable Evidence sub-bullet.

### Behavioral

- [ ] **AC-1** — Given a Sol authoring an autonomous segment, When it reaches the `schema` field of an `agent()` call, Then the instruction it reads is to copy a named literal block verbatim, with no prose enumeration of any subset of verdict values anywhere in its path.
  - Evidence (`machine`): `grep -n 'Canonical dispatch schema' .ai-skills/skills/prism-conductor/claude.md .prism/skills/prism-conductor/step-04-dispatch.md` returns a hit in both files, and `grep -c 'needs-stronger-model' .ai-skills/skills/prism-conductor/claude.md` returns `0`.

- [ ] **AC-2** — Given the canonical dispatch schema block, When its `verdict` enum is compared against the `## Primary verdict` table, Then the two sets are identical and both contain `needs-fix`.
  - Evidence (`machine`): `pnpm prism:test` passes, including `verdict-enum-parity.test.ts` assertions (a) and (b).

- [ ] **AC-3** — Given a review-rung persona dispatched by Sol that recorded fixable findings in `## Review Issues`, When it reads its own `## When dispatched by Sol` section, Then that section names `needs-fix` as the verdict for that case and distinguishes it from `needs-replan` and `blocked` without requiring the persona to open another file.
  - Evidence (`human`): read § `## When dispatched by Sol` in both `.ai-skills/skills/prism-code-review-pr/shared.md` and `.ai-skills/skills/prism-code-review-self/shared.md`; confirm the four-verdict distinction is stated in place.

- [ ] **AC-4** — Given Briar has finished a review and written her findings to the plan, When she completes the run, Then her spec directs her to stage the plan file alone, mechanically verify the staged set contains only that path, commit, and push — including the full-ref push form for a worktree.
  - Evidence (`human`): read § `## After completing the review` item 7 in `.ai-skills/skills/prism-code-review-self/shared.md`; confirm all four steps and the worktree full-ref form are present.

- [ ] **AC-5** — Given a reader following "authors ship, reviewers review" in `skill-routing.md`, When they reach the reviewer-push question, Then the rule points them at the scoped exception rather than reading as a blanket prohibition.
  - Evidence (`human`): read `.prism/rules/skill-routing.md` § Authors ship, reviewers review and `.prism/rules/branch-plan.md` § Landing a plan-only commit back to back; confirm no contradiction.

- [ ] **AC-10** — Given a plan-writing review lane (Briar self-review or Reese AC-verify) dispatched inside a Sol run, When the lane returns and Sol ratifies before routing, Then Sol confirms the plan blob changed on the branch and re-dispatches the reviewer if it did not — read-only, never committing or writing the plan itself.
  - Evidence (`human`): read `.prism/skills/prism-conductor/step-05-route.md` § Deterministic ratification and `.prism/skills/prism-conductor/lib/report-back.md` line 30; confirm the review-lane landing check (blob-SHA-unchanged → re-dispatch, strike-budget-bounded, park at `needs-human`) is specified in step-05 and cross-referenced from report-back.md, and that Eric is excluded (findings land on the PR, not the plan).

- [ ] **AC-6** — Given the verdict enum block is edited to drop a value, When the test suite runs, Then it fails with a message naming the missing value.
  - Evidence (`machine`): temporarily remove `needs-fix` from the schema block, run `pnpm prism:test`, observe assertion (b) fail naming `needs-fix`, restore the block, re-run and observe green.

- [ ] **AC-9** — Given a reader learning the report-back contract from the consumer docs, When they read the primary-verdict enumeration in `docs/ai-skills/conductor.md`, Then it lists all six verdicts including `needs-fix`, and no other enumeration in that file lists a strict subset.
  - Evidence (`machine`): `pnpm prism:test` passes, including `verdict-enum-parity.test.ts` assertion (d) extended to `docs/ai-skills/conductor.md`; and `grep -c 'needs-fix' docs/ai-skills/conductor.md` returns `≥ 2`.

### Non-behavioral

- [ ] **AC-7** — All generated mirrors are regenerated by `pnpm prism:build`; no mirror file under `.claude/`, `.cursor/`, or `templates/install/.prism/` is hand-edited in this change.
  - Evidence (`machine`): `pnpm prism:build` then `pnpm prism:check` both exit `0`; `git diff --stat` shows every mirror change accompanied by its canonical-source change.

- [ ] **AC-8** — No file under `.prism/skills/prism-conductor/` produces mirror churn (that tree is outside `COPIED_CONTENT_AREAS`).
  - Evidence (`machine`): after `pnpm prism:build`, `git status --short` lists no `.claude/skills/prism-conductor/lib/` or `.claude/skills/prism-conductor/step-*` paths.

### AC Adjustments

None.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-21 | Winston | Authored AC from merged #427/#428 | created | not synced (dispatch bounds forbid tracker writes) |
| 2026-07-22 | Winston | Added AC-10 for the Sol-side deterministic landing check (Question B reconciliation) | updated | not synced (dispatch bounds forbid tracker writes) |

---

## Cleanup Items

None identified.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as` (applies to `verdict-enum-parity.test.ts` only)
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases — `verdict-enum-parity.test.ts` present and proven load-bearing per AC-6
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — `pnpm prism:build` then `pnpm prism:check`, last run: not yet
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-07-21
