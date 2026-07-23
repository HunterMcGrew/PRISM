# Plan: followup-seed-twin-skills-ecosystem

## Ticket

None. Post-merge same-scope follow-up to the #429 Linear-literal sweep, per [`.prism/rules/followup-scope.md`](../rules/followup-scope.md) — a follow-up PR off `main`, no new ticket. The #429 lane swept the Linear literals in this file and surfaced the deeper content drift as a finding; that drift is the same file, the same thread, and small enough to review as one focused PR.

Branch: `huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem`
PR body opener: `Follow-up to #429. No new ticket per .prism/rules/followup-scope.md.`

---

## Goal

Bring the curated seed twin `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` back to content-currency with its canonical partner, and write down the curation boundary as a rule a future editor can apply instead of re-deriving it each time.

---

## Background — why this drifted and what "curated" actually buys

`.ai-skills/definitions/seed-curation.json` sorts every canonical `.prism/` file into `excluded` (canonical-only), `curated` (a hand-maintained consumer twin), `renames`, or unclassified (byte-mirrored). For **curated** files, `checkSeedDrift` in `scripts/ai-skills/build.ts:583-589` checks only that the seed file **exists** — it never compares content — and `mirrorSeed` skips curated files entirely so `prism:build` never writes them.

So a curated twin has no mechanical staleness signal at all. Canonical can move arbitrarily far ahead and every gate stays green. That is exactly what happened here: canonical is 404 lines, the twin 339, and whole sections are missing.

This shipped in the published npm `0.8.0` — `.prism/architect/` and `templates/install/` are both in `package.json#files`, so consumers installing today receive the stale twin. Nothing is broken; they get outdated persona descriptions and a roster missing the handoff phrases. Motivation, not emergency.

---

## The curation boundary

The deliverable of this plan is a rule, not a one-pass edit list. A curated twin is **canonical minus what a consumer cannot reach, with consumer-specific identifiers tokenized**. Three tests decide every line, in order:

**Test 1 — Identifier tokenization.** Values specific to one install (repo, org, tracker, default branch) ship as `${TOKEN}` literals; canonical carries PRISM's own rendered values. Substitution happens at install time, never at seed-write time — so the seed keeps the raw token. This is the existing token model; nothing new.

**Test 2 — Reference reachability.** A cross-reference ships only if its target ships to consumers. Check the target against `.ai-skills/definitions/seed-curation.json` and the `templates/install/.prism/` tree:

- **Numbered ADRs do not ship** — every `spec/adrs/_toolkit/NNNN-*.md` is in `excluded`; the seed carries only `README.md` and `TEMPLATE.md`. So every `See ADR-NNNN` / `[ADR-NNNN](…)` citation is dropped, and where the ADR's *content* is load-bearing the sentence paraphrases the invariant in place of the link. The twin's orchestration-persona paragraph is the model: it states "the autonomy-between-gates invariant keeps the orchestrator from eroding PRISM's human-gated correctness model" where canonical links ADR-0048.
- **`.prism/skills/**` does not ship.** Consumer skills render into the host's skill directory; the consumer's `.prism/` has no `skills/` tree. Any clause pointing at `.prism/skills/…` is dropped — including mid-sentence, which is why some rows need surgical clause removal rather than wholesale copy.
- **`.prism/references/**`, `.prism/rules/**`, `.prism/architect/**`, `.prism/templates/**` do ship** (subject to their own `excluded` entries). References into them stay verbatim. `verdict-contract.md`, `acceptance-criteria.md`, `audit-workflow.md`, `shipping-flow.md`, `structural-remedies.md` all ship — citations to them are correct in the twin.
- **Runtime-created paths are exempt from this test.** `.prism/plans/`, `.prism/lessons.md`, `.prism/business/strategy.md`, `.prism/audit-state.json`, `.prism/retros/` and friends don't exist in the seed because personas create them on first write (per [`.prism/rules/lazy-artifacts.md`](../rules/lazy-artifacts.md)). Referencing them is correct, not dangling.

**Test 3 — Subject-matter.** Content *about building, publishing, or maintaining PRISM itself* is maintainer-only and never ships: npm packaging invariants, `scripts/ai-skills/**` internals, `dist/cli.js`, the release ritual, the literal guards' implementation. The discriminator is the audience — a consumer runs `prism adopt` and `prism update`; they never publish the package or run its build guards. Content about *what a consumer's own install does* ships even when the mechanism lives in PRISM's scripts.

**What the boundary does not license.** Everything that passes all three tests ships verbatim. Curation is subtraction and tokenization only — never paraphrase-for-its-own-sake, never a shorter version of a shipping concept. A twin sentence that carries the same information as canonical in different words is drift waiting to happen: it reads as intentional, so the next editor leaves it, and the two versions diverge further on the next canonical edit. When a paraphrase is genuinely required (an ADR's reasoning must survive without the link), keep it to the minimum edit that removes the unreachable reference.

**Direction of flow is always canonical → twin.** The twin is never the place a new idea lands first.

---

## Findings — the drift is one-directional

Mechanically confirmed: **the twin contains no content canonical lacks.** Every twin-only line is one of exactly three kinds — a `${TOKEN}` literal (3 lines), the same sentence as canonical minus an ADR citation or an unreachable path (correct curation), or a stale version of a canonical line. There is no case where the twin holds something canonical should adopt.

That shapes the work: this is a one-way catch-up, not a two-way merge. No canonical edits are needed except the boundary-rule promotion in task 8.

Heading-set delta (canonical headings absent from the twin):

| Heading | Verdict |
| --- | --- |
| `### Distribution: npm` | Deliberately omitted — Test 3. Maintainer-only: npm publish target, packaging invariants, `dist/cli.js`, release ritual. |
| `### Handoff phrases` | **Missing in error** — pure roster routing content, passes all three tests. Task 5. |
| `## Output guards` (+ `### Leftover-token guard`, `### Thrive-literal guard`, `### Why two guards instead of one`, `### Allowlist`) | Deliberately omitted — Test 3. Describes `scanPlatformRoots` in `scripts/ai-skills/literal-guard.ts` and PRISM's own build gates. The leftover-token guard does run during consumer `prism update`, but the section documents the guards' implementation and asymmetry rationale, which is maintainer audience. |

The twin adds no headings of its own.

---

## Implementation Tasks

All tasks are content-only edits to markdown. No build effect except the verification pass in task 9. Tasks 1–7 are independent of one another and may run in any order; task 8 is independent; task 9 runs last.

Every "replace" below gives the exact current text so the Edit call writes itself. Unless a task says otherwise, copy the canonical text **verbatim** — do not re-wrap, re-pad table pipes, or rephrase.

### Clove (implementation)

1. **Refresh the Reese row** — `templates/install/.prism/architect/_toolkit/skills-ecosystem.md:35`. The current row predates AC verification entirely. Replace the Role cell (the third column, between the second and third `|` on that line) — current text:

   > `Produces manual QA checklists and bug-fix verification plans from change sets — tag ranges, PR groups, single PRs, or feature branches. Picks the artifact shape per mode (Release, Sprint / Group, Feature / PR, Bug-fix Verification) based on prompt words, input shape, and ticket labels. PRs open as draft per `shipping-flow.md § Draft-by-default`; the human flips ready before merging.`

   with canonical's cell (`.prism/architect/_toolkit/skills-ecosystem.md:35`) **minus the one unreachable clause** — final text:

   > `Produces manual QA checklists and bug-fix verification plans from change sets across its checklist modes (Release, Sprint / Group, Feature / PR, Bug-fix Verification), and additionally runs an **executed AC Verification** mode — grading a plan's acceptance criteria against the branch diff with per-criterion binary verdicts and typed evidence (a graded verdict report, not a tester-facing checklist). In a Sol run, AC Verification is the `ac-verify` phase, dispatched after deterministic ratification and **before** the review loop. Picks the mode from prompt words, input shape, and ticket labels. Verdict semantics have a single shipped home at `.prism/references/qa-test-plan/verdict-contract.md`. PRs open as draft per `shipping-flow.md § Draft-by-default`; the human flips ready before merging.`

   The dropped clause is `; the `acVerdicts` report-back shape + routing predicates live in `.prism/skills/prism-conductor/lib/report-back.md`` — Test 2, `.prism/skills/**` does not ship. The semicolon before it becomes a period. Leave the `| No |` column and surrounding pipes untouched.

2. **Add the Mira Path A handoff sentence to the Parker row** — same file, line 39. Insert one sentence into the Role cell, between `Sits above Mira on grain — PRDs decompose into stories.` and `Invoke-only; not part of the standard handoff chain.` — so the cell reads `…PRDs decompose into stories. Handoff lands via Mira's Path A PRD/epic input. Invoke-only; not part of the standard handoff chain.` Matches canonical line 39 verbatim; no clause needs dropping.

3. **Name Sol in the cadence-persona paragraph** — same file, line 59. Replace `no tooling forces invocation outside an orchestrated run.` with `no tooling forces invocation outside a Sol run.` (canonical line 59). This is a consistency fix, not cosmetic churn: Sol ships to every consumer (`.ai-skills/definitions/roles.json`, `prism-conductor`, `routing: auto`), the twin's own roster table names him, and the twin's Iris row three lines below already says "Sol run-close auto-dispatch" — the file currently contradicts itself.

4. **Replace the Plan Section Ownership table** — same file, lines 209–223. Replace the entire table block (header row through the `## PR Readiness` row inclusive) with canonical's table at `.prism/architect/_toolkit/skills-ecosystem.md:215-230`, copied verbatim including its column padding. This adds the missing `### Story Map` row and picks up canonical's widths in one edit. Do **not** touch the intro line above the table (twin line 207) — canonical's version ends `See ADR-0014.` and the twin correctly drops it per Test 2.

5. **Add the AC gradeability paragraph** — same file. Insert a new paragraph after line 229 (`See `.prism/templates/acceptance-criteria.md` for the full reference.`) and its following blank line, before `**Behavioral criteria** use Gherkin…`. Text is canonical lines 238 minus the unreachable clause — insert exactly:

   > `Every criterion carries a **stable ID** (`AC-1`, `AC-2`…) and a falsifiable **Evidence sub-bullet** tagged `machine` or `human` — the gradeability bar. This turns the AC into a grading instrument: Reese's executed AC Verification walks criteria by ID and grades each against its Evidence. The bar's authoring rules (falsifiable-not-merely-runnable, positive controls on absence-evidence, behavioral evidence for behavioral criteria, the two-verifier standard) live in the template; the verdict semantics Reese grades against live at `.prism/references/qa-test-plan/verdict-contract.md`. On tracker sync, the ID prefix and Evidence sub-bullets are stripped — the tracker AC stays stakeholder-facing.`

   Dropped clause: `, and the `acVerdicts` report-back shape + routing at `.prism/skills/prism-conductor/lib/report-back.md`` — Test 2. Leave one blank line above and below the new paragraph.

6. **Add the `### Handoff phrases` subsection** — same file. Insert after the Cross-skill Handoffs table (after line 270, the Pixel row) and before the `---` on line 272. Copy canonical lines 282–299 verbatim — the `### Handoff phrases` heading, the intro sentence `When a request falls outside the active skill's scope, use these phrases to route back.`, and all **14** bullets. No clause needs dropping: every persona named ships, and the block contains no ADR citations and no `.prism/` paths. Preserve blank lines around the heading and the bullet list.

7. **Leave the Pixel handoff cell diverged** — same file, line 270. No edit. Canonical ends the cell `…User must explicitly invoke her. See ADR-0013 (discovery) and ADR-0034 (routing destination).`; the twin ends it `…User must explicitly invoke her. Mode 2 always routes through Winston; mode 1 inline sketches go directly to Clove.` That is Test 2 working correctly — the twin paraphrases the routing rule the ADRs carry, in place of two links a consumer can't follow. This task exists so a future reader doesn't "fix" it back into a dangling citation. **Verify only; change nothing.**

8. **Promote the curation boundary to the architect surface** — `.prism/architect/_toolkit/install-layout.md` (canonical only). Append a new `## Curated seed twins: the curation boundary` section at the end of the file, carrying the three tests and the direction-of-flow rule from this plan's `## The curation boundary` section above. Two constraints:
   - State the tests and their reasons; do not restate this plan's per-row edit list (cite-don't-restate, per [`implementation-task-detail.md`](../rules/implementation-task-detail.md) § Cite, don't restate).
   - **Do not add the matching section to `templates/install/.prism/architect/_toolkit/install-layout.md`.** The boundary rule is maintainer-only under its own Test 3 — a consumer never curates seed twins. `install-layout.md` is itself a `curated` entry, so `prism:build` will not mirror the addition and no drift check will fire.

9. **Verify** — run in order from the repo root:
   - `pnpm run prism:crossref-lint` — must exit 0. This is the load-bearing gate for Test 2: the linter already walks `templates/install/.prism/` (`scripts/ai-skills/crossref-lint.ts:119`) and resolves cross-references there, so it proves the added content introduced no unreachable reference.
   - `pnpm run prism:check-types` and `pnpm run prism:test` — must pass.
   - `pnpm run prism:build` — must pass **and produce no git diff on either `skills-ecosystem.md`**. Both are `curated`, so `mirrorSeed` skips them; a build-generated diff here would mean the curation classification changed and the run should stop.
   - `git diff --name-only origin/main` — must list exactly three paths: the twin, `.prism/architect/_toolkit/install-layout.md`, and this plan file.

---

## Decisions

- **Two PR-review corrections landed post-implementation, restoring the plan's "twin holds no content canonical lacks" claim to true.** Eric's PR #442 review found: (1) the new Test 1 paragraph in `install-layout.md:233` illustrated token syntax with `${GITHUB_OWNER}`/`${DEFAULT_BRANCH}` — since the file is mirrored, `prism:build` substituted these examples into rendered values, inverting the sentence in `.claude/`/`.codex/`/`.cursor/`; (2) task 6's restored `### Handoff phrases` section made canonical's `— see § Handoff phrases above` pointer reachable again, but the twin kept it dropped; (3) canonical `skills-ecosystem.md:368` carried a lowercase "this project squash-merges" typo the twin had already corrected — a fourth kind of twin-only content the Findings section's mechanical claim didn't account for.
  - **Chosen approach:** (1) named the tokens without the `${}` wrapper so the substitution regex (`\$\{([A-Z][A-Z0-9_]*)\}`) can't match; (2) restored the dropped clause in the twin now that its target ships; (3) fixed the capitalization in canonical (direction of flow is always canonical → twin), which also restores the Findings claim to true.
  - → no promotion needed (PR-review corrections to this plan's own implementation, not a new lasting decision)

- **The curation boundary is three ordered tests — tokenize identifiers, drop references whose targets don't ship, drop maintainer-audience subject matter — and nothing else.** Everything passing all three ships verbatim.
  - **Root cause:** the boundary was never written down. Each editor re-derived it, and "curated" got read as "roughly equivalent, edit freely," which is how 65 lines of divergence accumulated with every gate green.
  - **Alternatives considered:** (a) a per-file prose note at the top of each twin; (b) a `curationNotes` field in `seed-curation.json`; (c) one rule in the architect doc that owns the install layout.
  - **Chosen approach:** (c). The boundary is uniform across all curated files — it's a property of what ships, not of any one file — so a per-file note (a) would be 17 copies of one rule, drifting independently. (b) puts prose in a machine-read JSON file that nothing renders.
  - **Implementation guidance:** task 8. Lands in `.prism/architect/_toolkit/install-layout.md`, canonical only.
  - → promoted to `.prism/architect/_toolkit/install-layout.md`

- **Curation is subtraction and tokenization only — never paraphrase for its own sake.** A twin sentence carrying canonical's meaning in different words is the most expensive kind of drift: it reads as deliberate, so the next editor preserves it, and the gap widens on every canonical edit. Task 3 fixes one instance ("an orchestrated run" for "a Sol run") where the paraphrase bought nothing and left the file self-contradicting. Task 7 preserves the one paraphrase that earns its place — replacing two dangling ADR links with the rule they carry.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` (folded into the boundary section from the decision above)

- **Hand-curation stays; the missing piece is a staleness detector, not a generator.** The recurring drift argues for *detection*, not for replacing editorial judgment with a filter.
  - **Root cause:** the defect is not that humans edit the twin. It is that nothing reports when canonical moves and the twin doesn't — `checkSeedDrift` treats curated files as existence-only (`build.ts:583-589`).
  - **Alternatives considered:** (a) status quo, no change; (b) generate the twin from canonical with a mechanical internal-content filter; (c) generate from inline `<!-- internal -->` fences in canonical; (d) keep hand-curation, add a change-parity check to the build.
  - **Chosen approach:** (d). (b) fails on the evidence in front of us — tasks 1 and 5 each drop a *sub-clause* from the middle of a sentence whose remainder ships, and the surrounding text (`In a Sol run, AC Verification is the ac-verify phase`) is correct for consumers. No regex separates those; a filter would either mangle the prose or need per-file markers, which is (c). (c) is real but it is a build-system change touching `build.ts`, the semantics of `seed-curation.json`, and all 17 curated files — a large blast radius to solve a reporting gap. (a) is what produced this plan.
  - **Known limitation, stated honestly:** change-parity catches the common case (canonical edited in a PR, twin untouched) but would *not* have caught this one — #429 touched the twin on 2026-07-21 for the Linear sweep, resetting any recency signal while leaving the content drift intact. It is a net improvement, not a proof.
  - **Scope:** **out of scope for this follow-up — separate ticket.** It is build tooling in `scripts/ai-skills/build.ts` with its own tests, a different lane from a markdown content fix, and folding it in would defeat the single-focused-PR reason this is a follow-up rather than a new ticket in the first place.
  - → no promotion needed (recorded here as the mechanism call; the follow-up ticket carries the design if it's filed)

- **Byte-parity is not the acceptance criterion and cannot be.** The twin ships tokens where canonical ships values, so the two files are correct precisely when their bytes differ. The AC below substitutes structural and invariant checks — heading-set conformance against a named allowlist, zero ADR citations, zero unreachable paths, tokens intact, crossref-lint green.
  - → no promotion needed (specific to this plan's AC construction)

- **AC-1's evidence count is 2, not 1, and that is correct.** `grep -c 'executed AC Verification' templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `2`: once in the Reese row (task 1) and once in the AC gradeability paragraph (task 5). Canonical itself has the same 2 occurrences (verified: `grep -c 'executed AC Verification' .prism/architect/_toolkit/skills-ecosystem.md` also returns `2`), and both tasks call for verbatim copies of canonical text. The plan's AC-1 evidence undercounted; the twin content is correct as specified.
  - → no promotion needed (AC wording correction, specific to this plan)

- **The curation-boundary section's "does not license" and "why hand-curation stays" paragraphs were corrected against ADR-0064 and disqualified recency detection before the section could promote to consumer-facing agent context.** Found post-review, pre-merge — other plans had already begun citing the section, raising the cost of leaving it wrong.
  - **Root cause:** (1) "Curation is subtraction and tokenization only" was narrower than the ratified boundary — [ADR-0064](../spec/adrs/_toolkit/0064-consumer-internal-boundary.md) § "ADR references split into two lanes" explicitly sanctions a third transformation, genericizing an ADR number cited only as a sample of the citation form, and the shipped `templates/install/.prism/spec/adrs/_toolkit/README.md` twin already practices it (`ADR-NNNN`, not a real number) with no license for it in the rule as written. (2) The section recommended a change-parity/recency check as the follow-up detection mechanism; recency is disqualified outright — it misses original mis-curation (no canonical-moved event exists to detect), gets reset by a partial sweep that touches the twin without closing the drift (exactly what `## Signals` above documents happening to this same file on 2026-07-21), and misses canonical/twin sharing a commit date.
  - **Alternatives considered:** leaving genericization undocumented (rejected — the rule would keep contradicting its own citation examples and the ratified ADR) and leaving the recency recommendation in place with a caveat (rejected — a "real improvement, though not X" framing reads as endorsement, and the correct mechanism, a date-independent structural diff, is now fully scoped in GitHub issue `#441`).
  - **Chosen approach:** rewrote both paragraphs in place — named genericization as a third sanctioned transformation citing ADR-0064, and replaced the recency recommendation with the structural-diff requirement (heading-set plus reference-class comparison, no timestamp input) citing issue `#441`. The surrounding "why hand-curation stays" argument (a mechanical filter can't separate surgical clause-drops from wholesale omission) is correct and unchanged.
  - **Implementation guidance:** content-only edit to canonical `.prism/architect/_toolkit/install-layout.md`; `pnpm prism:build` regenerates the three platform mirrors automatically. The section is maintainer-only and excluded from the curated `templates/install/` twin — no twin edit follows from this correction.
  - → no promotion needed (correction to a decision already promoted to `.prism/architect/_toolkit/install-layout.md`; the promoted section itself now carries the fix)

- **`git diff --name-only origin/main` lists five tracked paths, not three, and that is expected.** Editing non-curated canonical `install-layout.md` (task 8) causes `pnpm prism:build` to regenerate its mirrors in `.claude/`, `.codex/`, `.cursor/` per the existing copied-areas mechanism (`install-layout.md § What gets copied`) — confirmed as established repo convention via `git show --stat d62197c`, which shows the same four-file pattern (canonical + three platform mirrors) for a prior install-layout.md edit. The plan's task 9 bullet and AC-10 evidence anticipated only the twin, `install-layout.md`, and the plan file — they didn't account for the mandatory mirror regeneration that keeps `pnpm prism:check` green. Omitting the mirrors from the commit would leave the branch failing drift detection, so committing all five tracked paths (plus the untracked plan file) is the correct — and only build-green — outcome.
  - **Root cause:** the plan's verification bullet and AC-10 were written assuming install-layout.md's edit wouldn't need its own mirrors re-generated, missing that it's a non-curated (mirrored) file like any other canonical architect doc.
  - **Alternatives considered:** (a) follow the literal three-path count and omit the mirrors — rejected, breaks `prism:check` on the very next CI run; (b) revert the mirrors and hand-edit them out of the diff — rejected, this is exactly the kind of out-of-band platform-copy edit that `prism:check` exists to catch.
  - **Chosen approach:** commit all `prism:build`-regenerated paths. This is the only outcome consistent with "build passes" and "check stays green," both of which are load-bearing elsewhere in this same plan.
  - → no promotion needed (verification-wording correction, specific to this plan)

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** — Given a consumer reading the installed skills-ecosystem doc, When they read the Reese row, Then it describes the executed AC Verification mode and its `ac-verify` phase placement.
  - **Evidence** (`machine`): `grep -c 'executed AC Verification' templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `1`, and `grep -c 'ac-verify' …` returns `1`. Positive control: both return `0` on `origin/main`.

- [ ] **AC-2** — Given a consumer reading the Parker row, When they look for where a finished PRD goes next, Then the row names Mira's Path A PRD/epic input.
  - **Evidence** (`machine`): `grep -c "Mira's Path A" templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `1`. Positive control: `0` on `origin/main`.

- [ ] **AC-3** — Given a consumer looking up who writes an epic plan's story map, When they read `## Plan Section Ownership`, Then the `### Story Map` row is present and names Mira as writer.
  - **Evidence** (`machine`): `grep -c 'Story Map' templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `1`. Positive control: `0` on `origin/main`.

- [ ] **AC-4** — Given a consumer writing acceptance criteria, When they read `## Acceptance Criteria Format`, Then the gradeability bar (stable IDs + Evidence sub-bullets tagged machine/human) is stated.
  - **Evidence** (`machine`): `grep -c 'gradeability bar' templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `1`. Positive control: `0` on `origin/main`.

- [ ] **AC-5** — Given a persona that needs to route an out-of-scope request, When it reads `### Handoff phrases`, Then all 14 routing phrases are available.
  - **Evidence** (`machine`): `sed -n '/^### Handoff phrases/,/^---/p' templates/install/.prism/architect/_toolkit/skills-ecosystem.md | grep -c '^- '` returns `14`. Positive control: the section does not exist on `origin/main`, so the command returns `0`.

### Non-behavioral

- [ ] **AC-6** — Heading-set conformance: every canonical heading appears in the twin except the six allowlisted maintainer-only headings.
  - **Evidence** (`machine`): `diff <(grep '^#' .prism/architect/_toolkit/skills-ecosystem.md) <(grep '^#' templates/install/.prism/architect/_toolkit/skills-ecosystem.md) | grep '^<'` outputs exactly these six lines and no others — `### Distribution: npm`, `## Output guards`, `### Leftover-token guard (\`runLeftoverTokenGuard\`)`, `### Thrive-literal guard (\`runLiteralGuard\`)`, `### Why two guards instead of one`, `### Allowlist`. The same command with `grep '^>'` outputs nothing (the twin adds no headings). Positive control: on `origin/main` the `'^<'` side additionally lists `### Handoff phrases`.

- [ ] **AC-7** — Test 2 holds: the twin cites no ADR and no unreachable path.
  - **Evidence** (`machine`): `grep -cE 'ADR-[0-9]|\.prism/skills/|scripts/ai-skills/|@huntermcgrew/prism|dist/cli\.js' templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `0`, **and** `pnpm run prism:crossref-lint` exits 0. The linter is the load-bearing half — it resolves every cross-reference in `templates/install/.prism/`, so it catches unreachable targets the grep pattern doesn't enumerate.

- [ ] **AC-8** — Test 1 holds: consumer-specific identifiers remain tokenized.
  - **Evidence** (`machine`): the twin's token occurrences are unchanged from `origin/main` — `diff <(git show origin/main:templates/install/.prism/architect/_toolkit/skills-ecosystem.md | grep -o '\${[A-Z_]*}' | sort) <(grep -o '\${[A-Z_]*}' templates/install/.prism/architect/_toolkit/skills-ecosystem.md | sort)` outputs nothing. Stated as a no-regression rule rather than a fixed count so the criterion survives a future token being added. Separately, `grep -c 'HunterMcGrew\|agent-crew' templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `0` — no rendered value leaked in from canonical during the copy.

- [ ] **AC-9** — The curation boundary is documented on the architect surface, canonical-only.
  - **Evidence** (`machine`): `grep -c 'curation boundary' .prism/architect/_toolkit/install-layout.md` returns `1`, and the same grep against `templates/install/.prism/architect/_toolkit/install-layout.md` returns `0`.

- [ ] **AC-10** — The change is content-only and touches nothing else.
  - **Evidence** (`machine`): `pnpm run prism:crossref-lint`, `pnpm run prism:check-types`, `pnpm run prism:test`, and `pnpm run prism:build` all pass; `git status --porcelain` after `prism:build` is empty (the build regenerates nothing here — both files are `curated`); `git diff --name-only origin/main` lists exactly three paths.

- [ ] **AC-11** — A reader who does not know this PR happened can apply the boundary rule to a different curated twin without asking.
  - **Evidence** (`human`): a reviewer reads the new `install-layout.md` section cold and answers three questions from it alone — does a `See ADR-0031` citation ship? does a reference to `.prism/references/worktree-mode.md` ship? does a paragraph about the npm publish ritual ship? Expected: no, yes, no. This is the one criterion no grep can carry — the deliverable is a rule's *applicability*, and only a human read tests that.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-23 | Winston | AC generated | followup-seed-twin-skills-ecosystem | N/A — no ticket per followup-scope.md |

---

## Signals — out of scope for this plan

**The drift is a class, not one file.** Named here so it isn't lost; deliberately absent from `## Implementation Tasks`.

Nine of the seventeen `curated` entries have a canonical partner with a more recent last-commit date. Line-count deltas run as high as −91. Neither signal proves staleness on its own — legitimate curation removes lines, and #429 proved recency can be reset by a partial sweep that leaves the drift intact — but one spot check confirms the class is real:

`.prism/architect/_toolkit/install-layout.md` (canonical 225 lines, twin 134) is missing seven canonical sections, and its surviving first-contact section still reads `## First-contact adoption: \`prism:adopt\`` where canonical reads `## First-contact adoption: \`prism init\` then \`prism adopt\``. That is **consumer-visible wrong instructions**, not merely outdated prose — a worse failure than the one this plan fixes, in a file consumers read to understand how they adopt PRISM.

Recommended follow-up, in order:
1. Audit `install-layout.md`'s twin against the boundary rule this plan writes down — highest severity, since the staleness is instructional.
2. Sweep the remaining seven canonical-newer curated twins against the same rule.
3. Design the change-parity detector (the mechanism call in `## Decisions`) so the class stops recurring.

Each is a separate follow-up. Folding any of them into this PR would turn a focused content fix into a surface-wide sweep and defeat the reason this is a follow-up PR rather than a ticket.

---

## Sessions

- 2026-07-23 [main] open: Intent — write an executable plan reconciling the curated seed twin and state the curation boundary as a reusable rule; Bounds — plan file only, no code, no twin edits, no mirror regeneration; Approach — read both files in full, prove the drift direction mechanically, derive the boundary from what actually ships rather than from the existing edits · close: scope held
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem] open: Intent — execute tasks 1–9 exactly as specified, reconciling the twin and promoting the curation boundary to `install-layout.md`; Bounds — content-only edits to the two named files plus this plan; no source/build changes; Approach — verbatim copy per task, then run the task 9 verification sequence in order · close: scope held with two documented verification-count corrections (see `## Decisions`) — implementation matches every task's specified text exactly.
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem] open: Intent — self-review the PR #442 diff for correctness, scope discipline, and build/seed-drift gates; Bounds — review only, no code edits; Approach — re-verify each AC's evidence command against the checked-out branch, confirm no mirror was hand-edited by diffing `pnpm prism:build` output against committed state, run full `pnpm prism:check` · close: scope held — zero findings, all 11 ACs mechanically re-verified, `prism:check` green with no drift.
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem] open: Intent — fix Eric's PR #442 review findings (one Major, three Minor) and re-verify the full check gate; Bounds — the four flagged lines plus regenerated mirrors and this plan's Decisions/History; no new scope beyond what Eric named; Approach — apply each suggested fix as specified, run `pnpm prism:build` to regenerate mirrors, then `pnpm prism:check` end to end · close: scope held — all four findings fixed, `prism:check` exits 0.
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem] open: Intent — fix Eric's two round-2 Minors (missing `## Review Issues` backfill, stale PR body) and re-verify `prism:check`; Bounds — the plan's `## Review Issues`/`## PR Readiness` sections plus the PR #442 body; no source edits; Approach — add the four round-1 findings as structured entries, re-sync the PR body's path count and Summary, then run `pnpm prism:check` · close: scope held — both Minors fixed, `prism:check` exits 0.

---

## History

- 2026-07-23 [main]: Winston planned the seed-twin reconciliation — nine tasks, boundary rule promoted to `install-layout.md`, mechanism call recorded (hand-curation stays, change-parity detector is a separate ticket). Confirmed mechanically that the twin holds no content canonical lacks, so this is a one-way catch-up. Flagged the drift as a class affecting nine of seventeen curated twins; see `## Signals`.
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem]: Clove executed tasks 1–8 verbatim per spec and ran task 9's verification sequence — crossref-lint, check-types, test, and build all pass, with no build-generated diff on either `skills-ecosystem.md`. Two verification-count corrections found during task 9 are recorded in `## Decisions` (AC-1 evidence count, and the `git diff --name-only origin/main` path count); both are undercounts in the plan's verification wording, not implementation defects — see Decisions for the actual counts and why they're correct.
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem]: Clove fixed all four of Eric's PR #442 review findings — de-tokenized the Test 1 example in `install-layout.md` so mirroring can't substitute it, restored the twin's now-reachable `§ Handoff phrases` pointer, merged the plan's duplicate `## Decisions` section, and fixed canonical's lowercase squash-merge typo the twin had already corrected. See `## Decisions` for the fuller writeup. `pnpm prism:build` regenerated the three platform mirrors for both edited canonical files; `pnpm prism:check` exits 0.
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem]: Clove fixed Eric's two round-2 Minors — backfilled `## Review Issues` with the four round-1 findings (Status `fixed`, Briar's clean line kept as a dated pass record) so the retro charter reads the actual review record instead of a false clean pass, and re-synced the PR #442 body's path count (5 → ten) and Summary bullets to include the round-2 canonical edits.
- 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem]: Clove corrected two factual defects in `install-layout.md`'s curation-boundary section, found post-review and pre-merge — see `## Decisions` for the fuller writeup. `pnpm prism:build` regenerated the three platform mirrors; `pnpm prism:check` exits 0.

---

## Review Issues

No issues found — 2026-07-23 [huntermcgrew/prism-429-followup-seed-twin-skills-ecosystem] (Briar self-review pass)

### Test 1 token examples get substituted by the mirror build

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:233`
- **Problem:** `${GITHUB_OWNER}` / `${DEFAULT_BRANCH}` were illustrating token syntax, but the file is mirrored, so `prism:build` substituted them — the `.claude/`/`.codex/`/`.cursor/` copies asserted that token literals *are* `HunterMcGrew` and `main`, inverting the sentence in the copy agents load.
- **Suggested fix:** name the tokens without the `${}` wrapper so `TOKEN_LITERAL_PATTERN` can't match.

### Twin drops the now-reachable `§ Handoff phrases` pointer

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/skills-ecosystem.md:275`
- **Problem:** canonical's quick-consult rationale points at `§ Handoff phrases` (`— see § Handoff phrases above`), and the twin dropped that pointer — correct curation before this PR (the target didn't ship), now stale since task 6 ships the section at twin line 275.
- **Suggested fix:** restore the pointer now that its target is reachable.

### Plan has a second, out-of-template-order `## Decisions` section

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/followup-seed-twin-skills-ecosystem.md`
- **Problem:** a second `## Decisions` heading landed after `## History`, duplicating the template's single-section contract and splitting content the Decision verdict gate, Zoe, and Iris all read from one place.
- **Suggested fix:** merge both entries into the original `## Decisions` section and delete the duplicate heading.

### Canonical carries a lowercase squash-merge typo the twin already corrected

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/skills-ecosystem.md:368`
- **Problem:** canonical read "this project squash-merges" where the twin already had the corrected capitalization — a fourth kind of twin-only content the plan's mechanical "twin holds no content canonical lacks" claim didn't account for.
- **Suggested fix:** capitalize canonical to match (direction of flow is canonical → twin).

---

## PR Readiness

- [x] No critical or major issues
- [x] `pnpm run prism:crossref-lint` passes
- [x] `pnpm run prism:check-types` passes
- [x] `pnpm run prism:test` passes
- [x] `pnpm run prism:build` passes and produces no git diff on either `skills-ecosystem.md` (ten tracked paths in total change after Eric's review pass — see `## Decisions`)
- [x] PR description up to date — re-synced to ten tracked paths and the two round-2 canonical edits (PR #442)
- [x] Lasting decisions promoted to architect context (task 8)
- [x] `pnpm run prism:check` (full gate) exits 0 after fixing Eric's four PR #442 findings

**Last updated:** 2026-07-23
