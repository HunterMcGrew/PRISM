# Plan: PRISM-477

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/477 — "Hook-based enforcement is Claude-only — no hooks fire under Codex, and the gap is silent"

## Goal

Decide and record PRISM's portability posture for hook-dependent enforcement, and make the Claude-only reach visible to a Codex or Cursor adopter before they rely on it.

---

## User Stories

Not applicable — this is a spec-and-docs ticket with no end-user feature.

---

## Design

Not applicable — no UI.

---

## Implementation Tasks

Every task below writes to a path the architect write gate routes. The gate denies the edit until the route's docs have been read through a flagless `cat` or a rangeless `Read`; each task names the exact clearing commands. Read them once per agent — credit is per-agent, not per-task, so tasks sharing a route clear together.

### Clove (implementation)

1. **Write ADR-0074 at `.prism/spec/adrs/_toolkit/0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md`** (new file). Renumbered from the plan's original 0073 — PRISM-476 landed 0073 in parallel; see `## Decisions`.

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/spec-editing.md
   cat .prism/architect/guides/writing-an-adr.md
   ```

   Frontmatter, exactly:

   ```
   ---
   Number: 0074
   Title: Hook-Dependent Enforcement Reaches Claude Code Only; the Fallback Everywhere Else Is Always-On Prose
   Status: accepted
   Date: <the date you write it, YYYY-MM-DD>
   ---
   ```

   Three sections, per `.prism/architect/guides/writing-an-adr.md`. Content is specified below — write the prose, do not invent the claims.

   **`## Context`** carries four things:

   - **The inventory, corrected.** PRISM ships exactly three hook-registered behaviors on `main`, all from `scripts/ai-skills/hooks/` and all registered in `templates/install/.claude/settings.json`: the `PostToolUse` announce layer on `Read|Grep|Bash` (ADR-0071), the `PreToolUse` write gate on `Write|Edit|Bash` (ADR-0072), and the `PostCompact` handler. Name what each one guarantees.
   - **The issue's inventory is stale, and say so plainly.** Issue #477 lists `.ai-skills/hooks/run-gates.mjs`, `ownership-guard.mjs`, `evidence-ledger.mjs`, and `gates.json` as the hook runtime. Those files belong to the verdict-ratification floor that was built and then reverted — ADR-0067 (superseded) into ADR-0069, with the revert recorded in `.prism/plans/epic-floor-revert.md`. None of them exists on `main`, and none is coming back on that channel: ADR-0069 rejects hooks on the `Stop`/`SubagentStop` report-back channel permanently. Correct the record rather than repeating it.
   - **This is a delivery gap, not a platform limit.** `scripts/ai-skills/hooks/harnesses.mjs` carries working Cursor and Codex adapters — payload shapes, scope ids, tool-kind tables — and its own comment on the Codex adapter reads "Codex supports `PreToolUse`, but as with Cursor nothing delivers it a registration and no probe has observed its deny envelope." The asymmetry inside the runtime is narrower than the issue suggests: `emitNag` is defined for all three hosts, so the announce layer would work on Cursor and Codex the moment a registration existed; only `emitDeny` returns `null` on those two, and only because no probe has observed the envelope to answer in. The issue's finding that Codex "exposes no registration mechanism" contradicts the code and does not survive contact with it. What is actually missing per host is a registration writer, idempotent merge semantics for that host's settings file, and a live probe of its deny envelope.
   - **The fallback already exists and is already portable.** `.prism/rules/context-reuse.md` § "Architect-context routing is diff-blind" declares `load: always`, so it reaches every host through AGENTS.md, and it already states the prose obligation and names the hook as Claude-only. `.prism/references/skill-core.md` § "Reading before writing" states the same obligation at Step 0 of every persona session, on every host.
   - **Delivery is not gated on the consumer's host.** `refreshHookRuntime` is called unconditionally from `runUpdate` (`scripts/ai-skills/update.ts`) with no `optedIn` check, so every `prism update` writes `.claude/hooks/` and merges the registration into `.claude/settings.json` even on a consumer who opted into Codex or Cursor only. State this as fact in the Context; the consequence it produces belongs in `## Consequences` below.

   **`## Decision`** states the posture in one sentence before elaborating: hook-dependent enforcement is accepted as Claude Code-only, and the guarantee everywhere else is carried by always-on prose rather than by a second enforcement mechanism. Then name three rejected alternatives, one line of reasoning each:

   - **Build the Cursor and Codex delivery seams now.** Rejected as scope, not as direction — each needs its own registration format, its own idempotent settings merge, and a live probe of that host's deny envelope before `emitDeny` can return anything trustworthy. Shipping a deny in an unverified envelope produces a gate that either fails open silently or blocks with an unperformable remedy, which is the failure ADR-0067's revert was about. This stays open follow-up work, and the ADR says so.
   - **A git `pre-commit` / `pre-push` floor as the portable equivalent.** Rejected because it cannot enforce the guarantee at all: the guarantee is read-*before*-write, and a commit hook fires after every edit in the change is already on disk. It can observe a violation, never prevent one. Two costs on top: installing it needs either a new dependency (`husky` — `.prism/rules/code-standards.md` § General forbids a new dependency without approval) or a per-clone `git config core.hooksPath` step every consumer must run by hand, which is the same "consumer must take a step" failure that removing the `.generated/` staging directory already corrected (`docs/ai-skills/compatibility.md` § The install-script rule). And the spec-lint half of enforcement already has a portable floor that needs no local hook — `pnpm prism:check` runs in CI on every PR and on `main`, on both ubuntu and windows.
   - **Level down — remove the Claude Code gate so every host behaves identically.** Rejected because it trades a real guarantee on one host for symmetry on three. The gate was added on measured evidence that announcement alone habituates (ADR-0072 § Context); deleting it reinstates the failure that measurement identified.

   Then state where the runtime notice lives: `.prism/references/skill-core.md` § "Reading before writing", a single static host-neutral sentence read at Step 0 of every persona session on every host. Name the two rejected placements:

   - **A per-host notice in each skill's `codex.md` / `cursor.md` platform body.** Rejected because `buildSkillMarkdown` in `scripts/ai-skills/generate-skills.ts` composes exactly `shared.md` plus the one host's file, per skill, with no layer above it — there is no shared per-host prelude any skill would inherit, and `.ai-skills/skills/_shared/` does not exist. The notice would be one copy per skill per host, every copy free to drift, and every one of those files is an empty placeholder comment today.
   - **A runtime host-detection check inside the skill.** Rejected because it spends a tool call every session on every host to rediscover a fact that is static and already known when the registration is written — the registration itself passes `--tool=claude` on the command line.

   **`## Consequences`** states the honest negatives, per the guide's "The honest negative" section:

   - A Codex or Cursor session can edit a routed spec file with the governing doc unread and nothing will stop it. The only thing standing between that session and a wrong edit is prose it may not act on — which is precisely the habituation ADR-0072 measured for the announce layer.
   - The asymmetry is invisible from inside a session. A persona behaves correctly under Claude Code and permissively under Codex with no signal that anything differs, and the compensating control is the static sentence in the shared startup contract, not a detection.
   - **The compensating control ADR-0072 named does not reach the hosts that need it, and its stated reason for staying quiet is false.** `checkHookRegistration` in `scripts/ai-skills/doctor.ts` reports only three findings, all keyed on `.claude/`, and its own doc comment justifies silence on the grounds that "a Cursor or Codex consumer has no `.claude/` tree at all." That premise does not hold: `refreshHookRuntime` is ungated, so any consumer who has run `prism update` does have a `.claude/hooks/` tree and a registration — both halves present, doctor quiet, and the gate still never fires because Codex and Cursor receive no registration of their own. A clean `doctor` run on those hosts is not evidence that enforcement is present. This ticket does not change doctor (see the plan's `## Decisions`); the ADR records the state so a later reader is not misled by the doc comment.
   - Numbered ADRs do not ship to consumers (ADR-0064), so this ADR is the maintainer-facing record only. The consumer-facing statement is task 5 below, in `docs/ai-skills/compatibility.md`.

   No verification for this task on its own; tasks 6 and 7 cover the tree.

2. **Add the ADR-0074 index row to `.prism/spec/adrs/_toolkit/README.md`.** Same gate clearance as task 1 (already credited if task 1 ran first in the same agent). The file ends in a table whose last row is `| 0072 | ... |` at line 126. Append one row in the identical five-column format:

   `| 0074 | [Hook-Dependent Enforcement Reaches Claude Code Only; the Fallback Everywhere Else Is Always-On Prose](0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md) | accepted | <one-sentence summary matching the ADR's Decision> |`

   After task 1. No verification beyond task 7.

3. **Sharpen `.prism/references/skill-core.md` § "Reading before writing" so it names the host.**

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/spec-editing.md
   cat .prism/architect/guides/writing-an-architect-doc.md
   ```

   Replace this exact text:

   ```
   diff-blind). Authoring paths are write-gated: on hosts with the hook runtime,
   edits to routed paths are denied until their routed docs are read.
   ```

   with:

   ```
   diff-blind). Authoring paths are write-gated on hosts that receive the hook
   runtime, where an edit to a routed path is denied until that route's docs are
   read. Claude Code is the only host that receives it today, so on Codex and
   Cursor nothing stops an unread edit — match the manifest and read the docs
   yourself before you write.
   ```

   Two constraints on the replacement text, both because this file is a `mirrored` entry in `.ai-skills/definitions/seed-curation.json` and its twin ships to consumers under `templates/install/.prism/references/skill-core.md`: no `ADR-NNNN` reference (`crossref-lint` forbids them in shipped content per ADR-0064), and no maintainer-only command name. The text above already satisfies both — do not add either.

   Edit the canonical file only. `templates/install/.prism/references/skill-core.md` and the three platform copies under `.claude/`, `.codex/`, and `.cursor/` are regenerated by task 6; do not hand-edit them.

4. **Point `.prism/architect/_toolkit/install-layout.md` § "Hook runtime" at the new ADR.** Same gate clearance as task 3.

   In § "Hook runtime", immediately after the paragraph beginning `**Delivery path.**`, insert one new paragraph:

   ```
   **The asymmetry is a decision, not an oversight.** Enforcement on Claude Code with always-on prose everywhere else, and the alternatives rejected to reach it — building the Cursor and Codex seams now, a git `pre-commit` floor, levelling down by removing the gate — are recorded in [ADR-0074](../../spec/adrs/_toolkit/0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md).
   ```

   Change nothing else in the file. After task 1 (the link target must exist).

5. **Do not touch `scripts/ai-skills/doctor.ts` in this ticket.** Recorded here so the omission is deliberate rather than forgotten — see `## Decisions` → "Doctor stays untouched". If a later session decides doctor should report the unavailability, that is a separate ticket.

6. **Run `pnpm prism:build`** from the worktree root. It regenerates the `.claude/`, `.codex/`, and `.cursor/` mirrors of the changed `.prism/` content and rewrites the `mirrored` seed twin under `templates/install/`. Expect the working tree to gain modifications to `.claude/references/skill-core.md`, `.codex/references/skill-core.md`, `.cursor/references/skill-core.md`, `templates/install/.prism/references/skill-core.md`, and the corresponding mirrors of `install-layout.md`. After tasks 1–4.

7. **Run `pnpm prism:check`** from the worktree root; it must exit 0. This is the full gate — `crossref-lint` (which would catch an ADR reference smuggled into shipped content), `spec-scope-lint`, the route and drift checks. If it fails, fix and re-run rather than proceeding. After task 6.

8. **Ship it.** Commit the ADR, the README row, the two `.prism/` edits, the docs change from Eli's task, and every generated mirror in one commit per `.prism/rules/git-conventions.md` (HEREDOC form, subject `PRISM-477: Record the hook-portability posture and surface the Claude-only reach`). Push, open the PR against `main` with a body per `.prism/templates/pr-description.md`. After task 7 and after Eli's task 1.

### Eli (documentation)

1. **Add a hook-enforcement section to `docs/ai-skills/compatibility.md`.**

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/documentation.md
   cat .prism/architect/_toolkit/architecture-doc-shape.md
   ```

   Insert a new `## Hook-based enforcement is Claude Code only` section between § "Per-tool layouts" and § "The install-script rule". It is consumer-facing prose, so it says what a consumer needs before they rely on the guarantee, not how the runtime works:

   - PRISM ships a hook runtime that does two things: it names the architect docs governing a file you just read, and it blocks an edit to a routed path until those docs are read.
   - It is delivered to Claude Code only. `prism adopt` and `prism update` write `.claude/hooks/` and merge the registration into `.claude/settings.json`; no equivalent is written for Codex or Cursor, so on those hosts neither behavior fires and nothing announces its absence.
   - This is a delivery gap rather than a limitation of those tools — both support the hook event the gate uses. Wiring them up is unshipped work, not a setting to flip.
   - What carries the guarantee on Codex and Cursor is the always-on rule in `.prism/rules/context-reuse.md` and the shared startup contract in `.prism/references/skill-core.md`: match the paths you are about to touch against `.prism/architect/manifest.json` and read every matching doc before you write. On those hosts that is a discipline, not an enforcement.
   - A clean `prism doctor` run on a Codex-only or Cursor-only install is not evidence that enforcement is present — the check looks for a Claude-shaped registration.

   Add the section to the page's opening bullet list ("The short version, before the prose") as a fourth bullet: hook-based enforcement reaches Claude Code only.

   Leave the page's frontmatter unchanged. `.prism/architect/_toolkit/documentation.md` § Frontmatter schema asks for `category`, `audience`, and `last_updated`, and this page carries only `title` and `description` — matching every sibling in that directory. Normalizing frontmatter across the doc tree is separate work, and doing it to one page makes the tree less consistent, not more.

   Do not cite ADR-0074 by number: `docs/` may link to ADRs on GitHub (the page already does for ADR-0044 and ADR-0046), so a GitHub link is permitted — but the section reads better without one, and the reachability rule makes an unlinked number worse than no reference. If you link, use the same absolute `https://github.com/HunterMcGrew/PRISM/blob/main/...` form the page already uses.

   Before Clove's task 6, so the build and check run over the finished tree.

---

## Decisions

- **The posture is "Claude-only enforcement, always-on prose everywhere else," and it is accepted rather than levelled.** Alternatives: build the Cursor and Codex delivery seams now — rejected as scope, since each needs a registration format, idempotent merge semantics, and a live probe of the host's deny envelope before `emitDeny` can return a trustworthy shape, and a deny in an unverified envelope either fails open or blocks with an unperformable remedy; and remove the Claude Code gate for symmetry — rejected because it trades a measured guarantee on one host for uniformity across three.
  - **Root cause of the confusion:** the gap is a delivery gap, not a platform limit. `scripts/ai-skills/hooks/harnesses.mjs` carries working Cursor and Codex adapters and its Codex comment states that Codex supports `PreToolUse`; what is missing is a registration writer per host.
  - **Implementation guidance:** nothing in `scripts/ai-skills/hooks/` changes in this ticket. The work is spec, one shipped reference sentence, and one consumer doc section.

- **Git hooks are rejected as the portable floor.** A `pre-commit` or `pre-push` hook fires after every edit in the change is already written, and the guarantee at issue is read-*before*-write — so it can report a violation but never prevent one. It is not a weaker version of the gate; it is a control for a different problem. Two further costs: installing it needs either a new dependency (`husky`, which `.prism/rules/code-standards.md` § General forbids without approval — and no user is available to approve one) or a per-clone `git config core.hooksPath` opt-in every consumer runs by hand; and the spec-lint half already has a host-independent floor in `pnpm prism:check` running in CI on every PR and on `main`. Recorded so the obvious idea is not re-proposed without its reason.

- **The runtime notice is one static sentence in `.prism/references/skill-core.md`, not per-host skill text and not a runtime detection.** Alternatives: a notice in each skill's `codex.md` / `cursor.md` platform body — rejected because those files are per-skill, so the sentence would be repeated once per skill per host and drift on the first edit; and a runtime check that inspects the host's settings — rejected because it spends a tool call every session on every host to rediscover a fact that is static and already known when the registration is written. `skill-core.md` is read at Step 0 of every persona session on every host and already carried a hedged version of the sentence, so the fix is a sharpening, not a new surface.

- **The issue's file inventory is stale and the ADR corrects it rather than echoing it.** `run-gates.mjs`, `ownership-guard.mjs`, `evidence-ledger.mjs`, and `gates.json` are artifacts of the reverted verdict-ratification floor (ADR-0067, superseded by ADR-0069; revert recorded in `.prism/plans/epic-floor-revert.md`) and do not exist on `main`. Repeating the list in a durable record would make a reverted design read as current.

- **An ADR is warranted; the triple gate fires, with gate 1 the weakest.** Per `.prism/references/triple-gated-adr-criterion.md`: *hard to reverse* — the reversible thing is the Claude-only fact (additive to fix), but the posture being recorded is "accept the asymmetry rather than level down," and reversing that means removing a shipped enforcement layer consumers depend on; *surprising without explanation* — a multi-runtime toolkit enforcing on one runtime, with `emitDeny: () => null` on the other two, reads as an oversight until the reasoning is on the page; *genuine trade-off* — three real alternatives were on the table and each lost for a stated reason. Gate 1 is the least clean of the three, and it is recorded that way rather than argued up.

- **Doctor stays untouched, and the reason its silence is wrong is recorded rather than fixed.** `checkHookRegistration` in `scripts/ai-skills/doctor.ts` reports three findings, all keyed on `.claude/`, and its doc comment justifies staying quiet by asserting "a Cursor or Codex consumer has no `.claude/` tree at all." That premise is contradicted by `refreshHookRuntime` being ungated (next Decision): an updated Codex-only consumer has both the runtime and the registration, doctor sees a healthy `.claude/` install, and the gate still never fires. Making doctor report the unavailability is a change to a consumer-facing output surface with its own blast radius and its own verification, and it is entangled with the ungated-delivery question below — fixing one without the other produces a warning that contradicts what the installer just did. **Default path (used in this ticket):** the state is recorded as a Consequence in ADR-0074 and stated plainly in the consumer docs section; no code change.

- **`refreshHookRuntime` being ungated on host is a real defect, and this ticket names it without fixing it.** `runUpdate` (`scripts/ai-skills/update.ts`) calls it unconditionally — no `optedIn.claude` check — so every `prism update` writes `.claude/hooks/`, merges a hooks block into `.claude/settings.json`, and appends two lines to `.gitignore` on consumers who opted into Codex or Cursor only. Considered folding the fix in: rejected because it changes what the installer writes into a consumer's repo, which is a wider blast radius than a spec-and-docs ticket carries, and because it and the doctor question have to move together to avoid shipping a warning that contradicts the installer. It is same-scope enough to be a follow-up PR rather than a new ticket per `.prism/rules/followup-scope.md` § Choosing the vehicle — file it against `scripts/ai-skills/update.ts` and `scripts/ai-skills/doctor.ts` as one unit.

- **ADR number moved 0073 → 0074; 0073 is taken by PRISM-476, landing in parallel.** Winston's plan drafted the ADR as 0073 against `main` at plan time; by implementation time a parallel lane (PRISM-476) had already claimed 0073. Renumbered to 0074 — the next free number confirmed against `.prism/spec/adrs/_toolkit/` at implementation time (0072 was the highest landed on this branch) — throughout the plan, the ADR file, its README row, and every cross-reference.

- **Every task names its gate-clearing `cat` commands inline.** The write gate denies an edit to a routed path until the route's docs are read, and every path in this plan is routed. Naming the commands in the task is the difference between a task an agent can execute and one that stalls on a deny it has to reverse-engineer.

---

## Sessions

- 2026-09-02 [huntermcgrew/prism-477-hook-portability] open: Intent — decide and record PRISM's portability posture for hook-dependent enforcement, and make the Claude-only reach visible to a Codex or Cursor adopter; Bounds — done when the plan carries tasks, AC, and decisions, and the AC is synced to issue #477; touch only `.prism/plans/prism-477.md` on this branch, implement nothing; Approach — correct the issue's stale inventory against `main`, apply the triple ADR gate, and pick the cheapest surface that already reaches all three hosts rather than building a fourth. · close: scope held
- 2026-09-02 [huntermcgrew/prism-477-hook-portability] open: Intent — implement Clove's tasks 1–4 and 6–7 (ADR-0074, the sharpened skill-core.md sentence, the install-layout.md pointer, build, check), renumbered to 0074 per the dispatcher's correction; Bounds — done when `pnpm prism:check` exits 0 and the AC evidence commands for AC-3 through AC-8 pass, touching only the paths the plan's Clove tasks name plus `seed-curation.json` if the build surfaces a gap; Approach — write the ADR content verbatim from the plan's spec, then verify each AC's evidence command myself rather than trusting the task description alone. · close: scope held — the `seed-curation.json` fix was a build-time gap the plan's tasks didn't name, filed under Refactor scope as in-local-frame-and-trivial (fixed inline, no follow-up needed)

---

## History

- 2026-09-02 [huntermcgrew/prism-477-hook-portability]: Winston planned PRISM-477 — ADR-0074, a sharpened sentence in the shared startup contract, and a consumer-facing compatibility section. Corrected the issue's hook inventory against `main`: the files it names are reverted-floor artifacts, and the Codex gap is a delivery gap rather than a platform limit. Git hooks rejected as the portable floor; see Decisions.
- 2026-09-02 [huntermcgrew/prism-477-hook-portability]: Clove implemented tasks 1–4 and 6–7 — wrote ADR-0074 (renumbered from 0073), sharpened `skill-core.md`, pointed `install-layout.md` at the ADR, and ran the build. Found and fixed a gap the plan didn't cover: the new ADR wasn't in `seed-curation.json`'s excluded list, so the first build shipped it into `templates/install/` with forbidden `ADR-NNNN` references; added the entry and reran the build. `pnpm prism:check` passes clean. Eli's docs task (task 5 in Eli's numbering) still to land on this branch.

---

## Debugged Issues

None.

---

## Review Issues

None yet.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given a session running on Codex or Cursor, When the persona reads its shared startup contract at the start of the session, Then it is told that write-gate enforcement is unavailable on that host and that it must match the routing manifest and read the governing docs itself.
  - Evidence (human): open `.codex/references/skill-core.md` and `.cursor/references/skill-core.md` at the "Reading before writing" section → both name Claude Code as the only host receiving the hook runtime and state the manual obligation for the other two · UNMET looks like: the section still reads only "on hosts with the hook runtime" without naming which host, leaving the reader unable to tell whether theirs is covered.

- [ ] **AC-2** Given a person evaluating PRISM for a Codex-only or Cursor-only team, When they read the compatibility page, Then they learn that hook-based enforcement reaches Claude Code only, that this is a delivery gap rather than a tool limitation, and that a clean setup check on their host is not evidence enforcement is present.
  - Evidence (human): read `docs/ai-skills/compatibility.md` end to end → a dedicated hook-enforcement section states all three facts, and the page's opening summary list carries a matching bullet · UNMET looks like: the page describes per-tool layouts with no mention of hooks, so a reader finishes it believing the enforcement applies to their host.

### Non-behavioral

- [ ] **AC-3** The decision record names every hook-registered behavior PRISM actually ships, and names no behavior it does not.
  - Evidence (machine): `cat .prism/spec/adrs/_toolkit/0074-*.md` → its inventory lists exactly the `PreToolUse` write gate, the `PostToolUse` announce layer, and the `PostCompact` handler; cross-check against `cat templates/install/.claude/settings.json`, whose `hooks` object has exactly those three keys · UNMET looks like: the ADR lists a gate, ownership guard, or evidence ledger with no matching registration, or omits a registered event.

- [ ] **AC-4** The record states plainly that the files issue #477 inventories do not exist on `main`, and says where they came from.
  - Evidence (machine): `grep -n "run-gates\|ownership-guard\|evidence-ledger" .prism/spec/adrs/_toolkit/0074-*.md` → matches, in a passage naming the reverted verdict-ratification floor. Positive control for the probe: `git ls-files | grep -c "ownership-guard"` → `0`, confirming the files are genuinely absent rather than the grep being broken · UNMET looks like: no match in the ADR, so the stale inventory survives unchallenged in the ticket.

- [ ] **AC-5** The git-hook alternative is recorded as rejected, with the reason it fails rather than only the verdict.
  - Evidence (machine): `grep -n "pre-commit" .prism/spec/adrs/_toolkit/0074-*.md` → matches in the Decision section, in a passage stating that a commit-time hook fires after the edit is already written and so cannot enforce read-before-write · UNMET looks like: git hooks appear as "rejected" with no stated reason, or do not appear at all.

- [ ] **AC-6** The sharpened startup-contract sentence reaches every host mirror and the consumer seed, and carries no reference a consumer cannot resolve.
  - Evidence (machine): after `pnpm prism:build`, run `grep -c "Claude Code is the only host that receives it" .prism/references/skill-core.md .claude/references/skill-core.md .codex/references/skill-core.md .cursor/references/skill-core.md templates/install/.prism/references/skill-core.md` → `1` for each of the five. Positive control: the same `grep -c` for `zzz-not-present` → `0` for each, proving the probe discriminates. Then `grep -c "ADR-00" templates/install/.prism/references/skill-core.md` → `0` · UNMET looks like: any of the five returns `0` (the build did not propagate), or the seed twin returns non-zero for the ADR probe (an unreachable reference shipped).

- [ ] **AC-7** The full repository gate passes.
  - Evidence (machine): `pnpm prism:check` → exit code 0 · UNMET looks like: any non-zero exit, including a `crossref-lint` failure on a reference added by this change.

- [ ] **AC-8** No dependency was added and no git hook was installed, since both were considered and rejected.
  - Evidence (machine): `git diff origin/main...HEAD -- package.json` → empty output; `ls .git/hooks | grep -v '\.sample$'` → no output, meaning every file there is still a git-shipped sample and no executable hook was installed. Positive control for that probe: `ls .git/hooks | grep -c '\.sample$'` → a non-zero count, proving the listing and the filter both work. (`core.hooksPath` is already set at local scope to the repo's own default `.git/hooks`, so its value is not the discriminator — the contents of that directory are.) · UNMET looks like: `package.json` gains a dependency, or a non-sample file appears in `.git/hooks`.

### AC Adjustments

None.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | Synced AC to GitHub issue #477 | 8 criteria | 8 criteria (IDs and Evidence stripped) |

---

## Cleanup Items

None.

---

## PR Readiness

- [ ] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (n/a — no TypeScript changes)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (n/a — no runtime logic changes)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-09-02, `pnpm prism:check` exit 0
- [ ] PR description up to date (draft PR opened; Eli's docs task still to land)
- [ ] Lasting decisions promoted to architect context (plan close, not yet reached)

**Last updated:** 2026-09-02
