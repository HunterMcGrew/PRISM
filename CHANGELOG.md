# Changelog

PRISM uses semantic versioning; this file tracks evolution by phase and epic, most recent first.

---

## [1.0.0] — 2026-11-20

### Who this is for

PRISM 1.0.0 is a clean break. Run `npx @huntermcgrew/prism@1.0.0 update`, then `npx @huntermcgrew/prism@1.0.0 doctor`.

- Anyone on 0.10.0 or earlier should read this entry before updating.
- Left alone: flat plans, your own skills and plans, and a `core.hooksPath` that isn't PRISM's.
- Upgrading from 0.10.0 may leave `.prism/architect/guides/writing-a-skill.md.bak` and `.prism/architect/guides/writing-an-architect-doc.md.bak` behind. If you never edited those two guides, delete the `.bak` files.
- Versions 0.7.0 to 0.10.0 are not recorded in this file.

### New hooks stop agents on day one

Claude Code and Codex get the agent hooks on `prism update`. Codex runs them only once you trust the project's `.codex/` layer. Cursor gets no agent hooks, so none of them deny there. The git hooks below run under any tool.

- The commit gate denies a commit with `-a`, `--no-verify`, or no paths named, and more than one commit in a command.
- The secrets gate denies reading a `.env` file other than `.env.example`, a `.pem` or `.key` file, or anything under a `secrets` folder. Its remedy is `node .claude/hooks/env-keys.mjs <file>`, which prints the key names without values.
- The brief gate denies a subagent brief to a workflow stage over 15 non-blank lines. On Codex it only logs.
- The approve guard denies an agent editing a chain file's approval lines, and running the approval script. The one exception: after the person approves in chat, the agent may run the approval command once, as a bare `node <repo's approve.mjs> <path>` with nothing else on the line.
- The reconcile gate holds a PR-review subagent from stopping while reconcile still reports unanswered or unlogged comments.
- `PRISM_HOOK_DENY_DISABLE=1` turns off every deny except the secrets gate's and the approve guard's. `PRISM_HOOK_DISABLE=1` stops every hook except those two. The secrets gate and the approve guard ignore both switches. The git hooks read neither.

A deny message names what clears it. The [troubleshooting page](https://github.com/HunterMcGrew/PRISM/blob/main/docs/troubleshooting.md#a-prism-hook-denied-an-agents-command) lists what clears each one.

### Git hooks

- `prism adopt`, `prism update`, and the agent's session start set `core.hooksPath` to `.githooks`, which holds PRISM's `pre-commit` and `pre-push` shims. They are delivered when `claude` or `codex` is in `hosts`.
- A `core.hooksPath` that isn't PRISM's, or hooks already in `.git/hooks`, are left alone, and `prism doctor` reports it as info.
- A hook with no command in the `gitHooks` key of `.ai-skills/config.json` skips with a notice and exits 0.

### Skill renames and removals

`prism update` removes the old skill directories, and the persona names still route to their new skills.

| Old skill                | Now                  | Persona |
| ------------------------ | -------------------- | ------- |
| `devils-advocate`        | `prism-challenge`    | none    |
| `prism-code-dev`         | `prism-implement`    | Clove   |
| `prism-code-review-pr`   | `prism-pr-review`    | Eric    |
| `prism-code-review-self` | `prism-self-review`  | Briar   |
| `prism-data`             | `prism-metrics`      | Tess    |
| `prism-debugger`         | `prism-debug`        | Sasha   |
| `prism-documentation`    | `prism-docs`         | Eli     |
| `prism-founder`          | `prism-strategy`     | Vera    |
| `prism-onboarding`       | `prism-onboard`      | Atlas   |
| `prism-qa-test-plan`     | `prism-qa-plan`      | Reese   |
| `prism-skill-forge`      | `prism-forge-skill`  | none    |
| `prism-standup-summary`  | `prism-standup`      | Lilac   |
| `prism-surface-audit`    | `prism-audit`        | Zoe     |
| `prism-ticket-start`     | `prism-start-ticket` | Nora    |
| `prism-user-stories`     | `prism-intent`       | Mira    |

- Retired with no replacement: `prism-conductor` (Sol), `prism-refactor-scout` (Ren), `prism-doc-walker` (Theo), and `prism-review-loop`. Sol, Ren, and Theo no longer route.
- New with no predecessor: `prism-plan`, `prism-spec`, and `prism-verify`.
- Winston (`prism-architect`) planned work at 0.10.0 and is now a consult that answers approach questions. "Plan this out" now routes to `prism-plan`.

### The new workflow

Work runs through a plan folder at `.prism/plans/<ticket>/`: intent, design when needed, spec, plan, two challenge rounds, implement, verify, review, draft PR, PR review, and retro.

- You usually touch it twice: approve the intent, then read the PR. Approval is `approve` in chat, or the approval script run in a terminal.
- A few things add a touch: a design marked for approval, a plan that fails auto-approve, a `blocked` report or a second `needs-replan` on one task, a change the architect confirms is intent-level, and a review pause. `REVIEW.md` lists the four review pause triggers.
- Stages commit their own work. The session pushes and opens the PR.
- Flat plans keep working and are not migrated.

[`docs/workflow.md`](https://github.com/HunterMcGrew/PRISM/blob/main/docs/workflow.md) walks through each stage.

### Review and verify

- `REVIEW.md` sits at the repo root and is the rulebook every review stage reads. While its first line starts with `<!-- prism:review`, `prism update` keeps it current. Delete that line and the file is yours.
- Reviews log what a human caught that the agent missed in `.prism/metrics/review-misses.jsonl`. `prism adopt` and `prism update` add `.prism/metrics/review-misses.jsonl merge=union` to `.gitattributes`, so two branches that each append a row merge cleanly.
- `prism-verify` runs every automated check the repo configures and records the results under `## Verification` in the plan.
- The retro (`prism-retro`) is a fixed last stage of a plan folder.

### New optional config keys

`stopPaths`, `testGlobs`, `secretPaths`, `importAliases`, `ci.requiredCheck`, `gitHooks`, and `hooks` are new in `.ai-skills/config.json`. None of them were in the schema at 0.10.0, and an existing config stays valid.

Two keys changed:

- `features.conductorMayMerge` is now `features.mainSessionMayMerge`. Rename the key to keep the setting. It lets the main session merge once the final review is clean, and it stays off unless you set it.
- `modelTiers.top` and `modelTiers.worker` are gone and can be deleted. `modelTiers.overrides` stays, and only its `eric` entry is read.

### Codex

PRISM sets `project_doc_max_bytes` in `.codex/config.toml` so Codex reads past the default 32 KiB of `AGENTS.md`. The repo-level key is not yet verified in a live Codex run. `prism doctor` warns when `AGENTS.md` is over the limit.

### Also since 0.10.0

- On Claude Code, compaction keeps its place: a summary template runs before a compact, and a note after it sends the session back to its plan. Codex gets neither.
- An umbrella speed bump denies, once, a new heading in a doc on the manifest's `umbrellas` list, so a section about one subsystem gets its own routed doc. New installs get a list that names the rule files too. `prism update` never rewrites `.prism/architect/manifest.json`, so an existing install adds an `umbrellas` key by hand, and lists the rule files in it to cover them. Copy the other new routes from `templates/install/.prism/architect/manifest.stub.json` in the same pass, such as `REVIEW.md`, `.prism/review/**`, and `.githooks/**`. Replace the `prism-qa-test-plan` route with `prism-qa-plan`, and drop `.prism/skills/**`, which routes nothing now.
- Atlas offers to draft architect docs for the main areas of your code during onboarding, and you can decline.
- `prism doctor` runs more checks than it did at 0.10.0. [`docs/adopt-prism.md`](https://github.com/HunterMcGrew/PRISM/blob/main/docs/adopt-prism.md#check-install-health-with-prism-doctor) lists them in run order.

---

## [Epic C — First-Contact Reconciliation] — 2026-06-16

Epic tracking issue: #195

- Added `pnpm prism:adopt` install entry — seeds `.prism/` from `templates/install/.prism/`, then runs the first sync to establish the steady-state baseline manifest (#196)
- Added first-contact onboarding mode to Atlas — detects established repos, surveys existing skills/architect-docs/ADRs/rules/docs (and their paths), runs a discovery sweep, and adopts-or-leaves per asset class without overwriting existing work (#197)
- Added ADR-0059 (first-contact adopts via seed-and-sync), updated install-layout doc with first-contact section, and closed the epic (#198)

---

## [Epic A — Docs Overhaul] — 2026-06-16

Epic tracking issue: #180

- Added Atlas documentation onboarding question set with established-repo detection (#186)
- Made the documentation kit config-driven and removed Thrive-specific references from operational docs (#185)
- Flattened the `docs/` tree and de-Thrived the taxonomy — `content/dev/` moved to top-level `docs/` (#183)
- Retired the paired-dev-doc convention from spec surfaces; added ADR-0058 (#182, #184)
- Added documentation config block to `.ai-skills/config.schema.json` (#181)
- Wrote timeless user guides (`docs/overview.md`, `docs/getting-started.md`, `docs/workflow.md`, `docs/personas.md`) and slimmed the README (#187)

---

## [#171 — prism:migrate-skill CLI] — 2026-06-16

- Added `pnpm prism:migrate-skill` command for migrate-mode automation when renaming or moving skill sources (#177)

---

## [#170 — prism:update hardening] — 2026-06-16

- Hardened `prism:update` source handling and deduplicated platform-dir resolution (#176)

---

## [#163, #164 — check and cleanup] — 2026-06-15 to 2026-06-16

- Added prose cross-reference lint to `pnpm prism:check` — broken internal links now fail CI (#175)
- Deleted the orphaned `.generated/cursor-skills/` tree (#174)

---

## [#154 — prism:update epic] — 2026-06-15

Epic: distribution-pull and consumer sync tooling

- Phase 1: `_toolkit` namespace separation — moved architect docs and ADRs to underscore-prefixed subdirs (#156)
- Phase 2: hash manifest (`.sync-manifest.json`) for drift detection (#165)
- Phase 3: `pnpm prism:update` command — three-way merge into consumer repos (#167)
- Phase 4: `.prism/custom` overlay model for consumer overrides (#168)
- Phase 5: path-based ownership classifier (#166)
- Phase 7: `prism-skill-forge` utility skill for creating new skills from within PRISM (#169)
- ADR-0057 promotion and install-layout doc update on epic close (#172)

---

## [Sol conductor — #115, #127, #131, #138] — 2026-06-13 to 2026-06-14

Epic: Sol multi-agent orchestration conductor

- Phase A: self-growing conductor v1 — scaffold, goal-state, agent definitions, report-back protocol, fleet management (#126)
- Phase B: hierarchy decomposition and greenfield decompose mode (#144)
- Phase C: teams, cross-team seam, and integration gate (#145)
- Phase D: scale — batching and partitioning (#146)
- ADR-0048, ecosystem registration, and dev doc on epic close (#106)
- Added seed-sync enforcement and CI workflow (#151)
- Added idempotency marker to Eric's PR-review summary template (#149)
- Inlined Tier-1 rule bodies into AGENTS.md so Codex honors the tier model (#153)

---

## [Wave 4 — Thrive backports] — 2026-06-04 to 2026-06-05

Backport wave 4 from Thrive's `.claude/` toolkit:

- Wave 4.1: governance and git-workflow rule ports (#76)
- Wave 4.2: utility-skill support (`/prism-handoff`) (#78)
- Wave 4.3: `prism-review-loop` utility skill (#85)
- Cross-runtime rule-tier honoring: Cursor `.mdc` globs and Codex AGENTS.md block (#102)
- Slimmed AGENTS.md — externalized behavioral norms to Tier 1 rules (#100)
- Three-tier follow-up-scope model ported from Thrive (#114)
- Added CONTEXT.md ubiquitous-language glossary (#89)

---

## [Wave 3 — writing and AC rules] — 2026-06-04

- Wave 3.1: writing voice and acceptance-criteria rule refinements (#72)

---

## [Wave 2 — persona upgrades] — 2026-05-24

- Wave 2 PR 1: Foundation rules and closing-messages doc (#41)
- Wave 2 PR 2: Sasha six-phase debug workflow, evidence grading, case file (#42)
- Wave 2 PR 3: Eric two-axis review restructure (#43)
- Wave 2 PR 4: Winston re-plan mode, vertical slicing, AFK/HITL, mode banners (#44)
- Wave 2 PR 5: Iris persona and Parker/Atlas STOP conventions (#45)
- Backport from Thrive PR 2028: shipping-flow agent hygiene (#47)
- Backport from Thrive PR 2039: structural-leverage review concepts (#69)

---

## [Phase 3 — Parker PRD persona] — 2026-05-23

- PRISM-3.1: Scaffolded Parker with greenfield mode (#27)
- PRISM-3.2: Brownfield mode step files (#28)
- PRISM-3.3: Reviewer rubric dispatch (#29)
- PRISM-3.4: Linear initiative handoff (#30)
- PRISM-3.5: ADR-0043 and paired dev doc (#31)

---

## [Phase 2.6 — Ren refactor scout] — 2026-05-23

- PRISM-2.6.1: Scaffolded Ren skill source and registered role (#23)
- PRISM-2.6.2: Step files for the 8-phase scout workflow (#24)
- PRISM-2.6.3: State lib doc and gitignore (#25)
- PRISM-2.6.4: ADR-0042 and paired dev doc (#26)

---

## [Phase 2.5 — Theo architect-doc walker] — 2026-05-22 to 2026-05-23

- PRISM-2.5.1: Scaffolded Theo skill source and registered role (#19)
- PRISM-2.5.2: Step files for the 8-phase workflow (#20)
- PRISM-2.5.3: State lib doc, scenarios, gitignore (#21)
- PRISM-2.5.4: ADR-0041 and paired dev doc (#22)
- Dogfooded Atlas against this repo — smoke test, anchor warning fix, docs (#18)

---

## [Phase 2 — Atlas onboarding skill] — 2026-05-22

- PRISM-2.1: Atlas skill scaffold, interactive flow, config writing (#14)
- PRISM-2.2: Stack detection subsystem (#15)
- PRISM-2.3: Per-team rule generators (#16)
- PRISM-2.4: Stub-anchor population mechanism (#17)

---

## [Phase 1.5 — bridge work] — 2026-05-22 to 2026-05-23

Five sub-phases (1.5a through 1.5f) consolidating the bifurcated install layout and closing gaps from Phase 1:

- PRISM-1.5c.1: Universal rule backports (#6)
- PRISM-1.5c.2: Sasha upgrade (#7)
- PRISM-1.5c.3: Nora upgrade (#8)
- PRISM-1.5c.4: Eric dual-mode (#9)
- PRISM-1.5c.5: Three-tier rule loading model (#10)
- PRISM-1.5c.6: Zoe persona (#11)
- PRISM-1.5d: Tokenization and content cleanup (#12)
- PRISM-1.5e: Deletion test added to Winston, Eric, Briar (#13)
- Phase 1.5f: Collapsed `.generated/`, committed `.cursor/skills/`, decisions verdict pattern, draft-PR-by-default, ADR-0044 (#34–#38)
- Replaced manifest catch-all with explicit globs and shipped ADR-0035 (#49)
- Codified implementation task detail bar; routed Pixel through Winston (#3)

---

## [Phase 1 — Foundation] — 2026-05-02 to 2026-05-04

- Initial extraction from Thrive's `.claude/` toolkit (2026-05-02)
- Phase 1: skill generator, canonical sources for every named persona, dogfood prefix migration (#1)
- Bifurcated install layout — `.prism/` canonical with build-time copies into platform dirs (#2)
