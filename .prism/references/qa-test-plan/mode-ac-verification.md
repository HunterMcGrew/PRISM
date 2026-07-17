# Reese — AC Verification Mode

> _Executed AC verification — grade a plan's acceptance criteria against the branch diff with per-criterion verdicts and typed evidence._

Attribution: this mode belongs to the `prism-qa-test-plan` skill (Reese).

Triggered when Mode Detection lands on a plan path carrying an `## Acceptance Criteria` section with no open PR yet, or by explicit prompt words like "verify the AC," "grade the AC." Unlike the other four modes, this one doesn't produce a tester-facing checklist — it produces a graded verdict report, an independent judge grading finished work against the plan's own AC per the verdict contract in [`verdict-contract.md`](./verdict-contract.md).

## 1. Resolve the diff

No PR exists yet at this point in the chain — this mode runs **before** the review loop opens one. Resolve the diff via `origin/${DEFAULT_BRANCH}..<branch>` (or the worktree diff if dispatched inside one). Never call `gh pr view` — there is nothing to view.

Read the plan's `## Acceptance Criteria` in full. Evidence commands come from the repo map's `verification` role (build/test/lint invocations the team has already declared) — never invented on the spot.

## 2. Walk criteria by ID

Go criterion by criterion, in ID order (AC-1, AC-2, …). For each, follow its Evidence sub-bullet's procedure exactly as written.

**Read-only execution, operationally defined:** no writes to tracked files, no mutating flags (snapshot updates, migrations, seeders). Ephemeral build artifacts (compiled output, test caches) are tolerated — they aren't tracked changes.

**Tree-clean discipline:** run `git status` before starting and again after every criterion is graded. The tree must be unchanged at the end, or the run is invalid — a dirtied worktree poisons Sol's own ratification `git diff` downstream. If a command unexpectedly mutates the tree, stop, restore it (`git checkout -- <paths>` for tracked files only), and grade that criterion UNGRADEABLE(`harness`) with the mutation named as the error.

## 3. Render verdicts

Grade each criterion `MET`, `UNMET`, or `UNGRADEABLE` per the verdict contract ([`verdict-contract.md`](./verdict-contract.md), authoritative). Key rules, restated here as an inline cheat-sheet for the walking procedure:

- **Harness failure ≠ UNMET.** A command that errors, can't run in the worktree, or disagrees with itself across two runs is UNGRADEABLE(`harness`) with the error captured — never UNMET.
- **Dead references** — an Evidence source naming a command or path that no longer resolves — are UNGRADEABLE(`dead-reference`).
- **Missing Evidence sub-bullet (the back catalog).** Plans written before the gradeability bar landed (A1) won't carry Evidence sub-bullets. When one is missing, derive the obvious evidence source from the criterion text and the repo map's `verification` role, and label the citation `(derived)`. Grade UNGRADEABLE(`ac-defect`) only when no obvious evidence source can be derived. UNGRADEABLE covers the evidence *source* being insufficient, dead, or unfalsifiable — not only criterion text that reads vague.
- **Human-tagged criteria** (`Evidence (human): ...`) are never graded machine MET/UNMET/UNGRADEABLE. Pull them into the awaiting-human-verification mini-checklist (step 6) and exclude them from every machine count.

## 4. Record UNMET entries

Every UNMET criterion becomes an open entry in the plan's `## Review Issues` — this is the retry prompt the implementer (Clove) reads. Each entry carries:

- The stable ID and the criterion text verbatim.
- The exact procedure followed: the command and its exit code, or the file:line inspected, or the behavior attempted.
- Concrete expected-vs-observed, quoted — never "not met." If the Evidence sub-bullet named an expected observation and the actual output diverges, quote both.
- The evidence type (`executed` | `inspected` | `demonstrated`).
- No prescribed fix. An UNMET is a failing-test report, not a diagnosis — root cause is Clove's job, or Sasha's if it needs debugging. A location observation ("the check lives at `foo.ts:42`") is fine; "change X to Y" is lane drift.

## 5. Save the report

**Path:** `.prism/qa/ac-verification-<ticket-id>.md` — one per ticket, created lazily on first save per `.prism/rules/lazy-artifacts.md` (sibling to `.prism/retros/` and `.prism/audits/`).

**Header:** pins the commit SHA (`git rev-parse HEAD`), date, and environment (worktree path or branch name).

**Body:**

1. **Verdict table** up top: `| ID | Verdict | Evidence type | Citation |` — one row per machine-graded criterion.
2. **Captured command output** below the table — the raw evidence for each row, keyed by ID.
3. **Awaiting-human-verification** section (step 6).

**Re-checks never overwrite.** When Reese re-grades after a fix lands, update the verdict table to the new state **and** append a dated re-check log entry underneath it — a refuted verdict is data, and the strike budget needs the trail. Every verdict — first pass or re-check — stamps the SHA it was rendered at.

## 6. Human-tagged criteria

Pull every `Evidence (human): ...` criterion into an **awaiting-human-verification** mini-checklist section in the report. These are never graded and never counted in the machine MET/UNMET/UNGRADEABLE totals — they surface at the human merge gate (the unconditional gate in `lib/report-back.md` § Gate registry) so a human verifies them before the branch merges.

## 7. Re-check scope

On a re-dispatch after a fix, re-grade:

- Every previously-UNMET criterion.
- Any previously-MET criterion whose evidence citations intersect the fix diff's file list (a fix can break something it didn't intend to touch).

Before rendering the final all-clear, run one full pass of every machine criterion's evidence — this is read-only and cheap by construction — so the final table is graded at a single SHA rather than a patchwork of SHAs from earlier passes.

## 8. Converted UNGRADEABLE

A criterion that survives two Reese⇄Clove fix cycles without resolving converts to UNGRADEABLE(`converted`). This pre-empts a third identical fix attempt on a criterion that isn't actually gradeable as written — the primary verdict becomes `needs-replan` (routes to Winston for criterion rewrite), not another `needs-fix` loop. This rides the existing step-07 three-strike rule; strike 2 already escalates the model, and the conversion is the AC-verification-specific escape before strike 3 would park the lane.

## 9. Update the plan and report back

After saving the report, append one line to the plan's `## History`: date, report path, and the MET/UNMET/UNGRADEABLE counts. The plan is the content bus — Eric, Iris, and Briar discover the report through this pointer; `.prism/qa/` is otherwise invisible to them.

**Report-back verdict** per `.prism/skills/prism-conductor/lib/report-back.md` (pointer, not restatement):

- Primary verdict per the contract: all machine criteria MET (born-UNGRADEABLE side-findings permitted) → `done`; ≥1 UNMET → `needs-fix`; all criteria UNGRADEABLE → `needs-replan`; no `## Acceptance Criteria` section at all → `blocked`.
- `acVerdicts` carried per `lib/report-back.md` § Evidence fields — the schema is quoted there only.
