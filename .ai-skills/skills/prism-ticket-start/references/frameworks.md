# Triage Frameworks

Reference content for Nora's triage assessments. Loaded by `SKILL.md` when running Definition of Ready, severity classification, impact assessment, scope/INVEST checks, blast radius mapping, or requirements quality review. Cite the framework by name when applying it ("this fails the INVEST 'Estimable' test" / "putting this at S2 because…") so downstream personas can audit the reasoning.

---

## Severity Classification

| Level | Label | Criteria | Example |
|-------|-------|----------|---------|
| **S1** | Critical | System down or data integrity at risk. No workaround. Affects all/most users or dealers. Revenue-impacting or data-corrupting. | Inventory sync deleting records. Checkout flow crashing on all sites. |
| **S2** | High | Major feature broken. Workaround exists but is painful or non-obvious. Affects many users. Core workflow degraded. | Filters return wrong results. Quote form submits but doesn't reach dealer. Equipment images not loading on mobile. |
| **S3** | Medium | Feature degraded. Reasonable workaround exists. Affects some users. Non-core workflow. | Sort order resets on page reload. Admin settings don't save on first try (works on retry). Slow image gallery on one browser. |
| **S4** | Low | Cosmetic or minor inconvenience. Easy workaround or negligible impact. Affects few users. | Button alignment off by 4px. Placeholder text typo. Tooltip shows on wrong side on one breakpoint. |

**Priority ≠ Severity.** A Low-severity bug on every dealer's homepage (blast radius: thousands of visitors daily) is higher priority than a High-severity bug in an admin tool used by three people. Always assess both dimensions before recommending priority.

---

## Impact Assessment

For any ticket — bug, feature, or improvement — assess impact across four dimensions:

- **Reach** — how many users, dealers, or sites are affected? All sites vs one site? All users vs admin-only? End customers vs internal staff?
- **Severity/Value** — how badly affected (bugs) or how much value delivered (features)? Can they work around it?
- **Frequency** — how often does this occur or how often will this be used? Every page load vs once a month? Daily workflow vs annual configuration?
- **Business cost** — revenue risk? Dealer churn risk? Compliance risk? Reputation risk? Does this block other work?

**Quick prioritization:** Impact = Reach × Severity × Frequency. Layer business cost on top. High reach + high severity + high frequency = drop everything. Low reach + low severity + low frequency = backlog.

When recommending a priority, show the reasoning: "Putting this at High — it's S2 severity affecting all dealers (high reach), happens on every inventory page load (high frequency), and there's no workaround. The only reason it's not Urgent is that it's a degradation, not a total failure."

---

## Definition of Ready

A ticket is "ready" when the next skill in the chain can start without coming back to ask questions.

**Universal (all types):**
- [ ] Goal is stated as a problem or outcome, not a solution
- [ ] Ticket type is labeled (bug / feature / improvement / DX)
- [ ] Scope is bounded — "in scope" and "out of scope" are explicit
- [ ] Acceptance criteria exist or can be derived from the description
- [ ] No unresolved blockers or dependencies
- [ ] Estimate exists or the ticket is estimable from the description
- [ ] Downstream skill can start from what's here (Winston can plan / Mira can write stories / Sasha can investigate)

**Bug-specific additions:**
- [ ] Steps to reproduce are present and verified (or marked suspected)
- [ ] Environment specified (staging / production, browser, device)
- [ ] Expected vs actual behavior described
- [ ] Severity classified (S1-S4) with rationale
- [ ] Blast radius assessed (affected sites, features, users, regression risk)
- [ ] Root cause identified (verified or suspected) — or flagged for Sasha

**Feature-specific additions:**
- [ ] User and their goal identified (not just "the system should...")
- [ ] Success criteria defined — how do you know when this is done?
- [ ] Edge cases or secondary users noted (even if just "TBD for Mira")
- [ ] Design reference linked or flagged as needed (no mock → flag for Pixel)

**Improvement-specific additions:**
- [ ] Current behavior described concretely
- [ ] Proposed change and rationale explained — why is the current way insufficient?
- [ ] Migration or backward compatibility considered if applicable

When a ticket fails the DoR, don't block silently — say what's missing and offer to help: "This needs scope boundaries before it's ready. Want me to help pin down what's in and what's out?"

---

## INVEST Criteria (Scope Assessment)

Evaluate whether a ticket is workable. Flag violations by name.

- **I — Independent:** Can this be worked on without waiting for another ticket? If not, flag the dependency and assess whether to decouple or sequence.
- **N — Negotiable:** Is there room to adjust scope during implementation, or is this locked to a specific solution? Tickets that prescribe implementation are fragile — the team should have room to find the best approach.
- **V — Valuable:** Does this deliver value to a user or the business? Pure technical refactors should articulate the user-facing benefit (faster load times, fewer errors, reduced maintenance cost).
- **E — Estimable:** Can the team estimate the effort? If it's too vague or too novel to estimate, it needs discovery first (Mira for requirements, Winston for technical feasibility), not implementation.
- **S — Small:** Can this be completed in one cycle? If not, split it. A ticket that spans multiple sprints is a project, not a ticket.
- **T — Testable:** Can you write acceptance criteria that verify when this is done? If the description says "should be fast" or "should look good," it's not testable. Pin it: "Fast means under 2 seconds on 3G" or "Good means matching the existing card pattern."

---

## Splitting Strategies

When a ticket fails the S (Small) test, or when the scope feels unbounded:

- **By user type** — admin vs frontend user vs API consumer. Ship one user's experience per ticket.
- **By workflow step** — separate create / edit / delete into individual tickets. Each is independently valuable.
- **By data type** — one ticket per entity when changes touch multiple models. Reduces blast radius.
- **By happy path vs edge cases** — ship core behavior first, handle edge cases in follow-up tickets.
- **Vertical slice** — one ticket delivers one thin path from UI to data layer. Never split horizontally (frontend in one ticket, backend in another) — that creates integration risk and blocks testing.

When suggesting a split, name the strategy: "This ticket covers create, edit, delete, and bulk operations for equipment listings. I'd split by workflow step — create first (it unblocks the demo), then edit and delete, then bulk as a follow-up."

---

## Complexity Signals

Tickets that are "bigger than they look." Flag these in the summary:

- Touches shared components used by multiple blocks or pages
- Requires changes across both frontend and backend
- Involves data migration or schema changes
- Needs coordination with external APIs or services
- Has no existing pattern to follow (novel architecture)
- Crosses the server/client boundary in a new way
- Affects both the block editor AND the frontend rendering
- Modifies behavior of a block that's used on every dealer site

Example surfacing: "Heads up — this touches the mega menu block, which is on every dealer site. Complexity signal: high blast radius, shared component, editor + frontend rendering. The estimate may need revision."

---

## Requirements Quality

When building requirements or reviewing a ticket description, check for:

**Ambiguity red flags** — words that signal unclear requirements:
- "appropriate," "suitable," "reasonable" — appropriate to whom? By what standard?
- "etc.," "and so on," "similar items" — what specifically? List them.
- "fast," "responsive," "user-friendly" — measurable to what threshold?
- "should" (ambiguous intent) vs "must" (clear requirement)
- "handle errors gracefully" — what does gracefully mean? Toast? Inline? Modal? Recovery path?
- "improve" without criteria — improve by what measure?

When you spot these, pin them: "The description says 'handle errors appropriately' — appropriate how? Let's define the error states and recovery paths so Clove doesn't have to guess."

**The "tomorrow test":** If you read this ticket tomorrow with no context, can you start working? If the answer is "I'd have a list of questions first," those questions should be answered in the ticket now.

**Completeness check:**
- Who is the user? (Not "the user" — which user?)
- What are they trying to accomplish?
- What does success look like?
- What does failure look like? (Edge cases, error states)
- What's in scope and what's out of scope?

---

## Blast Radius Assessment

For bugs, map blast radius before recommending priority:

1. **Which sites?** All dealer sites, or specific ones? Is the bug in shared code (affects everyone) or site-specific config (affects one)?
2. **Which pages/features?** Just this page, or anything that uses the same component or block?
3. **Which users?** All visitors, logged-in users, admin users, specific roles?
4. **What shares the code path?** If the bug is in a shared component (SlidingPanel, SearchBox, mega menu, carousel), other features using it may be affected.
5. **Regression risk of the fix:** What could the fix break? Heavily shared code paths need extra review scrutiny. Flag for Briar.

---

## Dependency Detection

Before recommending priority or status, check for dependencies:

- **Blocked by** — is this ticket waiting on another ticket, an API change, a design decision, or an external dependency? If blocked, don't put it in Todo — it'll sit there and create false signal.
- **Blocking** — are other tickets waiting on this one? Blockers get a priority bump. Flag: "THR-1234 is waiting on this — that changes the priority calculus."
- **Related** — are there tickets in the same area that should be sequenced together? Batch-related work reduces context-switching for Clove and Winston.
