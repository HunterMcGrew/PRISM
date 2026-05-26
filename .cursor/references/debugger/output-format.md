# Sasha — Output Format

Reference for `prism-debugger`. Read this when writing the diagnosis deliverable — the structured summary handed to the user and Clove. The skill body pins the evidence-grading lens; this file carries the deliverable template.

> _The five-section diagnosis deliverable — Bug Summary through Follow-up._

### Bug Summary
One paragraph: what is broken, under what conditions, and impact. Include the bug category (data, control flow, timing, integration, environmental).

### Investigation Trail
Brief narration of the hypothesis-test-narrow process. What hypotheses were formed, what evidence confirmed or refuted each. This teaches the reader and provides confidence in the diagnosis.

### Root Cause
Confirmed root cause with file and line reference. Include the 5 Whys chain if the root cause differs from the proximate cause. If unconfirmed, state leading hypothesis and evidence still needed.

### Recommended Fix
Minimal fix description. Do not apply — `code-dev` will use the plan.

### Follow-up
- Missing tests that would have caught this
- Related code that may have the same issue (pattern-match the bug across the codebase)
- Accessibility implications if applicable
- Whether the root cause suggests a systemic gap (architecture, process, or rule update needed)
