---
title: Codex AGENTS.md budget — child 3 of the Kitchen Line port
ticket: https://github.com/HunterMcGrew/PRISM/issues/519
stage: plan
status: draft
epic: https://github.com/HunterMcGrew/PRISM/issues/499
spec: ../prism-499/spec.md (the Children table, row 3, and the "AGENTS.md and Codex" design section)
created: 2026-11-18
---

# Plan: prism-519 — Codex AGENTS.md budget

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/519 — child 3 of epic #499.

## Goal

Make a Codex session that reads only the first 32 KiB of `AGENTS.md` still get the routing rule and every behavioral-norm rule, raise Codex's read limit in the repo's `.codex/config.toml`, and have `prism doctor` say when the limit is too low.

---

## Implementation Tasks

Every task below is Clove's. Commit subjects on this branch use `PRISM-519: <summary>`, because the folder-plan subject forms (`T3:` and so on) arrive with child 5. Commit once per task as each lands, per `git-conventions.md` (Commit Granularity).

Sequence: tasks 1 and 2 are independent. Task 3 needs both. Task 4 needs task 3. Tasks 5 and 6 need task 2. Task 7 needs tasks 3, 5, and 6. Task 8 needs task 3 merged to the branch and a human with Codex.

### Clove (implementation)

1. **Order the generated block by a named lead list.**
   - **Files:** `scripts/ai-skills/agents-md-block.ts`, `scripts/ai-skills/agents-md-block.test.ts`.
   - **Change, constant.** After `AGENTS_MD_SEEDED_MARKER`, add an exported constant with a JSDoc that states the why (Codex reads only the first 32 KiB of `AGENTS.md` by default, so the rules that drive a run go first):

     ```ts
     export const AGENTS_MD_LEAD_RULES: readonly string[] = [
     	"skill-routing.md",
     	"plan-before-building.md",
     	"subagent-strategy.md",
     	"self-improvement-loop.md",
     	"verification-before-done.md",
     	"demand-elegance.md",
     	"autonomous-bug-fixing.md",
     	"core-principles.md",
     	"bash-output-minimization.md",
     	"cross-agent-handoff-accountability.md",
     	"pre-compaction-checkpoint.md",
     ];
     ```

   - **Change, `renderTier1Block`.** Before rendering, reorder `rules`: first every rule whose `name` is in `AGENTS_MD_LEAD_RULES`, in list order, then every other rule in the order it arrived. A list name with no matching rule is skipped silently, because a consumer's rules directory may lack one. Leave `collectTier1RuleBodies` alphabetical, so its existing ordering test stays true. Signature unchanged.
   - **Change, new export.** Add `measureLeadSectionEnds(agentsMd: string, leadRules: readonly string[] = AGENTS_MD_LEAD_RULES): { name: string; endByte: number | null }[]`. For each name, find `<!-- source: .prism/rules/<name> -->`. Its end is the UTF-8 byte offset (`Buffer.byteLength` of the text before it) of the next `<!-- source: ` marker after it, or of `AGENTS_MD_BLOCK_END` when none follows. `endByte` is `null` when the source marker is absent.
   - **Change, module JSDoc.** In the file's top JSDoc, add one sentence: rules named in `AGENTS_MD_LEAD_RULES` render first, in list order, then the rest alphabetically.
   - **Tests to add** in `agents-md-block.test.ts`, and add one line to the header list for "lead rules render first, in list order":
     - `renderTier1Block` given `zeta.md`, `skill-routing.md`, `alpha.md`, `core-principles.md` (in that input order) renders the source comments in the order `skill-routing.md`, `core-principles.md`, `zeta.md`, `alpha.md`.
     - `renderTier1Block` given only non-lead names keeps their input order.
     - `measureLeadSectionEnds` on a synthetic string whose first section body holds an em dash (`—`, 3 bytes in UTF-8) returns byte offsets, not character offsets: assert the value equals `Buffer.byteLength` of the prefix and differs from the string index.
     - `measureLeadSectionEnds` returns `endByte: null` for a list name with no marker.
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/agents-md-block.test.ts` passes.
   - **Proof fails on main:** yes. The new tests import `AGENTS_MD_LEAD_RULES` and `measureLeadSectionEnds`, which do not exist there.
   - **Behavior change:** yes. The generated block's order changes for PRISM and for every consumer on their next `prism update`. No existing test pins the order of these names (checked: no lead name appears in a render assertion in `agents-md-block.test.ts`, `update.test.ts`, `adopt.test.ts`, or `eject.test.ts`).

2. **Add the Codex project-doc module.**
   - **Files:** new `scripts/ai-skills/codex-project-doc.ts`, new `scripts/ai-skills/codex-project-doc.test.ts`.
   - **Exports** (exact shapes):

     ```ts
     export const CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES = 32 * 1024;
     export const CODEX_CONFIG_RELATIVE_PATH = ".codex/config.toml";

     export function computeProjectDocMaxBytes(agentsMdBytes: number): number;

     export type ProjectDocMaxBytesSetting =
     	| { kind: "absent" }
     	| { kind: "set"; value: number }
     	| { kind: "unparseable"; raw: string };

     export function readProjectDocMaxBytes(toml: string | null): ProjectDocMaxBytesSetting;

     export function mergeProjectDocMaxBytes(toml: string | null, value: number): string;

     export async function syncCodexProjectDocLimit(
     	repoRoot: string,
     	dryRun: boolean
     ): Promise<{ outcome: FileOutcome; warning?: string } | null>;
     ```

     `FileOutcome` is a type-only import from `./update` (`import type`), so no runtime cycle forms.
   - **`computeProjectDocMaxBytes`:** round up to a multiple of 65,536, then add 65,536. 132,790 gives 262,144. 65,536 gives 131,072. 1 gives 131,072. The caller never passes 0, because an absent `AGENTS.md` skips the write.
   - **`readProjectDocMaxBytes`:** the top-level region is every line before the first line matching `^\s*\[`, which is the first table or array-of-tables header. In that region, match `^\s*project_doc_max_bytes\s*=\s*(.*?)\s*(#.*)?$`. No match, or a `null` input, gives `absent`. A captured value matching `^[0-9][0-9_]*$` gives `set`, with underscores removed before `Number()`. Any other value gives `unparseable` with the raw text. A key inside a table does not count.
   - **`mergeProjectDocMaxBytes`:** preserve the file's line ending (`\r\n` when the input contains one, otherwise `\n`). When the key is `set`, replace only the digits on that line and keep any trailing comment. When it is `absent`, prepend these two lines and one blank line before any existing content:

     ```toml
     # Raises Codex's AGENTS.md read limit (32 KiB by default). prism update keeps it at or above the file's size.
     project_doc_max_bytes = <value>
     ```

     With a `null` input, the result is those two lines and a trailing line ending.
   - **`syncCodexProjectDocLimit`:** read `<repoRoot>/AGENTS.md`. If it is absent, return `null`. Otherwise compute the value from its byte length, then read `<repoRoot>/.codex/config.toml` (absent is `null`).
     - `unparseable` gives `{ outcome: { relativePath: ".codex/config.toml", action: "no-op" }, warning: ".codex/config.toml sets project_doc_max_bytes to <raw>, which PRISM cannot read; left unchanged. Set it to <value> or more." }`.
     - `set` with a value at or above the computed one gives action `no-op`, because a larger value may be the team's own choice.
     - Otherwise write the merged text (create `.codex/` with `fs.mkdir(..., { recursive: true })` first), unless `dryRun`. The action is `written` when the file was absent and `overwritten` when it existed.
   - **Tests to add:**
     - the three `computeProjectDocMaxBytes` values above;
     - `readProjectDocMaxBytes` returns `absent` for `null`, for a file with no key, and for a key that sits only under `[profiles.x]`;
     - it returns `set` for `project_doc_max_bytes = 1_048_576  # mine`, giving 1048576;
     - it returns `unparseable` for `project_doc_max_bytes = 0x100000`;
     - merge into `null`;
     - merge into a file with other top-level keys and a `[mcp_servers.x]` table: the other lines are byte-identical and the key lands at the top;
     - merge replacing an existing smaller value keeps its trailing comment;
     - merge preserves `\r\n`;
     - `syncCodexProjectDocLimit` in a temp dir covers no `AGENTS.md` (gives `null`), a 40,000-byte `AGENTS.md` with no config (gives `written` and the value 131,072), a larger existing value (gives `no-op` with the file unchanged), and `dryRun` (gives the outcome with nothing on disk).
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/codex-project-doc.test.ts` passes, and `pnpm prism:check-types` passes.
   - **Proof fails on main:** yes, because the module does not exist.
   - **Behavior change:** no. The module is new and nothing calls it until tasks 3 and 5.

3. **Wire the build: size report, PRISM's own Codex config, and regeneration.** After tasks 1 and 2.
   - **Files:** `scripts/ai-skills/build.ts`, then the regenerated `AGENTS.md` and new `.codex/config.toml`.
   - **Change, `syncAgentsMdTier1Block`.** Change its return type from `Promise<void>` to `Promise<{ content: string; alwaysOnBytes: number } | null>`. Return `null` on the early return when `AGENTS.md` is absent. Otherwise return `next` (the file content after replacement) and the summed `Buffer.byteLength` of every collected rule's `body`. Its one caller is `main()`, and the tests do not call it (confirm with `grep -rn syncAgentsMdTier1Block scripts/`).
   - **Change, `main()`.** At the existing `await syncAgentsMdTier1Block(...)` call:
     - Keep the result. When it is not `null`, compute `leadEnd` as the largest non-null `endByte` from `measureLeadSectionEnds(result.content)`, then print one line with `console.log`. The prefix is `prism:check` in check mode and `prism:build` otherwise:

       ```
       <prefix>: AGENTS.md is <bytes> bytes; its lead sections end at byte <leadEnd> of the <32768> Codex reads by default; the always-on rules total <alwaysOnBytes> bytes.
       ```

       When every `endByte` is `null`, replace the middle clause with `no lead section was found`. Nothing exits non-zero on these numbers.
     - Then call `syncCodexProjectDocLimit(repoRoot, checkMode)`. When it returns an outcome whose action is not `no-op`, push `path.join(repoRoot, ".codex", "config.toml")` onto `changedPaths`, so check mode reports drift and build mode lists the write. Print any `warning` with `console.warn`.
     - PRISM's build runs this for every host, as it already does for platform output. The `hosts` gate is a consumer concern and lives in task 5.
   - **Then run** `pnpm prism:build`. It reorders `AGENTS.md` (same bytes, new order) and writes `.codex/config.toml`, which should hold `project_doc_max_bytes = 262144` when `AGENTS.md` is 132,790 bytes. If the size differs, the value is whatever `computeProjectDocMaxBytes` gives. Commit `AGENTS.md`, `.codex/config.toml`, and `build.ts` together.
   - **Proof:**
     - `pnpm prism:build` prints the size line;
     - `head -c 32768 AGENTS.md | grep -c 'source: .prism/rules/branch-plan.md'` prints `1`. `branch-plan.md` is the first non-lead rule, so its marker starting inside 32 KiB means every lead section ended there;
     - `grep -c '^project_doc_max_bytes = ' .codex/config.toml` prints `1`;
     - `pnpm prism:check` passes.
   - **Proof fails on main:** yes. `git show origin/main:AGENTS.md | head -c 32768 | grep -c 'source: .prism/rules/skill-routing.md'` prints `0`, and main has no `.codex/config.toml`.
   - **Behavior change:** yes. Build output gains one line in both modes, and `prism:check` now fails when `.codex/config.toml` is stale against `AGENTS.md`'s size.

4. **Add the repo budget test.** After task 3.
   - **Files:** new `scripts/ai-skills/agents-md-budget.test.ts`.
   - **Change.** One `node:test` test that reads the repo-root `AGENTS.md` (resolved from `import.meta.url`, two directories up from `scripts/ai-skills/`). It calls `measureLeadSectionEnds` and asserts, for every entry:
     - `endByte !== null`, with message `<name> is in AGENTS_MD_LEAD_RULES but not in AGENTS.md`;
     - `endByte <= CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES`, with message `<name> ends at byte <endByte>, past the <32768> bytes Codex reads by default. Shorten a lead rule or move one out of AGENTS_MD_LEAD_RULES.`

     The file JSDoc says what the test protects and that child 5 adds the workflow block to the same list.
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts` passes.
   - **Proof fails on main:** yes. Run against `origin/main`'s `AGENTS.md` (alphabetical), `skill-routing.md` ends near byte 110,796.
   - **Behavior change:** no.

5. **Write the limit from `prism update` when Codex is a host.** After task 2.
   - **Files:** `scripts/ai-skills/update.ts`, `scripts/ai-skills/update.test.ts`.
   - **Change.** In `runUpdate`, right after the `refreshConsumerAgentsMdBlock` call, run `const codexDocLimit = hosts.includes("codex") ? await syncCodexProjectDocLimit(consumerRepoRoot, dryRun) : null;`.
     - When it carries a `warning`, print it with `console.warn` prefixed `prism:update: `.
     - Fold `codexDocLimit.outcome` into the returned `outcomes` beside `hookOutcomes`, so `reportSummary` and `--dry-run` show it. This is the same pattern the hook runtime uses, and its existing comment explains why.
     - Do not add a field to `RunUpdateSummary`.
     - In dry-run the size comes from the pre-refresh `AGENTS.md`, because the refresh writes nothing in dry-run. Accept that: it can differ from the real run by at most one 64 KiB step.
   - **Tests to add** in `update.test.ts`, using the file's existing temp-consumer fixture helpers:
     - hosts absent (all hosts) and a consumer `AGENTS.md` over 32 KiB gives a `.codex/config.toml` with the computed value and an outcome for `.codex/config.toml`;
     - `hosts: ["claude"]` leaves no `.codex/config.toml` behind;
     - `dryRun: true` writes nothing and still reports the outcome.
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/update.test.ts` passes, and so does `pnpm exec tsx --test scripts/ai-skills/adopt.test.ts`, because adopt delegates to `runUpdate`.
   - **Proof fails on main:** yes. The new tests expect a `.codex/config.toml` that main never writes.
   - **Behavior change:** yes. When Codex is a host and `AGENTS.md` exists, `runUpdate` reports one more outcome. Edit an existing `update.test.ts` or `adopt.test.ts` assertion only when it pins the full outcome list, and only by adding the `.codex/config.toml` entry.

6. **Add the doctor check.** After task 2.
   - **Files:** `scripts/ai-skills/doctor.ts`, `scripts/ai-skills/doctor.test.ts`.
   - **Change, union.** Add `| "codex-doc-limit"` to `DoctorFinding["check"]`. Only `doctor.ts` and its tests use the type, and doctor has no JSON output, so this is not a public-API change.
   - **Change, check.** Add `async function checkCodexDocLimit(consumerRepoRoot: string): Promise<DoctorFinding[]>`:
     - Return `[]` when `resolveHosts(await readConsumerConfigSafely(consumerRepoRoot))` lacks `codex`, when `AGENTS.md` is absent, or when its byte length is at most `CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES`.
     - Otherwise read `.codex/config.toml` with `readProjectDocMaxBytes`, set `computed = computeProjectDocMaxBytes(size)`, and return exactly one finding. In every message below, `<FALLBACK>` is the sentence `If your Codex does not apply the repo's .codex/config.toml, set project_doc_max_bytes = <computed> at the top level of ~/.codex/config.toml.`

     | Setting | Severity | Message |
     | --- | --- | --- |
     | `absent` | `warning` | `AGENTS.md is <size> bytes, but Codex reads only the first 32768 by default and .codex/config.toml sets no project_doc_max_bytes, so Codex sessions miss the rest. Run npx @huntermcgrew/prism update to set it to <computed>. <FALLBACK>` |
     | `set`, below `size` | `warning` | `AGENTS.md is <size> bytes, but .codex/config.toml sets project_doc_max_bytes = <value>, so Codex sessions miss the rest. Run npx @huntermcgrew/prism update to raise it to <computed>. <FALLBACK>` |
     | `unparseable` | `warning` | `.codex/config.toml sets project_doc_max_bytes to <raw>, which PRISM cannot read. Set it to <computed> or more. <FALLBACK>` |
     | `set`, at or above `size` | `info` | `.codex/config.toml sets project_doc_max_bytes = <value>, enough for AGENTS.md (<size> bytes). <FALLBACK>` |

     The `info` row is the fallback the OPEN Decision's default path names. Keep it whatever the live run in task 8 finds, because an untrusted project or an older Codex can still skip the repo file.
   - **Change, wiring.** In `runDoctor`, push `...(await checkCodexDocLimit(consumerRepoRoot))` immediately after the `checkHookRegistration` line.
   - **Tests to add** in `doctor.test.ts`, using its temp-repo helpers. Cover the four rows above, a `hosts: ["claude"]` repo with a 40,000-byte `AGENTS.md` (no finding), and a 30,000-byte `AGENTS.md` (no finding). Assert `healthy` stays `true` in every case, because none of these is an `error`.
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/doctor.test.ts` passes.
   - **Proof fails on main:** yes. Main produces no `codex-doc-limit` finding.
   - **Behavior change:** yes. `prism doctor` prints one more line for a Codex repo whose `AGENTS.md` is over 32 KiB.

7. **Document the behavior, then run the full check.** After tasks 3, 5, and 6. This is the docs work absorbed into this PR (see Decisions).
   - **`.prism/architect/_toolkit/consumer-sync-flow.md`.** In the "Steady-state persona-skill distribution" section, insert a paragraph right after the paragraph that starts `**The hook runtime rides the same update.**`. It must say:
     - when Codex is in `hosts` and `AGENTS.md` exists, `runUpdate` sets `project_doc_max_bytes` in the repo's `.codex/config.toml` through `syncCodexProjectDocLimit` (`scripts/ai-skills/codex-project-doc.ts`);
     - the value is the file size rounded up to the next 64 KiB, plus one 64 KiB step;
     - the edit touches only that top-level key, never lowers a larger value, and leaves a value it cannot parse alone with a warning;
     - dropping Codex from `hosts`, or ejecting, leaves the key in place;
     - Codex reads only the first 32 KiB by default, so the generated block also puts `AGENTS_MD_LEAD_RULES` (`scripts/ai-skills/agents-md-block.ts`) first.

     Lead the paragraph with `**Codex's AGENTS.md limit rides the same update.**`.
   - **`templates/install/.prism/architect/_toolkit/consumer-sync-flow.md`.** This is the curated twin. Insert the same paragraph at the same place, minus the two `scripts/ai-skills/...` paths and the two code identifiers, which a consumer cannot reach (`install-layout.md`, "Curated seed twins: the curation boundary", Test 2). Attribute the mechanism to `prism update`.
   - **`.prism/architect/_toolkit/install-layout.md`.** In "Direct-write tool outputs", add a bullet after the `.codex/codex-config.toml` bullet: `` `.codex/config.toml` is **committed** — the repo's own Codex project config. PRISM sets only `project_doc_max_bytes` in it, through `prism update` when Codex is among the hosts, and leaves every other key alone. ``
   - **`templates/install/.prism/architect/_toolkit/install-layout.md`.** Add the same bullet after its `.codex/codex-config.toml` bullet.
   - **`docs/adopting-into-existing-repos.md`.** In "Why a pre-existing AGENTS.md matters most for Codex", add a paragraph after the one that starts `That inlining step`. It says Codex reads only the first 32 KiB of `AGENTS.md` unless `project_doc_max_bytes` is raised. PRISM puts routing and the behavioral-norm rules first, so they fit in that window. `prism update` raises the limit in `.codex/config.toml` when Codex is among your hosts, and `prism doctor` warns when the file is bigger than the limit. Update the page's `last_updated` frontmatter to the commit date.
   - **Then run** `pnpm prism:build` to refresh the platform copies of the two architect docs, and commit everything.
   - **Proof:** `pnpm prism:check` passes; this covers crossref-lint, seed drift, the literal and leftover-token guards, spec-scope-lint, and the full suite. Also run `git diff origin/main --stat -- package.json pnpm-lock.yaml`, which prints nothing.
   - **Proof fails on main:** no. These are docs.
   - **Behavior change:** no.

8. [HITL] **Live Codex run: does Codex honor the repo-level key?** After task 3 is pushed. This needs someone with an authenticated Codex CLI (Hunter); the planning machine has no `codex` on PATH.
   - **Setup.** In a checkout of this branch, trust the project in Codex.
   - **Run A, with the key.** Run `codex exec "Quote, word for word, the first sentence under the heading 'Anti-pattern: Session-context leakage' in your AGENTS.md instructions. If you cannot see that heading, reply exactly NOT VISIBLE."`. That heading sits in `writing-voice.md`'s body, past byte 120,000 of `AGENTS.md`.
   - **Run B, the positive control.** Temporarily delete the `project_doc_max_bytes` line from `.codex/config.toml`, run the same command, then restore the line with `git checkout -- .codex/config.toml`.
   - **Reading the results:**
     - Run A quotes the sentence and run B replies `NOT VISIBLE`: the repo key is honored. Replace the OPEN Decision with a resolved one and keep doctor's `info` row unchanged.
     - Both runs reply `NOT VISIBLE`: the repo key is not honored. Keep the OPEN, and record the result under Decisions.
     - Both runs quote it: the probe is not discriminating, because something else raised the limit (check `~/.codex/config.toml`). Record that and retry with the home setting removed.
   - **Record.** Write the outcome as a `## History` line and in the OPEN Decision. Clove commits it as `PRISM-519: Record the live Codex limit check`.
   - **Not run before merge.** Leave the OPEN as written and list it in the PR body. That matches the spec's proof clause: "or the fallback is recorded".

---

## Decisions

- **Ordering happens inside `renderTier1Block`, driven by a named list.**
  - **Root cause:** the block sorts rules alphabetically. `skill-routing.md` ends near byte 110,796 and most norm rules sit past byte 53,000, so a default Codex session never sees them.
  - **Alternatives considered:**
    - A second marker pair holding the lead rules ahead of the block. Rejected, because `hasTier1BlockMarkers`, `replaceTier1Block`, and `prism eject` all assume one pair, and `prism update` never restructures a consumer's `AGENTS.md`.
    - Reordering at each caller. Rejected, because PRISM's build and the consumer refresh would each need the same edit.
  - **Chosen approach:** one list in `agents-md-block.ts`, applied in `renderTier1Block`. Both callers inherit it with no call-site change.
  - **Implementation guidance:** keep `collectTier1RuleBodies` alphabetical, so the rest of the block and its existing test do not move.
- **The lead list is the rule files; its order follows the intent's sentence.** The intent names "the workflow block, the resume table, routing, and the behavioral norms." Routing is `skill-routing.md`. The behavioral norms are the rules that `AGENTS.md`'s "Behavioral norms" table links, in that table's row order. The table itself already sits in the handwritten preamble inside the first 4 KiB, so listing it would prove nothing. Child 5 prepends the workflow block and resume table.
- **The 32 KiB budget is nearly spent, and child 5 has to reclaim space.**
  - **Measured on main at 840ee678:** the preamble ends at byte 3,125, and routing plus the ten norm rules add 27,424 bytes. The last lead section ends near byte 30,549, leaving about 2,219 bytes.
  - **Thrive's `## Workflow` block at db3570975 is 7,513 bytes.** Prepended as written, the lead set would end near byte 38,000 and the task 4 test would fail.
  - **Not child 3's to fix.** The lead set as specified fits today. Child 5's planner should budget about 5.3 KB of cuts. The obvious source is `skill-routing.md` (14,719 bytes), which child 5 rewrites anyway.
  - **Why the test fails loudly rather than warns:** a silently overflowing lead set is exactly the failure this child exists to prevent.
- **The value never goes down, and the edit touches one line.**
  - The value is the size rounded up to the next 64 KiB, plus one step (spec). A larger existing value is kept, because a team may have raised it for nested `AGENTS.md` files that share Codex's budget.
  - The TOML edit is line-based, with no parser. A parser would be a new dependency, and only one top-level integer key is ever read or written.
  - The edit reads only the region before the first table header. A value it cannot read is left alone with a warning, because rewriting a value it does not understand could corrupt the file.
- **PRISM's own build writes PRISM's `.codex/config.toml`.** Then the live run in task 8 can test this repo, and `prism:check` catches a stale value when a rule edit grows `AGENTS.md` past a 64 KiB step. Consumers get the write through `runUpdate`, which `prism adopt` delegates to. Onboarding regenerates through `prism update` in consumer context and `pnpm prism:build` in toolkit context (`prism-onboard`, its install-context table). So adopt, update, and onboarding are all covered with no skill edit.
- **Only the repo-root `AGENTS.md` is sized.** Codex's limit covers the combined files on its root-to-working-directory walk. The one 64 KiB headroom step covers small nested files, and a team with large ones raises the value by hand, which the never-lower rule then keeps.
- **Dropping Codex from `hosts`, and `prism eject`, both leave the key.** The key is harmless without Codex. The file is the team's committed config, and the value may be one they raised themselves, so removing it could undo a choice PRISM did not make.
- **Doctor warns rather than errors, and always names the per-developer fallback.** A short read limit degrades Codex sessions without breaking the install, and `healthy` keys on `error` alone. The `~/.codex/config.toml` sentence carries the OPEN Decision's default path below.
- **The docs land in this PR, written by Clove.** The two architect docs, their curated twins, and the consumer guide describe behavior this PR adds. A separate docs PR would describe code that has not merged. This is a documented absorption of the docs lane, per `branch-plan.md` (Implementation Tasks).
- **The plan is a folder `plan.md` with the flat-plan sections.** The spec puts each child in `.prism/plans/prism-<n>/`. The folder templates and task grammar arrive in child 4, so this plan uses the `branch-plan.md` template, the only one on `main`. `resolveLivePlan` already finds `prism-519/plan.md`. The plan cites sections by name only and never points History at a Decision, so child 4's plan-folder citation lint will not need to allowlist it.
- **One PR, though it crosses the 10-file mark.** About 10 hand-written files change. The rest are generated: `AGENTS.md`, `.codex/config.toml`, and the `.claude/`, `.codex/`, and `.cursor/` copies of two architect docs. The spec defines child 3 as one PR, and its parts share one purpose. If Hunter wants a stack, the cut goes after task 4: ordering, report, and budget test in the first PR; config write, doctor, and docs in the second.
- **AC was not synced to issue #519 in this run.** Editing a public issue needs Hunter's go-ahead, and this run had none. Sync it when the plan is approved, or let Clove sync it when implementation starts.
- **OPEN — TBD, needs a live Codex run (Hunter).** Whether Codex honors `project_doc_max_bytes` in a repo-level `.codex/config.toml`. The Codex docs show a repo-level file and do not list this key among those it ignores there, but they do not say it is honored. **Default path (used until resolved):** child 3 writes the key, and `prism doctor` prints the per-developer `~/.codex/config.toml` setting as a fallback (task 6). Task 8 is the probe.

---

## Sessions

- 2026-11-18 [huntermcgrew/prism-519-codex-budget] open: Intent — plan child 3 (Codex AGENTS.md budget) from the epic spec; Bounds — this plan folder only, commit and push, no PR, no code; Approach — measure the real byte layout, order inside `renderTier1Block`, one line-based TOML writer shared by build and update, one doctor check · close: scope held

---

## History

- 2026-11-18 [huntermcgrew/prism-519-codex-budget]: Plan created from the epic spec at `origin/huntermcgrew/prism-499-approve-once`. It has eight tasks, all Clove's, and one carried OPEN; the AC was not synced to #519 in this run.

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given PRISM's generated agent instructions file, When a reader takes only its first 32 KiB, Then the whole skill-routing rule and every behavioral-norm rule are inside that window.
  - Evidence (machine): `head -c 32768 AGENTS.md | grep -c 'source: .prism/rules/branch-plan.md'` → `1`, because the first rule after the lead set starts inside the window; plus `pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts` passes · Positive control: `git show origin/main:AGENTS.md | head -c 32768 | grep -c 'source: .prism/rules/skill-routing.md'` → `0` · UNMET looks like: `0` on the branch, or the budget test failing and naming a rule past byte 32768.
- [ ] **AC-2** Given a repo with Codex among its hosts and an instructions file over 32 KiB, When `prism update` runs, Then the repo's Codex config sets the read limit to the file size rounded up to the next 64 KiB plus one more 64 KiB step, and every other line in that config is unchanged.
  - Evidence (machine): `pnpm exec tsx --test scripts/ai-skills/update.test.ts scripts/ai-skills/codex-project-doc.test.ts` passes, including the merge test that keeps other keys byte-identical; plus in this repo `grep '^project_doc_max_bytes = ' .codex/config.toml` → `project_doc_max_bytes = 262144` while `wc -c < AGENTS.md` is 132790 · UNMET looks like: a missing key, a value that is not the next 64 KiB multiple plus 65536, or a changed line elsewhere in the fixture.
- [ ] **AC-3** Given the repo's Codex config already sets a larger read limit, When `prism update` runs, Then that value is left as it was.
  - Evidence (machine): the `syncCodexProjectDocLimit` "larger existing value" test in `codex-project-doc.test.ts` passes, asserting action `no-op` and identical file bytes · UNMET looks like: the value lowered to the computed one.
- [ ] **AC-4** Given a repo whose hosts do not include Codex, When `prism update` runs, Then no Codex config file is created.
  - Evidence (machine): the `hosts: ["claude"]` test in `update.test.ts` passes, asserting `.codex/config.toml` does not exist · UNMET looks like: the file exists after the run.
- [ ] **AC-5** Given a Codex repo whose instructions file is over the configured read limit, or over 32 KiB with no limit set, When `prism doctor` runs, Then it warns, names the value to set, and names the per-developer setting as a fallback, without marking the install unhealthy.
  - Evidence (machine): the `absent`, `set below size`, and `unparseable` cases in `doctor.test.ts` pass, each asserting one `codex-doc-limit` finding with severity `warning`, a message containing `~/.codex/config.toml`, and `healthy === true` · UNMET looks like: no finding, an `error` severity, or a message without the fallback.
- [ ] **AC-6** Given a Codex repo whose configured read limit covers the instructions file, When `prism doctor` runs, Then it prints an informational line naming the per-developer setting, and no warning.
  - Evidence (machine): the `set at or above size` case in `doctor.test.ts` passes with exactly one `info` finding · UNMET looks like: a `warning`, or no line at all.
- [ ] **AC-7** Given any build or check run, When it finishes, Then it prints the instructions file's size, where its lead sections end, and the size of the always-on rules, and the run's exit status does not depend on those numbers.
  - Evidence (machine): `pnpm exec tsx scripts/ai-skills/build.ts --check; echo "exit=$?"` → output includes a line starting `prism:check: AGENTS.md is ` and `exit=0` on a synced tree · UNMET looks like: no size line, or a non-zero exit caused by the size.
- [ ] **AC-8** Given a trusted checkout of this repo and an authenticated Codex CLI, When Codex is asked for text that sits past byte 120,000 of the instructions file, Then it quotes the text with the repo's limit in place and cannot see it with the limit removed — or the run's absence is recorded and the fallback stands.
  - Evidence (human): task 8's run A and run B outputs recorded in `## History` and in the OPEN Decision · UNMET looks like: no recorded result and no recorded "not run" before the close.

### Non-behavioral

- [ ] **AC-9** No new dependency is added.
  - Evidence (machine): `git diff origin/main --stat -- package.json pnpm-lock.yaml` → empty output · Positive control: the same command against a scratch edit to `package.json` lists it · UNMET looks like: either file listed.
- [ ] **AC-10** The repo's full check passes with the regenerated outputs committed.
  - Evidence (machine): `pnpm prism:check` → exit 0 and `prism:check passed. Generated outputs are in sync.` · UNMET looks like: a non-zero exit, or any file listed as out of sync.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-18 | Winston | Generated AC | updated | not synced — needs Hunter's go-ahead to edit #519 |

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date, and it lists the OPEN Decision
- [ ] Lasting decisions promoted to architect context (if applicable)
- [ ] `> Retro:` line recorded at close

**Last updated:** 2026-11-18
