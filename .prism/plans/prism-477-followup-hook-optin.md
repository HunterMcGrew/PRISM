# Plan: PRISM-477 followup — hook delivery and the doctor signal

## Ticket

Follow-up to https://github.com/HunterMcGrew/PRISM/issues/477 (shipped as PR #478, commit `6649a235`). No new ticket per `.prism/rules/followup-scope.md` § Choosing the vehicle — post-merge, same-scope, so this is a follow-up PR off `main`.

Lineage: PRISM-477's plan (`.prism/plans/prism-477.md`, closed 2026-09-02) records this work in two `## Decisions` entries — "Doctor stays untouched, and the reason its silence is wrong is recorded rather than fixed" and "`refreshHookRuntime` being ungated on host is a real defect, and this ticket names it without fixing it." ADR-0074 § Consequences carries the same state as a maintainer-facing record. Those two entries and that Consequence are the whole record this plan starts from.

## Goal

Make `prism doctor` tell the truth about how far hook enforcement reaches, so a clean run on a Codex-only or Cursor-only consumer stops reading as evidence that the write gate is protecting them.

---

## User Stories

Not applicable — a diagnostic-output correction with no end-user feature.

---

## Design

Not applicable — no UI.

---

## Implementation Tasks

Every task below writes to a path the architect write gate routes. The gate denies the edit until the route's docs have been read through a flagless `cat` or a rangeless `Read`; each task names the exact clearing commands. Read them once per agent — credit is per-agent, not per-task, so tasks sharing a route clear together.

**Run the clearing `cat` as a bare command.** A `cd <dir> && cat <doc>` does not clear the gate — the `&&` disqualifies the read-only proof, so the command is judged as a write and denied again. Use one `cat` per call with a single path operand and nothing else on the command line.

### Clove (implementation)

1. **Correct the false premise in `checkHookRegistration`'s doc comment** — `scripts/ai-skills/doctor.ts`, the JSDoc block immediately above `async function checkHookRegistration` (currently ending at line 671).

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/spec-editing.md
   cat .prism/architect/_toolkit/skills-ecosystem.md
   cat .prism/architect/_toolkit/output-guards.md
   cat .prism/architect/_toolkit/install-layout.md
   ```

   Replace the final paragraph, exactly:

   ```
    * Removing both halves is silent. Nothing on disk then distinguishes a
    * consumer who deleted the gate from one who never received it — a Cursor or
    * Codex consumer has no `.claude/` tree at all — so reporting it would fire on
    * installs that are correct as they stand.
   ```

   with:

   ```
    * Removing both halves is silent. Nothing on disk then distinguishes a
    * consumer who deleted the gate from one who never received it, so reporting
    * it would fire on installs that are correct as they stand.
    *
    * Presence is not reach. `refreshHookRuntime` delivers into `.claude/`
    * on every consumer regardless of which host they actually run, so a Codex
    * or Cursor consumer has both halves and still gets no enforcement — the
    * registration is Claude-shaped and no other host reads it. That is what
    * the informational finding below exists to say; without it a clean run
    * reads as evidence of a gate that is not firing.
   ```

   Verification: `pnpm prism:check-types`.

2. **Add the host-reach informational finding to `checkHookRegistration`** — `scripts/ai-skills/doctor.ts`, inside `checkHookRegistration`, immediately before the closing `return findings;`. Gate is the same route as task 1 (already cleared).

   Insert:

   ```ts
   	if (findings.length === 0 && registeredPaths.has(hookRuntimePath)) {
   		findings.push({
   			check: "hook-registration",
   			severity: "info",
   			message:
   				"The hook runtime is installed and registered. It fires on Claude Code only — Codex and Cursor receive no registration, so on those hosts read-before-write is a discipline carried by .prism/rules/context-reuse.md and .prism/references/skill-core.md, not an enforced gate. See docs/ai-skills/compatibility.md § Hook-based enforcement is Claude Code only.",
   		});
   	}
   ```

   The `findings.length === 0` guard keeps the line off a report that already carries a warning about this check — a consumer reading "present but unregistered" does not also need the reach caveat. The `registeredPaths.has(hookRuntimePath)` guard keeps it off a repo with neither half installed, preserving the existing "joint absence is outside what it can see" behavior.

   Cite `docs/ai-skills/compatibility.md`, not ADR-0074 — numbered ADRs never ship to consumers (ADR-0064), so an ADR citation in consumer-facing output is a dangling reference.

   Verification: `pnpm prism:check-types`.

3. **Keep "No issues found." meaningful by keying it on error and warning only** — `scripts/ai-skills/doctor.ts`, in `formatDoctorReport` (currently line 933).

   Replace:

   ```ts
   	if (report.findings.length === 0) {
   		lines.push("No issues found.");
   	} else {
   		for (const finding of report.findings) {
   			lines.push(`[${SEVERITY_LABEL[finding.severity]}] ${finding.check}: ${finding.message}`);
   		}
   	}
   ```

   with:

   ```ts
   	if (!report.findings.some((f) => f.severity !== "info")) {
   		lines.push("No issues found.");
   	}

   	for (const finding of report.findings) {
   		lines.push(`[${SEVERITY_LABEL[finding.severity]}] ${finding.check}: ${finding.message}`);
   	}
   ```

   Without this, task 2's always-present info line would suppress "No issues found." on every healthy install — a consumer would lose the one line that tells them the run was clean. `healthy` already keys on `error` alone and needs no change.

   After task 2 and 3, sequence: task 3 must land with task 2 in the same commit — task 2 alone regresses the healthy-run output.

   Verification: `pnpm prism:check-types`.

4. **Rewrite the doctor test that asserts no finding on the healthy path, and add two** — `scripts/ai-skills/doctor.test.ts`. Gate route is the same as task 1 (already cleared).

   Replace the test at line 1080, `"runDoctor reports no hook finding when the runtime and its registration agree"`, whose body asserts `assert.deepEqual(hookFindings(report.findings), [])`. Keep its fixture; rename it to `"runDoctor reports hook reach, not a problem, when the runtime and its registration agree"` and change the assertion to: exactly one hook finding, its `severity` is `"info"`, and its message matches `/Claude Code only/`.

   Add, in the same `// --- hook registration ---` block, using the existing `withTempRoots` + `writeFile` + `hookFindings` idiom:

   - `test("runDoctor omits the hook reach line when the runtime is present but unregistered", ...)` — reuse the fixture from the line-984 test; assert the single finding's severity is `"warning"` and no `info` finding is present. This is the positive control for the `findings.length === 0` guard: without it a broken guard and a working guard produce the same one-finding report.
   - `test("formatDoctorReport still prints No issues found. alongside an info-only finding", ...)` — build a `DoctorReport` literal with one `info` finding, call `formatDoctorReport`, assert the output contains both `"No issues found."` and `"[INFO] hook-registration:"`.

   Leave the line-1099 test (`stays silent when a repo has neither a hook runtime nor a registration`) unchanged — the `registeredPaths.has(hookRuntimePath)` guard keeps it passing, and its survival is the evidence that guard works.

   Test names state the contract, not the change that produced them, per `.prism/rules/writing-voice.md` § Anti-pattern: Session-context leakage.

   Verification: `pnpm prism:test`.

5. **Reconcile the two prose homes of the compensating-control claim** — `.prism/architect/_toolkit/install-layout.md` § Write gate (line 169) and its curated seed twin.

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/spec-editing.md
   cat .prism/architect/guides/writing-an-architect-doc.md
   ```

   In `.prism/architect/_toolkit/install-layout.md`, replace the final sentence of the § Write gate paragraph beginning **The gate is friction, not a wall.**:

   ```
   The compensating control is visibility: `prism doctor`'s hook-registration check turns a removed hook into a reported finding rather than a silent absence.
   ```

   with:

   ```
   The compensating control is visibility: `prism doctor`'s hook-registration check turns a removed hook into a reported finding rather than a silent absence, and on an install where both halves are present it reports the reach — the gate fires on Claude Code only, so a clean run is not evidence that a Codex or Cursor session is being held to it.
   ```

   Then make the matching edit in the curated twin `templates/install/.prism/architect/_toolkit/install-layout.md` § Write gate, in its "Turning it off." paragraph (line 143). Replace:

   ```
   `prism doctor` reports a removed or unregistered hook so the change is visible rather than silent.
   ```

   with:

   ```
   `prism doctor` reports a removed or unregistered hook so the change is visible rather than silent, and on a healthy install it names the reach — the gate runs under Claude Code only, so a clean report does not mean a Codex or Cursor session is being held to it.
   ```

   The twin is hand-maintained: `install-layout.md` is a `curated` entry in `.ai-skills/definitions/seed-curation.json`, so the build neither writes it nor compares its content and no gate catches the drift. Do not add an ADR citation to the twin — numbered ADRs do not ship (ADR-0064).

   Verification: `pnpm prism:check`.

6. **Amend ADR-0074 § Consequences to record that doctor now reports the reach** — `.prism/spec/adrs/_toolkit/0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md`.

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/spec-editing.md
   cat .prism/architect/guides/writing-an-adr.md
   ```

   Leave the existing third paragraph in place — the reasoning that led there is part of why the current answer is right, and a superseded observation is not deleted. Replace only its closing two sentences:

   ```
   A clean `doctor` run on those hosts is not evidence that enforcement is present. This ticket does not change doctor (see the plan's `## Decisions`); this record exists so a later reader is not misled by the doc comment.
   ```

   with:

   ```
   A clean `doctor` run on those hosts was therefore not evidence that enforcement is present. The follow-up to this ticket closed the reporting half: `checkHookRegistration`'s doc comment no longer carries the false premise, and a healthy install now draws an informational finding naming the Claude-only reach. Delivery itself is still ungated — see `.prism/plans/prism-477-followup-hook-optin.md` § Decisions for why that half needs a consumer-facing consent signal it does not yet have.
   ```

   Do not change `Status: accepted` — the decision the ADR records is unchanged; only one of its consequences moved.

   Verification: `pnpm prism:check` (crossref-lint resolves the plan-path reference; the ADR is `excluded` from the seed, so there is no twin to sync).

7. **Correct the one falsified sentence in the consumer-facing compatibility doc** — `docs/ai-skills/compatibility.md`, § "Hook-based enforcement is Claude Code only", its final line.

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/documentation.md
   cat .prism/architect/_toolkit/architecture-doc-shape.md
   ```

   Replace:

   ```
   A clean `prism doctor` run on a Codex-only or Cursor-only install isn't evidence that enforcement is present — the check looks for a Claude-shaped registration.
   ```

   with:

   ```
   `prism doctor` says so itself: on an install where the runtime is present and registered, it prints an informational line naming the Claude-only reach. The check looks for a Claude-shaped registration, so a clean run on a Codex-only or Cursor-only install is not evidence that enforcement is present.
   ```

   Also bump `last_updated` in the file's frontmatter to the date you make the edit, per `.prism/architect/_toolkit/documentation.md` § Frontmatter schema.

   This is a consumer-facing `docs/` edit absorbed into Clove's lane rather than routed to Eli — see `## Decisions`.

   Verification: `pnpm prism:check`.

8. **Run the full gate and update this plan** — `pnpm prism:check` from the worktree root. Append the implementation entry to `## History` and the `close:` clause to the `## Sessions` line per `.prism/rules/session-orientation.md` § Battery Persistence.

   Ship per `.prism/rules/skill-routing.md` § Authors ship, reviewers review: commit, push, open a draft PR whose body opens with "Follow-up to PRISM-477. No new ticket per `.prism/rules/followup-scope.md`." per that rule's § Follow-up PR conventions.

---

## Decisions

- **The delivery gate this follow-up was scoped to build cannot be built as framed: there is no consumer-side host opt-in signal to gate on.** The follow-up ships the doctor half only.
  - **Root cause of the framing error:** PRISM-477's Decision and ADR-0074 § Context both say `refreshHookRuntime` is called "with no `optedIn` check," which reads as though an `optedIn` value exists and the call site forgot to consult it. It does not. `.ai-skills/config.schema.json` has no `platforms` / `hosts` / `optedIn` / `targets` key; `.ai-skills/definitions/paths.json` declares where each host's output goes, never whether it is wanted; and `build.ts`'s `optedIn` object is a check-mode drift heuristic over PRISM's own managed-marker directories, not a consumer preference. `update.ts`'s hardcoded all-true is not a forgotten check — it is the only value available.
  - **Alternatives considered:** add a `hosts` key to `config.json` — rejected for this PR, because a key defaulting to all-hosts fixes nobody by default (every existing consumer keeps the current behavior) and a key defaulting to none breaks every existing consumer, so it needs an `init` flag, an Atlas onboarding question, and a migration story; derive the signal from what is on disk — rejected as circular, since `runUpdate` creates `.claude/skills` and `.claude/agents` itself on every run, so after the first run the evidence is self-fulfilling; add a `--no-hooks` flag or `PRISM_SKIP_HOOK_RUNTIME` env var — rejected as speculative, since nobody has asked for it and `.prism/rules/code-standards.md` § General forbids abstraction ahead of a concrete second case.
  - **Chosen approach:** ship the reporting half now and route the consent question to its own ticket. The two halves were coupled on the premise that fixing doctor alone ships a warning contradicting the installer — that holds only for a *warning about stale delivery*, which presumes gated delivery. An **informational** finding describing what the installer actually did contradicts nothing.
  - **Implementation guidance:** nothing in `scripts/ai-skills/update.ts` changes in this PR. `refreshHookRuntime`, `deliverHookRuntimeFile`, `pruneStaleHookRuntimeFiles`, `mergeHookSettingsRegistration`, and `appendHookStateGitignoreLines` are all untouched, and so are their tests.
  - → no promotion needed (a scoping call for one PR; the durable half is the OPEN Decision below)

- **OPEN — TBD, needs Hunter input.** Whether PRISM should ask consent before installing hook *behavior* into a consumer's own files, and what shape that consent takes. The asymmetry that makes this a real question rather than a tidiness one: writing `.claude/skills/**` and `.claude/agents/**` is PRISM writing into its own managed roots, marked with `.ai-skill-generated` and swept by its own orphan cleanup — but merging a hooks block into `.claude/settings.json` and appending globs to `.gitignore` edits two files that are the consumer's, to install behavior that changes what every tool call does. `.prism/architect/_toolkit/install-layout.md` § Write gate already names `.claude/settings.json` as the consumer's file and deliberately leaves it unrouted. **Default path (used until resolved):** delivery stays ungated and unconditional; `prism doctor` reports the reach so the consumer can see what landed and remove it (three documented removal paths already exist — `PRISM_HOOK_DENY_DISABLE=1`, deleting the `PreToolUse` entry, deleting `hook.mjs`). Recommend Nora file this as its own ticket — two `followup-scope.md` signals point to a split: a different system (the config schema, `init`'s flag surface, Atlas's onboarding script) and a size that would not have fit inside PRISM-477.
  - → no promotion needed while OPEN; promote or retire when the question resolves

- **The new finding is `info`, not `warning`, and it fires only on the healthy path.** A warning would assert something is wrong, and nothing is: the runtime is present because the installer put it there on purpose, and on a Claude Code consumer it is working exactly as designed. `severity: "info"` already exists in the `DoctorFinding` union and in `SEVERITY_LABEL`, and `healthy` keys on `error` alone, so an info finding cannot flip a consumer's exit code. Considered firing it unconditionally on every adopted consumer: rejected because a consumer already reading "hook.mjs is present but registers no hook command" does not also need a paragraph about host reach — two findings on one check compete for the same attention.
  - → no promotion needed (a local choice inside one check; the finding's own message is the durable statement)

- **`formatDoctorReport`'s "No issues found." moves from a total-count test to an error-or-warning test.** Without it, task 2's always-present info line would suppress the one line that tells a consumer the run was clean — the info finding would have silently cost them the healthy signal. Considered leaving the format function alone and accepting the loss: rejected, because it trades a consumer-facing regression for a three-line edit. Considered printing the info findings above the "No issues found." line: rejected as noise-before-signal.
  - → no promotion needed (implementation tactic, evident from the diff)

- **The `docs/ai-skills/compatibility.md` edit is absorbed into Clove's lane rather than routed to Eli.** It is a one-sentence correction of a claim this PR's code makes false, not a doc-writing task, and `.prism/rules/code-standards.md` § Removal and rename completeness asks that every prose home of a changed predicate be reconciled in the same review pass. Splitting one sentence across a persona handoff costs more than it protects. Recorded here because `.prism/rules/branch-plan.md` § Implementation Tasks permits cross-lane absorption only with a `## Decisions` entry naming the scope shift and the affected file.
  - → no promotion needed (one application of an existing rule)

- **No new ADR.** Per `.prism/references/triple-gated-adr-criterion.md`, none of the three gates fires: *hard to reverse* — the change is one informational finding and a doc-comment correction, revertible in a single commit; *surprising without explanation* — ADR-0072 already names doctor visibility as the compensating control and ADR-0074 § Consequences already records that its stated reason for silence was false, so this restores a documented intent rather than establishing a new one; *genuine trade-off* — the info-vs-warning call is real but local, and it belongs in this plan. The consent question in the OPEN Decision above may well earn an ADR when it resolves; this PR does not.
  - → no promotion needed (an application of the existing criterion)

- **ADR-0074's superseded Consequence paragraph is amended, not deleted.** `.prism/architect/guides/writing-an-adr.md` keeps the reasoning that led somewhere wrong, because it is part of why the current answer is right. The paragraph keeps its account of the false premise and gains two sentences saying which half closed and which did not. `Status` stays `accepted` — the decision is unchanged; one of its consequences moved.
  - → no promotion needed (the guide already carries the standing rule)

---

## Sessions

- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin] open: Intent — close the misleading clean-doctor signal PRISM-477 recorded and left unfixed; Bounds — done when doctor reports hook reach and every prose home of the old claim is reconciled, touching no file under `scripts/ai-skills/update.ts` and no test of `refreshHookRuntime`; Approach — reporting half only, because the delivery half has no consumer signal to gate on · close: scope held — planning only, no source touched

---

## History

- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin]: Winston planned the follow-up. Reconnaissance found no per-host opt-in signal anywhere in the consumer surface, so the delivery gate the defect record called for is deferred to its own ticket and this PR ships the doctor half; see Decision: "The delivery gate this follow-up was scoped to build cannot be built as framed."

---

## Debugged Issues

None recorded on this branch. The originating defect is documented in `.prism/plans/prism-477.md` § Decisions and in ADR-0074 § Consequences.

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

**Background:** A consumer repo that has run `prism adopt` at least once, so `.claude/hooks/hook.mjs` and the `.claude/settings.json` hooks block are both present.

- [ ] **AC-1** Given the hook runtime is installed and registered, When the consumer runs `prism doctor`, Then the report includes a line stating that hook enforcement runs under Claude Code only and pointing at the compatibility documentation
  - Evidence (machine): run the doctor test suite — `pnpm prism:test` → the healthy-path hook test passes asserting exactly one `hook-registration` finding with severity `info` whose message matches `/Claude Code only/` · UNMET looks like: the assertion fails with zero findings, or the finding's severity is `warning` or `error`

- [ ] **AC-2** Given the hook runtime is installed and registered and nothing else is wrong, When the consumer runs `prism doctor`, Then the report still tells them plainly that no issues were found
  - Evidence (machine): `pnpm prism:test` → the `formatDoctorReport` test passes asserting the rendered output contains both `No issues found.` and `[INFO] hook-registration:` · UNMET looks like: the rendered output contains the INFO line but not `No issues found.`

- [ ] **AC-3** Given the hook runtime is on disk but no registration points at it, When the consumer runs `prism doctor`, Then they are told the hook is inert and are not additionally given the host-reach line
  - Evidence (machine): `pnpm prism:test` → the unregistered-runtime test passes asserting one `hook-registration` finding of severity `warning` and no finding of severity `info` · UNMET looks like: two findings are returned, or the single finding's severity is `info`

- [ ] **AC-4** Given a repo with neither a hook runtime nor a registration, When the consumer runs `prism doctor`, Then no hook finding of any severity is reported
  - Evidence (machine): `pnpm prism:test` → the pre-existing test `runDoctor stays silent when a repo has neither a hook runtime nor a registration…` passes unmodified · UNMET looks like: that test fails with a one-element findings array

- [ ] **AC-5** Given the consumer runs `prism doctor` on an otherwise-healthy install, When the run finishes, Then its exit status is unchanged from before this change
  - Evidence (machine): `pnpm prism:test` → the existing healthy-run doctor tests asserting `report.healthy === true` pass unmodified · UNMET looks like: a healthy fixture reports `healthy: false`, meaning the new finding leaked into the error severity

### Non-behavioral

- [ ] **AC-6** No file under `scripts/ai-skills/update.ts` is modified, and no test of `refreshHookRuntime`, `mergeHookSettingsRegistration`, or `appendHookStateGitignoreLines` changes
  - Evidence (machine): `git diff --name-only origin/main...HEAD` → the output does not contain `scripts/ai-skills/update.ts`; positive control: the same command does list `scripts/ai-skills/doctor.ts`, proving the diff is being read · UNMET looks like: `update.ts` appears in the changed-file list

- [ ] **AC-7** The false premise "a Cursor or Codex consumer has no `.claude/` tree at all" survives nowhere in the tree
  - Evidence (machine): `grep -rn "no .claude. tree at all" .` → no matches; positive control: `grep -rn "hook-registration" scripts/ai-skills/doctor.ts` returns matches, proving the search reaches the file · UNMET looks like: the first grep returns a hit in `doctor.ts` or any mirror

- [ ] **AC-8** Consumer-facing output and shipped docs cite no numbered ADR
  - Evidence (machine): `pnpm prism:check` → exits 0, with crossref-lint's install-adr-gate green · UNMET looks like: the gate reports an `ADR-NNNN` reference in the install seed or in a consumer-facing string

- [ ] **AC-9** The curated seed twin of `install-layout.md` carries the same corrected claim as its canonical partner
  - Evidence (human): open `templates/install/.prism/architect/_toolkit/install-layout.md` § Write gate and confirm its "Turning it off." paragraph names the Claude-only reach of a clean doctor report · UNMET looks like: the twin still ends that paragraph at "visible rather than silent"

- [ ] **AC-10** The full repository gate passes
  - Evidence (machine): `pnpm prism:check` → exit 0 · UNMET looks like: any non-zero exit, with the failing sub-gate named in the output

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | Not synced — follow-up PR, no ticket of its own per `followup-scope.md` | prism-477-followup-hook-optin | N/A |

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-09-02
