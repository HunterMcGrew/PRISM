# Evidence: Opus-5 retune, skill slimming, and hooks — collected 2026-08-13

Source material for a PRISM port. Three sweeps: thrive PRs #2240–2326, the
`~/Documents/portable-skills` roster, and thrive's live hook system.

Companion to [`.prism/plans/thrive-port.md`](../plans/thrive-port.md), which triaged thrive
PRs #2192–2239 on 2026-07-30. That triage is not repeated here. Its build status: PR A is
[#449](https://github.com/HunterMcGrew/PRISM/pull/449), still open and unmerged; PRs B–H were
never started.

---

## 1. Thrive PRs — the Opus-5 series

The load-bearing PR is **#2273**, the diagnosis. Everything else in this section is its
remedy, split for reviewability.

| PR | State | What it is |
| --- | --- | --- |
| #2273 | closed (split) | Diagnosis: the always-on rule layer causes scope creep on Opus 5 |
| #2276 | merged | The fix — condition-gated rule phrasing replaces license phrasing |
| #2277 | merged | Build-time partials so a shared block lives in one file |
| #2278 | merged | Pinned review range + named angle sweep for the two reviewer personas |
| #2275 | closed | Routing-hint hook — injects a persona hint at prompt time |
| #2296 | merged | Stop pinning a heavyweight output style repo-wide |
| #2259 | merged | Subagent delegation tiebreaker |

### #2273 — the measurement

~50 controlled runs, counting out-of-scope files touched:

| Config | Out-of-scope files touched |
| --- | --- |
| No project config loaded | 0 |
| Full always-on rule set loaded | 2 / 1 / 2 |
| Full rule set, previous model generation | 0 / 0 / 0 |

Two named root causes. Rules phrased as a **license to reshape** rather than gated on a
firing condition — Opus 5 follows instructions more literally than prior models, so
license-language that earlier models safely ignored now gets executed. And persona routing
that depends on a table the model often never reaches.

`Demand Elegance` is named as an offending rule. PRISM ships `.prism/rules/demand-elegance.md`
as `load: always`.

### #2276 — the remedy

Rewrites the offending rules to lead with the **firing condition** instead of a blanket
license. Touched `code-standards.md`, `working-principles.md`, `session-orientation.md`, three
ADRs, `AGENTS.md`, and `CLAUDE.md`.

### #2275 — the routing-hint hook (closed, but measured)

A prompt-time hook that matches the incoming prompt against a persona-routing table and
injects a one-sentence hint. Written because the routing table sat "thousands of words back"
in the prompt, and vague imperatives ("fix this") rarely matched it verbatim.

Measured: runs where a persona hint fired touched **8–9 relevant files**; the run with no
persona hint touched **3 files** and shipped a fix that was invisible on the live site.

PRISM's `skill-routing.md` is the same buried-table shape this hook was written to replace.

### #2296 — the output-style lever

Removed `"outputStyle": "Scannable"` from the committed `.claude/settings.json`. It had been
force-loading a ~4,000-word output style on every request, for every clone.

### #2259 — the delegation tiebreaker

Adds one sentence to the subagent rule: **"when unsure whether work is delegation-shaped, do
it yourself."** The motivating incident happened *in PRISM* — an architect persona fanned out
to two research subagents for a task it should have read inline, stalling on ~250k wasted
subagent tokens with no plan file written.

PRISM's `subagent-strategy.md` currently says the opposite: "when you're unsure whether to
spend the compute, spend it."

---

## 2. Thrive PRs — hooks

| PR | State | What it is |
| --- | --- | --- |
| #2261 | merged | The original architect-context hooks — PostToolUse nag + PreToolUse deny |
| #2262 | merged | Generalized to Codex and Cursor via a `HARNESSES` dispatch table |
| #2280 | merged | Generate skill projections locally via git hooks; drop 190 generated files from VCS |

**#2261's own measurement:** with the hook, the same task read more of the relevant architect
docs, used ~25k more context tokens, and finished **~45s faster with a better answer**.

**#2280** removed 190 generated per-harness files from version control and regenerates them
via `post-merge` / `post-rewrite` / `post-checkout`. Fails open — writes a
`.skills-sync-failed` marker rather than blocking.

---

## 3. Thrive PRs — rules, templates, governance

| PR | State | What it is |
| --- | --- | --- |
| #2268 | merged | Three-question evidence gate for unreported findings |
| #2260 | merged | "An overflowing container is the signal to cut" — **already ported** via PRISM #455 |
| #2242 | merged | Ticket templates rewritten scannable; one severity vocabulary |
| #2267 | merged | AC sync preserves QA checkbox state; all write paths centralized |
| #2269 | merged | Restored a sub-rule silently lost across two rules-reorg migrations |
| #2247 / #2249 | open | Zoe audit rounds — 86 lessons → 24 via nine rule promotions; 37 of 96 plans archived; 79 worktrees cleared |
| #2299 | merged | Evidential-bleed anti-pattern + a shape pass in doc review |
| #2303 | merged | `EnterWorktree` must receive a convention-matching branch name |
| #2313 | merged | Session-leak phrasing swept from five block docs |
| #2314 | merged | Results-and-safety metrics doc refresh |
| #2316 | merged | Manifest-routing pattern: path glob → architect doc auto-loaded |
| #2321 / #2322 | open | A persona packaged as an installable Claude Code plugin |

**#2268's gate** — three questions before a pattern-matched finding is reported at all: Is the
state reachable? Is the behavior intentional? What would changing it cost?

**#2299's evidential bleed** — human-facing pages that accumulate citations, version numbers,
and test paths to *defend* a claim to an agent rather than *teach* a human how the system
works. Paired with a "shape pass" added to doc review alongside the accuracy checks.

**#2321/#2322** — `.claude-plugin/marketplace.json` plus a `bin/` PATH wrapper and a sync
transform keeping the bundled copy aligned with the dev source. A different distribution
mechanism than PRISM's npm render.

---

## 4. Portable-skills — the slimming doctrine

Sources: `SLIMMING-GUIDE.md` (447 lines, 11 parts), `.slim-calibration.md` (74 lines),
`ROSTER-AUDIT.md` (244 lines). Every rule carries an evidence tag — `[measured]`,
`[Anthropic]`, or `[inferred]`. Treat `[inferred]` as hypothesis.

### The census against PRISM

| Pattern | PRISM `.ai-skills/skills/*/shared.md` | portable-skills |
| --- | ---: | ---: |
| Definition-of-Done blocks | 28 | 1 |
| `## The run, in order` | 26 | 0 |
| `**Trigger:**` occurrences | 170 | 12 |
| Closing Re-Orientation Battery | 31 | 0 |
| Skills citing a shared core | 0 | 27 |
| winston / prism-architect | 405 lines | 135 |
| clove / prism-code-dev | 392 lines | 188 |
| sasha / prism-debugger | 418 lines | 325 |

PRISM's always-on rule layer, measured 2026-08-13: **20 rules, 1,639 lines, ~19,000 words**
loaded before any work starts.

### Rule 1 — replace prescribed read sequences with the facts required `[measured]`

The highest-leverage change. Winston's fixed startup batch became exit-condition questions.
Same skill, one section changed:

| | Prescribed reads | Exit conditions |
| --- | ---: | ---: |
| External research calls | 0 | 17 |
| Chat words | 1,856 | 917 |
| Dependency coverage | 8 prose mentions / 18 tasks | 14 / 14 explicit |

The mechanism, verbatim: *"A prescribed read batch doesn't suppress the rule — it suppresses
the rule's trigger condition. The model never forms an external-system claim, because the
reads never surface a question the repo can't answer."*

**The trap:** *"'Four questions' is not the mechanism."* The Opening Orientation Battery is
already four questions and produces zero research, because its questions are about the
*request*. Winston's worked because one question was about constraints originating **outside
the repo**. Rewrite an orientation section without an outside-facing question and you have
changed the shape while keeping the problem.

Closing move: *"An unanswerable question is a task, not an assumption."*

### Rule 2 — delete Definition of Done checklists `[Anthropic]`

Quoted guidance: explicit verification instructions ("include a final verification step for
any non-trivial task," "use a subagent to verify") cause **over-verification on Opus 5**;
removing them reduces wasted tokens with no loss in quality.

26 of 30 skills carried one — 4,740 words. Grep beyond the header for `before declaring
done`, `before presenting`, `re-verify`. Keep the one line naming the deliverable; the
checkbox list under it goes.

### Rule 4 — control verbosity with one instruction, not with skill size `[measured]`

Holding a fat Winston fixed and changing **only** the output style moved chat output
1,114 → 2,372 words, **+113%** — more than twice what the entire slim-vs-fat redesign moved
(~500 words). Order of operations: **freeze the output style before measuring any slimming
work.**

### Rule 8 — cut the personality essay, keep the voice `[measured]`

~700 words of personality plus a ~1,300-word Cognitive Approach block (four lenses, each with
a Trigger and an Escape) was 30% of the file. *"The essay wasn't load-bearing; the voice is."*
Two of four lenses survive as one sentence each. *"Keep the discriminator, cut the elaboration
around it."*

### The other four rules

- **Rule 3** — cut every restatement. Test: search a phrase from any instruction; more than
  one hit outside a cross-reference means one goes.
- **Rule 5** — collapse output templates. *"Sections that get conditionally omitted anyway
  are paying rent in every invocation to appear in some."*
- **Rule 6** — don't tell a reviewer to be selective. *"The fix for a noisy reviewer is a
  filter pass, not a quieter reviewer."*
- **Rule 7** — cap subagent delegation; already done, keep it.

### Measured outcome

| | Projected | Measured |
| --- | ---: | ---: |
| Roster total words | ~45,000 (−62%) | ~102,000 (−16%) |
| Typical load per invocation | — | 6,441 → 4,896 (−24%) |

Per-skill range 3% (zoe) to 79% (winston). The 79% Winston figure is declared unrepresentative
— its bulk was personality prose, an 11-section template, and a checklist, all near-fully
compressible.

**The word figure is an expectation, never a gate.** Nine skills landed at 16–38% against
expectations near 60%. *"If the keep-list and the number conflict, the keep-list wins and you
report the conflict. Never cut protected content to hit a number."*

### Where cut content goes

Delete (most cuts) → the shared core (anything true for every persona) → `references/` under
the skill (*"a mode that fires on one invocation in twenty is paying full price on the other
nineteen"*) → extract as its own skill.

### What was kept, and why

Output templates. Typed contracts — *"something downstream parses it; prose flexibility here
is a bug."* The plan gate, run-control state files, pinned review ranges. Calibration reads
that already say what they're for — *"a read instruction paired with the fact it establishes
is rule 1 done right."* **Escape conditions** — *"these aren't verification; they're
routing."* And the `description` frontmatter, never slimmed: *"slimming a body is fine;
slimming a description costs invocations."*

---

## 5. Portable-skills — the shared substrate

`skills/_shared/`, seven files, ~5,500 words. PRISM has no equivalent — zero of its 31 skills
cite a shared core.

| File | Lines | Read by |
| --- | ---: | --- |
| `core.md` | 134 | every persona, as Step 0 before greeting |
| `review-angles.md` | 196 | briar + eric |
| `strategy-doc.md` | 67 | the nine business personas |
| `review-exhaustiveness.md` | 32 | briar, eric, review-loop |
| `verification.md` | 26 | grading personas |
| `worktree-safety.md` | 17 | clove, eric, sol, zoe |
| `ac-verdicts.md` | 16 | eric, iris, reese, sol |

Every persona carries an identical block: *"Step 0, before greeting: read `_shared/core.md`
from the same skills root as this skill."* Never a literal profile path — a `--check`
violation enforces this.

Three architectural rules. **One core, not two** — splitting a ~1,500-word core to save 116
words per invocation costs a maintenance surface the repo has already been burned by. **Single
shape-owner** — quote a fragment, never restate it, because *"the roster's history shows
quoted contracts fork."* **Single-owner content lives with its owner** — retros, audits,
design, conductor paths moved out of core into iris, zoe, pixel, sol.

A persona that overrides a core section writes a one-line stub under the core's heading name,
not a restatement. The sanctioned place to *modify* a core section is a `Persona notes on the
shared core:` sub-list.

---

## 6. Portable-skills — what's new

**`skills/tdd/`** (67 lines) — persona-less reference. Three anti-patterns *with their tells*:
implementation-coupled (a refactor breaks the test though behavior didn't change),
tautological (the assertion recomputes the expected value the same way the code does),
horizontal slicing (all tests written, then all implementation). Refactoring is explicitly not
part of the loop.

**`skills/devils-advocate/`** (67 lines) — extracted from winston's inline section; the
standalone is better than the inline one. Four passes, a typed verdict, and an applicability
test: *"does this artifact commit to a decision before the evidence exists?"* Deliberately has
no name or personality — *"a named character with quirks is an invitation to perform
skepticism."*

**`_shared/verification.md`** — "Checks that cannot fail." Six rules, the most transferable
non-slimming content in the repo: emit your own cardinality; ship the positive control inside
the check; a check deriving its expectation from the thing under test proves agreement, not
correctness; **a control is written against the failure, not against the fix**; a control
suite's denominator is the properties the thing claims, not the guards it happens to have; a
criterion the implementation fell short of is never reworded down.

**`_shared/review-angles.md`** — nine angles, a three-token status vocabulary (`swept` /
`n/a — <reason>` / `not reached — <reason>`), mandatory per-angle enumeration with a named
unit, and a **verdict cap**: a bounded angle forbids an unqualified ready state.

**Briar's file-slice fan-out** — fan out by file-surface slice (~5 related files grouped by
module affinity, never alphabetically), **not by angle**, plus one cross-cutting subagent per
pass. An angle reads `swept` only when every slice with surface for it reported `swept`; the
enumeration is the **union**, not the longest.

**The two-projection build** — one source, two derived surfaces, neither hand-editable.
`render-agents.py` inlines everything into Codex TOML (no filesystem to resolve a pointer
against). `render-claude-agents.py` emits shims, because inlining would double-install each
persona and let copies drift. Eight `--check` violation classes, each with a positive control.

**The persona-declaration gate** — a skill whose first body line isn't `You are **Name**
(pronouns),` gets no TOML and no agent shim *by construction*, rather than by a maintained
exclusion list.

---

## 7. Cautions — things tried and reversed

Do not re-port these deletions. They were briefed as cuts and refused, or deleted and
restored:

- `core.md § Context budget` — kept.
- `core.md § Opening Orientation Battery` — kept. Four questions about the *request*; not a
  prescribed sequence, not a verification checklist.
- `briar § Diff-only reading` — kept, condensed to one line.
- `core.md § Servers and long-lived processes`, winston's `## Closing ceremony`, winston's
  `## Dispatched runs`, winston's evidence-format gradeability bar — deleted, then restored
  compressed. **All four were found by a reviewer, not by the slimming pass.**

Three questions to run before any deletion: Does anything else *say* this, written, where the
reader arrives — not "could the model infer it"? Does the evidence measure the right surface?
Is the proposed repair "repoint the citers" — because that means N copies of a single-owner
procedure, and you should restore instead.

### Stale rows inside the source docs

`SLIMMING-GUIDE.md` Part 2's `Closing Ceremony Mode | Deleted` row records a deletion the run
reversed; Part 8 supersedes it. `ROSTER-AUDIT.md`'s `Servers and long-lived processes |
DELETE — zero dependents` is likewise reversed and the section is live today.
`.slim-calibration.md` states flatly that `ROSTER-AUDIT.md` is context only and **its line
anchors are never to be trusted**.

### Unresolved

**The control-vs-slim experiment never ran.** A no-skill control produced 801 chat words, 18
tasks, and 15 verification commands — matching or beating *both* Winston versions on detail at
a third of the output, and it did research the skills didn't. Its one durable weakness was
task sequencing (2 markers vs 7–8). What a skill adds over the always-on rules remains
unmeasured, and the roster was rewritten anyway on an explicit call.

**Reviewer recall is a measured lower bound.** The 2026-08-10 bake-off had Briar recall **3 of
7** applicable defects *while fully complying* with the nine-angle battery — it emitted the
coverage block and reported `swept` on the angle a missed defect sat in. A defect class both
reviewers missed leaves no trace in either reviewer's output.

**Skills-vs-subagents precedence is vendor-owned.** The skills half is experiment-verified;
the agents half is verified only by reading the shipped binary's dedupe logic. Both can change
on any Claude Code release.

### Rejected designs

A second (business) core. Splitting reese's AC verification. Giving devils-advocate a
personality. A citation length floor — tried and failed twice. A narrow same-file-only
citation resolver — 59 false positives. **`scannable.md` as a default output style** — its
"don't announce what you're about to do" line contradicts the global CLAUDE.md instruction to
narrate before the first tool call, and it is almost entirely negative instruction.

---

## 8. Thrive's hook system

Five agent hooks live. PRISM runs one.

| Hook | Event / matcher | Thrive | PRISM |
| --- | --- | :-: | :-: |
| architect-context nag | PostToolUse / `Read\|Write\|Edit\|Bash` | yes | yes |
| architect-context authoring gate | PreToolUse / `Write\|Edit\|Bash` | yes | no |
| shell-write reroute | PreToolUse / `Bash` | yes | no |
| compact dedup reset | PreCompact | yes | no |
| git guard | PreToolUse / `Bash` | yes | no |
| worktree node_modules guard | PreToolUse / `Bash` | yes | no |
| skills-sync | SessionStart | yes | no |

### The PreCompact hook is not a checkpoint writer

`.claude/hooks/compact-checkpoint.mjs` deletes the architect-context dedup state file so docs
re-nag after compaction — compaction can drop the conversation history that made a doc "read",
and leaving the state intact silences that doc permanently. It writes no summary. With no
`session_id` in the payload it falls back to an age sweep of state files older than 12h.

The write-a-summary behavior thrive keeps as a *rule*, and its ADR-0008 is explicitly not
about this hook. PRISM's `pre-compaction-checkpoint.md` is the same rule-level thing.

### The plan-file / architect-file guard

Not a separate hook — the `PreToolUse` arm of `hook.mjs`, driven by an `"authoring"` section
in `manifest.json` covering `plans/**`, `architect/**`, `rules/**`, `adrs/**`, `references/**`,
`skills/**`, `output-styles/**`, `hooks/**`.

It **denies the write** until the prerequisite docs are read:

> You're editing `<path>`, an instruction-layer file — read these in full first, then retry:
> `<docs>`.

Only the `write` kind can be denied — reads and searches stay open, or the remedy would be
unperformable. No session id means it never denies. A deny never writes dedup state.

The **shell-write reroute** covers `>`, `>>`, `tee`/`tee -a`, and `sed -i` targeting an
authoring path, with a remedy that judges no prerequisites at all so it can never be
unsatisfiable:

> You're writing to `<path>`, an instruction-layer file, via a shell write — redo this edit
> with your file-edit tool so the authoring gate can check its prerequisites.

Named parsing gaps, deliberately open: word-prefixed redirects (`echo hello>f`), `python -c`,
`cp`/`mv`/`dd`.

### The harness abstraction

One module-level `HARNESSES` table keyed by `--tool`, plus `resolveToolKind`. Tool-kind
vocabulary: `read` (the only kind that credits), `write` (the only kind the gate can deny),
`shell` (token extraction, never credits), `search` (code routes only). An unlisted tool name
resolves to `write` deliberately — an allowlist runs one short of the next tool a vendor ships.

| | Claude Code | Codex | Cursor |
| --- | --- | --- | --- |
| Registration | `.claude/settings.json` | `.codex/hooks.json` | `.cursor/hooks.json` |
| Event names | `PreToolUse` / `PostToolUse` / `PreCompact` | `PostToolUse` | `preToolUse` / `postToolUse` |
| Session key | `session_id` | `session_id` | `conversation_id` |
| Nag envelope | `hookSpecificOutput.additionalContext` | same | `additional_context` |
| Deny envelope | `permissionDecision` + `permissionDecisionReason` | same | `permission` + `user_message` + `agent_message` |
| Nothing to say | no stdout | no stdout | `{}` |
| Matcher support | yes | yes | **no** |

Cursor executes `.claude/settings.json` hooks alongside its own when third-party configs are
enabled, so a **foreign-payload guard** drops a Cursor event name arriving on the claude row.

### Seven design invariants

1. Fail open everywhere. Never a non-zero exit from a context hook. **No `process.exit()`** —
   it truncates pending stdout writes.
2. Ship a **pointer** (doc paths), never doc content. Measured 299KB emitted / 10KB landed;
   `additionalContext` is capped around 2KB. Pointers make every vendor's cap irrelevant by
   construction.
3. Credit on **observed read**, never on "we sent an instruction." A partial read
   (offset/limit) credits nothing.
4. Every safety check lives in the script, never in a registration matcher — a matcher-less
   harness silently inherits nothing.
5. A gate's tests need three legs: the deny fires, seeded state clears it, **and a live remedy
   performed through the gate clears it.** They shipped an unsatisfiable gate that passed
   70/70 tests.
6. Harness-specific field names live only inside the table, enforced by a row-boundary grep
   test over everything below it.
7. Deny only what you can parse; where you can't, **reroute** to a surface that can.

### The delivery blocker

Thrive's hook is a **zero-dependency `.mjs`** — plain Node, no package manager, no build step.
PRISM's is TypeScript invoked as
`"$CLAUDE_PROJECT_DIR/node_modules/.bin/tsx" .../claude-post-read.ts`.

A consumer install has no `node_modules` and no `tsx`. That is why
`templates/install/.claude/settings.json` is `{}` and consumers receive zero hooks. Porting
hook *logic* does not close this; converting to zero-dependency `.mjs` does.

### Tests

Thrive's `test-inject-architect-context.sh` is 1,286 lines / ~115 cases, zero-dependency bash.
Two cases run against the repo's **live manifest**, so a manifest edit that breaks routing
fails there. None of the three hook test runners is wired into CI.

---

## 9. Port-relevant deltas, consolidated

What PRISM has that the evidence says is actively costly:

- 1,639 lines / ~19,000 words of `load: always` rules — the layer #2273 measured as the source
  of Opus-5 scope creep.
- `demand-elegance.md`, `load: always` — the rule class #2273 names by example.
- `subagent-strategy.md` saying "when unsure, spend it" — the inverse of #2259's tiebreaker,
  which was written about a PRISM incident.
- `verification-before-done.md`, `load: always` — the instruction class Anthropic names as an
  over-verification trigger. PR [#449](https://github.com/HunterMcGrew/PRISM/pull/449) already
  drafts the amendment and has not merged.
- 28 Definition-of-Done blocks, 26 `## The run, in order` sections, 170 `**Trigger:**`
  occurrences, 31 Closing Re-Orientation Batteries across the skill bodies.

What PRISM lacks:

- A shared core. Zero of 31 skills cite one; the substrate is restated per persona.
- The PreToolUse authoring gate, the shell-write reroute, the PreCompact reset, and the
  SessionStart sync.
- A zero-dependency hook runtime, without which no hook reaches a consumer.
- Prompt-time persona routing (#2275) — its routing table is the same buried shape.
- `tdd` and `devils-advocate` as skills.
- A build-time partials mechanism (#2277) or its `_shared/` equivalent.
