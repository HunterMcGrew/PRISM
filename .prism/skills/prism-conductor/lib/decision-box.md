# Conductor deferred-commit decision box

The Nora-led deferred-commit procedure Sol invokes per distinct deduped `target`. `step-09-reconcile.md` cites this doc; do not restate it there.

The decision box is the boundary between discovering work and committing to it. Nora makes the scope judgment; Sol resolves deterministic run-state lookups; the autonomy policy governs when the commit fires.

## Labor split

**Nora** runs the four-signal scope judgment (per `followup-scope.md`'s scope-fit gate) and resolves a disposition. Nora drafts the ticket and defers the tracker write.

**Sol** picks `fold-active` vs. `followup-pr` from the target lane's merge status — a deterministic run-state lookup from goal-state, never an interpretation call. Sol never judges scope.

**Winston** is consulted only on `escalationReason: "blast-radius"` — Sol routes a Winston read, then dispatches Nora a second time to finalize with Winston's verdict.

## Procedure

### Step A — Nora evaluates (first dispatch)

Sol dispatches Nora with the deduped signal and its `target`. Nora:

1. Runs the four-signal scope-fit gate (per `followup-scope.md`) on the signal.
2. Resolves one of these dispositions:
   - `fold-active` — the fix belongs in an active lane's PR.
   - `followup-pr` — a follow-up PR, no new ticket.
   - `new-ticket` — a distinct new ticket is warranted.
   - `drop` — the signal is noise; no action.
3. If the disposition warrants a ticket: drafts it as a DoR-draft (estimate null, flagged for human ratification). The tracker write is **deferred** — Nora returns the draft, she does not commit it yet.
4. Returns `{ disposition, draftTicket, escalationReason? }` where `escalationReason` is `"blast-radius"` when set. A genuinely ambiguous same-scope-vs-split call is **not** escalated — Nora resolves it herself (over-emit < under-emit; conservative default is the lighter disposition, `fold-active` / `followup-pr`, over a new ticket).

When the originating signal was emitted by a lane with a non-null `team`, Sol carries that `team` value into the decision-box context and onto any resulting lane (fold-in or new ticket) — the new lane inherits the emitting lane's `team` unless the operator or decompose chain explicitly overrides it. **Sol does not strip or reassign team tags** (FR-7; ADR-0049 "Sol never reassigns"). This is a deterministic carry, not a Nora scope judgment — Nora judges scope, Sol carries the team tag.

Sol writes `pendingTicketCommit: true` on the lane and records the step as `routed` in goal-state before proceeding.

### Step B — Fold-vs-follow-up resolution (Sol, deterministic)

When Nora returns `fold-active` or `followup-pr`, Sol reads the target lane's `status` from goal-state:

- Target lane `status: done` → disposition `followup-pr` (worktree cleaned; a new follow-up-PR lane spawns).
- Target lane `status: active | parked` → disposition `fold-active` (open worktree; the fix folds into that lane).

Sol records the resolution without dispatching Nora again on this dimension.

### Step C — Uncertain path (escalation)

When Nora returns `escalationReason: "blast-radius"`:

1. Sol writes `pendingTicketCommit: true`, records step `routed`, dispatches Winston for a blast-radius read.
2. Winston returns its assessment; Sol records step `winston-verdict` in goal-state.
3. Sol dispatches Nora a second time with Winston's verdict to finalize.
4. Nora finalizes the disposition and returns the updated `{ disposition, draftTicket }` without an `escalationReason`.
5. Sol records step `finalized`.

The uncertain path is always: one Nora dispatch → one Winston read → one Nora finalize. Never more.

### Step D — No-escalation path

When Nora returns no `escalationReason`:

1. Sol records step `finalized` in goal-state.
2. If `disposition` is `drop`: no further action; set `processedAt` on the signal.
3. If `disposition` is `fold-active`, `followup-pr`, or `new-ticket` AND the autonomy gate clears:
   - Nora commits the ticket (if warranted).
   - Sol records the outcome in the lane's `signals[]` entry (`disposition`, `processedAt`).
   - The committed ticket / spawned lane records the inherited `team` in its `lanes[]` entry (carried from the emitting lane per the team-tag carry in Step A).
4. If the autonomy gate does not clear (`internal`/`launch` above trivial): Nora returns `needs-human`; Sol batches the draft into `pendingHumanReport`.

## Crash safety

`goal-state` is written at each decision-box step before the next step begins:

| Step | `pendingTicketCommit` | Record in goal-state |
| ---- | -------------------- | -------------------- |
| After Nora's first dispatch | `true` | step = `routed` |
| After Winston's verdict | `true` | step = `winston-verdict` |
| After Nora finalizes | `false` | step = `finalized`, `disposition` set, `processedAt` set |

On resume after a crash:

- Step `routed` present, no `winston-verdict` → re-dispatch Winston.
- Step `winston-verdict` present, no `finalized` → re-dispatch Nora to finalize.
- Step `finalized` present → the decision box is complete; skip.

No signal recorded before the crash is dropped. `pendingTicketCommit: true` means the ticket was drafted but not committed — surface it to the human on resume if the commit didn't land.

## Cross-references

- `lib/reconcile.md` — the reconcile primitive that identifies distinct deduped targets and calls the decision box per target.
- `lib/report-back.md` — the `needs-human` verdict shape and autonomy-gate batching.
- `.prism/rules/followup-scope.md` — the four-signal scope-fit gate Nora runs inside the decision box.
