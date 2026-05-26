# Nora — Create-Ticket Path

> Procedure `prism-ticket-start` follows when the user wants to create a new ticket rather than start an existing one. The intent detection stays in the skill body; this file carries the full create flow.

When the user wants to create a new ticket rather than start an existing one. Triggered by phrases like "I found a bug", "create a ticket", "new ticket", "file a bug", "log this as a ticket".

1. **Detect intent** — distinguish from "start PRISM-123". If `$ARGUMENTS` contains a ticket ID, use the normal startup flow. If it contains create-ticket language, use this path.

2. **Determine ticket type** — if obvious from context (e.g. "I found a bug" → bug), use it. Otherwise ask: "What type of ticket is this — bug, feature, or improvement?"

3. **Collect required fields** based on type (see `../../templates/ticket-types.md`):
   - **Bug**: walk through `../../templates/bug-report.md` interactively — severity (use S1-S4 scale with criteria), environment, repro steps, expected/actual behavior, root cause (if known — mark as `verified` or `suspected`), suspected fix (if apparent), **blast radius assessment** (which sites, pages, users, shared code paths), and acceptance criteria (derive from repro steps + expected behavior, include edge cases). Run the **"tomorrow test"** on the description before finalizing.
   - **Feature**: ask for objective (problem/outcome framing, not solution) and scope (what's in, what's out). Check for **ambiguity red flags**. If the feature has UI implications: "Does a mock or design exist for this? If not, we may want Pixel involved."
   - **Improvement**: ask for current behavior (concrete, not vague), proposed change, and rationale. Check against **INVEST criteria** — is this estimable? Testable? Small enough for one cycle?

4. **Determine team** — use the team from `skills-ecosystem.md § Project Context`. Do not ask.

4b. **Follow-up scope-fit gate** — if the ticket is being created as a **follow-up** to existing work (signals: invoked from another persona's session, the description cites a review comment or plan decision, the title contains "follow-up" / "followup" / "remaining" / "rest of", or the user explicitly says "create a follow-up"), run the scope-fit gate from `../../rules/followup-scope.md § Scope-fit gate` before creating:

   - **Print the proposed scope** as a single block — title, description, originating ticket reference, and the decision or review comment that produced the follow-up.
   - **Check against the four gate criteria:**
     - One fix or one feature — the ticket addresses a single concern, not a bundle.
     - Traceable to one decision — the follow-up cites the specific decision, review comment, or plan entry in the originating ticket.
     - Has a done condition — a reader landing on the ticket cold can tell when it's complete.
     - Owned by a known persona class — the follow-up names implementation, debugging, design, or documentation as the kind of work.
   - **If all four pass:** proceed to step 5 (priority & triage).
   - **If any fail:** print which criterion failed and ask the user to narrow scope. Example: "This follow-up bundles two concerns — the helper extraction and the test additions. The scope-fit gate wants one or the other. Which is more urgent?" Do not create the ticket until the gate passes.
   - **Explicit override:** the user can force creation by saying "create it anyway" or equivalent. If they override, append `> Scope-fit gate overridden by user` to the ticket description so the next reader sees the trail.

   The gate does not fire for net-new tickets (a freshly discovered bug, a brand-new feature) — those route through the normal create flow without the follow-up framing. See `../../rules/followup-scope.md` for the full rule and anti-patterns.

5. **Priority & triage guidance** — before creating, recommend where this ticket should land using the **impact assessment framework**:
   - **Priority** — recommend using the impact formula (Reach × Severity × Frequency + business cost):
     - **Urgent** — S1-S2 + high reach + no workaround + revenue impact. Cite: "This is Urgent because [specific impact]."
     - **High** — significant impact but workaround exists or reach is bounded. Cite the reasoning.
     - **Normal** — clear value, no time pressure, moderate impact.
     - **Low** — nice-to-have, limited impact, easy workaround.
   - **Status placement** — recommend based on readiness and urgency:
     - **Triage** → not enough information yet, needs clarification or repro steps. "This needs more detail before it's ready — parking in Triage."
     - **Backlog** → valid work but not urgent, no current cycle pressure. Passes DoR but not time-sensitive.
     - **Todo** → ready to be picked up, well-defined, passes DoR, but not in the current sprint.
     - **Current cycle** → time-sensitive, blocking other work, or small enough to slot in now.
   - **Rationale** — explain the recommendation in one sentence with the impact reasoning.
   - **Complexity signals** — flag any that apply: "Heads up — this touches the inventory sync, which is shared infrastructure. May be bigger than it looks."
   - Present the recommendation and let the user confirm or adjust before creating

6. **Estimate** — recommend story points using the scale defined in step 4e of the normal startup path. Present with reasoning, confirm with user, and include in the `save_issue` call. Do not create a ticket without an estimate.

7. **Create the ticket** via `save_issue`:
   - Set title, description (formatted per type, all template sections present), team, priority, and estimate
   - Apply the appropriate label (`bug`, `feature`, or `improvement`)
   - Set the status based on the agreed triage placement from step 5

8. **Stop and confirm** — creating a ticket is complete. Wait for the user before continuing with branch setup, assignment, or local work.
   - Present the created ticket summary (ID, title, URL, priority, estimate, status)
   - Then pause: "Ticket's created. Let me know when you're ready to start working on it."
   - Only proceed with branch setup (step 6 onward from the normal startup flow) if the user explicitly says they want to start — look for phrases like "start", "let's work on", "pick up", "ready to start", "set me up". Phrases like "create a ticket" or "file a bug" mean they just wanted the ticket, not the full setup.
   - If the user invokes Nora again later with the ticket ID and start language, resume from step 6 (branch state check) of the normal startup flow.
