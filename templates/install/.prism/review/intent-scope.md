# Intent conformance and scope

Does the diff deliver what the intent asked for, and nothing it didn't? Trigger: always. It reads structural `not reached` when no `intent.md` and no `## Acceptance Criteria` in `plan.md` exist. On an epic child, whose folder holds no `intent.md`, the intent in this pass and every other pass file is the epic's `intent.md`, in the folder its `spec.md`'s `epic:` line names.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Grade every acceptance criterion.** Grade each one per § `Grading a criterion`. An unmet criterion is a finding. An ungradeable one names what would make it gradeable.
- **Non-functional constraints.** Check the diff against each constraint `intent.md`'s proposed outcome names, such as contrast, performance, or type safety. A diff that breaks one is a finding.
- **Out-of-scope changes.** Work the plan didn't specify, with no stated reason anywhere, is a finding of kind "out-of-scope change".
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

A criterion defect is a defect in the current plan, so it is not follow-up work. Record it as an open finding, and the criterion's owner sharpens it: `prism-intent` on a plan folder, `prism-plan` on an epic child's folder or a flat plan. The rest of the review goes on with the gradeable criteria.

**No confidence grades.** A per-criterion confidence dial is the partial-credit escape hatch a three-way grade exists to remove. Type the evidence instead: `executed` (re-runnable) beats `inspected` (file state), which beats `demonstrated` (self-reported). A review where every grade rests on `demonstrated` evidence is a rubber stamp.

**A disputed unmet.** When the author believes an unmet grade misreads the criterion, the fix is not a code change with no requirement behind it. Both readings go to the criterion's owner, who sharpens the criterion, and the next round grades the corrected version. Two competent readers reaching opposite grades means the criterion is ambiguous.

**Where the grades go.** Grades go in the review's report to the session. An unmet criterion is a finding. Criteria awaiting a person are listed in the PR body.

Stack checks for this pass, when the repo has them: `.prism/review/stack/intent-scope.md`.
