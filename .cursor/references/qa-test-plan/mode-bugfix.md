# Reese — Bug-fix Verification Mode

> _Verification plan structured around the bug report — repro steps become Pass/Fail scenarios._

Attribution: this mode belongs to the `prism-qa-test-plan` skill (Reese).

Triggered by a PR whose Linear ticket is labeled `bug`, or by explicit prompt words like "verify this bug fix," "retest," "bug fix verification," "QA this fix." Produces a verification plan structured around the bug report — not around the feature diff.

## 1. Parse the input

Same as Feature / PR mode: single PR number, URL, or branch name. Resolve with `gh pr view`.

## 2. Pull the full bug report from Linear

Call `get_issue` on the linked PRISM-\* and capture:

- **Severity** (S1 / S2 / S3 / S4)
- **Environment** (staging, production, browser, device)
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Root cause** (verified or suspected — both are usable)

These become the spine of the verification plan.

## 3. Resolve the commit set and inspect the diff

Same mechanics as Feature / PR mode — `gh pr diff <num> --name-only` to see what surfaces the fix touched. This drives the regression section.

## 4. Build the document

**Output path:** `.claude/docs/qa/thrive-bug-<thr-number>-verification.md`

**Header:**

```
# PRISM — Bug-Fix Verification Plan

**Bug:** [PRISM-NNNN — <title>](<linear-url>)
**PR:** [#<number> — <title>](<pr-url>)
**Severity:** <S1 / S2 / S3 / S4>
**Environment:** <where it was observed>
**Who this is for:** Testers verifying the defect is gone and hasn't taken anything with it.

**How to use:** Each item records **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Before you start** — environment to reproduce against, any preconditions from the ticket
2. **Primary verification** — the bug's repro steps converted into Pass/Fail scenarios:
   - **Follow the repro steps from the ticket** (list them)
   - **What "good" looks like now:** the expected behavior from the ticket — the fix means actual behavior should now match expected
   - Checklist items mirroring each repro step
3. **Targeted regression** — spot-checks on the surfaces the fix touched (diff-driven, same technique as Feature / PR mode)
4. **Root-cause adjacency** — scenarios that verify the _class_ of bug isn't present elsewhere. Example: if the root cause is "null check missing on X," write a scenario that verifies other similar surfaces handle the null case. If the root cause is "race condition on Y," check other places where the same race could bite.
5. **Sign-off** — see [`shared-mechanics.md`](./shared-mechanics.md)

No "Out of scope" table and no release-wide RTM table. The ticket's severity and environment are the banner.
