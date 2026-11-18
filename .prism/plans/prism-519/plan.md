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

2. **Add the Codex project-doc module.** *(Amended 2026-11-18, PR #521 review, two rounds.)*
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

     export function readLimitInForce(setting: ProjectDocMaxBytesSetting): number;

     export function mergeProjectDocMaxBytes(
     	toml: string | null,
     	setting: Exclude<ProjectDocMaxBytesSetting, { kind: "unparseable" }>,
     	value: number
     ): string;

     export async function syncCodexProjectDocLimit(
     	repoRoot: string,
     	dryRun: boolean
     ): Promise<{ outcome: FileOutcome; warning?: string } | null>;
     ```

     `FileOutcome` is a type-only import from `./update` (`import type`), so no runtime cycle forms.
   - **`computeProjectDocMaxBytes`:** round up to a multiple of 65,536, then add 65,536. 132,790 gives 262,144. 65,536 gives 131,072. 1 gives 131,072. The caller never passes 0, because an absent `AGENTS.md` skips the write.
   - **`readProjectDocMaxBytes`:** the top-level region is every line before the first table or array-of-tables header. A header line is `[a.b]` or `[[a.b]]` with optional quoted key segments and a trailing comment, and nothing else on the line, so an array element such as `[1, 2],` does not end the region. In that region, match `^\s*project_doc_max_bytes\s*=\s*(.*?)\s*(#.*)?$`. No match, or a `null` input, gives `absent`. A captured value matching `^[0-9][0-9_]*$` gives `set`, with underscores removed before `Number()`. Any other value gives `unparseable` with the raw text. A key inside a table does not count.
   - **`mergeProjectDocMaxBytes`:** take the `setting` that `readProjectDocMaxBytes` already returned, so the config is parsed once. Preserve the file's line ending (`\r\n` when the input contains one, otherwise `\n`). When the key is `set`, replace only the digits on that line and keep any trailing comment. When it is `absent`, prepend these two lines and one blank line before any existing content:

     ```toml
     # Raises Codex's AGENTS.md read limit (32 KiB by default). prism update keeps it at or above the file's size.
     project_doc_max_bytes = <value>
     ```

     With a `null` input, the result is those two lines and a trailing line ending.
   - **`syncCodexProjectDocLimit`:** read `<repoRoot>/AGENTS.md`. If it is absent, return `null`. Otherwise read `<repoRoot>/.codex/config.toml` (absent is `null`). When the config is absent and `AGENTS.md` is at most `readLimitInForce(setting)`, return `null` as well, because Codex already reads the whole file (AC-2 says "over 32 KiB"). `readLimitInForce` is the configured `project_doc_max_bytes` when `set`, otherwise `CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES`; with no config it is always the default. Otherwise compute the value from the byte length.
     - `absent` on an existing config, when any line of the file at any depth matches the limit-line pattern, gives action `no-op` and a warning: `.codex/config.toml has a project_doc_max_bytes line PRISM cannot place at the top level (under a table, or after a multi-line value); left unchanged. Set it to <value> or more at the top level.` The top-level reader cannot tell a lone-value array element (`[3]`) from a table header, so it can miss a key that is really top-level, and prepending a second one would make the TOML invalid. A key that genuinely sits under a table gets the same warning, which is the cost of not parsing.
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
   - **Amended:** the `mergeProjectDocMaxBytes` signature (the self-review cleaner path, recorded in History), the table-header test, and the small-file skip. Added tests: a multi-line array above the key, dotted and quoted headers, and the skip at 32,768 bytes versus 32,769.
   - **Amended (second round):** the new `readLimitInForce` export and the skip's use of it, and the merge guard above. Added tests: the `[3]` multi-line-array repro and a key under a table (both leave the file unchanged and warn), and `readLimitInForce` for `set`, `absent`, and `unparseable`.
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

4. **Add the repo budget test.** After task 3. *(Amended 2026-11-18, PR #521 review.)*
   - **Files:** new `scripts/ai-skills/agents-md-budget.test.ts`.
   - **Change.** One `node:test` test that reads the repo-root `AGENTS.md` (resolved from `import.meta.url`, two directories up from `scripts/ai-skills/`). It calls `measureLeadSectionEnds` and asserts, for every entry:
     - `endByte !== null`, with message `<name> is in AGENTS_MD_LEAD_RULES but not in AGENTS.md`;
     - `endByte <= CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES`, with message `<name> ends at byte <endByte>, past the <32768> bytes Codex reads by default. Shorten a lead rule or move one out of AGENTS_MD_LEAD_RULES.`

     The file JSDoc says what the test protects and what growing the list costs. It does not mention child 5's workflow block, which does not exist on this branch.
   - **Amended:** the JSDoc clause naming child 5's block was cut in the self-review fix (see Review Issues).
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts` passes.
   - **Proof fails on main:** yes. Run against `origin/main`'s `AGENTS.md` (alphabetical), `skill-routing.md` ends near byte 110,796.
   - **Behavior change:** no.

5. **Write the limit from `prism update` when Codex is a host.** After task 2. *(Amended 2026-11-18, PR #521 review.)*
   - **Files:** `scripts/ai-skills/update.ts`, `scripts/ai-skills/update.test.ts`.
   - **Change.** In `runUpdate`, right after the `refreshConsumerAgentsMdBlock` call, run `const codexDocLimit = hosts.includes("codex") ? await syncCodexProjectDocLimit(consumerRepoRoot, dryRun) : null;`.
     - When it carries a `warning`, print it with `console.warn` prefixed `prism:update: `.
     - Fold `codexDocLimit.outcome` into the returned `outcomes` beside `hookOutcomes`, so `reportSummary` and `--dry-run` show it. This is the same pattern the hook runtime uses, and its existing comment explains why.
     - Do not add a field to `RunUpdateSummary`.
     - In dry-run the size comes from the pre-refresh `AGENTS.md`, because the refresh writes nothing in dry-run. Accept that: the previewed action can differ from the real run's, with no bound. An `AGENTS.md` whose marker pair is still empty grows by more than 100 KB on refresh, so the preview can say `no-op` where the real run overwrites.
     - **Amended:** the "at most one 64 KiB step" bound was unsupported and is dropped.
   - **Tests to add** in `update.test.ts`, using the file's existing temp-consumer fixture helpers:
     - hosts absent (all hosts) and a consumer `AGENTS.md` over 32 KiB gives a `.codex/config.toml` with the computed value and an outcome for `.codex/config.toml`;
     - `hosts: ["claude"]` leaves no `.codex/config.toml` behind;
     - `dryRun: true` writes nothing and still reports the outcome.
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/update.test.ts` passes, and so does `pnpm exec tsx --test scripts/ai-skills/adopt.test.ts`, because adopt delegates to `runUpdate`.
   - **Proof fails on main:** yes. The new tests expect a `.codex/config.toml` that main never writes.
   - **Behavior change:** yes. When Codex is a host and `AGENTS.md` is over the limit in force or a `.codex/config.toml` already exists, `runUpdate` reports one more outcome. Edit an existing `update.test.ts` or `adopt.test.ts` assertion only when it pins the full outcome list, and only by adding the `.codex/config.toml` entry.

6. **Add the doctor check.** After task 2. *(Amended 2026-11-18, PR #521 review, two rounds.)*
   - **Files:** `scripts/ai-skills/doctor.ts`, `scripts/ai-skills/doctor.test.ts`.
   - **Change, union.** Add `| "codex-doc-limit"` to `DoctorFinding["check"]`. Only `doctor.ts` and its tests use the type, and doctor has no JSON output, so this is not a public-API change.
   - **Change, check.** Add `async function checkCodexDocLimit(consumerRepoRoot: string): Promise<DoctorFinding[]>`:
     - Return `[]` when `resolveHosts(await readConsumerConfigSafely(consumerRepoRoot))` lacks `codex`, or when `AGENTS.md` is absent.
     - Read `.codex/config.toml` with `readProjectDocMaxBytes` before the size check, and return `[]` when the byte length is at most `Math.min(CODEX_DEFAULT_PROJECT_DOC_MAX_BYTES, readLimitInForce(setting))`. A file inside the default window and inside any lower configured limit has nothing to cut. The `min` is what keeps the `info` row below: a configured limit above the default must not silence a file that is past the default and relies on that limit.
     - Otherwise set `computed = computeProjectDocMaxBytes(size)` and return exactly one finding. In every message below, `<FALLBACK>` is the sentence `If your Codex does not apply the repo's .codex/config.toml, set project_doc_max_bytes = <computed> at the top level of ~/.codex/config.toml.`

     | Setting | Severity | Message |
     | --- | --- | --- |
     | `absent` | `warning` | `AGENTS.md is <size> bytes, but Codex reads only the first 32768 by default and .codex/config.toml sets no project_doc_max_bytes, so Codex sessions miss the rest. Run npx @huntermcgrew/prism update to set it to <computed>. <FALLBACK>` |
     | `set`, below `size` | `warning` | `AGENTS.md is <size> bytes, but .codex/config.toml sets project_doc_max_bytes = <value>, so Codex sessions miss the rest. Run npx @huntermcgrew/prism update to raise it to <computed>. <FALLBACK>` |
     | `unparseable` | `warning` | `.codex/config.toml sets project_doc_max_bytes to <raw>, which PRISM cannot read. Set it to <computed> or more. <FALLBACK>` |
     | `set`, at or above `size` | `info` | `.codex/config.toml sets project_doc_max_bytes = <value>, enough for AGENTS.md (<size> bytes). <FALLBACK>` |

     In the two `warning` rows that read a size or a value (`absent` and `set`, below `size`), the message gains the sentence ` The routing and behavioral-norm rules at the top of the generated block end at byte <leadRulesEnd>, so Codex misses those too.` after `miss the rest.`, when `leadRulesEnd` (the largest non-null `endByte` from `measureLeadSectionEnds(AGENTS.md)`) is past the limit in force: 32768 for `absent`, the configured value for `set`.

     The `info` row is the fallback the OPEN Decision's default path names. Keep it whatever the live run in task 8 finds, because an untrusted project or an older Codex can still skip the repo file.
   - **Change, wiring.** In `runDoctor`, push `...(await checkCodexDocLimit(consumerRepoRoot))` immediately after the `checkHookRegistration` line, inside the `syncResult.syncState.manifest !== null` gate that `checkSeedDelivery` uses, so a never-adopted repo gets no `prism update` advice.
   - **Tests to add** in `doctor.test.ts`, using its temp-repo helpers. Cover the four rows above, a `hosts: ["claude"]` repo with a 40,000-byte `AGENTS.md` (no finding), and a 30,000-byte `AGENTS.md` (no finding). Assert `healthy` stays `true` in every case, because none of these is an `error`. Also cover a never-adopted repo (no finding), and four lead-rule cases built from a large preamble above a rendered block: lead rules past the default window with no config, lead rules past a configured 32768, lead rules inside the window, and a configured limit that covers the lead rules but not the whole file (the last two carry no lead-rule sentence). Also cover a configured limit below 32 KiB (16384) with a file between that value and 32 KiB, which warns and names where the lead rules end, and the same limit with a file inside it, which gives no finding.
   - **Amended:** the manifest gate, the lead-rule sentence, and the extra tests. Second round: the early return reads the config first and compares against the limit in force, plus the two lowered-limit tests. A lead rule cannot end past the end of the file, so the lead-rule sentence only ever accompanies a warning the size check already raises; it adds what is cut, not a new finding.
   - **Proof:** `pnpm exec tsx --test scripts/ai-skills/doctor.test.ts` passes.
   - **Proof fails on main:** yes. Main produces no `codex-doc-limit` finding.
   - **Behavior change:** yes. `prism doctor` prints one more line for a Codex repo whose `AGENTS.md` is over 32 KiB.

7. **Document the behavior, then run the full check.** *(Amended 2026-11-18, PR #521 review, two rounds.)* After tasks 3, 5, and 6. This is the docs work absorbed into this PR (see Decisions).
   - **`.prism/architect/_toolkit/consumer-sync-flow.md`.** In the "Steady-state persona-skill distribution" section, insert a paragraph right after the paragraph that starts `**The hook runtime rides the same update.**`. It must say:
     - when Codex is in `hosts` and `AGENTS.md` is over the limit in force (32 KiB until the config sets one), or a `.codex/config.toml` already exists, `runUpdate` sets `project_doc_max_bytes` in the repo's `.codex/config.toml` through `syncCodexProjectDocLimit` (`scripts/ai-skills/codex-project-doc.ts`), and a small `AGENTS.md` with no config gets none;
     - the value is the file size rounded up to the next 64 KiB, plus one 64 KiB step;
     - the edit touches only that top-level key, never lowers a larger value, leaves a value it cannot parse alone with a warning, and skips with a warning a config that has a `project_doc_max_bytes` line the top-level reader cannot see;
     - dropping Codex from `hosts`, or ejecting, leaves the key in place;
     - Codex reads only the first 32 KiB by default, so the generated block also puts `AGENTS_MD_LEAD_RULES` (`scripts/ai-skills/agents-md-block.ts`) first.

     Lead the paragraph with `**Codex's AGENTS.md limit rides the same update.**`.
   - **`templates/install/.prism/architect/_toolkit/consumer-sync-flow.md`.** This is the curated twin. Insert the same paragraph at the same place, minus the two `scripts/ai-skills/...` paths and the two code identifiers, which a consumer cannot reach (`install-layout.md`, "Curated seed twins: the curation boundary", Test 2). Attribute the mechanism to `prism update`.
   - **`.prism/architect/_toolkit/install-layout.md`.** In "Direct-write tool outputs", add a bullet after the `.codex/codex-config.toml` bullet: `` `.codex/config.toml` is **committed** — the repo's own Codex project config. PRISM sets only `project_doc_max_bytes` in it, through `prism update` when Codex is among the hosts, and leaves every other key alone. ``
   - **`templates/install/.prism/architect/_toolkit/install-layout.md`.** Add the same bullet after its `.codex/codex-config.toml` bullet.
   - **`docs/adopting-into-existing-repos.md`.** In "Why a pre-existing AGENTS.md matters most for Codex", add a paragraph after the one that starts `That inlining step`. It says Codex reads only the first 32 KiB of `AGENTS.md` unless `project_doc_max_bytes` is raised. PRISM puts routing and the behavioral-norm rules first, so they sit inside that window whenever the content above the generated block is small. `prism update` raises the limit in `.codex/config.toml` when Codex is among your hosts and the file is over the limit in force (32 KiB until the config sets one) or a config already exists, and `prism doctor` warns when the file is bigger than the limit in force. Update the page's `last_updated` frontmatter to the commit date.
   - **Amended:** the first-paragraph claim that the lead rules fit "even where the limit is never raised" is replaced, in the canonical architect doc, its twin, and the guide, by "whenever the content above the block's begin marker is small", plus a sentence that `prism doctor` warns when the limit in force ends before them. Second round: the write condition is stated as above in the canonical doc, its twin, and the guide. The canonical `install-layout.md` bullet also says PRISM's own build writes the key and `prism:check` fails when it is stale.
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
- **The lead rules fit the default window only while the content above the block is small.** The ordering is guaranteed, the fit is not: the lead rules run to about 27 KB, so a consumer who added the marker pair to a file with more than about 5 KB above it pushes them past 32 KiB. Only PRISM's own file is measured in CI. Doctor measures the consumer's file with `measureLeadSectionEnds` and says so when the limit in force ends before the lead rules.
  - **Alternatives considered:** a separate doctor finding for the lead rules. Rejected, because a lead rule cannot end past the end of the file, so the finding would always duplicate the existing size warning.
- **`prism update` writes no Codex config for an `AGENTS.md` inside the limit in force when no config exists.** Codex already reads the whole file, so the config would be a committed file with no effect. An existing config is still updated, because a team that has one may have lowered the value. The write condition is "over the limit in force, or a config already exists", and the docs say so.
  - **Alternatives considered:** also skipping an existing config that has no key when the file fits (the review's cleaner path). Rejected for now, because the stated contract updates any existing config, and a config with no key costs one harmless line.
- **Doctor and the sync share one "limit in force" helper, `readLimitInForce`.** It is the configured value when readable, otherwise 32,768. Doctor's early return uses `min(32768, limit in force)`, not the limit alone, because a configured limit above the default must not silence a file past 32 KiB that relies on it (AC-6's `info` row).
- **The merge skips with a warning when a limit line exists that the top-level reader cannot see.** The reader has no TOML parser, so a lone-value array element (`[3]`) reads as a table header and hides a real top-level key; prepending then writes a duplicate key. Alternatives considered: enumerating more array shapes in `TABLE_HEADER` (rejected, because each fix leaves a narrower shape, which is what the last two rounds found) and adding a parser (rejected, a new dependency). The cost is that a key that really sits under a table gets the warning too, instead of a prepended top-level key that would have been valid. That is a rare config and the warning names the value to set by hand.
- **Doctor warns rather than errors, and always names the per-developer fallback.** A short read limit degrades Codex sessions without breaking the install, and `healthy` keys on `error` alone. The `~/.codex/config.toml` sentence carries the OPEN Decision's default path below.
- **The docs land in this PR, written by Clove.** The two architect docs, their curated twins, and the consumer guide describe behavior this PR adds. A separate docs PR would describe code that has not merged. This is a documented absorption of the docs lane, per `branch-plan.md` (Implementation Tasks).
- **The plan is a folder `plan.md` with the flat-plan sections.** The spec puts each child in `.prism/plans/prism-<n>/`. The folder templates and task grammar arrive in child 4, so this plan uses the `branch-plan.md` template, the only one on `main`. `resolveLivePlan` already finds `prism-519/plan.md`. The plan cites sections by name only and never points History at a Decision, so child 4's plan-folder citation lint will not need to allowlist it.
- **One PR, though it crosses the 10-file mark.** About 10 hand-written files change. The rest are generated: `AGENTS.md`, `.codex/config.toml`, and the `.claude/`, `.codex/`, and `.cursor/` copies of two architect docs. The spec defines child 3 as one PR, and its parts share one purpose. If Hunter wants a stack, the cut goes after task 4: ordering, report, and budget test in the first PR; config write, doctor, and docs in the second.
- **AC was not synced to issue #519 in this run.** Editing a public issue needs Hunter's go-ahead, and this run had none. Sync it when the plan is approved, or let Clove sync it when implementation starts.
- **`compatibility.md` gains `config.toml` in its `.codex/` bullet, though it is outside this plan's files.** The file is the one `install-layout.md` cites for the committed-vs-ignored contract, and this change made its `.codex/` bullet false by committing `.codex/config.toml`. The edit is one sentence and shares the PR's purpose; a separate PR would leave the two files disagreeing until it merged.
- **OPEN — TBD, needs a live Codex run (Hunter).** Whether Codex honors `project_doc_max_bytes` in a repo-level `.codex/config.toml`. The Codex docs show a repo-level file and do not list this key among those it ignores there, but they do not say it is honored. **Default path (used until resolved):** child 3 writes the key, and `prism doctor` prints the per-developer `~/.codex/config.toml` setting as a fallback (task 6). Task 8 is the probe.

---

## Sessions

- 2026-11-18 [huntermcgrew/prism-519-codex-budget] open: Intent — plan child 3 (Codex AGENTS.md budget) from the epic spec; Bounds — this plan folder only, commit and push, no PR, no code; Approach — measure the real byte layout, order inside `renderTier1Block`, one line-based TOML writer shared by build and update, one doctor check · close: scope held
- 2026-11-18 [huntermcgrew/prism-519-codex-budget] open: Intent — build tasks 1–7 of this plan; Bounds — the plan's files only, no dependency, task 8 (live Codex run) skipped because Codex is not installed here; Approach — one commit per task, generated outputs rebuilt in tasks 3 and 7 · close: scope held
- 2026-11-18 [huntermcgrew/prism-519-codex-budget] open: Intent — fix the three Minor self-review findings plus the merge-signature cleaner path; Bounds — doctor gate and test, compatibility.md, budget-test JSDoc, `mergeProjectDocMaxBytes`, this plan · close: scope held
- 2026-11-18 [huntermcgrew/prism-519-codex-budget] open: Intent — fix the PR #521 review findings (one Major, two Minor) and the review's extra observations; Bounds — the doc-limit code and tests, the three docs naming the fit claim, the canonical install-layout bullet, this plan; Approach — reword the claim, extend doctor, then record the plan amendments in a separate commit · close: scope held
- 2026-11-18 [huntermcgrew/prism-519-codex-budget] open: Intent — fix the three threads from the second PR #521 review and the stale PR body; Bounds — the codex-project-doc and doctor code and tests, the write-condition sentence in three docs, this plan; Approach — one limit-in-force helper for both checks, a skip-and-warn merge guard, code and docs in one commit, plan record in another · close: scope held

---

## History

- 2026-11-18 [huntermcgrew/prism-519-codex-budget]: Plan created from the epic spec at `origin/huntermcgrew/prism-499-approve-once`. It has eight tasks, all Clove's, and one carried OPEN; the AC was not synced to #519 in this run.
- 2026-11-18 [huntermcgrew/prism-519-codex-budget]: Built tasks 1–7: lead-first block order, the `.codex/config.toml` limit sync in build and `prism update`, the budget test, the doctor check, and the docs. Task 8 was not run, so the OPEN Decision stays on its default path; the lead sections end at byte 30,549 of 32,768 on this branch.
- 2026-11-18 [huntermcgrew/prism-519-codex-budget]: Fixed the three Minor self-review findings in 0b142e12: doctor's codex-doc-limit check runs only for an adopted repo, compatibility.md lists `.codex/config.toml`, and the budget-test JSDoc no longer names child 5's block. `mergeProjectDocMaxBytes` now takes the already-read setting, so the config is parsed once.
- 2026-11-18 [huntermcgrew/prism-519-codex-budget]: Fixed the PR #521 review findings in 29d3f79b: the lead-rule fit claim is reworded in three docs and doctor now notes when the lead rules are cut, the TOML header test no longer trips on array elements, and an `AGENTS.md` inside 32 KiB gets no config. Amended Tasks 2, 4, 5, 6, and 7 to match the code.
- 2026-11-18 [huntermcgrew/prism-519-codex-budget]: Fixed the second PR #521 review in 0d932c59: doctor and the sync share a limit-in-force helper, the merge skips with a warning when a limit line hides from the top-level reader, and three docs state the write condition. Amended Tasks 2, 5, 6, and 7.

---

## Debugged Issues

---

## Review Issues

### Doctor's codex-doc-limit check prescribes `prism update` on a never-adopted repo

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:1404`
- **Problem:** `checkCodexDocLimit` runs before the repo is adopted. A never-adopted repo whose own `AGENTS.md` is over 32 KiB gets a warning that says to run `prism update`, but the right command there is `prism adopt`. `install-layout.md` (the `runDoctor` call-site gate paragraph) warns against exactly this. It is Minor because the finding is a warning, `healthy` stays true, and it only fires on a pre-adopt repo with a large AGENTS.md.
- **Suggested fix:** wrap the call in the same `syncResult.syncState.manifest !== null` gate that `checkSeedDelivery` uses, and add a no-manifest test.
- **Fixed in:** 0b142e12 — `runDoctor` gates `checkCodexDocLimit` on `syncResult.syncState.manifest !== null`, and a no-manifest test covers it.

### compatibility.md's per-tool ownership list omits `.codex/config.toml`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/docs/compatibility.md:42`
- **Problem:** `install-layout.md` now lists `.codex/config.toml` as committed, and it cites compatibility.md § Per-Tool Directory Ownership as the source of that contract. That section's `.codex/` bullet does not mention the file, so the source and its summary disagree. It is Minor because only the docs disagree. Behavior is unaffected.
- **Suggested fix:** add `config.toml` (PRISM sets only `project_doc_max_bytes`) to the tracked list in that bullet.
- **Fixed in:** 0b142e12 — the `.codex/` bullet in compatibility.md now lists `config.toml`.

### Budget test JSDoc names a workflow block that does not exist

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/agents-md-budget.test.ts:7`
- **Problem:** The JSDoc says "The workflow block added to the same list must fit too", but `AGENTS_MD_LEAD_RULES` has no workflow block. A reader coming to this cold cannot resolve the reference, because it describes child 5's future work. It is Minor because only the comment is affected.
- **Suggested fix:** cut the clause so the sentence reads "Growing the list means shortening a lead rule or moving one out."
- **Fixed in:** 0b142e12 — the JSDoc clause is cut.

### The lead rules are promised to fit the default window in a consumer's file

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/consumer-sync-flow.md:69`
- **Problem:** the sentence says the lead rules "fit in that default window even where the limit is never raised". That holds for PRISM's own `AGENTS.md`, which has about 3 KB above the block, not for a consumer with more above it. The same sentence is in the install twin and in `docs/adopting-into-existing-repos.md`.
- **Suggested fix:** narrow the claim to what holds, or make doctor measure the consumer's file.
- **Fixed in:** 29d3f79b — the claim is reworded in all three docs, and `checkCodexDocLimit` runs `measureLeadSectionEnds` on the consumer's `AGENTS.md` and adds the lead-rule sentence when the limit in force ends before them. Four doctor tests cover it.

### The dry-run comment bounds a gap that has no bound

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:595`
- **Problem:** the comment says the dry-run size differs from a real run by at most one 64 KiB step. A consumer file with an empty marker pair grows by more than 100 KB on refresh, so the preview can say `no-op` where the real run overwrites. The plan repeated the bound.
- **Suggested fix:** drop the bound.
- **Fixed in:** 29d3f79b — the comment and Task 5 no longer state a bound.

### `## Implementation Tasks` contradicts the diff in three places

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-519/plan.md:80`
- **Problem:** Task 2 showed the old `mergeProjectDocMaxBytes(toml, value)` signature, Task 4 said the budget-test JSDoc names child 5's block, and Task 6 wired the doctor check without the manifest gate.
- **Suggested fix:** update the three task bullets.
- **Fixed in:** the plan-record commit after 29d3f79b — Tasks 2, 4, and 6 are marked amended and match the code. Tasks 5 and 7 are amended too, for this round's other changes.

### The TOML top-level scan treats any line starting with `[` as a table header

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/codex-project-doc.ts:25`
- **Problem:** an element of a multi-line array, such as `[1, 2],`, ended the top-level region. A `project_doc_max_bytes` below it read as `absent`, and the merge would prepend a second key and make the TOML invalid.
- **Suggested fix:** match only real header lines.
- **Fixed in:** 29d3f79b — `TABLE_HEADER` matches `[a.b]` and `[[a.b]]` lines only. A header-shaped line inside a multi-line string still ends the region; a parser would be needed to tell it apart.

### No test pins the small-file update case, and the update test's title implies a threshold

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.test.ts:755`
- **Problem:** `runUpdate` wrote `.codex/config.toml` for any Codex repo with an `AGENTS.md`, while the test title said "over 32 KiB".
- **Suggested fix:** skip the write inside the default window and pin it with a test.
- **Fixed in:** 29d3f79b — `syncCodexProjectDocLimit` returns `null` for an `AGENTS.md` of 32 KiB or less with no config. The existing test's title is now accurate, so it was kept, and a new `runUpdate` test pins the small-file case.

### The canonical install-layout bullet omits PRISM's own build

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:68`
- **Problem:** the bullet says PRISM sets the key "through `prism update`". PRISM's own build also writes it, and `prism:check` fails on a stale value, which a maintainer would not expect from that bullet.
- **Suggested fix:** say so in the bullet.
- **Fixed in:** 29d3f79b.

### The consumer-sync-flow paragraph says `prism update` writes the config whenever `AGENTS.md` exists

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/consumer-sync-flow.md:69`
- **Problem:** the opening predicate, "when Codex is in `hosts` and `AGENTS.md` exists", is false since 29d3f79b, which writes nothing for a file inside the default window with no config. The same predicate was in the curated twin and in Task 7's first bullet.
- **Suggested fix:** state the exception in all three and rebuild.
- **Fixed in:** 0d932c59 — the canonical doc and its twin say "over the limit in force (32 KiB until the config sets one), or a `.codex/config.toml` already exists", and the guide's sentence matches. Task 7 carries the same wording, and the platform copies are rebuilt.

### Doctor's early return compares against the default window, not the limit in force

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:1065`
- **Problem:** a configured `project_doc_max_bytes` below 32 KiB with a file between that value and 32 KiB cut the lead rules, and doctor returned `[]`, while three docs said it warns when the limit in force ends before them.
- **Suggested fix:** read the setting before the early return and compare against the limit in force.
- **Fixed in:** 0d932c59 — `checkCodexDocLimit` reads the config first and returns `[]` only when `size <= Math.min(32768, limit in force)`. The suggested `size <= limit in force` alone would also silence a file past 32 KiB covered by a larger configured limit, which loses the `info` row AC-6 requires, so the default stays in the `min`. Two tests cover a 16384 limit with a file inside and outside it.

### A lone-value array element still reads as a table header in the TOML top-level scan

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/codex-project-doc.ts:27`
- **Problem:** `[3]`, `["b"]`, and `[[1]]` closing a multi-line array match `TABLE_HEADER`, so a key below them reads `absent` and the merge prepends a duplicate key, which is invalid TOML.
- **Suggested fix:** on `absent`, skip with a warning when any line matches the limit-line pattern.
- **Fixed in:** 0d932c59 — `syncCodexProjectDocLimit` skips and warns in that case, the `topLevelLines` JSDoc names the lone-value shape, and a test pins the reviewer's `[3]` repro. A key under a real table now gets the same skip and warning instead of a prepended top-level key; the Decision below records the cost.

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

- [x] No critical or major issues (the three Minors are fixed)
- [x] Types correct — no `any`, no unsafe `as` (`prism:check-types` clean)
- [x] No stray console.logs or debug artifacts (the build's size line and the update/build warnings are intended output)
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-11-18 (`pnpm prism:check` exit 0: 993 tests, 0 failed; size line reports lead sections ending at byte 30,549 of 32,768)
- [x] PR description up to date, and it lists the OPEN Decision
- [ ] Lasting decisions promoted to architect context (if applicable)
- [ ] `> Retro:` line recorded at close

**Last updated:** 2026-11-18
