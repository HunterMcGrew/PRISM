# Plan: prism-481

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/481 — label `bug`

## Goal

Make Atlas completable in an npm-consumer install: give the consumer CLI the one detection surface it lacks, move anchor population into the render pipeline where a consumer can reach it, and rewrite Atlas's procedure so every command it names is one the reader can actually run.

---

## Design

No UI surface. The design work is the install-context split described under `## Decisions`.

---

## Implementation Tasks

Three lanes, shipped as a linear stack of three PRs. Lane A is inert until Lane B names it; Lane B is wrong until Lane A exists. See `## Decisions` → "Ship as a three-PR stack."

### Clove (implementation) — PR 1 of 3: runtime

Branch: `huntermcgrew/prism-481-atlas-consumer-install` (this branch).

1. **Add `scripts/ai-skills/detect.ts`** — new file exporting `runDetectCli(): Promise<void>` and a testable core `runDetect(opts: { consumerRepoRoot: string }): Promise<DetectReport>`.
   - `DetectReport` is `{ stack: DetectedStack; docLayout: DetectedDocLayout }`. Import `detectStack` from `./lib/stack-detect` and `detectDocLayout` from `./lib/doc-detect` — both are already pure and root-parameterized (`stack-detect.ts:82`, `doc-detect.ts:62`), so neither needs a change.
   - `runDetectCli` resolves the consumer root exactly as `init.ts` does: `resolveConsumerRoot({ explicitConsumer: parseConsumerFlag(process.argv), cwd: process.cwd(), selfPrismRoot: resolveSelfPrismSource() })`. Copy the call shape from `init.ts:167`.
   - Output: `console.log(JSON.stringify(report, null, 2))` — JSON to stdout, nothing else on stdout. Read-only; the command writes no file.
   - Guard the direct-entry block with `isDirectCliEntry("detect.ts")` from `./lib/cli-entry`, per `install-layout.md` § bundle-safe entry. Never `import.meta.url === process.argv[1]`.
   - Verification: `pnpm prism:check-types`.

2. **Wire `detect` into the CLI** — `scripts/ai-skills/cli.ts`.
   - Add `import { runDetectCli } from "./detect";` beside the existing subcommand imports (alphabetical: after `runAdoptCli`, before `runDoctorCli`).
   - Add a `case "detect": await runDetectCli(); break;` to the `switch (subcommand)` block, placed after `adopt` and before `update` so dispatch order matches USAGE order.
   - Add one USAGE line, aligned with the existing two-space column:
     `  prism detect   Report the detected tech stack and doc layout as JSON (read-only)`
     Place it after the `adopt` line and before `update`. USAGE is the consumer-reachability authority (`install-layout.md` § Curated seed twins → Test 2), so this line is what makes the command citable from shipped prose.
   - Verification: `pnpm prism:check-types`, then `npx tsx scripts/ai-skills/cli.ts --help` prints the new line.

3. **Export a pure in-memory anchor substitution** — `scripts/ai-skills/lib/anchor-substitute.ts`.
   - Add `export function substituteAnchorsInContent(content: string, replacements: Record<string, string>): { content: string; anchorsReplaced: string[] }`. Extract the existing in-memory half of `substituteAnchors` (the `findAnchors` walk and span replacement, currently inline above the tmp+rename write at `anchor-substitute.ts:272-279`) into this function, and have `substituteAnchors` call it before writing. No behavior change to `substituteAnchors`.
   - Do **not** delete `substituteAnchorsAcrossSkills` in this task — task 6 handles its retirement, after the render path is proven.
   - Verification: `npx tsx --test scripts/ai-skills/anchor-substitute.test.ts` stays green.

4. **Export the anchor content builder** — `scripts/ai-skills/lib/onboarding-run.ts`.
   - Promote the private `buildContentByAnchor` (used by `runAnchorSubstitution` at `onboarding-run.ts:128`) to `export function buildContentByAnchor(config: OnboardingConfig): Record<string, string>`. Signature and body unchanged — only the `export` keyword is added.
   - Verification: `pnpm prism:check-types`.

5. **Run the anchor pass at render time** — `scripts/ai-skills/generate-skills.ts`.
   - Add an optional `anchorContent?: Record<string, string>` field to the options object `generatePlatformSkills` accepts.
   - At each of the four points where `substituteTokens(...)` is currently called (`generate-skills.ts:131`, `:148`, `:152`, `:193`), apply `substituteAnchorsInContent(content, anchorContent)` to the body **immediately before** the `substituteTokens` call, skipping when `anchorContent` is undefined or empty.
   - **Order is load-bearing: anchors first, then tokens.** Anchor content is derived from the same config that feeds the token map, so an anchor body may legitimately contain a `${TOKEN}`; running tokens first would leave it unresolved and trip `runLeftoverTokenGuard`. Put a one-sentence comment on the call naming that constraint (not the migration) per `.prism/rules/code-comments.md`.
   - Verification: `pnpm prism:build` — PRISM's own rendered `.claude/skills/**` must stay byte-identical, because PRISM's config has no `productDomain` content to inject. If it diverges, stop and report rather than accepting the diff.

6. **Thread anchor content through update, and retire the source mutation** — `scripts/ai-skills/update.ts` and `scripts/ai-skills/lib/onboarding-run.ts`.
   - In `refreshPlatformSkills` (`update.ts:837`), build `const anchorContent = buildContentByAnchor(consumerConfig);` and pass it into the `generatePlatformSkills({...})` call at `:878`. `consumerConfig` is already loaded at `update.ts:507` — thread it into `refreshPlatformSkills` as a new parameter beside `tokenMap` rather than re-reading config.
   - Update the call site at `update.ts:568` to pass `consumerConfig`.
   - Delete `runAnchorSubstitution` from `onboarding-run.ts` and `substituteAnchorsAcrossSkills` from `anchor-substitute.ts`, plus their imports and any now-unused `AnchorSubstitutionSummary` / `AnchorResult` types. Every anchor in `.ai-skills/skills/**` currently holds its shipped generic default (verified by grep across the roster), so retiring in-place mutation reverts no committed content.
   - Remove the `substituteAnchorsAcrossSkills` cases from `scripts/ai-skills/anchor-substitute.test.ts`; keep every `findAnchors` and `substituteAnchors` case.
   - Blocks task 7. Verification: `pnpm prism:check`.

7. **Tests.** After tasks 1–6.
   - **`scripts/ai-skills/detect.test.ts`** (new). Follow `doc-detect.test.ts`'s temp-dir style: `fs.mkdtemp(path.join(os.tmpdir(), "prism-detect-"))`. Three cases: a repo seeded with a react+next `package.json` reports those in `report.stack`; a repo seeded with `mkdocs.yml` reports `tool: "mkdocs"` in `report.docLayout`; an empty repo returns the `unknown` language sentinel rather than throwing. Assert against `runDetect`, not the CLI wrapper — the shape `init.test.ts:6` uses.
   - **`scripts/ai-skills/cli.test.ts`** — add `test("runDetectCli is exported from detect.ts and is a function", ...)` asserting `typeof runDetectCli === "function"`, matching the `runInitCli` case at `cli.test.ts:117-122`.
   - **`scripts/ai-skills/cli-bundle.test.ts`** — `detect` prints only JSON, so extend the `NO_SUBCOMMAND_OUTPUT` regex at `:30` with a marker from detect's own report body (`"docLayout"`), never the subcommand name, per the comment already on that constant.
   - **`scripts/ai-skills/update.test.ts`** — add the regression catch this ticket exists for. Build a consumer using the `withTempRoots` helper at `adopt.test.ts:60` (consumer root with no `package.json` and no `scripts/`). Give the consumer config a non-empty `productDomain`, run `runUpdate`, then assert two things: (a) the rendered `.claude/skills/prism-code-dev/SKILL.md` contains the `productDomain` string in place of the default anchor prose, and (b) every file under the fake PRISM source's `.ai-skills/skills/` tree is byte-identical to its pre-run content. Assertion (b) is the one that fails if anyone reintroduces source mutation.
   - Verification: `pnpm prism:check` green end to end.

### Clove (implementation) — PR 2 of 3: Atlas procedure

Branch off PR 1's head. Do not start before task 7 is green.

8. **Add the install-context probe to Atlas's startup** — `.ai-skills/skills/prism-onboarding/shared.md`, § Startup → Batch 1.
   - Insert a new numbered probe as the first item in Batch 1, renumbering the existing 1–6 to 2–7:
     "**Install context** — check whether `<repo-root>/scripts/ai-skills/` exists. Present → **toolkit context** (a PRISM clone or vendored checkout). Absent → **consumer context** (PRISM installed from npm; its code lives in `node_modules` and is reachable only through the `prism` CLI). Every step below that names a command branches on this answer, and nothing else does."
   - Add one sentence directly under it: "Install context is a second axis, not a sixth mode — it multiplies against all five modes in § Identity rather than joining them."
   - Verification: content-only, no build effect. `pnpm prism:build` regenerates mirrors.

9. **Replace the two library-call detection steps with a context branch** — `shared.md`, the probes currently at lines 43 and 45 (`detectStack` / `detectDocLayout`).
   - Collapse both into one probe reading:
     "**Stack and doc-layout detection** — in consumer context, run `npx @huntermcgrew/prism detect` and read the JSON from stdout: `stack` carries languages, frameworks, and evidence paths; `docLayout` carries the doc tool and location. In toolkit context, call `detectStack(<repo-root>)` and `detectDocLayout(<repo-root>)` from `scripts/ai-skills/lib/`. Either way `[\"unknown\"]` is a valid language sentinel for an empty or unrecognized repo, and the survey reports whichever path produced the answer."
   - Verification: `grep -n "scripts/ai-skills/lib" .ai-skills/skills/prism-onboarding/shared.md` returns only the toolkit-context clause.

10. **Add the command-mapping table** — `shared.md`, a new `## Install context` section placed immediately after `## Identity`.
    - The table has three columns — Step, toolkit, consumer — and one row per branching step: detection (`detectStack`/`detectDocLayout` vs `prism detect`); config validation (inside `writeOnboardingConfig` + `pnpm prism:check` vs inside `prism update`, with `npx @huntermcgrew/prism doctor` as the standalone check); regenerate outputs (`pnpm prism:build` vs `npx @huntermcgrew/prism update`); anchor population (`runAnchorSubstitution` is retired — anchors render during output regeneration in both contexts, so Atlas performs no anchor step at all); seed-and-sync for first-contact (`pnpm prism:adopt` vs `npx @huntermcgrew/prism adopt`).
    - Keep the table to one line per cell. If a cell wraps, cut words before adding a column, per `.prism/rules/writing-voice.md` § An overflowing container.
    - Verification: content-only.

11. **Fix the schema-path claims** — `shared.md` § How Atlas Thinks → 4 (currently line 90) and § Definition of Done (currently line 139).
    - Both currently say Atlas validates against `.ai-skills/config.schema.json` as though it sat at the consumer root. It does not: `config-schema-validate.ts:171-176` resolves it from the PRISM source root, deliberately, so a hand-edited consumer copy cannot validate against the wrong rules. Rewrite both to name the behavior rather than the path: "Atlas validates the assembled config against the schema PRISM ships before the atomic write; a schema failure names the offending field and does not touch the on-disk file."
    - Verification: `grep -n "config.schema.json" .ai-skills/skills/prism-onboarding/shared.md` returns nothing.

12. **Rewrite Procedure B and the Definition of Done build clauses** — `shared.md` lines 98, 135, 143.
    - Procedure B's title becomes "**Procedure B — output regeneration fails after config write.**" Its body keeps the three-hypothesis loop verbatim and names the regeneration command by install context rather than hardcoding `pnpm prism:build`.
    - § Definition of Done line 135: replace "the green `pnpm prism:build`" with "a green output regeneration (§ Install context)".
    - § Definition of Done line 143: replace the bullet with "**Outputs regenerate green** — the regeneration command for this install context completes without error, and the rendered roster carries the team's anchor content."
    - Verification: `grep -rn "pnpm prism:" .ai-skills/skills/prism-onboarding/shared.md` returns only lines inside the § Install context table's toolkit column.

13. **Fix the three onboarding references** — `.prism/references/onboarding/`. These ship to consumers verbatim (`package.json#files` includes `.prism/references/`, and `build.ts` auto-mirrors them into the seed), so each is as consumer-facing as `shared.md`.
    - `modes.md:20-21` — `runRuleGenerators` stays (it is already consumer-root-parameterized and works unchanged); the `runAnchorSubstitution` clause is deleted and replaced with "anchor content renders during output regeneration in step 13 — Atlas performs no separate anchor step."
    - `modes.md:23` and `modes.md:77` — replace "Run `pnpm prism:build` to regenerate platform mirrors" with "Regenerate outputs per the install-context table in `prism-onboarding` § Install context."
    - `modes.md:76` — replace `` `pnpm prism:adopt --prism-source <resolved PRISM source>` `` with "the adopt command for this install context (`npx @huntermcgrew/prism adopt`, or `pnpm prism:adopt --prism-source <path>` in a toolkit checkout)".
    - `question-flow.md:84` — `pnpm prism:migrate-skill` has no consumer CLI equivalent and never will: migration is `prism-skill-forge`'s migrate mode, a skill, not a script. Replace the offer with "adopt it by invoking `prism-skill-forge` in migrate mode against the skill's path, or leave it untouched." This is correct in both contexts.
    - `question-flow.md:28,36` — `detectDocLayout` / `inferDocFormat` become "the doc layout reported by detection (§ Startup)", so the reference stops naming an unshipped module.
    - `output-contract.md:9` — replace "reads this on every `pnpm prism:build`" with "reads this on every output regeneration".
    - `output-contract.md:17` — the anchor write-target line currently names `.ai-skills/skills/<persona>/shared.md` as a file Atlas writes. Atlas no longer writes it in any context. Move the entry from the file-write list to the file-read list and restate it as "anchor defaults live in PRISM's canonical skill sources and are substituted into the rendered roster at regeneration time; Atlas writes none of them."
    - `output-contract.md:25` — drop the consumer-root `.ai-skills/config.schema.json` claim, matching task 11.
    - `output-contract.md:41` — replace "`AdoptSummary` from `pnpm prism:adopt`" with "the adopt summary from the seed-and-sync step".
    - Verification: `grep -rn "pnpm prism:\|scripts/ai-skills" .prism/references/onboarding/` returns nothing.

14. **Write ADR-0075** — `.prism/spec/adrs/_toolkit/0075-anchors-substitute-at-projection-time.md`. Number verified against the directory (highest is `0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md`). `Status: accepted`.
    - `## Context` — anchors were designed so canonical sources stay generic (ADR-0032), but the only populating mechanism mutated those canonical sources in place. In an npm install the canonical sources are inside `node_modules`, so the mechanism either silently no-ops (`readdir` ENOENT returns an empty Map) or, if pointed at the package root, writes into a directory that is destroyed on reinstall and shared across projects. Every anchor therefore reached every npm consumer holding its shipped placeholder prose — including the literal sentence "Populated during onboarding" — while `docs/getting-started.md` § Step 3 promised the opposite.
    - `## Decision` — anchor substitution runs in the render pass beside token substitution, deriving content from the consumer's own `config.json`, and the in-place mutation is retired. State the three rejected alternatives with one line each: mutating sources inside `node_modules` (destroyed on reinstall, leaks across projects); Atlas writing a separate anchor-content file for the render pass to read (a second source of truth for content `config.json` already carries); and dropping the consumer promise from the docs and leaving anchors toolkit-only (honest and cheapest, but it makes the npm install a second-class product to save one call in a pass that already reads the same config).
    - `## Consequences` — name the honest negative: PRISM's own repo loses the ability to inspect populated anchor content on disk, because populated content now exists only in rendered output. Note that anchors run before tokens so anchor bodies can carry `${TOKEN}` values, and that this ordering is a constraint the render pass must keep.
    - Verification: `pnpm prism:crossref-lint` and `pnpm prism:ship-closure`.

15. **Update the three architect docs.** All three are routed to the paths this ticket changes, so each must match the new behavior or it becomes a confident wrong claim a future session loads as authoritative.
    - `.prism/architect/_toolkit/anchor-substitution.md` — the § Public surface block currently lists `substituteAnchorsAcrossSkills` and `runAnchorSubstitution`; replace them with `substituteAnchorsInContent` and `buildContentByAnchor`. Rewrite § "Idempotency and atomic write" — there is no write any more, so idempotency is now trivially structural. Rewrite § "Who runs this module" — the caller is the render pass, not Atlas. Add one paragraph on the anchors-before-tokens ordering and why.
    - `.prism/architect/onboarding.md` — add an § Install context section covering the `scripts/ai-skills/` discriminator and the orthogonality clause from task 8, stated as the reason the mode taxonomy is unchanged. Confirm the § "The mode taxonomy" table and the ordered mode walk still read correctly with the new axis; do not renumber the walk.
    - `.prism/architect/_toolkit/onboarding.md` — § "Workflow order" step 6 names `substituteAnchorsAcrossSkills`; rewrite it to say anchor content renders at regeneration and Atlas runs no substitution step. Leave every other lasting decision in that file intact.
    - Verification: `pnpm prism:check`.

### Eli (documentation) — PR 3 of 3

Branch off PR 2's head. Docs are Eli's lane; PRs 1–2 do not touch `docs/`.

16. **`docs/adopt-prism.md`** — add a `### prism detect` subsection to the command reference, after the `prism doctor` section at line 156. Cover: what it reports (stack and doc layout as JSON), that it is read-only and safe to run repeatedly, and that Atlas calls it during onboarding so a consumer rarely runs it by hand.

17. **`docs/getting-started.md`** — § Step 3, item 4 currently reads "Fill in the stub anchors that `adopt` put in place," which describes work Atlas no longer does. Replace with a line saying Atlas writes your config and reruns `prism update`, and that the update is what renders your team's content into the persona roster. Keep the numbered list at five items.

18. **`docs/troubleshooting.md`** — add one entry for the symptom this ticket fixes: Atlas reporting missing `scripts/ai-skills/lib`, a missing consumer-root `config.schema.json`, or an unrunnable `pnpm prism:build`. Resolution: the install is on a PRISM version older than the fix; run `npx @huntermcgrew/prism@latest update`, then check `npx @huntermcgrew/prism doctor` for the reported version.
    - Verification for 16–18: `pnpm prism:crossref-lint` — every path and command these pages name must resolve.

---

## Decisions

- **Ship as a two-PR stack, not three.** Hunter approved collapsing the plan's three-lane stack into two PRs: PR 1 is Lane A (runtime) alone; PR 2 carries Lane B (Atlas procedure, ADR-0075, the three architect docs) and Lane C (docs) together on one branch stacked on PR 1. The lane boundaries and task content are unchanged — only the PR cut moves.
- **The two internal-only anchor functions are deleted outright, not deprecated.** Hunter approved deleting `runAnchorSubstitution` (`onboarding-run.ts`) and `substituteAnchorsAcrossSkills` (`anchor-substitute.ts`) directly rather than keeping deprecated wrappers — both are internal build-script functions with no consumer-facing call surface, so a deprecation period buys nothing. Tests exercising them (`anchor-substitute.test.ts`, `rule-generators.test.ts`) were removed in the same commit; `substituteAnchors` (the single-file write primitive) and its tests stay, since the plan keeps it as a public seam.
- **`buildContentByAnchor` takes `{ productDomain: string }`, not `OnboardingConfig` as task 4 specified.** Verified before implementing (`.prism/rules/cross-agent-handoff-accountability.md`): task 4 said the signature stays `(config: OnboardingConfig)` unchanged, but the render-time caller in `update.ts` holds a `PrismConfig` (the on-disk shape `loadConfig` returns), not an in-session `OnboardingConfig` — the two types share almost no fields (no `githubOwner`, `githubRepo`, `techStack: DetectedStack`, `existingStandards`). Full `OnboardingConfig` would not typecheck at the real call site. Narrowing the parameter to the one field the function actually reads fixes the mismatch without touching Atlas's own call in `runAnchorSubstitution` (removed anyway) — `OnboardingConfig` still structurally satisfies the narrower type.
- **`productDomain` now persists to `.ai-skills/config.json`.** Root cause: `OnboardingConfig.productDomain` was always collected in Atlas's in-session flow but `toOnDiskConfig` never wrote it, and the schema had no slot for it — so `update.ts`'s `consumerConfig` could never carry a real value, and task 6's anchor-render wiring would have been structurally present but dead in every real consumer install. Fixed by adding `productDomain?: string` to `.ai-skills/config.schema.json`, `PrismOnDiskConfig`, and `PrismConfig` (`lib/tokens.ts`), and writing it in `toOnDiskConfig` when non-empty (same pattern as `slackChannel`). This is schema/type plumbing, not Atlas's interactive-flow prose — Atlas already collects the field; this only makes the write path complete. `update.test.ts` covers the full path: config → `refreshPlatformSkills` → rendered anchor.
- **`prism detect` ships; `prism validate` does not.** The issue proposed both. Detection has no consumer-reachable equivalent, so it earns a subcommand. Validation already has two: `validateConsumerConfigAgainstSchema` runs inside `runUpdate` (`update.ts:501-502`) and `prism doctor` exposes it standalone and read-only. A third spelling of an existing check is a permanent public surface bought for nothing.
  - **Alternatives considered:** folding detection into `prism init`/`adopt` output — rejected because `init` runs once and never re-detects, and a first-install consumer has no config at all; Atlas reading the tree itself with no CLI help — rejected because it discards a tested, fixture-covered detector in favor of an LLM eyeballing package manifests, which produces different answers across models and gives npm consumers a measurably worse Atlas than toolkit users.
  - **Packaging cost is zero.** `bundle.ts` runs esbuild with `bundle: true`, so anything `cli.ts` imports transitively lands in `dist/cli.js`. `stack-detect.ts` already ships that way through `init.ts`; `doc-detect.ts` starts shipping the same way. No `package.json#files` change, and `verify-pack-parity.ts` needs no new entry because the subcommand reads no packaged file the existing entries do not already cover.
  - **One subcommand, not two.** Both detectors run together in Batch 1, both are read-only, both return small JSON. Every name in `USAGE` is a permanent promise, so one name carrying both reports beats two.

- **Anchor substitution moves into the render pass, and in-place source mutation is retired.** This is the ticket's real defect and it is wider than the issue states: anchors have never reached any npm consumer. See ADR-0075 for the full record.
  - **Root cause:** `substituteAnchorsAcrossSkills` globs `<root>/.ai-skills/skills/` and rewrites those files. In a consumer that directory is inside `node_modules`, so the call either no-ops silently on ENOENT or writes somewhere reinstall destroys.
  - **Chosen approach:** substitute in memory inside `generatePlatformSkills`, beside the token pass that already reads the consumer's config. It removes machinery rather than adding it, and it makes anchors work exactly like tokens — canonical source holds marker plus default, render substitutes.
  - **Alternatives considered:** convert `domain-context` to a `${PRODUCT_DOMAIN}` token — rejected because the documented Test-1/Test-2 split reserves tokens for identifiers and anchors for content, and the pending `examples`/`workflow-example` anchors are definitionally content; leave anchors toolkit-only and correct the docs — rejected, recorded in ADR-0075 as the cheapest honest alternative.
  - **Safe to retire:** every `atlas:*` anchor across `.ai-skills/skills/**` currently holds its shipped generic default, verified by grep. Nothing populated is committed, so the retirement reverts no content.

- **Anchors substitute before tokens.** Anchor bodies derive from the same config that feeds the token map, so an anchor may legitimately carry a `${TOKEN}`. Tokens-first would leave it unresolved and trip `runLeftoverTokenGuard`. Anchors-first composes; the reverse does not.

- **Install context is a second axis, not a sixth mode.** The discriminator is `scripts/ai-skills/` at the repo root — present means toolkit, absent means consumer. It multiplies against all five existing modes rather than joining them, so the ordered mode walk in `.prism/architect/onboarding.md` is untouched.
  - **Alternatives considered:** a root `package.json` carrying a `prism:build` script — rejected, a consumer's own `package.json` is a false positive and confirming the script needs a second read; the sync manifest's `prismVersion` — rejected, a vendored toolkit checkout has one too. The `scripts/` probe is one read and is the literal cause of every failure in the issue's table.
  - A vendored PRISM inside a consumer repo classifies as consumer context, which is correct: `npx @huntermcgrew/prism <cmd>` works there, and consumer-context instructions are safe in a toolkit checkout while the reverse is not.

- **One skill body with two branches, not a consumer-only body.** The generated Claude body is 165 lines against a 500-line cap (`MAX_SKILL_BODY_LINES`, `utils.ts:26`), so headroom is not the constraint. The deciding reason is that no mechanism exists to ship a different body to consumers — the same `shared.md` renders everywhere — so a second body would need new machinery to solve a problem a table and three conditional clauses already solve. Most of the procedure does not branch; only detection, regeneration, and the retired anchor step do.

- **`sourceCommit: "unknown"` stays out of scope.** The issue calls it minor and it is unrelated to the failure. `resolveSourceCommit` (`build.ts:891`) shells `git rev-parse HEAD` against the PRISM root, which in a consumer is inside `node_modules`; the command fails and the value degrades to `"unknown"`. The real fix is baking the SHA into the bundle at publish time, which `bundle.ts` has no step for — a release-ritual change touching `docs/publishing-prism.md`, a different subject-matter thread. Recorded as a follow-up.
  - **Latent risk worth naming in the follow-up:** when `node_modules` is not gitignored, `git rev-parse HEAD` succeeds and records the *consumer's* HEAD as PRISM's source commit. That is a silently wrong value, not a missing one.

- **The Atlas `hosts` question stays out of scope.** PR #480 added `hosts` to the schema; `init` does not write it and Atlas has no prompt for it. A parallel lane is currently changing what `hosts` means for skill output, so an Atlas question written now would be written against moving semantics. It is also additive to `question-flow.md` — a different file and a different failure mode from the consumer-path bug. Recorded as a follow-up for after the parallel lane settles.

- **No mechanical gate against recurrence in this ticket.** `ship-closure.ts` is a file-link closure and has no command-authority check; the `USAGE`-as-authority doctrine in `install-layout.md` § Curated seed twins → Test 2 exists in prose with no enforcement, which that doc states outright. A gate would need a fence syntax so a legitimate toolkit-context mention does not fail, and issue #444 already owns the ungated command-reachability class. Building it here would absorb #444's scope into a bug fix.
  - **What this ticket proves and #444 should absorb:** the gap is wider than the curated seed twins. `.ai-skills/skills/**` and `.prism/references/**` ship too, and both carried the same class of violation.

- **`modes.md`'s seed-and-sync handoff step names the install-context table instead of embedding a `pnpm prism:adopt` example inline.** Task 13's literal wording for `modes.md:76` was "the adopt command for this install context (`npx @huntermcgrew/prism adopt`, or `pnpm prism:adopt --prism-source <path>` in a toolkit checkout)" — a wording that itself contains `pnpm prism:`. AC-6's evidence is a zero-tolerance grep on `.prism/references/onboarding/` (no toolkit-column exception the way `shared.md`'s table gets one), so the literal wording would fail the AC it exists to satisfy. Fixed by pointing the step at `prism-onboarding` § Install context instead of naming either command inline — same information, no command literal in a reference doc.

- **Ship as a three-PR stack, linear.** Twenty-one files across three lanes, past the ten-file threshold. Lane A (runtime, 10 files) is inert until Lane B names it. Lane B (Atlas prose plus ADR plus architect docs, 8 files) is wrong until Lane A exists. Lane C (docs, 3 files) describes both. The cuts fall on lane boundaries, and nothing inside a lane can ship without the rest of that lane.

---

## Sessions

- 2026-09-02 [huntermcgrew/prism-481-atlas-consumer-install] open: Intent — plan the consumer-mode Atlas fix from issue #481, evaluating the proposed CLI surface rather than adopting it; Bounds — plan file only, no implementation, no source edits; Approach — verify the packaging and render pipeline first, since bundling and existing render seams change which of the issue's three proposals are actually needed · close: scope held
- 2026-09-02 [huntermcgrew/prism-481-atlas-consumer-install] open: Intent — implement PR 1's runtime lane (tasks 1-7: `prism detect`, render-time anchor substitution, retire the mutation path, tests); Bounds — `scripts/ai-skills/**` and `.ai-skills/config.schema.json` only, no Atlas prose/ADR/architect-doc/docs edits; Approach — verify the plan's line-number citations before editing, and fix the `buildContentByAnchor`/`productDomain` type-plumbing gap the plan's task 4/6 combination didn't typecheck against · close: scope held — two deviations from the plan's literal wording (buildContentByAnchor's parameter type; productDomain schema/type plumbing) recorded as Decisions above, both necessary for task 6's own AC-2 to be true rather than a compiling-but-dead wire
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure] open: Intent — implement PR 2's Atlas-procedure lane (tasks 8-15: install-context branching in `shared.md`, the three onboarding references, ADR-0075, three architect docs); Bounds — `.ai-skills/skills/prism-onboarding/shared.md`, `.prism/references/onboarding/**`, `.prism/spec/adrs/_toolkit/0075-*.md`, and the three named architect docs only — no `docs/**` (Eli's lane); Approach — read every governing doc the write gate names, verify the ADR number and seed-curation classification against the directory, then edit task-by-task and run `pnpm prism:build`/`pnpm prism:check` before shipping · close: scope held — one deviation from task 13's literal wording recorded as a Decision below (AC-6's zero-tolerance grep on `.prism/references/onboarding/` overrides the toolkit-column exception task 13 wrote inline)
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure] open: Intent — fix Briar's two PR 2 self-review Majors (both stale prose crediting Atlas with running anchor substitution) and merge the plan's duplicated bookkeeping sections after the origin/main merge; Bounds — anchor-substitution.md § Anchor schema, shared.md's Procedure D and opening persona description, plan bookkeeping sections only; Approach — fix the two named findings, sweep shared.md once more for the same claim class, then merge duplicate section pairs keeping every entry · close: scope held
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure] open: Intent — implement tasks 16-18, the docs lane, on `docs/adopt-prism.md`, `docs/getting-started.md`, and `docs/troubleshooting.md`; Bounds — `docs/**` only, no source or spec edits; Approach — verify `prism detect`'s CLI surface and USAGE line against the shipped source before citing them, follow the existing flat-markdown-guides shape and frontmatter each file already uses · close: scope held — one adjacent fix folded in (adopt-prism.md's `prism init` section still credited Atlas with "anchor population," stale per ADR-0075; corrected in the same file already in the diff)
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure] open: Intent — self-review PR 2 (tasks 8-18) against the plan's Decisions and AC-1/5/6/7/8/9, walking Atlas's consumer branch end to end and checking the three onboarding references, three architect docs, and ADR-0075 against shipped code; Bounds — review only, plan-only commit, no source edits, no GitHub posting; Approach — verify every named command against `cli.ts`, grep AC-6/AC-9's exact patterns from inside the worktree, and run `pnpm prism:check`/`pnpm prism:build` for the mechanical gates · close: scope held — two Major findings recorded above, both prose contradictions (Atlas credited with an anchor step it no longer runs); all mechanical AC evidence (AC-5, AC-6, AC-7, AC-9) confirmed passing, AC-8's ADR structure confirmed complete
- 2026-09-02 [huntermcgrew/prism-481-atlas-consumer-install] open: Intent — self-review PR 1 of the stack (draft PR #483) across the anchor-render pass, `prism detect`, deletion completeness, and `productDomain` persistence; Bounds — read-only review, chat + plan write only, no source edits, no GitHub post; Approach — verify every plan claim against source and a live run of the check pipeline rather than trusting the diff's own comments · close: scope held — one Minor comment finding, all other angles clean

---

## History

- 2026-09-02 [huntermcgrew/prism-481-atlas-consumer-install]: Wrote the implementation plan. Evaluation cut `prism validate` as redundant with `prism doctor` and widened the fix to anchor substitution, which has never reached any npm consumer; see Decisions and ADR-0075.
- 2026-09-02 [huntermcgrew/prism-481-atlas-consumer-install]: Implemented PR 1's runtime lane (tasks 1-7) — added `prism detect`; moved anchor substitution into `generatePlatformSkills`, threaded through `update.ts`; deleted `runAnchorSubstitution`/`substituteAnchorsAcrossSkills` and their tests; fixed `productDomain` never persisting to `.ai-skills/config.json`, which the plan's task 6 silently depended on. `pnpm prism:check` green; see Decisions for the two plan deviations.
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure]: Implemented PR 2's Atlas-procedure lane (tasks 8-15) — install-context probe added to Atlas's startup Batch 1, the two detection steps collapsed into one context-branching probe, a new `## Install context` command table added after `## Identity`, schema-path and build-command claims rewritten to name behavior instead of a consumer-unreachable path, the three onboarding references and three architect docs updated to match, and ADR-0075 written recording the render-time anchor decision. `pnpm prism:build` and `pnpm prism:check` both green; see Decisions for the one plan deviation.
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure]: Implemented the docs lane (tasks 16-18) — added a `prism detect` subsection to `docs/adopt-prism.md`'s command reference, replaced the stale "fill in stub anchors" step in `docs/getting-started.md` § Step 3 with the config-write-then-update step, added a troubleshooting entry for consumers hitting toolkit-only paths in `docs/troubleshooting.md`, and fixed a stale "anchor population" credit to Atlas found in `adopt-prism.md` while in the file. `pnpm prism:check` green.
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure]: Fixed Briar's two PR 2 self-review Majors — `anchor-substitution.md` § Anchor schema still credited Atlas with running substitution (rewrote to caller-agnostic render-time phrasing), and Procedure D in `shared.md` described an anchor step Atlas no longer runs (deleted; the render pass's unknown-anchor handling is already documented). A follow-up sweep found and fixed a third stale claim in `shared.md`'s opening persona description. Merged the plan's duplicated section pairs (main's PR 1 copy and this branch's PR 2 copy, introduced by the `origin/main` merge) into one of each. `pnpm prism:build` (874/874 tests) and `pnpm prism:check` (exit 0) both green.
- 2026-09-02 [huntermcgrew/prism-481-atlas-procedure]: Briar self-reviewed PR 2 (tasks 8-18) — two Major findings, both stale prose describing Atlas as still running an anchor step it no longer runs; `pnpm prism:check` and `pnpm prism:build` confirmed green, no mirror drift.

---

## Debugged Issues

Add entries here via the debugger skill. Each entry has a structured format.

---

## Review Issues

### `anchor-substitution.md` § Anchor schema still credits Atlas with running substitution

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/anchor-substitution.md` § Anchor schema
- **Problem:** The sentence "When Atlas runs, it replaces the inner span (between open and close) with team-specific content" survived the task-15 rewrite and contradicts the same file's § Who runs this module, which correctly states the render pass (`generatePlatformSkills`) is the only caller and Atlas runs no anchor step. AC-9's grep doesn't catch this — the sentence names no banned symbol, only a stale claim about *who* substitutes.
- **Fix applied:** Replaced with "At render time, the inner span (between open and close) is replaced with team-specific content." — caller-agnostic phrasing consistent with § Who runs this module.

### Procedure D in `shared.md` describes an anchor step Atlas no longer runs

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-onboarding/shared.md` § When Things Break, "Procedure D — Anchor substitution lands on an unknown anchor"
- **Problem:** Procedure D instructs Atlas on handling an unknown-anchor case mid-session, but the same file's § Install context table states "Anchor population: none — anchors render during output regeneration" for both install contexts — Atlas performs no anchor step in either context, so there's no Atlas-run moment where it could "land on" an anchor. Predates this PR and wasn't touched by tasks 8-12, but is now describing behavior the rest of the file just retired.
- **Fix applied:** Deleted Procedure D — the render pass's own unknown-anchor handling is already documented in `anchor-substitution.md` § Idempotency, ordering, and atomic write. A follow-up sweep of `shared.md` for the same class of stale claim found one more: the opening persona-description sentence separately credited Atlas with "populates stub anchors"; rewritten to describe the config write instead (Atlas supplies the values the render pass's anchor and token layers read, per ADR-0030 and ADR-0075).

### Changelog-voice JSDoc on `refreshPlatformSkills`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts` (docstring above `refreshPlatformSkills`)
- **Problem:** The docstring paragraph read "Anchor population used to be a separate Atlas write into the canonical `.ai-skills/skills/` sources; it now runs here, in memory, on every regeneration." — changelog-voice per `.prism/rules/code-comments.md` (described the migration, not the current invariant).
- **Fix applied:** Rewrote to state only the current invariant — "Anchor population happens here, in memory, on every regeneration — see ADR-0075." Checked the sibling JSDoc on `applyAnchorsThenTokens` in `generate-skills.ts` for the same voice issue; it already states the invariant (anchors before tokens, and why), no fix needed there.

No other issues found beyond the three above — 2026-09-02 [huntermcgrew/prism-481-atlas-consumer-install]. Verified: `pnpm prism:check-types` (clean), `pnpm prism:test` (860/860 pass), `pnpm prism:build` (byte-identical — `git status` clean after the build, directly confirming task 5's own AC rather than trusting Clove's claim), `pnpm prism:check` (exit 0 — crossref-lint, spec-scope-lint, ship-closure, verify-pack-parity all pass). A tree-wide grep for `runAnchorSubstitution|substituteAnchorsAcrossSkills|AnchorSubstitutionSummary|AnchorResult` under `scripts/` returns nothing — the deletion is complete, no stray references. `isDirectCliEntry("detect")` matches the codebase's actual convention (basename without extension, confirmed against every other subcommand's guard) despite the plan's task 1 literally specifying `"detect.ts"` — not a bug, just the plan's wording being imprecise. `productDomain`'s schema entry is optional (absent from `required`), so an existing config without it still validates; the write path (`toOnDiskConfig`, gated on non-empty trim), both type surfaces (`PrismOnDiskConfig`, `PrismConfig`), and the render-time read (`consumerConfig.productDomain ?? ""`) all check out against source. All four `substituteTokens` call sites in `generate-skills.ts` route through the new `applyAnchorsThenTokens` helper in the anchors-before-tokens order the plan requires. The tests removed from `anchor-substitute.test.ts` and `rule-generators.test.ts` only exercised the deleted `substituteAnchorsAcrossSkills`/`runAnchorSubstitution` paths — no live behavior lost coverage. Briar's PR 2 self-review (plan commit `45154739`) found the two Major stale-prose contradictions above; both fixed on `huntermcgrew/prism-481-atlas-procedure`, verified via `pnpm prism:build` (874/874 tests, mirrors regenerated) and `pnpm prism:check` (exit 0).

### Angle Coverage

- Types and logic: swept — no issues
- Accessibility: n/a — no UI in this diff
- Removal/rename completeness: swept — zero remaining references to the two deleted functions/types under `scripts/`; PR 2's sweep confirms zero remaining prose claims crediting Atlas with running anchor substitution
- Test coverage: swept — new tests cover `detect`'s three contracts plus the anchor-render and byte-identity regression; no gap found
- Comments/JSDoc: swept — one Minor changelog-voice finding above, otherwise clean
- Spec/plan divergence: swept — the plan's two recorded deviations (buildContentByAnchor's parameter type; productDomain schema/type plumbing) are both necessary and match the diff exactly
- Docs impact: n/a — PR 2/3 own Atlas prose and consumer docs per the plan's lane split; PR 1 touches neither
- Build: swept — `pnpm prism:build` produces a byte-identical tree (PR 1); PR 2's build regenerates mirrors for the two edited files, byte-identical elsewhere
- Cross-file/citation integrity: swept — call sites, imports, and the schema/type threading through `onboarding-config.ts` → `tokens.ts` → `update.ts` all verified against source, not just the diff

---

## Cleanup Items

None found.

---

## PR Readiness

- [x] No critical or major issues (two Major findings from Briar's PR 2 self-review, both fixed)
- [x] Types correct — no `any`, no unsafe `as` introduced; PR 2 is content-only, no source changes
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (PR 1); PR 2 is content-only, no new logic
- [x] All debugged issues resolved (no `open` entries in `## Debugged Issues` — none exist)
- [x] Build passes — last run: 2026-09-02, `pnpm prism:build` green (874/874 tests), mirrors regenerated for the two PR 2 fixes, byte-identical elsewhere
- [x] PR description up to date — PR 1 (#483) rewritten to the canonical template shape on Eric's Minor finding, verified rendered; PR 2 (#484) body written at open, not re-verified since
- [x] Lasting decisions promoted to architect context — ADR-0075 recorded; the three routed architect docs match shipped behavior (AC-9)

**Last updated:** 2026-09-02

---


## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given a repo that has only ever been set up with `npx @huntermcgrew/prism init`, When Atlas is invoked and runs to completion, Then it finishes through config write, validation, and output regeneration without referring the user to `scripts/ai-skills/lib`, `pnpm prism:build`, or a config schema at the repo root.
  - Evidence (human): run Atlas end to end in a fresh npm-consumer repo and read the full transcript → the session reaches its closing summary, and no message names any of the three · UNMET looks like: Atlas stalls, or the transcript names any of `scripts/ai-skills/lib`, `pnpm prism:build`, or a consumer-root `config.schema.json`.
  - This is the issue's done condition, carried verbatim in substance.

- [ ] **AC-2** Given a consumer repo whose configuration records a product domain, When the update command runs, Then the persona files it writes carry that product domain in place of the generic placeholder text.
  - Evidence (machine): `npx tsx --test scripts/ai-skills/update.test.ts` → the anchor-render case passes; grep the rendered `.claude/skills/prism-code-dev/SKILL.md` for the domain string returns a hit, and for "Populated during onboarding from the team's actual product domain" returns nothing. Positive control for the absence half: the same grep against the canonical `.ai-skills/skills/prism-code-dev/shared.md` returns a hit, proving the probe works · UNMET looks like: the rendered file still carries the placeholder sentence.

- [ ] **AC-3** Given a consumer repo, When the update command runs, Then nothing inside the installed PRISM package is modified.
  - Evidence (machine): `npx tsx --test scripts/ai-skills/update.test.ts` → the byte-identity case passes, comparing every file under the fake PRISM source's `.ai-skills/skills/` before and after the run · UNMET looks like: any file under that tree differs after the run.

- [ ] **AC-4** Given any repo, When the detect command is run, Then it prints the detected tech stack and doc layout as JSON and writes no file.
  - Evidence (machine): `npx tsx --test scripts/ai-skills/detect.test.ts` → all three cases pass; `npx tsx scripts/ai-skills/cli.ts detect | node -e "JSON.parse(require('fs').readFileSync(0))"` exits 0 · UNMET looks like: non-JSON on stdout, a non-zero exit on an empty repo, or any file appearing in `git status` after the run.

- [ ] **AC-5** Given the consumer CLI's help output, When a reader looks for the detect command, Then it is listed alongside init, adopt, update, doctor, and eject.
  - Evidence (machine): `npx tsx scripts/ai-skills/cli.ts --help` → output includes a line beginning `  prism detect` · UNMET looks like: the command dispatches but is absent from the help listing, which would make every reference to it in shipped prose unreachable.

### Non-behavioral

- [ ] **AC-6** Atlas's skill body and the three onboarding references name no command or path a consumer cannot reach.
  - Evidence (machine): `grep -rn "pnpm prism:\|scripts/ai-skills" .prism/references/onboarding/` returns nothing, and the same grep against `.ai-skills/skills/prism-onboarding/shared.md` returns only lines inside the § Install context table's toolkit column. Positive control: the same grep against `.prism/architect/_toolkit/install-layout.md` returns hits, proving the pattern matches · UNMET looks like: any hit outside the toolkit column.

- [ ] **AC-7** The full build and check pipeline passes.
  - Evidence (machine): `pnpm prism:check` → exits 0 · UNMET looks like: any non-zero exit, including a `discovery-metadata.test.ts` body-cap failure on the grown Atlas body or a `ship-closure` dangling-reference failure from the new ADR.

- [ ] **AC-8** The decision to render anchors rather than mutate sources is recorded as an ADR carrying its rejected alternatives.
  - Evidence (human): open `.prism/spec/adrs/_toolkit/0075-anchors-substitute-at-projection-time.md` → it has Context, Decision, and Consequences; Decision names all three rejected alternatives with a reason each; Consequences states at least one honest negative · UNMET looks like: a missing section, an alternative listed without its reason, or an all-upside Consequences section.

- [ ] **AC-9** The three routed architect docs match the shipped behavior.
  - Evidence (machine): `grep -rn "substituteAnchorsAcrossSkills\|runAnchorSubstitution" .prism/architect/` returns nothing. Positive control: the same grep against this plan file returns hits · UNMET looks like: any architect doc still describing the retired API as live.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | AC generated and synced | prism-481 | #481 |

