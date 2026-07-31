# Verification Before Done

## Purpose

A completion claim names its evidence. "Done" backed by a passing test, a clean log, or a behavior diff is knowledge; "done" without evidence is a belief the next reader inherits and pays for when it turns out false. The bar is: "Would a staff engineer approve this?" If you're not sure, you're not done.

**Why:** demonstrated correctness is the difference between believing the work is right and knowing it. The staff-engineer bar names the standard concretely so "done" means the same thing across sessions and models.

**How to apply:**

- When claiming a task is complete, name the evidence the claim rests on — a test result, a log, a behavior diff. A claim with no evidence to name isn't ready to be made.
- When the change is behavioral, the behavior diff between `main` and the change is the proof worth citing.
- Hold the work to the staff-engineer bar. If you're not sure it would pass review, it isn't done yet.
