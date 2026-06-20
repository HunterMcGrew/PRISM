# Plan: epic-eve-substrate

> Closed (Abandoned): 2026-06-20 — the eve substrate effort was reverted from main in PR #239 and preserved here per ADR-0047 as the durable record of the attempt. The ADRs (0062/0063), emitter code (the eve additions to scripts/ai-skills/build.ts), and .eve/ outputs this plan references no longer exist on main.

> This epic adds Vercel eve as a compile/deploy target for PRISM's autonomous persona slice. The `.prism/` markdown directory stays the single source of truth — porting means extending `pnpm prism:build` with an eve emitter, not relocating the system.

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/235

## Goal

Add a Vercel eve emitter to `pnpm prism:build` and port the autonomous persona slice (Lilac first, then Sage and Zoe) so they run as always-on, channel-driven eve agents orchestrated by Sol.

---

## User Stories

---

## Design

---

## Implementation Tasks

The work decomposes into six shippable **units**, ordered by dependency. Each unit is a lane Sol can fan out. The sequencing decision (hand-author Lilac in Unit A before extracting the emitter in Unit C) is load-bearing — see `## Decisions` § Sequencing.

- **Unit A** (Clove) — hand-author Lilac's eve agent directory as the runtime-validated reference. Blocks B.
- **Unit B** (Clove) — add `@ai-sdk/anthropic` + eve-output path definitions; the structural prerequisites for the emitter. Parallel with A.
- **Unit C** (Clove) — build the eve emitter in `build.ts`, extracted from Unit A's reference shape. After A and B.
- **Unit D** (Clove) — regenerate Lilac from the emitter; prove byte-identical to Unit A via a new test. After C. This is the emitter's correctness proof.
- **Unit E** (Clove) — extend the drift/cleanup/guard/seed machinery to cover eve output. After C.
- **Unit F** (Eli) — document the eve emitter and the Docker validation runbook. After D and E.

The Docker end-to-end validation of Lilac running on eve (`eve build && eve start`) is a **manual milestone**, not a unit — it needs Node 24 and cannot run in host CI. It is captured as a non-behavioral AC marked `[Docker / manual]`, not a Clove task.

### Clove (implementation)

#### Unit A — Hand-author Lilac's eve agent directory (reference artifact)

1. **Create the Lilac eve agent directory skeleton** at `.eve/agents/prism-standup-summary/`. This is a hand-authored reference, not generated output (Unit D later regenerates it and diffs against this). Create these files (full content in the sub-tasks below): `agent.ts`, `instructions.md`, `skills/prism-standup-summary/SKILL.md`, `schedules/standup.md`, `channels/slack.ts`, `channels/eve.ts`. Verification: none yet (no build wired) — this unit is validated by Unit D's diff and the Docker milestone.

2. **Write `agent.ts`** at `.eve/agents/prism-standup-summary/agent.ts` with direct-to-Anthropic routing:
   ```ts
   import { defineAgent } from "eve";
   import { anthropic } from "@ai-sdk/anthropic";

   export default defineAgent({
     model: anthropic("claude-sonnet-4.6"),
   });
   ```
   Direct routing (not the gateway string `"anthropic/claude-sonnet-4.6"`) is required so the agent runs off-Vercel on `ANTHROPIC_API_KEY` with no AI Gateway — see `## Decisions` § Direct-to-Anthropic. Depends on Unit B task 7b (`@ai-sdk/anthropic` must be installed for this import to resolve).

3. **Write `instructions.md`** at `.eve/agents/prism-standup-summary/instructions.md` carrying Lilac's always-on identity. Content: the persona identity frame (the "You are **Lilac**…" opening paragraph from `.ai-skills/skills/prism-standup-summary/shared.md:1`) plus the `## Personality` and `## How Lilac Thinks` sections — the stable identity, not the procedural workflow. Do **not** include the procedural anti-pattern catalogue or the step-by-step standup workflow; those go in the skill body (task 4). The split rule: identity and voice → `instructions.md` (always-on); workflow and procedure → `skills/<id>/SKILL.md` (loaded on match). See `## Decisions` § Routing and context distribution.

4. **Write the skill** at `.eve/agents/prism-standup-summary/skills/prism-standup-summary/SKILL.md`. Frontmatter is a single `description` field — copy the `description` value from `.ai-skills/skills/prism-standup-summary/frontmatter.yml` verbatim (it already reads as a routing hint: "Lilac — standup scribe. Composes a 4-section Slack standup…"). Body: the procedural sections of `shared.md` (the standup workflow, the four-subsection rules, the Slack rendering contract, the anti-pattern catalogue) — everything that is *how to do the standup* rather than *who Lilac is*. The `description` is eve's only routing mechanism (verified) — it must be present and must read as a trigger hint, not a label.

5. **Write the schedule** at `.eve/agents/prism-standup-summary/schedules/standup.md` in markdown form:
   ```md
   ---
   cron: "0 13 * * 1-5"
   ---

   Compose today's standup from recent PR activity and post it to the team Slack channel after preview-and-confirm.
   ```
   `0 13 * * 1-5` is 13:00 UTC weekdays (cron is UTC on the schedule runner — verified against `docs/schedules.mdx`). The body must carry enough context to trigger the standup skill's `description` match (this is FR-3, the entry-point inversion — the schedule body is the turn content the model routes on). Schedules are root-only, which is why Lilac is a root agent (Option B).

6. **Write the Slack channel handler** at `.eve/agents/prism-standup-summary/channels/slack.ts`. Use eve's Slack channel (`import { slackChannel } from "eve/channels/slack"` — confirm the exact import path against `node_modules/eve/docs/channels/slack.mdx` at write time). The channel is the inbound surface and the HITL render target (approvals become Slack buttons). Gate the post: the standup-post action must be wrapped so it surfaces as an `always()` HITL approval before posting — Lilac's existing contract already requires preview-and-confirm (`shared.md:44-47`), so the gate expresses an existing rule, not a new one. See `## Decisions` § Idempotency.

7. **Write the eve HTTP channel** at `.eve/agents/prism-standup-summary/channels/eve.ts` with a local-world-safe auth array:
   ```ts
   import { eveChannel } from "eve/channels/eve";
   import { localDev, placeholderAuth } from "eve/channels/auth";

   export default eveChannel({
     auth: [localDev(), placeholderAuth()],
   });
   ```
   Omit `vercelOidc()` — slice 1 runs on loopback under `localDev()`, and `placeholderAuth()` fails closed so a misconfigured non-local deploy returns 401 rather than serving open. A real auth helper (`httpBasic`/`jwtHmac`/`oidc`) is required before any non-local deploy — see `## Decisions` § Auth (open-question variant). Verification for the whole unit: deferred to Unit D diff + Docker milestone.

#### Unit B — Structural prerequisites (parallel with A)

7b. **Add `@ai-sdk/anthropic` to dependencies.** It is not in the spike's deps and is required for direct-to-Anthropic routing (off-Vercel, no AI Gateway). Add it to the eve agent's own `package.json` context — since the eve agent runs under Node 24 in Docker (separate from the host build toolchain), the dependency belongs in the eve agent's dependency manifest, not necessarily the repo root `package.json`. Decide at implementation time whether slice 1 carries a dedicated `.eve/package.json` or reuses the root; if a dedicated manifest, pin `eve@^0.11.6`, `@ai-sdk/anthropic` (latest compatible), and `ai@7.0.0-beta.178` to match the spike (NFR-4 version containment). Verification: `pnpm install` (or the eve-scoped install) resolves without peer-dep errors.

8b. **Add eve path definitions** to `.ai-skills/definitions/paths.json` under `generated`: add `"eveAgentsRoot": ".eve/agents"`. This is the source of truth the emitter reads for its output dir, mirroring `claudeAgentsRoot` / `codexAgentsRoot` (paths.json:11-12). Verification: `pnpm prism:check-types` (the `pathDefinitions.generated.eveAgentsRoot` reference in Unit C task 9 must resolve against the type).

#### Unit C — Build the eve emitter in `build.ts` (after A and B)

8. **Add the `buildEveAgent` emitter functions** to `scripts/ai-skills/build.ts`, as siblings to `buildClaudeAgentMarkdown` (build.ts:211) and `buildCodexAgentToml` (build.ts:164). The emitter is a set of pure functions that take a persona's `SkillSource` (frontmatter map + shared body) plus the persona id and produce the eve agent directory's file contents — `instructions.md`, `skills/<id>/SKILL.md`, and (when the persona declares them in source) `schedules/` and `channels/` entries. Derive the identity/workflow split from Unit A's hand-authored Lilac: whatever content landed in Lilac's `instructions.md` vs `SKILL.md` is the split rule the emitter encodes. Match the existing emitters' header convention (`GENERATED_MARKDOWN_HEADER_LINE` for `.md`, the `<!-- Source / Target -->` comment block). Verification: `pnpm prism:check-types` (the new functions must type-check).

9. **Add an `eve` target to the `optedIn` gate and the per-skill loop** in `main()` (build.ts:1229 for `optedIn`, build.ts:1263 for the loop). Follow the `claudeAgents` pattern exactly: an `optedIn.eve` flag that is `!checkMode || (await eveAgentsRootHasManagedContent(targetRoots.eve))`, a `targetRoots.eve` entry resolved from `pathDefinitions.generated.eveAgentsRoot` (added in Unit B task 2), and a guarded write block inside the loop calling the Unit A emitter functions via `writeFileIfChanged`. **Gate eve emission to in-scope autonomous personas only** — not every skill is an autonomous-slice persona. Add the in-scope set as a constant (`EVE_AUTONOMOUS_PERSONAS = new Set(["prism-standup-summary"])` for slice 1; Sage and Zoe join in wave 2) and skip personas not in the set, mirroring how `roleDefinition.type !== "utility"` gates the agent-def emitters. Verification: `pnpm prism:build` runs without error.

10. **Add `eveAgentsRootHasManagedContent`** to `build.ts` as a sibling to `claudeAgentsRootHasManagedContent` (build.ts:700). It walks the eve agents root and returns true if any persona subdir carries the managed marker. The marker write happens per-persona inside the loop (like the Claude skills marker at build.ts:1309). Verification: covered by Unit E's drift test.

#### Unit D — Regenerate Lilac and prove byte-identical (after C)

11. **Run `pnpm prism:build`** and confirm it generates `.eve/agents/prism-standup-summary/` from canonical source. Then **diff the generated output against the Unit A hand-authored reference.** Because Unit A wrote the reference directly into `.eve/agents/prism-standup-summary/`, the regenerate step would overwrite it — so first **move the Unit A reference** to a fixture location `scripts/ai-skills/__fixtures__/eve-lilac-reference/` (as part of this task), then regenerate, then diff generated-vs-fixture. Zero diff is the emitter's correctness proof. If they differ, the emitter (Unit C) is wrong — fix Unit C, not the fixture. Verification: `diff -r .eve/agents/prism-standup-summary scripts/ai-skills/__fixtures__/eve-lilac-reference` returns empty.

12. **Write the emitter test** at `scripts/ai-skills/eve-emitter.test.ts` following the shape of `claude-agent-def.test.ts`. Assert: (a) the emitter produces an `instructions.md` containing Lilac's identity frame and *not* the standup workflow; (b) the `SKILL.md` frontmatter carries a non-empty `description`; (c) the generated directory tree byte-matches the `__fixtures__/eve-lilac-reference` fixture. Test runs on host Node (no eve runtime needed — it asserts directory shape, not behavior). Verification: `pnpm prism:test` passes; confirm the new test is picked up by the `scripts/ai-skills/*.test.ts` glob.

#### Unit E — Extend drift, cleanup, guard, and seed machinery (after C)

13. **Add eve-output cleanup** by calling `removeDeletedManagedAgentFiles` (or a directory-aware analogue) for the eve agents root in `main()`, alongside the existing calls at build.ts:1511-1522. Because eve output is a *directory* per persona (not a single `.md`/`.toml` file), the cleanup must remove a whole persona subdir whose canonical source no longer exists or whose persona left the `EVE_AUTONOMOUS_PERSONAS` set. Model it on `removeDeletedManagedSkills` (directory-based) rather than `removeDeletedManagedAgentFiles` (file-based). Verification: `pnpm prism:test` — add a cleanup case to the emitter test asserting a removed persona's eve dir is swept.

14. **Add the eve agents root to the literal-guard roots** list in `main()` (build.ts:1524). The eve output is generated and must not carry non-tokenized Thrive-flavored literals, same as every other platform output. Verification: `pnpm prism:build` (the literal guard runs as part of it); if Lilac's source carries a literal, tokenize the canonical source or allowlist per the existing flow.

15. **Classify the eve output in `seed-curation.json`** at `.ai-skills/definitions/seed-curation.json`. The `.eve/` tree is a *generated platform output*, not canonical `.prism/` content — confirm whether the seed mirror (`writeSeedMirror`, which only walks `COPIED_CONTENT_AREAS` under `.prism/`) even touches it. It does **not** (eve output is under `.eve/`, not `.prism/`), so no seed-curation entry is needed — but add a one-line comment in the plan-referenced spot confirming the decision so a future reviewer doesn't re-ask. Verification: `pnpm prism:check` passes (no seed drift reported for eve output). If `prism:check` reports the eve tree as unclassified, that is the signal it *is* being walked and needs an `excluded` entry — handle that case if it arises.

16. **Decide the gitignore posture for `.eve/`** and update `.gitignore`. Follow the per-tool ownership rule (ADR-0044, install-layout § Direct-write tool outputs): the eve agents root is a generated, in-repo destination → **committed** (like `.cursor/skills/`), so a consumer gets it via `git pull`. Add `.eve/worktrees/` to the ignored set (operational state, like the other tools' worktrees at .gitignore:11-13). Verification: `git status` shows the generated `.eve/agents/` as tracked and any worktree dir as ignored.

### Eli (documentation)

#### Unit F — Document the emitter and the Docker runbook (after D and E)

17. **Update `.prism/architect/_toolkit/install-layout.md`** to add the eve emitter to the platform-output inventory. Add `.eve/agents/<persona>/` to the "Platform-specific outputs" list (install-layout.md:10) and a short subsection under "What gets copied; what stays canonical-only" (install-layout.md:41) explaining that eve output is generated per-persona from `.ai-skills/skills/<id>/` (like the other agent defs) and is gated to the autonomous-slice persona set. Cite ADR-0062. Verification: `pnpm prism:crossref-lint` passes (any new repo-root-absolute references resolve).

18. **Write the Docker validation runbook** at `.prism/architect/_toolkit/eve-runtime.md` (new file). Content: the manual milestone steps to run Lilac on eve — `node:24` Docker container, `pnpm install` (with `@ai-sdk/anthropic`), `ANTHROPIC_API_KEY` env, `eve build`, `eve start`, hit the dev-trigger route `POST /eve/v1/dev/schedules/standup`, confirm the standup composes and the Slack-post HITL gate fires. Note the Node-floor split (emitter on host 22, runtime on Docker 24) and that this is a manual milestone, not CI. Add the manifest route for the new doc in `.prism/architect/manifest.json` (key `.eve/**` or `scripts/ai-skills/build.ts` → add `eve-runtime.md`) so future eve-emitter edits load it. Verification: `pnpm prism:verify-manifest` and `pnpm prism:crossref-lint` pass.

---

## Wave 2 — Sage and Zoe (repo-state personas, FR-4)

Wave 2 ports the first two repo-state personas onto the FR-4 design resolved above (`## Decisions` § FR-4 state-location, § Q2 general idempotency; ADR-0063). It decomposes into **three Sol-laneable units**:

- **Unit G** (Clove) — the emitter FR-4 extension: new `eve.yml` sandbox/write-back keys + a `buildEveSandboxFile` that generates `sandbox/sandbox.ts`. **Shared infrastructure — must land first; H and I both depend on it.**
- **Unit H** (Clove) — port Sage: add her `eve.yml`, add her to `EVE_AUTONOMOUS_PERSONAS`, hand-author her sandbox/write-back reference, regenerate-and-diff.
- **Unit I** (Clove) — port Zoe: same shape as H.

**Parallelism / serialization:** G blocks both H and I. H and I are independent in *content* (different personas, different `eve.yml`, different reference fixtures) but **both edit one line — the `EVE_AUTONOMOUS_PERSONAS` set in `build.ts:250` — and both add a wave-2 byte-diff test case.** That single shared edit is the serialization point: run H and I **sequentially** (H then I, or I then H), or lane them in parallel only with an explicit merge step that unions the set membership and concatenates the test cases. Recommended: G first (solo), then H and I sequentially in one lane. The live eve run of either persona stays Docker-manual — no CI AC requires Node 24, same split as Lilac.

The verification split is unchanged from wave 1: the emitter extension and the two byte-diffs are CI-green on host Node; the actual clone → fetch → read → write → push runtime is the Docker milestone.

### Clove (implementation)

#### Unit G — Emitter FR-4 extension (shared; must land before H and I)

19. **Extend the `EveAgentConfig` type and `loadEveAgentConfig`** in `scripts/ai-skills/build.ts` (config type near the existing eve config interface; loader at `build.ts:292`). Add these optional flat `eve.yml` keys, parser-safe (flat scalars and `[a, b]` lists only — the frontmatter parser drops nested blocks, per Decision: Canonical input vs template split):
    - `sandbox: boolean` (default `false`) — when `true`, emit a `sandbox/sandbox.ts`.
    - `sandboxBackend: "docker" | "microsandbox"` — required when `sandbox: true`; the loader **throws** if `sandbox: true` and the backend is absent or is `justbash` (per ADR-0063 Decision 3 — `justbash` has no real binaries and cannot run `git`).
    - `repoCheckout: boolean` (default `false`) — when `true`, the generated `sandbox.ts` includes the bootstrap clone + onSession refresh.
    - `writeBackGate: "always"` — the HITL approval helper for the write-back push (only `always` is valid in wave 2; the loader throws on any other value).
    - `writeBackPaths: [a, b]` — the paths the write-back commits (Sage: the changelog output dir; Zoe: `.prism/audits`, `.prism/plans`, `.prism/audit-state.json`). Used in the skill-body write-back instruction, not in `sandbox.ts`.
    Keep Lilac's `eve.yml` valid with all keys absent (the defaults make her a no-sandbox persona). Verification: `pnpm prism:check-types` passes; the existing Lilac byte-diff is unchanged (no new keys in her `eve.yml`).

20. **Add `buildEveSandboxFile`** to `build.ts` as a sibling to `buildEveAgentFiles` (`build.ts:467`). It is a pure function: given the `EveAgentConfig`, the default branch name, and the token map, it returns the `sandbox/sandbox.ts` content. Emit nothing (return no entry) when `eveConfig.sandbox` is `false`. When `true`, generate `defineSandbox({ backend, revalidationKey, bootstrap, onSession })`:
    - `backend`: `docker()` or `microsandbox()` from `eveConfig.sandboxBackend` (import from `eve/sandbox`).
    - `revalidationKey: () => "<persona-id>-repo-bootstrap-v1"` — stable so the template image is reused (per `sandbox.mdx`).
    - `bootstrap({ use })` (only when `repoCheckout`): clone the PRISM repo into `/workspace` — `git clone <repo-url> .` — leaving network open for the clone. Use a token-substituted repo URL (`${GITHUB_OWNER}/${PROJECT}` derived; reuse the token map so a consumer's repo substitutes).
    - `onSession({ use })` (only when `repoCheckout`): `git fetch origin && git reset --hard origin/<default-branch>` so each session reads current state (defeats the stale-snapshot trap).
    The function takes the same `substituteTokens(..., tokenMap)` treatment as the other generated files (all six wave-1 files already pass through `substituteTokens` — keep the seventh consistent). Verification: `pnpm prism:check-types` passes.

21. **Wire `buildEveSandboxFile` into the emit loop** in `main()` at the eve emit block (`build.ts:1706` where `buildEveAgentFiles` is called). After building the agent files map, call `buildEveSandboxFile(...)`; if it returns content, add `sandbox/sandbox.ts` to the written files alongside the rest of the directory. The marker write (`build.ts:1722`) and `writeFileIfChanged` loop already cover any new relative path — no change there. Verification: `pnpm prism:build` runs without error; for Lilac (no sandbox), `.eve/agents/prism-standup-summary/sandbox/` does **not** appear (assert in the test, task 22).

22. **Add wave-2 emitter tests** to `scripts/ai-skills/eve-emitter.test.ts`. Assert: (a) `buildEveSandboxFile` returns no entry when `sandbox` is `false` (Lilac's regression guard — no `sandbox/` dir); (b) it returns a `sandbox/sandbox.ts` containing `defineSandbox`, the chosen backend, the bootstrap `git clone`, and the onSession `git reset --hard` when `sandbox` + `repoCheckout` are `true`; (c) `loadEveAgentConfig` throws when `sandbox: true` and `sandboxBackend` is `justbash` or absent; (d) `loadEveAgentConfig` throws when `writeBackGate` is anything but `always`. Tests run on host Node (assert generated content, not eve runtime). Verification: `pnpm prism:test` passes; confirm the new cases are picked up by the existing `scripts/ai-skills/*.test.ts` glob.

#### Unit H — Port Sage (after G)

23. **Add Sage to `EVE_AUTONOMOUS_PERSONAS`** at `build.ts:250` — union in `"prism-changelog"`. **Serialization note:** this line is also edited by Unit I; if H and I run in separate worktrees, the merge must union both ids, not overwrite. Verification: `pnpm prism:check-types` passes.

24. **Author Sage's `eve.yml`** at `.ai-skills/skills/prism-changelog/eve.yml`. Use Lilac's `eve.yml` as the shape template. Keys:
    - `model: claude-sonnet-4.6` (match Lilac; Sage is not reasoning-heavy).
    - `scheduleName: changelog`, `scheduleCron` — **decide cadence with Hunter** (see Open Decision below); default-path body: a release-tag-range prompt. Note: Sage's real trigger is a tag push, which eve schedules cannot express (cron only). Wave-2 default is a manual dev-trigger / HTTP invocation, not a cron — so `scheduleCron` may be a placeholder weekly cron with the body instructing "only run when a new release tag exists since the last changelog." Flag this as the open cadence question.
    - `sandbox: true`, `sandboxBackend: docker`, `repoCheckout: true` — Sage reads git history, needs the checkout.
    - `writeBackGate: always`, `writeBackPaths: [<changelog output dir>]` — confirm Sage's output dir from `doc-generation.md` (the changelog reference) at author time.
    - `instructionsSections: [Personality, How Sage Thinks]` — identity only (matches Lilac's split).
    - `skillSections: [Changelog Standards, Startup, Commit parsing, Categorization, Change consolidation, Document structure, Document generation, Definition of Done]` — the workflow. Omit `Framework Knowledge`/`Common Issues`/`Domain Context`/`Post-Delivery Closing`/`Next persona`/`Session close` sections whose bodies are `.prism/references/` load-links the eve world can't resolve (the reference-scaffolding stripping handles links inside included sections, but sections that are *only* a load-link add nothing — leave them out). Verification: covered by task 26's byte-diff.
    - **Write-back adaptation:** Sage's `Post-Delivery Closing` section references the shared shipping-flow (commit → push → PR). In the eve world there is no interactive shipping flow — replace it with the FR-4 write-back: write the changelog into `/workspace`, then `git add <output> && commit && push` behind the `always()` gate. This adaptation is a `skillSections` content concern — if `Post-Delivery Closing` can't be cleanly stripped to the write-back, hand-author the write-back instruction into the reference fixture (task 25) and have the emitter reproduce it. Note the divergence in a `## Decisions` sub-bullet if the section is adapted rather than included verbatim.

25. **Hand-author Sage's eve agent reference** at `scripts/ai-skills/__fixtures__/eve-sage-reference/` (mirror the `eve-lilac-reference/` location and shape from wave 1, Unit D task 11). This is the runtime-intent reference the emitter must reproduce. Include the `sandbox/sandbox.ts` with the docker backend + clone bootstrap + onSession refresh. Verification: none yet — validated by task 26's diff and the Docker milestone.

26. **Regenerate and prove byte-identical.** Run `pnpm prism:build`, then `diff -r .eve/agents/prism-changelog scripts/ai-skills/__fixtures__/eve-sage-reference`. Zero diff is the proof. If they differ, fix the emitter (Unit G) or the `eve.yml` (task 24), not the fixture — unless the delta is a token substitution (then the fixture carries the substituted form, per Decision: Token substitution). Add a Sage byte-diff case to `eve-emitter.test.ts`. Verification: `diff -r` empty; `pnpm prism:test` passes.

#### Unit I — Port Zoe (after G)

27. **Add Zoe to `EVE_AUTONOMOUS_PERSONAS`** at `build.ts:250` — union in `"prism-surface-audit"`. Same serialization note as task 23. Verification: `pnpm prism:check-types` passes.

28. **Author Zoe's `eve.yml`** at `.ai-skills/skills/prism-surface-audit/eve.yml`. Keys:
    - `model: claude-sonnet-4.6`.
    - `scheduleName: audit`, `scheduleCron: "0 9 * * 1"` (Mondays 09:00 UTC — Zoe's cadence is weekly, advisory; the cron is the natural fit, unlike Sage's tag-driven trigger). Body: "Audit the `.prism/` surface — plans, lessons, ADRs, architect docs — issue per-Decision verdicts and write the report."
    - `sandbox: true`, `sandboxBackend: docker`, `repoCheckout: true` — Zoe reads the `.prism/` tree.
    - `writeBackGate: always`, `writeBackPaths: [.prism/audits, .prism/plans, .prism/audit-state.json]` — her audit report, plan verdict annotations, and state file.
    - `instructionsSections: [Personality]` — Zoe's `shared.md` has no "How X Thinks" section; identity is `Personality` plus the front-matter frame. Confirm the identity preamble (the "You are **Zoe**…" opener) is captured by `extractIdentityPreamble` — Zoe's `shared.md` opens with `## Personality` at line 5, so verify the preamble extractor handles a persona whose first section is `Personality` (Lilac may differ). If the extractor misses Zoe's opener, that's an emitter gap — fix it in Unit G, not by reshaping Zoe's source.
    - `skillSections: [When this skill is invoked, Purpose, Cadence, Audit surfaces, Per-Decision verdict procedure, Archive classification, Plan-archive lane, Open-question Decision variant, Output format, State file, What Zoe does NOT do]` — the full audit workflow.
    - **Write-back adaptation:** Zoe's write-back is the genuine `.prism/`-write-back — audit report to `.prism/audits/`, verdict sub-bullets onto plan files, state file. The skill body already describes these writes; the FR-4 addition is the `git add .prism/ && commit && push` behind the `always()` gate after the writes land in `/workspace`. Her "No silent edits" contract already requires confirmation — the gate expresses it.
    Verification: covered by task 30's byte-diff.

29. **Hand-author Zoe's eve agent reference** at `scripts/ai-skills/__fixtures__/eve-zoe-reference/`. Same shape as Sage's (task 25), with Zoe's sandbox + write-back paths. Verification: validated by task 30.

30. **Regenerate and prove byte-identical.** `pnpm prism:build`, then `diff -r .eve/agents/prism-surface-audit scripts/ai-skills/__fixtures__/eve-zoe-reference`. Add a Zoe byte-diff case to `eve-emitter.test.ts`. Verification: `diff -r` empty; `pnpm prism:test` passes.

#### Unit E-coverage check (folds into H/I; no new unit)

31. **Confirm the wave-1 drift/cleanup/guard machinery covers the two new personas with no change.** The cleanup uses `eveValidIds = knownSkillIds ∩ EVE_AUTONOMOUS_PERSONAS` (`build.ts:1864-1872`) — adding Sage/Zoe to the set automatically extends cleanup to their dirs. The literal guard root (`targetRoots.eveAgents`) already covers the whole `.eve/agents/` tree, so the new `sandbox/sandbox.ts` files are literal-guarded for free — **verify Sage/Zoe source carries no Thrive-flavored literal** (if it does, tokenize the canonical source per the wave-1 flow). Seed-curation needs no entry (`.eve/` is outside `COPIED_CONTENT_AREAS`, confirmed wave 1). Verification: `pnpm prism:check` green (drift, literal guard, seed all pass for the two new personas).

### Eli (documentation)

#### Unit J — Document FR-4 (after G, H, I)

32. **Extend `.prism/architect/_toolkit/eve-runtime.md`** with an FR-4 section: the sandbox bootstrap clone + onSession refresh, the `docker`/`microsandbox`-only backend constraint (`justbash` invalid for repo-state personas), and the HITL-gated write-back push. Add Sage and Zoe to the Docker milestone steps — for each: clone fires in the sandbox, the persona reads the checkout, writes its artifact, and the write-back push surfaces the `always()` HITL gate. Note the runtime-only unknowns (git auth in the sandbox, network policy, concurrent-push races) as things the milestone verifies that CI cannot. Cite ADR-0063. Verification: `pnpm prism:crossref-lint` passes.

33. **Update `.prism/architect/_toolkit/install-layout.md`** to add `sandbox/sandbox.ts` to the eve generated-file inventory (the wave-1 subsection lists six derived files; the seventh is the conditional sandbox file, emitted only for repo-state personas declaring `sandbox: true`). Cite ADR-0063. Verification: `pnpm prism:crossref-lint` passes; `pnpm prism:verify-manifest` passes (the `.eve/**` route already covers the new file kind).

---

## Decisions

- **Sequencing: hand-author Lilac first (Unit A), then extract the emitter (Unit C), then regenerate-and-diff (Unit D) — not emitter-first.**
  - **Root cause of the choice:** eve is a beta runtime no one on the team has a working example of. Writing the emitter first encodes *assumptions* about eve's directory shape into TypeScript, discovered wrong only when `eve build` rejects the output inside Docker (Node 24, slow loop).
  - **Alternatives considered:** emitter-first (Parker's suggestion); hand-author-only (no emitter this epic); hand-author-first-then-extract (chosen).
  - **Chosen approach:** hand-author Lilac's agent dir as a runtime-validated reference, extract the emitter from it, then regenerate Lilac and byte-diff against the reference. Beats emitter-first because it produces a known-good artifact validated against the real runtime *before* generalizing, and turns the emitter's correctness proof from a Docker-gated integration question into an on-host byte-diff. Beats hand-author-only because the emitter is the whole point (FR-1) and extracting it from a concrete example is lower-risk than authoring it abstract.
  - **Implementation guidance:** Unit A writes into `.eve/agents/prism-standup-summary/`; Unit D moves it to `__fixtures__/eve-lilac-reference/` before regenerating so the diff has something to compare against.
  - → promoted to ADR-0062 (the sequencing rationale is summarized in Consequences; the full reasoning lives here in the plan as ticket-tactical depth).

- **Routing and context distribution: persona `description` → eve skill `description` (verbatim); identity → `instructions.md`, workflow → `skills/<id>/SKILL.md`.**
  - **Root cause:** eve routes to skills by `description` only — there is no static event→skill dispatch table (verified against `docs/skills.mdx`). And eve does not auto-load shared context across an agent — `instructions.md` is the only always-on surface.
  - **Chosen approach:** map PRISM frontmatter `description` straight onto the eve skill `description` (PRISM's already reads as a trigger hint). Split `shared.md` by kind: identity/voice/personality → always-on `instructions.md`; procedure/workflow/anti-patterns → on-match `SKILL.md`. Tier-1 always-on rules, when a persona needs them, also go in `instructions.md` (per-skill siblings are for on-demand reference content the workflow reads, not always-on rules).
  - **Implementation guidance:** the identity/workflow split is established concretely in Unit A (Lilac) and the emitter (Unit C) encodes whatever split landed there. Pre-emit check: the emitter asserts every emitted `SKILL.md` carries a non-empty `description` (FR-2) and fails the build if one is missing.
  - → promoted to ADR-0062 § Decision 1–2 and the install-layout doc (Unit F task 17).

- **Idempotency (Open Q2): defer the general layer; gate each side effect behind eve HITL `always()` in the meantime.**
  - **Root cause:** eve re-runs a step interrupted mid-execution, so a non-idempotent side effect caught mid-`execute()` by a crash fires twice (verified). Completed steps never re-run, so the risk is narrow.
  - **Alternatives considered:** build a general idempotency layer now (dedup keys / check-before-act); gate behind HITL (chosen); do nothing.
  - **Chosen approach:** gate every in-scope side effect behind `needsApproval: always()`. For Lilac (slice 1) the only side effect is the Slack post, and her existing contract already requires explicit preview-and-confirm — so the gate is her existing rule in eve's primitive, not new friction. A general idempotency layer earns its place only when a persona has a side effect that *shouldn't* require approval on every run.
  - **Implementation guidance:** Unit A task 6 wraps the Slack-post action in the `always()` gate. The general layer is the resolver's call when the first such persona ships (Winston).
  - → promoted to ADR-0062 § Decision 6.

- **FR-4 state-location (Open Q3): clone in the sandbox, refresh per-session, write back through a HITL-gated push.** A repo-state persona gets its checkout from a generated `agent/sandbox/sandbox.ts` (`defineSandbox`) — `bootstrap` clones the PRISM repo into `/workspace` once at template build, `onSession` runs `git fetch && git reset --hard origin/<default-branch>` so each session reads current state. Reads use the default-harness `bash`/`read_file`/`grep`/`glob` against `/workspace`; no new tools.
  - **Root cause of the choice:** the GitHub *channel's* pre-call checkout requires the Vercel backend (ADR-0062 Decision 3), but the eve *sandbox* provides its own checkout that runs on local backends. The spike's channel-framing obscured this — repo-state personas are schedule/HTTP-driven, not channel-driven, so the channel constraint never applied to them. Source-verified against `docs/sandbox.mdx`: the `bootstrap` hook's canonical use is "cloning a baseline repo," and the network policy is "leave the factory open so `bootstrap` can `git clone`, then lock down in `onSession`."
  - **Alternatives considered:** GitHub-channel checkout (needs Vercel — rejected, violates NFR-2); a dedicated `tools/checkout-repo.ts` typed tool (rejected — deletion-test failure: it wraps `git clone` the agent can already run via the `bash` tool, relocating complexity rather than removing it); clone only in `bootstrap` (rejected — `bootstrap` runs once at template build and freezes the checkout, so personas read stale state).
  - **Chosen approach:** sandbox `bootstrap` baseline clone + `onSession` refresh. Beats channel checkout because it runs off-Vercel on `docker()`/`microsandbox()`; beats a dedicated tool because it reuses eve's designed sandbox seam and the default `bash` tool; beats bootstrap-only because the onSession refresh defeats the stale-snapshot trap.
  - **Backend constraint:** `docker()` or `microsandbox()` only — never `justbash()`, which has "no real binaries" and cannot run `git`. The emitter restricts a checkout persona's backend to the real backends.
  - **Implementation guidance:** the emitter gains a `buildEveSandboxFile` that produces `sandbox/sandbox.ts` when `eve.yml` declares `sandbox: true`. Lilac declares no sandbox key → emits no sandbox dir → her byte-diff is unchanged (the regression guard). Full clone/fetch/git-auth/network-policy correctness is Docker-manual, not CI — the byte-diff proves the emitter generates a correct `sandbox.ts`, not that it clones at runtime.
  - → promoted to ADR-0063 § Decisions 1–3.

- **Q2 general idempotency: stays deferred; the repo-state write-back rides the ADR-0062 HITL gate.** Both wave-2 personas write back through one side-effect class — a `git commit && git push` of their artifact (Sage: changelog document; Zoe: audit report + plan verdicts + state file) — gated behind `needsApproval: always()`. No idempotency key, no dedup layer.
  - **Root cause of the choice:** eve re-runs a step interrupted mid-execution, so a `git push` caught mid-step by a crash can fire twice. A push behind `always()` cannot fire from a re-run step without a fresh human decision — the same narrow-risk mitigation ADR-0062 Decision 6 chose for Lilac's Slack post.
  - **Alternatives considered:** build a general idempotency layer now (dedup keys / check-before-act — rejected as speculative infrastructure against a beta runtime); gate behind HITL (chosen); do nothing (rejected — the double-push risk is real).
  - **Chosen approach:** HITL `always()` on the write-back push. The gate is each persona's existing contract in eve's primitive: Sage's changelog already ships through a human-owned release PR, and Zoe's contract already forbids silent edits ("everything else waits for go-ahead"). A general idempotency layer earns its place only when a repo-state persona has a write-back that *shouldn't* require approval on every run — none in wave 2 does. The concrete trigger to revisit: the first repo-state persona whose push should be unattended (e.g. an unattended weekly audit), or a Docker-milestone finding that the write-back races concurrent human commits and needs a `git pull --rebase` before push.
  - **Implementation guidance:** the write-back is a documented action in each persona's eve skill body, wrapped in the `always()` gate. Sage and Zoe's write-backs collapse to one gated primitive — the idempotency story is one rule, not two.
  - → promoted to ADR-0063 § Decision 4.

- **FR-4 emitter synthesis (Unit G): the write-back instruction is a SKILL.md section the emitter synthesizes, Slack is conditional, and load-link-only sections are dropped from `skillSections`.** Three emitter shapes Unit I (Zoe) must follow verbatim.
  - **Root cause:** the generated `SKILL.md` body is assembled from `skillSections` of `shared.md`, so there is no slot for the FR-4 write-back. Sage's chat-harness `Post-Delivery Closing` references the interactive shipping flow, which has no eve analogue. And `Document generation` strips to a bare heading (its body is only a `.prism/references/` load-link + teaser).
  - **Alternatives considered:** hand-author the write-back into each fixture and have the emitter reproduce it (rejected — non-reproducible across personas, breaks on the next persona); include `Document generation` and tolerate the empty heading (rejected — dead weight, plan task 24 says leave it out).
  - **Chosen approach:** `buildWriteBackSection` synthesizes a `## Write-back` section appended to `SKILL.md` when the eve config declares `writeBackGate` — token-substituted, deterministic, byte-diffable. `slackConnectUid` is optional; the Slack channel emits only when present (Sage/Zoe have no Slack surface). A section whose body is *only* a load-link is omitted from `skillSections`, not stripped to a bare heading.
  - **Implementation guidance:** Zoe declares `writeBackGate: always` + `writeBackPaths` and gets the same synthesized section with her paths; she omits `slackConnectUid` (no Slack channel); she drops any `skillSections` entry whose body is load-link-only. The write-back command renders `git add <paths joined by space> && git commit && git push` inside one backtick span — no per-path backticks (nested backticks break markdown).
  - → no promotion needed (ticket-tactical; the synthesis rationale lives here and in the `buildWriteBackSection`/`buildEveSandboxFile` JSDoc).

- **OPEN — TBD, needs Hunter input.** Sage's eve trigger cadence. Sage's natural trigger is a *release-tag push*, but eve schedules are cron-only (verified, `docs/schedules.mdx`) — there is no tag-push schedule. Zoe maps cleanly to a weekly cron; Sage does not. **Default path (used until resolved):** wave 2 ships Sage with a placeholder weekly cron whose body instructs "only produce a changelog when a new release tag exists since the last run," plus a manual dev-trigger / HTTP invocation as the real entry point — the cron is a heartbeat, not the trigger. The clean resolutions (a GitHub-channel tag-push hook, or an external CI job that POSTs Sage's session route on tag push) are wave-3 candidates: both reintroduce the GitHub-channel/Vercel-backend question ADR-0062 Decision 3 flagged, so they need their own evaluation. This open question does not block Unit H — the placeholder-cron default lets Sage's port land and byte-diff on host CI; the live trigger is a Docker-milestone/wave-3 concern.

- **OPEN — TBD, needs the first non-local deploy as the trigger (resolver: Winston/Hunter at deploy time).** Production auth helper for the eve session routes. **Default path (used until resolved):** slice 1 runs entirely on loopback under `localDev()`, with `placeholderAuth()` failing closed behind it (Unit A task 7). `vercelOidc()` is omitted because the no-Vercel-lock-in goal means we must not rely on it alone. The first non-local deploy is the trigger to choose `httpBasic` / `jwtHmac` / `jwtEcdsa` / `oidc` / a custom `AuthFn`; under Option B, the receiving persona agent's auth walk must accept whatever outbound auth Sol presents (`bearer` / `basic` / OIDC).

- **Direct-to-Anthropic routing requires adding `@ai-sdk/anthropic` (not in the spike's deps).** The spike uses the gateway-routed model string, which needs `AI_GATEWAY_API_KEY` off-Vercel. Direct routing (`anthropic("…")` + `ANTHROPIC_API_KEY`) is required for the no-Vercel-lock-in goal, so `@ai-sdk/anthropic` is a real install task (Unit B), pinned alongside `eve@^0.11.6` per NFR-4. → promoted to ADR-0062 § Decision 5.

- **Verification split: the emitter is CI-green on host Node; running Lilac on eve is a manual Docker milestone.** The emitter is TypeScript in `build.ts` — its correctness is proved on host Node 22 by the Unit D byte-diff and the Unit D test, both in CI via `pnpm prism:check`. Actually running the agent (`eve build && eve start`) needs Node 24 → Docker `node:24`, which the host CI (Node 22) cannot run — so the end-to-end proof is a manual milestone captured as a `[Docker / manual]` AC, never a CI gate. → promoted to ADR-0062 § Decision 7. No CI AC requires Node 24.

- **Eve output lives under `.eve/agents/<persona>/`, committed, following the per-tool ownership rule (ADR-0044).** It is a generated in-repo destination → committed (like `.cursor/skills/`); `.eve/worktrees/` is ignored (operational state). It is not canonical `.prism/` content, so the seed mirror does not walk it and no `seed-curation.json` entry is needed (Unit E task 15 confirms). → no promotion needed (codified in install-layout.md via Unit F task 17 and follows existing ADR-0044).

- **Scope: autonomous slice only (Lilac → Sage → Zoe); the emitter gates emission to an explicit persona set.** The build loop (Winston/Clove/Briar) is not ported. Eric-via-GitHub-webhook is a documented wave-2 candidate, deferred because the GitHub channel's pre-call checkout requires the Vercel backend, conflicting with the local-world goal. → promoted to ADR-0062 § Decision 3.

- **Header reconciliation (Unit C): eve runtime files carry NO in-content generated-header comment.** The Claude/Codex `.md` emitters prepend a `<!-- AUTO-GENERATED -->` block; the eve emitter does not.
  - **Root cause:** eve routes to a skill by its frontmatter `description` only (its single routing mechanism). A leading HTML comment before `SKILL.md`'s opening `---` pushes the frontmatter off line 1 and risks breaking that routing; `agent.ts`/`channels/*.ts` are plain TypeScript a comment doesn't belong in. The hand-authored, runtime-intent reference deliberately carries no header.
  - **Alternatives considered:** prepend the header to match the other emitters (breaks routing); header on `.md` files only (still breaks SKILL.md); no header, marker-based managed detection (chosen).
  - **Chosen approach:** no in-content header. Managed-ness and drift protection (NFR-1) ride on the per-persona `.ai-skill-generated` marker written alongside the files — the directory-based managed pattern (`skillsRootHasManagedContent`), not the file-header pattern the Claude/Codex agent roots use. `eveAgentsRootHasManagedContent` checks the marker.
  - **Implementation guidance:** the fixture (= reference) was already header-free, so it is correct as-is; the emitter matches it. Do not "fix" the eve emitter to add headers — it would break Lilac's routing.
  - → no promotion needed (ticket-tactical; the marker-vs-header rationale lives here and in the emitter JSDoc).

- **Token substitution (Unit D): the eve emitter substitutes `${TOKEN}` placeholders, like every other platform; the preserved fixture carries substituted values.** The hand-authored reference kept literal `${PROJECT}` / `${GITHUB_OWNER}` etc.
  - **Root cause:** the reference was hand-copied from `shared.md` without running token substitution — a hand-authoring artifact, not the correct generated shape. Literal `${PROJECT}` in a deployed eve agent is broken (eve cannot resolve a PRISM build token). Every other platform output (Claude/Codex/Cursor) substitutes, and the literal-guard requires no raw source literals leak.
  - **Chosen approach:** the emitter substitutes (correct, guard-safe, every-platform behavior). The fixture was regenerated from the corrected emitter output, so it carries `PRISM` / `HunterMcGrew/PRISM` / `#prism-dev`. This is "defining the expected generated artifact," not "fixing the test to pass" — per the byte-diff: every delta between emitter and original reference was a token substitution, with zero body/structural differences.
  - **Implementation guidance:** the fixture is the *generated* artifact (substituted), not the raw hand-authored copy. A consumer build re-substitutes against their own config.
  - → no promotion needed (ticket-tactical).

- **Canonical input vs template split (Unit C): per-persona eve config lives in a new `eve.yml` sibling, NOT in `frontmatter.yml`.** Two files derive from `shared.md` (identity/workflow split); four are templated from `eve.yml`.
  - **Root cause:** `frontmatter.yml` is embedded verbatim into every platform's `SKILL.md` frontmatter, so eve keys added there would leak into Claude/Codex/Cursor output and drift many files. The frontmatter parser also rejects nested blocks (verified: a nested `eve:` block silently drops its indented children) — only flat keys parse.
  - **Chosen approach:** add `eve.yml` (flat keys: `model`, `scheduleName`/`scheduleCron`/`scheduleBody`, `slackConnectUid`, `instructionsSections`/`skillSections`) as a fifth sibling alongside `claude.md`/`codex.md`/`cursor.md` in the skill dir — read only by the eve emitter, invisible to other emitters and to `optionalSkillPayloads`/seed-curation. Section lists use `[a, b]` syntax (parser captures verbatim; emitter splits). The two derived files: `instructions.md` = identity preamble + `instructionsSections` (identity, no workflow); `SKILL.md` = folded `description` block + `skillSections` with `.prism/references/` load-link scaffolding stripped (those links are dead in the eve world — the eve agent has no `references/` tree). `agent.ts`/`schedules/<name>.md`/`channels/slack.ts` templated from `eve.yml`; `channels/eve.ts` is fixed boilerplate.
  - **Implementation guidance:** a persona joins the eve slice by (1) entering `EVE_AUTONOMOUS_PERSONAS` and (2) adding an `eve.yml`. The emitter throws if a set member lacks `eve.yml` or a required key.
  - → promotion candidate for Unit F's install-layout doc and ADR-0062 (the `eve.yml`-sibling + identity/workflow-split shape); leave promotion to plan close.

---

## History

- 2026-06-19 [hmcgrew/eve-substrate-port]: Created epic branch plan and issue #235.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Winston added the architecture, ADR-0062, and the implementation plan. Verified all 14 load-bearing eve runtime claims against the actual docs before relying on them; decomposed into six units (A: hand-author Lilac, B: prereqs, C: emitter, D: regenerate+diff, E: drift/guard/seed, F: docs). Resolved Open Q2 (idempotency → HITL gate default) and Q3 (state-location → wave-2 open variant); see Decision: Sequencing for the Lilac-by-hand-first call.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Clove completed Units A+B — hand-authored Lilac's eve agent directory (agent.ts, instructions.md, skills/prism-standup-summary/SKILL.md, schedules/standup.md, channels/slack.ts, channels/eve.ts) and added the standalone .eve/package.json plus eveAgentsRoot to paths.json. Import paths confirmed against eve docs; Slack channel uses connectSlackCredentials (Vercel Connect); schedule uses markdown form; pnpm prism:check-types passes.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Clove completed Unit C — added the `buildEveAgentFiles` emitter to `build.ts` (identity/workflow split + reference-scaffolding stripping + `eve.yml`-templated config), the `eve.yml` canonical sibling for Lilac, the `eveAgentsRoot` field on the `PathDefinitions` type, and the `EVE_AUTONOMOUS_PERSONAS`-gated wiring in `main()` (optedIn, targetRoots, marker, `eveAgentsRootHasManagedContent`). See Decisions: Header reconciliation and Canonical input vs template split.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Clove completed Unit D — preserved the reference to `__fixtures__/eve-lilac-reference/`, regenerated `.eve/agents/prism-standup-summary/`, and proved `diff -r` is ZERO (every original delta was a token substitution; fixture updated to the substituted generated form). Added `eve-emitter.test.ts` (5 tests, identity-split + non-empty description + byte-match) and excluded `__fixtures__` from the build tsconfig (eve `.ts` files import eve, absent on host). See Decision: Token substitution.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Clove completed Unit E — added eve cleanup (directory-based via `removeDeletedManagedSkills` on `eveValidIds = knownSkillIds ∩ EVE_AUTONOMOUS_PERSONAS`), added `targetRoots.eveAgents` to `literalGuardRoots`, confirmed seed-curation.json needs no entry (`.eve/` is outside all `COPIED_CONTENT_AREAS` paths), and added `.eve/worktrees/` to `.gitignore`. Cleanup test added to `eve-emitter.test.ts` (341 tests pass); `prism:check` green.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Eli completed Unit F — updated `install-layout.md` (eve agent output subsection: committed/ignored split, six derived files, no-header rationale, `eve.yml` sibling pattern), wrote `eve-runtime.md` (Docker validation runbook: Node-floor split, `eve build`/`eve start`, dev schedule trigger route, HITL gate, auth note), added `.eve/**` + `build.ts` manifest routes. All claims verified against source. `pnpm prism:build` updated 11 mirrors; `prism:check` green.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Briar self-review — all checks green (341/341 tests, zero byte-diff, prism:check clean, types clean). 2 minors: AC NFR-1 wording contradicts Header reconciliation Decision; agent.ts/slack.ts skip substituteTokens (latent token-leak risk for wave 2). No blocking issues.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Clove addressed 4 Briar findings — AC NFR-1 reworded to reference `.ai-skill-generated` marker; all 6 eve-generated files now pass through `substituteTokens` (slice-1 byte-diff ZERO confirmed); `docs/getting-started.md` lists `.eve/agents/` as the fourth compile target; ADR-0062 `/tmp` ephemeral reference replaced with durable language in canonical + all 4 platform mirrors. 341/341 tests pass; `prism:check` green.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Clove pushed branch and opened draft PR #236 for issue #235.
- 2026-06-19 [hmcgrew/eve-substrate-port]: Clove addressed Eric's 3 PR-review findings — added `@vercel/connect@0.2.2` to the eve-runtime.md dep enumeration (Major) with no-lock-in rationale, added 3 emitter throw-path tests (344 total, up from 341), and replaced the silent byte-match no-op with `assert.fail`. Byte-diff zero; `prism:check` green.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Winston resolved FR-4 (Open Q3) and Q2 idempotency, wrote ADR-0063, and planned the Sage/Zoe port. Source-verified the eve sandbox against `docs/sandbox.mdx`: read path is a sandbox `bootstrap` clone + `onSession` refresh on a local `docker`/`microsandbox` backend (off-Vercel — the channel-checkout-needs-Vercel framing never applied to repo-state personas); write path is one HITL-gated `git push`, so Q2 stays deferred. Decomposed into Units G (emitter FR-4 extension, first), H (Sage), I (Zoe) — H and I serialize on the shared `EVE_AUTONOMOUS_PERSONAS` edit. Flagged Sage's tag-push-vs-cron cadence as an OPEN needing Hunter.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Clove completed Unit G — `loadEveAgentConfig` gained the `sandbox`/`sandboxBackend`/`repoCheckout`/`writeBackGate`/`writeBackPaths` keys with the two ADR-0063 throws (justbash/absent backend; non-`always` gate), `buildEveSandboxFile` emits `sandbox/sandbox.ts` (defineSandbox + backend + bootstrap clone + onSession reset) or `null` for non-sandbox personas, and the skill body gains a synthesized `## Write-back` section. Made `slackConnectUid` optional so non-Slack repo-state personas omit the Slack channel. 4 new wave-2 tests; Lilac byte-diff stays ZERO. See Decision: FR-4 emitter synthesis.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Clove completed Unit H — added Sage's `eve.yml` (placeholder weekly cron per the OPEN cadence default; docker sandbox; `writeBackPaths: [.claude/changelogs]`; no `slackConnectUid`), unioned `prism-changelog` into `EVE_AUTONOMOUS_PERSONAS`, preserved the verified reference to `__fixtures__/eve-sage-reference/` before build, and proved `diff -r .eve/agents/prism-changelog` is ZERO. Dropped `Document generation` from `skillSections` (its body strips to a bare heading — only a `.prism/references/` load-link). Added the Sage byte-diff test; 349 tests pass (up from 344); `prism:check` green.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Clove completed Unit I — added Zoe's `eve.yml` (Monday 09:00 UTC weekly cron; docker sandbox + repo checkout; `writeBackPaths: [.prism/audits, .prism/plans, .prism/audit-state.json]`; no `slackConnectUid`), unioned `prism-surface-audit` into `EVE_AUTONOMOUS_PERSONAS`, preserved fixture to `__fixtures__/eve-zoe-reference/`, and proved all three byte-diffs (Zoe + Sage + Lilac) ZERO. Dropped `Output format` from `skillSections` (contains embedded `## ` headings inside a fenced code block that cause `extractSharedSection` to truncate and leave an unclosed fence — same pattern as Sage's `Document generation`). Added Zoe byte-diff test; 350 tests pass; `prism:check` green. No emitter fix needed for Zoe's `Personality`-first preamble — `shared.md` has a leading "You are **Zoe**..." paragraph before `## Personality`, so `extractIdentityPreamble` captures it correctly.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Eli completed Unit J — extended `eve-runtime.md` with the FR-4 repo-state section (sandbox bootstrap clone + onSession refresh, backend constraint, write-back HITL gate, runtime-only unknowns, and Docker milestone runbooks for Sage and Zoe; cited ADR-0063) and updated `install-layout.md` (sandbox/sandbox.ts as seventh derived file for repo-state personas, membership-rule language replacing the stale "Sage and Zoe join in wave 2" forward reference, dual ADR cite). Claims verified against `build.ts`, generated `sandbox.ts` files, `sandbox.mdx`, and the synthesized SKILL.md write-back text. `pnpm prism:build` updated 9 mirrors; `prism:check` green.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Briar self-review (Sol-dispatched) — wave-2 CI all green (350/350 tests, three byte-diffs ZERO, prism:check clean). 3 minors filed: `extractSharedSection` code-fence bug (documented, workaround in place); Zoe `Output format` dropped (content-loss, deferred); inline prose reference-links survive strip in Sage SKILL.md. Graded `extractSharedSection`/Zoe drop as **minor** (deferred follow-up). No blocking issues; verdict: needs-fix (minors, no PR-blocking items).
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Clove fixed Briar Finding 1 — made `extractSharedSection` code-fence-aware (insideFence toggle on ` ``` ` lines; section boundary only fires when `!insideFence`), re-added `Output format` to Zoe's `skillSections`, updated fixture, exported function, added 2 new tests (352 total). All three byte-diffs ZERO; `prism:check` green. Finding 2 (Zoe Output format) resolved as a direct consequence; Finding 3 (inline prose links) deferred per Sol scope.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Clove opened draft PR #237 for wave 2 (Sage + Zoe, FR-4 sandbox/write-back) — body authored from template; branch is clean.
- 2026-06-19 [hmcgrew/eve-wave2-sage-zoe]: Clove fixed Eric Minor 1 — rewrote `install-layout.md:77` to describe the Slack→sandbox swap rather than a seventh file; regenerated three platform mirrors; all three byte-diffs ZERO; 352/352 pass. Minor 2 (inline prose links) acknowledged on PR thread as correctly deferred; Eric's corrected path-resolution framing recorded in Review Issues.
- 2026-06-20 [hmcgrew/prism-235-archive-eve-plan]: The eve substrate effort was abandoned — PR #239 reverted all eve work from main, removing the ADRs (0062/0063), the emitter additions to build.ts, and the .eve/ outputs. A revision wave re-scoping eve to {Lilac, Sage, Nora, Reese} with Vercel-default and Node 24 (ADRs 0064/0065) was scoped on branch hmcgrew/prism-235-eve-revision but never implemented and is also abandoned. This plan is restored as an archived record per ADR-0047.

---

## Debugged Issues

---

## Review Issues

### extractSharedSection is code-fence-unaware (tracked, documented workaround in place)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/build.ts:373-389` (`extractSharedSection`)
- **Problem:** `extractSharedSection` scans for the next `## ` line to delimit a section, but does not track fenced-code-block state. A section whose body contains an embedded `## ` heading inside a ` ``` ` fence causes truncation at that interior heading, producing a section with an unclosed fence. Confirmed: `## Output format` in `prism-surface-audit/shared.md` truncates at line 168 (`## Summary` inside the code block), emitting only the opening ` ```markdown ` with no closing fence. Clove's workaround — dropping the section from `skillSections` — avoids the broken output but silently loses the section's content. See Sol-flagged grading below.
- **Suggested fix:** Track fence state in `extractSharedSection` (toggle a `insideFence` boolean on ` ``` ` lines; only stop at `## ` when `!insideFence`). This is a 5-line fix and removes the need for the workaround.
- **Fixed in:** `extractSharedSection` now tracks an `insideFence` boolean that toggles on lines starting with ` ``` `; section boundaries only fire when `!insideFence`. Exported for unit testing; two new tests added (fence-aware unit test + Zoe SKILL.md fence-balance assertion). No-op for Sage and Lilac (their sections have no embedded-fence headings — byte-diffs remain ZERO).

### Zoe Output format dropped from eve SKILL.md (content loss — grading below)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-surface-audit/eve.yml` (`skillSections`) + `build.ts:373`
- **Problem:** `Output format` is omitted from Zoe's `skillSections` because `extractSharedSection` would truncate it (see above). The section describes the audit report's file path (`.prism/audits/<YYYY-MM-DD>-audit.md`), the report's full schema (sections, verdict format, deferred items), and the `mkdir` behavior for first run. Without it, Zoe running on eve must infer the report structure from `## Purpose` alone — she will likely produce an output, but not necessarily matching the canonical shape.
- **Fixed in:** Re-added `Output format` to `skillSections` in `eve.yml` now that `extractSharedSection` is fence-aware. Fixture updated; all three byte-diffs ZERO; 352/352 tests pass.

### install-layout.md file-count wording describes a seventh file rather than the swap

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:77`
- **Problem:** "six for schedule-only personas (Lilac), a seventh for repo-state personas (Sage, Zoe)" mis-states the math. Both classes emit six files. Repo-state personas trade `channels/slack.ts` for `sandbox/sandbox.ts` — they do not add a seventh.
- **Fixed in:** Rewording: "The emitter derives six files from that source for every persona; repo-state personas (Sage, Zoe) emit `sandbox/sandbox.ts` in place of `channels/slack.ts` rather than adding a seventh." Canonical `install-layout.md` edited; `pnpm prism:build` regenerated three platform mirrors (`.claude/`, `.codex/`, `.cursor/`). Eve agent output unchanged — all three byte-diffs ZERO.

### Inline prose reference-links survive scaffolding strip in Sage SKILL.md

- **Severity:** `minor`
- **Status:** `deferred` — deferred to follow-up per Sol; the fix interacts with FR-4 link-handling design (EVE_REFERENCE_LINK / stripEveReferenceScaffolding); not in scope for this wave-2 increment.
- **File:** `scripts/ai-skills/build.ts:403-405` (`EVE_REFERENCE_LINK`) / `scripts/ai-skills/__fixtures__/eve-sage-reference/skills/prism-changelog/SKILL.md:95,99`
- **Problem:** `EVE_REFERENCE_LINK` only matches the bold-directive pattern (`**read [...](path)**`). Inline prose links to `.prism/references/` paths survive in the generated SKILL.md — e.g. "apply the Categorization Decision Tree from [`frameworks.md`](../../../.prism/references/changelog/frameworks.md)" appears at lines 95 and 99 of the generated Sage SKILL.md. These are dead links in the eve world (no `references/` tree). They are lower severity than the directive links because they degrade gracefully (the agent can still follow the inline instruction), but they are strictly wrong. **Corrected framing (from Eric PR review):** the "files exist in `/workspace` so it degrades gracefully" rationale is slightly off — the relative path as written doesn't resolve to the checked-out file. From `skills/prism-changelog/SKILL.md`, the path `../../../.prism/references/...` climbs above the agent root (`skills/prism-changelog` → `skills` → `<agent-root>` → escapes). In the repo clone it resolves to the non-existent `.eve/agents/.prism/references/...`. The fix is a real path-rewrite-vs-strip design decision (persona-dependent, FR-4-interacting), not a no-op.
- **Suggested fix:** Extend `stripEveReferenceScaffolding` to also strip inline markdown links whose href matches `.prism/references/` — or replace them with the link text only (drop the href).

### AC NFR-1 text contradicts Header reconciliation Decision

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/epic-eve-substrate.md:214`
- **Problem:** Non-behavioral AC item says eve output "carries the generated-file header" but the Header reconciliation Decision explicitly states eve files carry NO in-content generated-header comment (because a leading comment breaks SKILL.md frontmatter routing). The AC is contradicted by a locked Decision.
- **Fixed in:** AC NFR-1 reworded to reference the `.ai-skill-generated` marker instead of an in-content header.

### agent.ts and channels/slack.ts skipped by substituteTokens

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/build.ts:491-501`
- **Problem:** `agentTs` and `slackChannelTs` are not passed through `substituteTokens`. The literal-guard (Thrive-product-specific) doesn't catch PRISM-team-token placeholders leaking into those files. For slice 1 `eve.yml` has no token placeholders in `model` or `slackConnectUid`, so no drift today — but a future wave-2 persona whose `eve.yml` carries e.g. `slackConnectUid: slack/${SLACK_TEAM}` would emit a raw placeholder.
- **Fixed in:** All six generated eve files now pass through `substituteTokens`. Slice-1 byte-diff confirmed ZERO after the change.

### docs/getting-started.md missing .eve/agents/ compile target

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/getting-started.md:11,31`
- **Problem:** `pnpm prism:build` output list named `.claude/`, `.codex/`, `.cursor/` but omitted `.eve/agents/` as a fourth compile target.
- **Fixed in:** Both occurrences updated; `.eve/agents/` added with a phrase describing it as the autonomous-slice persona output.

### ADR-0062 References section cites an ephemeral /tmp path

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/_toolkit/0062-eve-substrate-port.md:12,76`
- **Problem:** `## References` cites `/tmp/eve-discovery-digest.md` — a session-scoped ephemeral path absent on any other machine. Session-context leakage in a durable artifact.
- **Fixed in:** Both occurrences replaced with durable language. Canonical ADR and all 4 platform mirrors updated; `pnpm prism:build` confirmed no uncommitted drift remains.

### eve-runtime.md dep enumeration missing @vercel/connect

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/eve-runtime.md:45`
- **Problem:** Step 2 of the Docker runbook enumerated `.eve/package.json` deps but omitted `@vercel/connect@0.2.2`, which `channels/slack.ts` imports (`connectSlackCredentials` from `@vercel/connect/eve`). A consumer running the runbook would install an incomplete dep set and get a module-not-found error at `eve build`.
- **Fixed in:** Added `@vercel/connect@0.2.2` to the enumerated set with a one-line rationale (build-time connection dep, not a Vercel runtime-service dep — consistent with no-lock-in goal). Also updated the `## Where to look` bullet to list the full pinned dep set. All 4 platform mirrors regenerated via `pnpm prism:build`.

### Emitter throw-paths untested

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/eve-emitter.test.ts`
- **Problem:** Three error guards in the emitter had no test coverage: (1) `extractDescriptionBlock` throwing when frontmatter has no `description` (backs behavioral AC item 2); (2) `loadEveAgentConfig` throwing on a missing required key; (3) the build loop's missing-`eve.yml` guard for a persona in `EVE_AUTONOMOUS_PERSONAS`.
- **Fixed in:** Added three tests: throws on missing description (asserts exact error message), throws on missing required key (asserts message pattern), and every `EVE_AUTONOMOUS_PERSONAS` member has an `eve.yml` on disk (catches the loop guard condition at unit-test time). Test count: 341 → 344.

### Byte-match test silently no-ops when generated tree is absent

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/eve-emitter.test.ts:148`
- **Problem:** The catch block in the byte-match test silently returned when `.eve/agents/prism-standup-summary` didn't exist, making `pnpm prism:test` pass green on a clean checkout with no prior build — the correctness proof silently vaporized.
- **Fixed in:** Replaced the silent `return` with `assert.fail(...)` that names the missing path and instructs the user to run `pnpm prism:build` first.

---

## Acceptance Criteria

### Behavioral

**Background:** PRISM's canonical persona source lives in `.ai-skills/skills/`, and `pnpm prism:build` regenerates all platform outputs from it.

- [ ] When the build runs, Then an eve agent directory is produced for each in-scope autonomous persona (Lilac for slice 1), containing an always-on identity file, a skill with a routing description, a schedule, and channel configuration.
- [ ] When the eve agent directory is produced, Then its skill carries a non-empty routing description (the build fails if any emitted skill is missing one).
- [ ] When a persona is removed from the autonomous-slice set and the build runs, Then that persona's eve agent directory is swept and no orphan remains.
- [ ] Given the hand-authored Lilac reference exists, When the emitter regenerates Lilac, Then the generated directory is byte-identical to the reference.
- [ ] [Docker / manual] Given the generated Lilac agent is built and served on eve's local world inside a Node 24 container, When the standup schedule is triggered, Then Lilac composes the 4-section standup and surfaces a preview-and-confirm approval before posting to Slack.
- [ ] [Docker / manual] Given the standup preview is shown, When the approval is granted, Then the standup posts to the Slack channel in-thread; When the approval is not granted, Then nothing posts.

### Non-behavioral

- [ ] `pnpm prism:build` completes without error and emits the eve agent directory (host Node).
- [ ] `pnpm prism:check` passes on a clean tree — no drift reported for eve output, the literal guard passes, the path guard passes, and the existing platform emitters are unaffected (host Node).
- [ ] `pnpm prism:test` passes, including the new eve-emitter test (host Node).
- [ ] The eve emitter is isolated in `build.ts` such that a breaking eve/`ai`-SDK upstream change is contained to the emitter, not the whole build (NFR-4); eve and `ai`-SDK versions are pinned.
- [ ] `.prism/` markdown remains the single source of truth — eve output is generated, drift-checked, and managed via the per-persona `.ai-skill-generated` marker; no eve output is hand-edited (NFR-1).
- [ ] The slice introduces no dependency on a Vercel-only service; the agent's model routing is direct-to-Anthropic and durability is the local on-disk world (NFR-2).
- [ ] [Docker / manual] Lilac runs on eve's local on-disk world (`.workflow-data`) under Node 24 with no Vercel service — this is a manual milestone, explicitly not a host-CI gate (the host runs Node 22).

### Wave 2 — Sage and Zoe (FR-4)

**Behavioral:**

- [x] When the build runs for a repo-state persona (one whose `eve.yml` declares `sandbox: true`), Then the emitter produces a `sandbox/sandbox.ts` containing the chosen backend, a bootstrap repo clone, and an onSession refresh.
- [x] When the build runs for a persona that declares no sandbox (Lilac), Then no `sandbox/` directory is produced — her generated output is unchanged from wave 1.
- [x] Given a persona declares `sandbox: true`, When its `eve.yml` sets `sandboxBackend` to `justbash` or omits the backend, Then the build fails with an error naming the persona and the backend constraint.
- [x] Given the hand-authored Sage reference exists, When the emitter regenerates Sage, Then the generated directory is byte-identical to the reference.
- [x] Given the hand-authored Zoe reference exists, When the emitter regenerates Zoe, Then the generated directory is byte-identical to the reference.
- [ ] [Docker / manual] Given Sage's generated agent is built and served on eve under Node 24, When her schedule (or dev-trigger) fires, Then the sandbox clones the repo, Sage reads the tag range and composes the changelog, and the write-back push surfaces a preview-and-confirm HITL approval before pushing.
- [ ] [Docker / manual] Given Zoe's generated agent is built and served on eve under Node 24, When her weekly schedule (or dev-trigger) fires, Then the sandbox clones the `.prism/` tree, Zoe writes the audit report and plan verdicts into the checkout, and the write-back push surfaces a preview-and-confirm HITL approval before pushing.

**Non-behavioral:**

- [x] `pnpm prism:build` and `pnpm prism:check` pass on a clean tree with Sage and Zoe in the autonomous set — drift, literal guard, and seed all green for the two new personas (host Node).
- [x] `pnpm prism:test` passes, including the wave-2 emitter cases (sandbox-file generation, the no-sandbox regression guard, the backend-constraint throw, and the Sage/Zoe byte-diffs) (host Node).
- [x] The FR-4 read path introduces no Vercel-only dependency — the sandbox clone runs on a local backend (`docker`/`microsandbox`), holding NFR-2 for repo-state personas.
- [ ] [Docker / manual] The full FR-4 runtime flow (clone → fetch → read → write → HITL-gated push) for Sage and Zoe is a manual milestone, explicitly not a host-CI gate.

---

## Cleanup Items

_No open items._

---

## PR Readiness

- [x] No critical or major issues (all review issues resolved — see Review Issues)
- [x] Types correct — no `any`, no unsafe `as` (`prism:check-types` passes)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (`eve-emitter.test.ts`, 17 tests — wave-2: no-sandbox guard, sandbox content, backend throw, writeBackGate throw, Sage byte-diff, Zoe byte-diff, Zoe Output format fence-balance, extractSharedSection fence-aware unit test; 352/352 pass)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-19 (`prism:build` + `prism:check` green; 352 tests pass; Zoe + Sage + Lilac byte-diffs zero; literal guard passes; crossref-lint passes; manifest coverage passes)
- [x] PR description up to date (PR #236 — body sync pending)
- [x] Lasting decisions promoted to architect context (Units F and J complete — eve.yml-sibling + identity/workflow split in `install-layout.md`; Docker runbooks in `eve-runtime.md`; FR-4 sandbox/write-back in `eve-runtime.md`; ADR-0062 and ADR-0063 cited)
- [x] No open Review Issues (Briar Finding 1 fixed, Finding 2 resolved, Finding 3 deferred per Sol; Eric Minor 1 fixed, Minor 2 acknowledged as deferred)

**Last updated:** 2026-06-19 (Clove: fixed Eric Minor 1 — `install-layout.md` file-count wording rewritten as swap; three platform mirrors regenerated; byte-diffs ZERO; Minor 2 acknowledged on PR #237 thread.)
