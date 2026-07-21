# QA Test Planning

Reference material for manual QA test plans — the craft, not the mechanics. Reese is the primary reader; other skills (Briar reviewing QA artifacts, Clove writing tests that mirror QA coverage) can reference this doc when they need the vocabulary.

The mechanics of Reese's skill — mode detection, per-mode workflows, the authors-ship closing — live in `.claude/skills/prism-qa-test-plan/SKILL.md`. This doc holds the things that don't change regardless of which mode Reese is running: how a good test plan reads, what techniques to reach for, what regression signals to watch.

---

## The QA Test Plan Specialist Role

A QA test plan specialist writes manual test plans from a change set. The change set can be almost any shape — a full release, a sprint's worth of PRs, a single feature, a hotfix, a bug fix verification — and the specialist's job is to pick the shape of the artifact that matches the shape of the work.

**Inputs that drive a test plan:**

- **Release** — a tag range, a set of PRs merged between two versions
- **Sprint / group** — a cluster of in-flight PRs, a commit range on a feature branch
- **Single feature or PR** — one user-visible change, often tied to one ticket
- **Bug-fix verification** — a single PR fixing a defect, with a bug report to verify against
- **Pre-implementation** — test plan built from acceptance criteria before code exists
- **Exploratory charter** — a time-boxed session mission, not a checklist
- **Scheduled regression / smoke** — periodic coverage not tied to any change set

Different inputs produce different artifacts. A release gets a full checklist with scope tables, risk-based coverage, and sign-off. A single PR gets a tight impact-analysis checklist. A bug fix gets a verification plan structured around the bug report. An exploratory charter is a mission statement and a session sheet, not a Pass/Fail list at all.

**What stays the same across input shapes:**

- The tester-first voice — plain English, observable outcomes, no jargon
- Risk-based allocation — testing effort proportional to likelihood × impact
- The regression question — "what else could this have broken?"
- ${TICKET_PREFIX}-\* traceability — every scenario maps back to a ticket; every ticket has at least one scenario
- Coverage of edges, not just happy paths

**What changes:**

- Scope filter — a release excludes many PRs as agentic/tests-only; a single PR has nothing to exclude
- Traceability format — a release uses a ticket table + RTM; a single PR calls out its one ticket inline
- Regression depth — a release sweeps shared surfaces broadly; a single PR targets only the surfaces its diff touched
- Document skeleton — release has a full scope table and sign-off; a bug-fix verification opens with the bug report banner

---

## Writing Rules

These apply to every scenario, step, and checklist item regardless of mode.

**Use:**

- Plain English — describe what the tester sees and does
- Outcomes: "form submits successfully", "preview loads without errors", "no server error page"
- Action verbs: "Navigate to...", "Click...", "Verify that..."
- Conditional phrasing: "If your site has X" — never assume every tenant has compare, showroom, etc.
- Specific locations: "In the block editor sidebar under [Panel Name]" — not "in the settings"

**Avoid:**

- Stack jargon: RSC, Apollo, resolver, bundle names, component names, file paths
- Vague assertions: "verify it works correctly", "check that nothing is broken"
- Implementation details: function names, TypeScript types, build steps
- Developer-only concerns: test coverage, linting, type safety

**When multiple tickets overlap one scenario:** list all ticket IDs on the **Tickets:** line.

**Surface-specific guidance:**

- **Search:** distinguish header Advanced Search vs full-page search route vs Kronos / equipment list blocks — different surfaces, different scenarios
- **404 / not found:** include when `not-found` or ticket text implies it
- **Block editor icon pickers:** include when commits touch editor icon UI
- **Sitewide block rendering:** include a pass when the range includes a blocks renderer / registry refactor

---

## Test Design Techniques

Reach for these based on what the change actually does. Not every technique applies to every scenario — pick the ones that fit.

| Technique                    | When to use                            | Application                                                                                                         |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Equivalence partitioning** | Inputs that should behave the same way | A field accepting 1-100 has three partitions: below (0), within (50), above (101). One test per partition.          |
| **Boundary value analysis**  | Bugs cluster at boundaries             | For 1-100: test 0, 1, 2, 99, 100, 101. Off-by-one errors live at edges.                                             |
| **Decision table testing**   | Multiple interacting conditions        | 3 conditions = 8 combinations. Most teams think of 2-3. Build the table, test all paths.                            |
| **State transition testing** | Entities with distinct states          | Map states and transitions. Test every valid transition. Then test invalid ones — can a Cancelled order be Shipped? |
| **Error guessing**           | Experience-driven edge cases           | "What input would a careless user try?" Empty strings, whitespace, emoji, very long strings, past dates.            |

---

## Risk Heat Map

For each feature in a change set, assign likelihood (1-3) and impact (1-3). Multiply for a score, then scale test depth accordingly.

| Score   | Testing depth                                       |
| ------- | --------------------------------------------------- |
| **7-9** | Exhaustive — all paths, edge cases, error states    |
| **4-6** | Thorough — happy path, key edge cases, error states |
| **2-3** | Happy path + one edge case                          |
| **1**   | Smoke test only                                     |

**Likelihood factors**: code complexity, amount of change, history of bugs in the module, dependencies on external systems, whether the code is new vs. modified vs. unchanged.

**Impact factors**: number of users affected, revenue impact, data loss potential, whether the failure is recoverable.

---

## Regression Risk Signals

After covering what the change should do, Reese asks what the change might have broken. Some surfaces ripple — a tweak in one place shows up in places that weren't touched in the diff. Watch for commits that touch:

- **Shared components** — anything in `components/ui/`, `components/layout/`, or shared hooks (`use-*` files imported by multiple blocks)
- **Block renderer / registry** — affects every block on every page
- **Global styles / CSS** — layout, typography, theme changes can shift spacing or visibility sitewide
- **Utility functions** — shared helpers in `lib/`, `utils/`, or `helpers/` that multiple features depend on
- **PHP endpoints or middleware** — REST API changes, auth logic, or server-side rendering can break surfaces that seem unrelated
- **Next.js routing / app directory** — changes to `layout.tsx`, `not-found.tsx`, middleware, or route structure
- **WordPress hooks / filters** — PHP hook changes can silently alter behavior downstream

**For each regression risk found:**

1. Identify the surface that could be affected (e.g. "all blocks using the shared Image component")
2. Write 1–3 spot-check scenarios — specific, observable things a tester can verify
3. Use the standard writing rules — plain English, action verbs, expected outcomes

**If no regression risks are found:** still include the regression section with a note like "No shared surfaces were modified in this range. Standard smoke test recommended," and include a minimal smoke test (homepage loads, navigation works, a sample block renders in the editor).

---

## Anti-Patterns

Three ways test plans quietly fail. Watch for these when reviewing your own work.

### Happy-path-only testing

Testing only that the feature works when everything goes right tells you very little — that's what the developer already verified. The bugs live in error states, edge cases, unexpected input, and interrupted flows. If every scenario is a happy path, the test plan is incomplete.

### Vague pass/fail criteria

"Should work correctly" and "verify functionality" force the tester to invent their own definition of correct. Every scenario needs a concrete expected result that two different testers would evaluate the same way.

### Under-testing high-risk areas

Writing thorough tests for simple features (they're easy to test) and cursory tests for complex features (they're hard to test) inverts the risk profile. The complex, high-impact areas deserve the most attention, even though they take more effort to write scenarios for.

---

## Domain Context

Domain-specific testing concerns (multi-tenancy, complex filtering, mobile-field scenarios, B2B workflows, CMS editor surfaces, etc.) are per-team and shape what a thorough test plan covers. Phase 3 (Winston codebase scan) will populate this section based on your team's product domain; until then, testers default to general best practices for the team's product surface.

---

## Output Shapes — Quick Reference

Different change-set shapes produce different artifact shapes. The mode Reese dispatches on determines the skeleton, but the underlying craft (techniques, writing rules, regression signals) is the same across all of them.

| Mode                     | Opens with                        | Scope filter                     | Traceability                            | Regression depth                          | Sign-off |
| ------------------------ | --------------------------------- | -------------------------------- | --------------------------------------- | ----------------------------------------- | -------- |
| **Release**              | Release reference + scope intro   | Out of scope table, full RTM     | Ticket table mapping ${TICKET_PREFIX}-\* to sections | Broad sweep of shared surfaces            | Required |
| **Sprint / Group**       | Range / PR list + scope intro     | Out of scope table, per-PR table | Per-PR ticket callouts                  | Shared surfaces across the group          | Required |
| **Feature / PR**         | PR reference + inline ticket      | None (single change)             | Inline ${TICKET_PREFIX}-\* with ticket AC if present | Targeted — only surfaces the diff touched | Required |
| **Bug-fix Verification** | Bug report banner (severity, env) | None (single change)             | Inline ${TICKET_PREFIX}-\* with bug repro steps      | Diff-driven plus root-cause adjacency     | Required |

---

## How a Good Test Plan Reads

When you're done, scan the file as if you're the tester picking it up tomorrow. Ask:

- Can I pick this up cold and start testing? (No hidden context required.)
- Does every step have a concrete, observable expected result?
- Does the coverage match the risk — heavy where it matters, light where it doesn't?
- Did I cover what the change might have broken, not just what it should do?
- Can every scenario trace back to a ticket, and does every ticket have coverage?

If yes to all five, the plan respects the tester's time. That's the bar.
