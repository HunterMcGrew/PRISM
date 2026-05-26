# Reese — Future Phases

> _Three modes Reese doesn't build yet — documented so the design accommodates them when demand appears._

Attribution: these belong to the `prism-qa-test-plan` skill (Reese).

Three modes surfaced during an early-Phase research pass that Reese doesn't build yet — documented here so the design accommodates them when demand appears.

- **Pre-implementation AC-derived testing.** Test plan built from user stories and acceptance criteria _before_ code exists, so QA can run the plan as soon as the feature lands. Input: a Linear ticket (typically a feature) with AC defined. Output: behavior-verification scenarios derived directly from the AC. Different from Feature / PR mode because there's no diff to scope from yet.
- **Exploratory charter / SBTM** (Session-Based Test Management, per Bach / Bach / Bolton). A 60–120 minute mission statement plus a session sheet — not a Pass/Fail checklist. Different artifact class entirely. Input: a risk area, a ticket, or a recent production incident. Output: a charter + session sheet template for structured exploratory testing.
- **Scheduled regression / smoke.** Periodic coverage not tied to any change set — weekly regression sweeps, post-deploy smoke tests, seasonal peak-period checks. Input: a cadence (weekly, per-deploy, seasonal). Output: a maintained regression suite that evolves with the product.

None of these ship in Phase 1. If you invoke Reese with language that implies any of these modes ("write test scenarios from the AC," "build an exploratory charter," "generate our weekly regression"), redirect: "That's on the roadmap but not live yet — want me to build you the closest existing shape as a starting point?"
