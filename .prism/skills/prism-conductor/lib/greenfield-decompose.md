# Conductor greenfield decompose chain

The Parker→Winston→Nora conducted-segment chain Sol runs in greenfield mode. `step-02-decompose.md` § Greenfield mode cites this doc; do not restate its content there.

## Inputs

A PRD document path and an architecture document path (both already-authored — Sol conducts the chain, it does not write specs). If the operator has no PRD or architecture document, they run Parker and Winston first; the greenfield decompose chain takes their output as inputs.

## The chain

Sequential. Each step is a Sol-dispatched agent running the named persona's skill.

1. **Parker** reads the PRD and emits **epic** lanes — initiative-grain, each with a one-line `scope` statement.
2. **Winston** reads the PRD + architecture + Parker's epics and emits **issue** lanes — architecture-grain task breakdowns, each with `parentId` → its epic.
3. **Nora** reads the issues and writes **ticket** lanes — leaf lanes, DoR-draft with `null` estimate before ratification, each with `parentId` → its issue.

All emitted lanes are `generation: 0` (see `lib/reconcile.md` § Tree-shaped delta — the reconcile pass assigns gen 0 to every lane in the planned tree regardless of depth).

Each chain step counts against `globalBudget.spent` like any dispatch.

## Crash safety and resume

The chain reuses the decision-box crash-safety pattern (`lib/decision-box.md` § Crash safety): Sol writes goal-state after each chain step returns (`parker-done` → `winston-done` → `nora-done`), and on resume continues from the last written step. No completed chain step is re-run. A partial tree already in goal-state (e.g. Parker's epics written before a crash) is preserved.

## Mid-chain escalation

If a chain persona returns `needs-human` (e.g. Winston's architecture step hits an ambiguous data-ownership call), Sol surfaces the escalation and resumes the chain from that step after the human clears it — the existing gate-routing in `step-05-route.md`, no new state machine.

## Ratification gate

After the chain completes, Sol surfaces the generated lane tree to the operator before dispatching any leaf lanes.

### Ratification artifact

The artifact is the **tree-structured view from the end-of-run report** (`step-10-report.md` § Tree-structured view): epics → issues → tickets with `parentId` pointers, per-lane `scope` statements, persona assignments, and the DoR-draft ticket list — surfaced as a chat-readable text summary plus the goal-state-readable lane tree (FR-6, B-A3).

### Gate behavior

Gate behavior is autonomy-policy-driven with a config seam (NFR-5):

- **`internal` / `launch` stakes:** the gate is `needs-human` — no dispatch proceeds until the operator approves. Sol batches the ratification artifact into `pendingHumanReport`.
- **`hobby` stakes:** the tree auto-dispatches without a ratification pause.

The operator may adjust `scope` statements or drop lanes before approving. Sol reconciles the adjustment (re-invokes the reconcile primitive over the edited tree) before dispatching.

### Breadth-gate interaction (B-A4 — load-bearing)

The ratification gate **is** the human review the breadth gate exists to force, so a ratified planned tree is **excluded from the breadth gate** — applying it again would be redundant double-gating.

The loophole guard closes the gap at `hobby` stakes: when there is no ratification gate, the breadth gate **does** apply to the planned tree as the backstop, so a very large tree can never bypass human review under every policy.

The three-case table for planned trees (cite `lib/convergence.md` § Brake 3 — Breadth gate for gate mechanics — do not restate them):

| Case | Breadth gate |
| --- | --- |
| Planned + ratified (`internal` / `launch`) | Skipped — ratification is the gate |
| Planned + auto-dispatched (`hobby`) | Applies as the backstop |
| Unplanned discovery (any policy) | Always applies (Phase A behavior, unchanged) |

Under every policy, a large planned tree faces exactly one human gate — ratification or the breadth gate, never both, never neither.

## Cross-references

- `lib/reconcile.md` § Tree-shaped delta — the reconcile extension that folds the chain's tree output into the lane set at gen 0.
- `lib/decision-box.md` — the crash-safety pattern this chain's resume logic mirrors.
- `step-02-decompose.md` § Greenfield mode — the step that calls this chain and routes its output to step-04 dispatch.
- `step-10-report.md` § Tree-structured view — the report format reused as the ratification artifact.
- `lib/convergence.md` § Brake 3 — Breadth gate — the gate whose mechanics the breadth-gate interaction table above cites without restating.
