---
Number: 0062
Title: Consumer Skill Distribution via prism:update
Status: accepted
Date: 2026-06-23
---

## Context

A consumer team onboards PRISM and gets the `.prism/` content surface — rules, architect docs, ADRs, templates — projected into their repo by `prism:adopt` and kept current by `prism:update` (ADR-0059, ADR-0057). But the personas themselves — Winston, Clove, Eric, and the rest of the `prism-*` roster — had no distribution path. PRISM's own build rendered them into the dogfood install's platform directories, but a consumer who ran `prism:update` received the content surface and none of the personas. The roster was a maintainer-only artifact: invokable in PRISM's own repo, invisible in every consumer's.

Plan prism-242 set out to close that gap — render the full `prism-*` roster into a consumer repo, with the consumer's tokens, automatically on `prism:update` / `prism:adopt`. The work surfaced a cluster of design questions that this ADR records the answers to. Several have sharp wrong answers that would have broken existing contracts, which is why they earn a durable record rather than living only in the closed plan.

The PRISM-side build already had a per-skill render loop, an orphan-cleanup pass keyed on a managed marker, and a token-substitution layer (ADR-0030). The question was never "how do we render a skill" — that machinery existed. The questions were: under what IDs do personas install, who owns the render code so both the PRISM build and the consumer update path can call it, where in the update/adopt call graph does the render belong, and what guards keep the consumer's output honest without firing on content that is legitimately the consumer's. Each was decided against the existing contracts rather than in a vacuum.

## Decision

Render the `prism-*` persona roster into a consumer repo automatically on every `prism:update` and `prism:adopt`, using the consumer's own token map, through a single render seam shared with PRISM's own build. Six sub-decisions make that concrete.

**1. Personas install under their canonical `prism-*` IDs; no directory remapping.** A persona renders into the consumer's skill directories under the same `prism-*` ID it carries in PRISM source. Bodies are tokenized with the consumer's map — the project token resolves to the consumer's project name, the ticket-prefix token to their prefix — but the directory ID is not remapped. Remapping the ID was considered and rejected: orphan cleanup and regeneration key off skill-ID membership in the roster plus the managed marker written into each generated directory. Remapping the directory name would break that contract — a renamed directory no longer matches its roster ID, so cleanup can't tell a current persona from an orphan.

**2. The render is extracted root-agnostic and shared.** The per-skill render loop is `generatePlatformSkills` in `scripts/ai-skills/generate-skills.ts`. It takes absolute source and target roots as parameters — it reads no module-global repo root — so both PRISM's own build and the consumer update path call the same function, each resolving its own absolute roots and passing them in. One renderer, two callers, no second implementation to drift.

**3. Platform-refresh and skill-gen live in the shared `runUpdate` seam.** `runUpdate` is the one function both `prism:update`'s entry point and `prism:adopt`'s `runAdopt` already call. The platform-refresh + roster-render step lives there, so both commands reach it through a single seam. This is a deliberate behavior change on the adopt path: before this work, `prism:adopt` never refreshed platform directories at all — it called `runUpdate` directly and never entered the update entry point's `main()`, where the refresh used to live. Relocating the step down into `runUpdate` fixes that latent gap as a consequence of giving both commands one seam. The update path's output is unchanged; a test asserts that.

**4. Two guards, asymmetric by design.** An always-on leftover-token guard runs over the rendered output in both contexts — PRISM's build and the consumer's update — and fails if any unresolved token literal survives the substitution layer. A second guard, the Thrive-literal guard, scans for the originating install's hardcoded literals and runs on PRISM's build only, never on consumer output. The asymmetry is load-bearing: an unresolved token is a bug on any surface, but a "Thrive"-flavored literal is a bug only in PRISM's output — a consumer whose project is literally named Thrive will have that name rendered into every skill body by token substitution, which is correct. Running the de-thriving canary on consumer output would fire on every such consumer.

**5. Orphan cleanup is managed-marker-keyed, not prefix-keyed.** When a persona leaves the roster, the next `prism:update` removes its skill directory from the consumer's platform directories. The delete predicate requires both that the directory's ID is absent from the current roster AND that the directory carries the managed marker PRISM writes into everything it generates. A consumer who hand-authors a `prism-*`-prefixed skill — same prefix, no marker — is never a delete target. Keying cleanup on the prefix alone was rejected for exactly this reason: it would clobber consumer-authored prefixed skills.

**6. Automatic on every update/adopt; no separate command.** The roster renders as part of `prism:update` and `prism:adopt`, not behind an opt-in flag or a `prism:install-personas` command. This is parity with content projection — the consumer doesn't run a separate command to receive updated rules or architect docs, and personas are distributed the same way.

## Consequences

- **Positive:** the full persona suite reaches every consumer with zero manual steps. A team that onboards and runs `prism:update` gets Winston, Clove, Eric, and the rest, rendered with their own project and ticket-prefix values.
- **Positive:** one render seam serves both PRISM's build and the consumer path. The byte-identical-output guarantee on PRISM's own build (proven in prism-242) means the extraction was a pure refactor — the shared function can't silently change what PRISM projects into its own dogfood install.
- **Positive:** the marker-keyed cleanup makes the roster safe to extend. A consumer can write their own `prism-*`-named skills alongside the distributed roster and trust that `prism:update` will never touch them.
- **Positive:** the adopt path now refreshes platform directories, closing a latent gap that predated this work — `prism:adopt` projects the roster end-to-end, not just the content surface.
- **Negative:** the two-guard asymmetry is a subtlety a future contributor has to hold. The Thrive-literal guard deliberately does *not* run on consumer output, and that absence is correct, not an oversight — the rationale lives in `skills-ecosystem.md § Output guards` and must stay documented or the asymmetry reads as a bug.
- **Negative:** because the render reuses the token-substitution layer, any seed-shipped doc that carries a non-resolvable example token literal in the pattern the substitution layer matches will throw on the consumer's content-copy. This surfaced during prism-242 in two seed ADRs and was fixed by rephrasing the example literals to the pattern-dodging `${...}` form — the same form this ADR uses for every token it names. Seed-shipped content must continue to dodge the token pattern for example literals (ADR-0030's contract).
- **Neutral:** adding or removing a persona from the roster propagates to every consumer on their next `prism:update` — a new persona appears, a dropped one is orphan-cleaned. This is the intended steady-state behavior, but it means roster changes have consumer-visible reach the moment they land.

## References

- [ADR-0030](./0030-token-substitution-at-build-time.md) — token substitution at build time; the layer the consumer render reuses to resolve the project and ticket-prefix tokens. Its `${...}`-form contract for example literals is what seed-shipped ADRs (including this one) follow.
- [ADR-0032](./0032-canonical-skill-content-is-generic.md) — canonical skill content is generic; the per-team specialization this distribution carries comes from Atlas-written content, not from the roster render.
- [ADR-0057](./0057-prism-update-merge-model.md) — the `prism:update` merge model the roster render rides on; the render is part of the same update flow.
- [ADR-0059](./0059-first-contact-adopts-via-seed-and-sync.md) — first-contact `prism:adopt`; the seam relocation in this ADR is what makes adopt project the roster.
- `.prism/plans/prism-242.md` — the plan that built this, including the seam-relocation, marker-invariant, and guard-asymmetry decisions in full.
- `.prism/architect/_toolkit/install-layout.md` § Steady-state persona-skill distribution — the durable architect-context description of what renders, with whose tokens, and how cleanup and idempotency work.
- `.prism/architect/_toolkit/skills-ecosystem.md` § Output guards — the two-guard model and why the asymmetry is load-bearing.
