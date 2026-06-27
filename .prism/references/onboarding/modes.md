# Atlas — Onboarding Modes

Full procedure for each mode. The body of `shared.md` names the mode — read here for the step-by-step.

---

## first-install

No `.ai-skills/config.json` exists. Run the full guided flow:

1. Survey — share detection results (stack + doc layout) and the mode.
2. Collect project display name.
3. Collect ticket prefix (validates `/^[A-Z][A-Z0-9]+$/`).
4. Collect GitHub org and repo.
5. Collect ticket-system kind (`"linear"` or `"github-issues"`), workspace, and team key.
6. Collect product domain (one or two sentences, freeform — used for the `atlas:domain-context` anchor).
7. Collect existing engineering standards (paths or "none").
8. Collect Slack channel (optional).
9. Collect documentation setup via the documentation question set (§ question-flow.md → Documentation question set).
10. Run `runRuleGenerators(config, repoRoot)` — code-standards → security → framework-guidelines, skip-if-exists by default. Offer the `acceptance-criteria` format choice once (skip-if-exists on re-run; not re-offered on reconfigure).
11. Run `runAnchorSubstitution(config, repoRoot)` — populates `atlas:specializes-in`, `atlas:domain-context`; leaves `atlas:examples` / `atlas:workflow-example` empty in v1. Appends a one-line applicability declaration to `accessibility.md` and `design-governance.md` when the detected stack includes UI file types — idempotent (skipped if declaration already present).
12. Write `.ai-skills/config.json` atomically via `writeOnboardingConfig` after explicit user acceptance.
13. Run `pnpm prism:build` to regenerate platform mirrors.
14. Emit the closing summary (see § output-contract.md → Closing summary shape).

---

## init-bootstrapped

`.ai-skills/config.json` exists but `.ai-skills/registry/onboarding-state.json` does not — the fingerprint of `prism init` having bootstrapped a skeletal config without the guided flow.

Run the **first-install step set** with two differences:

1. **Seed from the existing config.** For each field `init` collected — `project`, `ticketPrefix`, `ticketSystem.kind` (plus `teamKey`/`workspace` when present), `github.owner`, `github.repo`, and `slackChannel` when present and non-empty — treat the on-disk value as the answer and skip the prompt. Surface seeded values in the survey so the user can correct before continuing. `techStack` is NOT seeded from config — always re-detect via `detectStack`.
2. **Collect only what `init` does not write.** `init` writes `productDomain: ""`, `existingStandards: []`, and no `documentation` block. Atlas still prompts for product domain (step 6), existing standards (step 7), and documentation setup (step 9), then runs generators and anchor substitution.

The asset-path survey and discovery sweep run only when established-asset signals are also present — `init-bootstrapped` does not force first-contact behavior, but does not suppress it either.

On config write, seeded fields pass through unchanged. Skip-if-exists still governs generated rule files.

---

## reconfigure

`.ai-skills/config.json` already exists. Atlas reads the prior config, displays each field with its current value, and asks "which fields do you want to change?" Only the fields the user names are re-prompted; the rest carry over. After updates, Atlas writes the new config and re-runs the rule generators and anchor substitution. Skip-if-exists still applies — hand-edits survive unless the user explicitly passes `--force`.

**Hidden fields:** `features.conductorMayMerge` is never shown during reconfigure display — it is a hidden, default-off capability read only by Sol. If set manually, the value is preserved through the read-merge-preserve write path without being echoed.

The AC format offer (`acceptance-criteria.md`) does not re-fire on reconfigure runs.

---

## dogfood-self

Mode used when Atlas runs against PRISM's own repo. Behaviorally identical to first-install — same survey, same questions, same generators, same output. The mode flag exists so PR-2.5's smoke-test harness can invoke Atlas's orchestration entry point with a fixed answer map (no interactive prompts) and assert the expected files land.

**Conditional skip:** in `dogfood-self` mode, skip the STOP confirmation prompt before the question flow. The smoke-test harness's idempotency depends on no interactive pauses.

---

## first-contact

Mode for an established repo — one that already has its own setup (skills, architect docs, ADRs, rules, a docs layout, or an `AGENTS.md`) but has never had PRISM. Fires when Batch-1 detects any established-asset signal AND no `.prism/.sync-manifest.json` exists. First-contact is a superset of first-install.

**Step sequence (additions to first-install, in order):**

1. Survey — share detection results, detected established-asset signals, and the mode.
2–7. Same as first-install through existing standards.
8. **Asset-path survey** — ask the user to confirm or correct the auto-detected paths for each asset class: skills, architect docs, ADRs, rules, and docs (§ question-flow.md → Asset-path survey).
9. **Discovery sweep** — scan the union of auto-detected and user-supplied paths; per asset class, decide adopt or leave (§ question-flow.md → Discovery-sweep).
10. **Slack channel** — same as first-install (optional).
11. **Documentation setup** — same as first-install.
12. Run `runRuleGenerators`.
13. Run `runAnchorSubstitution`.
14. Write `.ai-skills/config.json` atomically.
15. **Seed-and-sync handoff** — run `pnpm prism:adopt --prism-source <resolved PRISM source>` to seed `.prism/` from the install surface and establish the steady-state baseline manifest. Surface the `AdoptSummary` in the closing summary.
16. Run `pnpm prism:build`.
17. Emit the closing summary — including the `AdoptSummary` and the discovery-sweep adopt/leave decisions.
