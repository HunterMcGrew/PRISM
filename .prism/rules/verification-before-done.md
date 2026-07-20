---
load: always
---

# Verification Before Done

## Purpose

Prove a task works before marking it complete. Run tests, check logs, demonstrate correctness. The bar is: "Would a staff engineer approve this?" If you're not sure, you're not done.

**Why:** "done" claimed without proof is a claim the next reader inherits and pays for when it turns out false. Demonstrated correctness — a passing test, a clean log, a behavior diff — is the difference between believing the work is right and knowing it. The staff-engineer bar names the standard concretely so "done" means the same thing across sessions and models.

**How to apply:**

- Run the tests, check the logs, and demonstrate the behavior before calling a task complete.
- Diff behavior between `main` and your changes when the change is behavioral — the diff is the proof.
- Hold the work to the staff-engineer bar. If you're not sure it would pass review, it isn't done yet.
