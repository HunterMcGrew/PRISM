# Intent conformance and scope

Does the diff deliver what the intent asked for, and nothing it didn't? Trigger: always. It reads structural `not reached` when no `intent.md` and no `## Acceptance Criteria` in `plan.md` exist.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Grade every acceptance criterion.** Grade each one per § `Grading a criterion`. An unmet criterion is a finding. An ungradeable one names what would make it gradeable.
- **Non-functional constraints.** Check the diff against each constraint `intent.md`'s proposed outcome names, such as contrast, performance, or type safety. A diff that breaks one is a finding.
- **Out-of-scope changes.** Work the plan didn't specify, with no stated reason anywhere, is a finding of kind "out-of-scope change".
- **Plan drift.** Handle it per § `Plan drift is reconciled, not reported`.
- **Re-test each "leave it alone" Decision.** For each Decision that leaves code unchanged, ask what breaks if the unchanged code and the new code drift apart. A real answer is a finding.

## Grading a criterion

**Where the criteria come from.** On a plan folder, read the criteria under `intent.md`'s acceptance criteria heading, per `.prism/templates/intent.md` § `Acceptance criteria`. A folder with no `intent.md`, such as an epic child, keeps them in `plan.md`'s `## Acceptance Criteria`, so read those. On a flat plan, read the plan's `## Acceptance Criteria`. The review never edits criteria in either file, so a criterion that reads wrong is a finding.

**Each grade is met, unmet, or ungradeable, with the evidence behind it.** Follow the criterion's own Evidence sub-bullet.

- **Met.** The Evidence ran or was inspected and showed what the criterion says. Name the command and its result, or the file and line. A `human` Evidence line is never graded met by the reviewer. Only a person grades it, so it goes on a short list of criteria awaiting human verification, never graded and never dropped.
- **Unmet.** The Evidence ran and showed something else. Quote the observation that contradicts the criterion.
- **Ungradeable.** The review could not reach a verdict. Name the reason:
  - an evidence command that errors, can't run in the worktree, or disagrees with itself across two runs is a harness failure, never unmet, because a signal that can't run is not a failing signal
  - an evidence source that names a command or path that no longer resolves is a dead reference
  - a criterion that is vague, unfalsifiable, or carries no evidence, with none derivable from its text, is a defect in the criterion

A criterion defect is a defect in the current plan, so it is not follow-up work. Record it as an open finding, and the criterion's owner sharpens it: `prism-intent` on a plan folder, `prism-plan` on a flat plan. The rest of the review goes on with the gradeable criteria.

**No confidence grades.** A per-criterion confidence dial is the partial-credit escape hatch a three-way grade exists to remove. Type the evidence instead: `executed` (re-runnable) beats `inspected` (file state), which beats `demonstrated` (self-reported). A review where every grade rests on `demonstrated` evidence is a rubber stamp.

**A disputed unmet.** When the author believes an unmet grade misreads the criterion, the fix is not a code change with no requirement behind it. Both readings go to the criterion's owner, who sharpens the criterion, and the next round grades the corrected version. Two competent readers reaching opposite grades means the criterion is ambiguous.

**Where the grades go.** Write them as sub-bullets under the round's record line in `## Review`, or in `## Review Issues` on a flat plan, one line per criterion: its ID, its grade, and its evidence type.

## Plan drift is reconciled, not reported

Every observation about the plan lands in one of two buckets, and the reviewer reports only the second. Cosmetics are neither, per `REVIEW.md` § `Severity`.

**Fix in place, the default, where nearly everything lands.** A `## PR Readiness` line that no longer matches the branch, a `## Decisions` entry missing its verdict sub-bullet, a Decision whose wording describes something other than what shipped. Work out which side is stale, edit the plan, and list what you edited in the report. No severity, no round trip. The review fixes drift in place only in the sections of `plan.md` other than `## Tasks`.

**Report as a Minor, and leave as written.** Two things are never edited. A task whose stated approach the code did not take, including a task a later Decision contradicts, is reported as a Minor finding and the task stays as written, because the task list is the plan's contract and the review has no authority to rewrite it. A difference between the diff and `intent.md` is a finding too, and the review never edits `intent.md`.

**Report only at a genuine impasse.** A Minor, stating what could not be resolved and what would settle it. It is for the case where the ticket, the diff, and the session history still leave it unclear which side is stale, most often because the code appears to contradict the Decision itself rather than merely post-date it. Reaching for it routinely is declining the reconciliation rather than hitting one.

### Reconcile against the Decision

A `## Decisions` entry records intent that predates the code, so when a Decision and some other plan text disagree, the Decision is what the rest gets reconciled against. `.prism/rules/branch-plan.md` § `Preserve Intentional Logic` already makes a Decision do-not-undo for implementation. This narrows what a reviewer does about a contradiction rather than changing what a Decision means.

**Check the Decision against fact first.** A Decision is not review authority and does not override fact. When it contradicts a manifest-matched architect doc, visible repo practice, or an external system's real behavior, that contradiction is the finding, reported at its own severity and never reconciled around. Everything below governs plan-internal drift, once the Decision has passed that check.

Three sources settle it, and the reviewer uses all three: the ticket's intent, what the implementation did, and the session history. Two worked shapes:

- A Decision and some other plan prose outside `## Tasks` disagree, and the code matches the Decision. The prose is stale and gets fixed.
- A task says one thing, a later Decision contradicts it, and the code matches the Decision. The task is reported as a Minor and left as written, and the Decision stands.

In both, the code tells the story and the plan is what drifted.

Never silently reverse a Decision to match the code. A Decision reversed by inference is an intentional constraint undone without anyone deciding to. That case is the impasse, and it goes in the report.

Stack checks for this pass, when the repo has them: `.prism/review/stack/intent-scope.md`.
