# Onboarding Architecture (Atlas)

Architect context for how Atlas (`prism-onboarding`) decides what flow to run when a consumer invokes onboarding. The load-bearing piece is the **mode taxonomy** — the small set of states a repo can be in, the file fingerprints that distinguish them, and the rule that routes each fingerprint to the right flow. Future work that touches detection, adds a cold-bootstrap path, or changes config seeding needs to start here, because getting the routing wrong silently runs the wrong flow (re-prompting a team that already answered, or skipping setup a fresh repo still needs).

Canonical source for the behavior is `.ai-skills/skills/prism-onboarding/shared.md` (mirrored to `.claude/`, `.codex/`, `.cursor/` by `pnpm prism:build`). This doc records the *why* behind that prose so it survives edits to it.

## The mode taxonomy

Atlas runs in one of these modes. Mode selection happens once at session start, in Batch 2 step 7, after Batch 1 has read the two fingerprint files. Mode determines both the opening message and the flow shape.

| Mode | `config.json` | `onboarding-state.json` | What runs |
| --- | --- | --- | --- |
| **first-install** | absent | absent | Full guided flow, end to end. |
| **init-bootstrapped** | present | absent | First-install step set, with `init`-collected fields pre-seeded and skipped. |
| **reconfigure** | present | present | Surface prior values; change only the fields the user names. |
| **dogfood-self** | (flag) | — | Same flow as first-install; no interactive STOP. Exists so the smoke-test harness can run end to end. |
| **first-contact** | absent | absent + established-asset signals, no `.sync-manifest.json` | Superset of first-install: adds an asset-path survey, a discovery sweep, and a seed-and-sync handoff via `pnpm prism:adopt`. |

## Detection fingerprints — the routing walk

The mode walk is an **ordered** list, and the order is the contract. Each branch claims its case before the next can, so a higher branch shadows a lower one when both would match. The walk, in order:

1. **Resume check (precedes everything).** If `onboarding-state.json` exists *with incomplete steps*, Atlas resumes from `nextIncompleteStep` instead of selecting a mode fresh. The state file is the resume marker — a guided run always writes it via `saveState` after each answer, so a partially-completed session is recoverable. This check sits ahead of the mode walk on purpose: a half-finished guided run must not be re-classified as `reconfigure` just because a config now exists.
2. **init-bootstrapped** — config present **and** state file absent.
3. **reconfigure** — config present **and** state file present.
4. **first-contact** — established-asset signals present **and** no `.sync-manifest.json`.
5. **first-install** — none of the above (no config, no state, no established assets).

**Why the state file is the discriminator between init-bootstrapped and reconfigure.** Both have a `config.json` on disk. What separates them is who wrote it. A guided Atlas run always writes `onboarding-state.json`; the `prism init` cold-bootstrap CLI (`scripts/ai-skills/init.ts`) writes a skeletal `config.json` and *never* touches state. So config-present + state-absent is the unambiguous signature of an `init` bootstrap — no marker field is needed, because `init` is the only writer that produces config without state. This is also why init-bootstrapped is a distinct mode rather than a sub-path inside reconfigure: `reconfigure`'s contract is "surface current values, change only named fields," which gates *off* exactly the first-install-only work (asset survey, generators, anchor population) that a freshly-bootstrapped repo still needs.

## The init-bootstrapped seeding rule

When `prism init` has bootstrapped a config, Atlas runs the **first-install step set** — survey → remaining questions → rule generation → anchor substitution → config write → build — with a seed-and-skip overlay on the question order:

- **Seed `init`-collected fields; skip the prompt when present and non-empty.** `init` writes `project`, `ticketPrefix`, `ticketSystem.kind` (plus `teamKey`/`workspace` when present), `github.owner`, `github.repo`, and `slackChannel` when provided. For each of these, treat the on-disk value as the answer and do not re-prompt. Surface the seeded values in the survey so the user can correct one before continuing — seeding is not silent.
- **Re-detect `techStack`; never seed it from config.** `init` writes `techStack` from `detectStack`, but Atlas always re-runs `detectStack` (Batch 1 probe 4) rather than carrying the stored value — consistent with first-install, and correct if the repo's stack changed between `init` and onboarding.
- **Collect only what `init` leaves empty.** `init` writes `productDomain: ""`, `existingStandards: []`, and no `documentation` block. Atlas still prompts for product domain, existing engineering standards, and documentation setup, then runs the generators (`runRuleGenerators`) and anchor substitution (`runAnchorSubstitution`).
- **Respect the ticket-system gate from Q4 on Q5.** The Linear team-key prompt (Q5) only fires for Linear users. A `github-issues` repo has an empty `linearTeam` and skips Q5 entirely — the seeding overlay does not change this gate; it inherits first-install's behavior.
- **Pass seeded fields through unchanged on write.** `writeOnboardingConfig` writes the assembled config (seeded + newly collected); a seeded field is never reset to a default. Skip-if-exists still governs generated rule files.

init-bootstrapped does not force first-contact behavior and does not suppress it. If a repo was `init`-bootstrapped *and* carries established assets, both the seed-from-config overlay and the first-contact additions apply.

## Implementation note

Mode detection is instruction-driven prose in `shared.md`, not a `detectMode()` function — there is no code seam to unit-test. The one typed surface is `OnboardingState["mode"]` in `scripts/ai-skills/lib/onboarding-types.ts`, which enumerates the mode values so `initialState(mode)` accepts each one; adding a mode means widening that union. Anything reading mode off `OnboardingState` is type-checked by `pnpm prism:check-types`.

---

_Source: PRISM-256 (Atlas detects `init`-written config) — see `.prism/plans/prism-256.md` for the resolution and alternatives weighed. The `init` cold-bootstrap CLI that creates the third file-state shipped in PRISM-250 (`prism init`)._
