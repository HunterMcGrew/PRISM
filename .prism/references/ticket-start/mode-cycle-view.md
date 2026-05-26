# Nora — Cycle View Mode

> Read-only mode `prism-ticket-start` runs to surface the state of the active cycle — what's ready, what's moving, what's stuck.

When invoked with "show me the cycle", "what's in flight", "cycle view", "sprint view", or similar — surface the state of the active cycle so the user can see what's ready, what's moving, and what's stuck.

1. **Fetch active cycle** — call `list_cycles` for the team from `skills-ecosystem.md § Project Context`, identify the active cycle (the one whose `startsAt`/`endsAt` window covers today). If no active cycle, say so and offer to list the next upcoming cycle instead.

2. **Fetch tickets in the active cycle** — call `list_issues` filtered by the active cycle ID. Pull `id`, `identifier`, `title`, `status`, `assignee`, `labels`, `updatedAt`, and any linked PR data via `attachments`.

3. **Bucket tickets into three groups:**
   - **Ready** — assigned but not started (status = "Todo" or the team's equivalent name for "queued and ready to pick up").
   - **In-flight** — actively in progress (status = "In Progress" **or** has an open GitHub PR linked via `attachments`).
   - **Blocked** — has a label matching `/blocked/i` **or** status = "Blocked" (or the team's equivalent).

   A ticket lands in exactly one bucket. If signals conflict (e.g. "In Progress" + "blocked" label), Blocked wins — the blocker is the user-relevant fact.

4. **Rollover detection** — call `list_cycles` for the previous cycle (the one immediately preceding the active one), then `list_issues` filtered to that cycle. For each ticket in the **In-flight** bucket above whose identifier also appeared in the previous cycle's ticket list **and** was not in "Done" status when that cycle closed, mark it with a `rollover` indicator. Surface the rollover count at the top of the output ("**3 rollover tickets** from PRISM-Cycle-12").

5. **Output format** — single markdown table with the columns below, sectioned by bucket. Rollover count headline above the table.

   ```
   **N rollover tickets from <previous-cycle-name>**

   ### Ready
   | Ticket | Title | Status | Rollover? | Last activity |
   | ------ | ----- | ------ | --------- | ------------- |

   ### In-flight
   | Ticket | Title | Status | Rollover? | Last activity |
   | ------ | ----- | ------ | --------- | ------------- |

   ### Blocked
   | Ticket | Title | Status | Rollover? | Last activity |
   | ------ | ----- | ------ | --------- | ------------- |
   ```

   `Last activity` is the human-readable delta from `updatedAt` to today ("2d ago", "5h ago"). `Rollover?` is `yes` or blank.

6. **Cite stuck patterns** — if any ticket has been in the same status for more than 5 days, append a short note below the table: "Heads up — PRISM-#### has been in Ready for 7 days. Worth checking if it's actually unblocked." This is observational, not a recommendation.

7. **No mutations** — Cycle View is read-only. Do not change statuses, reassign, or add labels from this mode. If the user asks to act on what they see, route through the existing start-ticket or create-ticket paths so the shared-state write confirmation gate applies.
