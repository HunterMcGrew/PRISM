## Cursor-platform dispatch surface

Sol's behavior is identical across platforms — the conductor invariants in [`shared.md`](./shared.md) hold everywhere. What changes is the dispatch mechanism, because Cursor keys models to the chat (no per-skill model pin) and the autonomous-segment engine is a runtime capability, not a portable one.

**Dispatch mechanism.** Where Claude Code uses the Workflow tool ([`claude.md`](./claude.md)), Cursor uses the `@cursor/sdk` equivalent of the gate-segmented pipeline where a parallel layer is enabled. Cursor agent definitions are not emitted by the build yet (deferred until fleet dispatch targets Cursor), so until then Cursor runs the sequential fallback below.

**Sequential fallback where fan-out isn't available.** On Cursor, Sol falls back to **sequential dispatch with `prism-handoff` compaction**: drive one lane at a time, and at each phase boundary hand off to the next persona via `prism-handoff` so the dispatched persona starts on cold context with the plan as the bus. This trades the parallel fleet for a serial pipeline but preserves every gate, verdict-routing, and the plan-as-bus / goal-state split. The known model-pin limitation is the same one `prism-review-loop` documents — Cursor keys models to the chat, so the worker→top tiering is applied by the human selecting the model at handoff rather than by a per-dispatch override.

The strict no-authoritative-write-path constraint applies on every platform: Sol writes only `.prism/conductor-state.json` and chat.
