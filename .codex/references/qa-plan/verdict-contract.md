# PRISM — The Verdict Contract

> _The authoritative semantics for AC-verification verdicts and their `reason` codes — consumed by `prism-qa-plan` (grading), `prism-implement` (dispute), and `prism-retro` (ingestion)._

This doc owns what the verdicts and their `reason` codes *mean*.

## Verdict-state taxonomy

1. **Harness failure ≠ UNMET.** An evidence command that errors, can't run in the worktree, or disagrees with itself across two runs (flake) is UNGRADEABLE(`harness`) with the error captured — never UNMET. A signal that can't run is not a failing signal.
2. **Dead references.** An evidence source naming a command or path that no longer resolves is UNGRADEABLE(`dead-reference`).
3. **Human-only criteria are not AC defects.** Visual, timing, or feel-based criteria get tagged `machine` or `human` on their Evidence sub-bullet at authoring (the plan skill's job). `prism-qa-plan` grades the machine set and emits the human set as a mini-checklist attached to the report — each criterion routed to the verifier that can actually verify it.
4. **Born vs converted UNGRADEABLE.** *Born* — UNGRADEABLE(`ac-defect`): the criterion is vague, unfalsifiable, or carries no evidence source and none can be derived from its text and the repo map's `verification` role — is recorded as a `## Review Issues` open entry; the lane **advances** on the gradeable set. *Converted* (a criterion that survived two grade-and-fix cycles without resolving) routes to `prism-plan` for criterion rewrite — a twice-failed criterion must not ride past review and the merge gate as a cosmetic note.
5. **Born-UNGRADEABLE is not follow-up work.** It's a defect in the *current* plan's AC, owned by `prism-plan` to sharpen — not new-ticket work, which is `prism-start-ticket`'s route. It rides a `## Review Issues` open entry (durable bus).
6. **UNGRADEABLE(`requires-human`)** is emitted in the report's awaiting-human-verification mini-checklist, for a human to verify before merge. Never graded, never silently dropped.
7. **Disputed UNMET.** When the doer (`prism-implement`) believes a rendered UNMET misreads the criterion, it hands both readings to `prism-plan` instead of fixing — never an appeasement fix (a code change with no requirement behind it). `prism-plan` owns the criterion and sharpens the criterion or evidence source, and `prism-qa-plan` re-grades against the corrected version. Two competent readers reaching opposite verdicts is, by this contract's own standard, an ambiguous criterion.
8. **No per-criterion confidence grades.** A confidence dial is the partial-credit escape hatch binary grading exists to remove. Evidence is *typed* instead (`executed` re-runnable > `inspected` file-state > `demonstrated` self-reported) — the type ratio is itself a signal, and wall-to-wall `demonstrated` METs is the rubber-stamp tell.
