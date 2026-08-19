# Plan: opus5-port

## Ticket

Unfiled — no tracker ticket, port authored by Winston under a Sol fleet dispatch, 2026-08-13. Source material: `.prism/research/opus5-port-evidence.md` (thrive PRs #2240–2326, the `~/Documents/portable-skills` slimming doctrine, thrive's live hook system) — dispatch-session research, deliberately kept untracked and out of every commit on this stack per the run's own instructions, so this citation names the file for the working tree that produced this plan rather than pointing a fresh clone anywhere. Supersedes [`.prism/plans/thrive-port.md`](./thrive-port.md), whose PR A is open as [#449](https://github.com/HunterMcGrew/PRISM/pull/449) and whose PRs B–H were never started.

## Goal

Retune PRISM for Opus-5-class instruction-following, and make the hook layer reach consumers at all: condition-gate the always-on rule layer (shipped), convert the hook runtime to zero-dependency `.mjs` and stack the write gate behind the credit channel and the writing guides it depends on, and slim the 31-skill roster onto a shared core.

---

## PR map

| PR | Branch | Theme | Tasks | Stacks on |
| --- | --- | --- | --- | --- |
| **PR 1** | `huntermcgrew/thrive-port-opus5-rule-amendments` (#449) | Rules retune | 1–9 | merged as `ccbef3d0` |
| **PR 0** | dispatched separately | Consumer delivery fixes — `manifest.json` and `SPEC.md` actually reach consumers | — | `origin/main` |
| **PR 2A** | `huntermcgrew/opus5-port-hook-runtime` | Hook runtime → zero-dependency `.mjs`, registered and delivered; announce-once | A1–A8 | PR 0 |
| **PR 2B** | `huntermcgrew/opus5-port-credit-channel` | Credit channel: Bash reads, `Grep`, full-read-only credit; subagent probe | B1–B4 | PR 2A |
| **PR 2C** | `huntermcgrew/opus5-port-writing-guides` | Writing guides, stub deny routes, doc splits, `SPEC.md` genericizing | C1–C8 | PR 2A |
| **PR 2D** | `huntermcgrew/opus5-port-deny-gate` | The write gate, `PostCompact` reset, ADR-0072, full suite | D1–D9 | PR 2B **and** PR 2C |
| **PR 2E** | `huntermcgrew/opus5-port-doctor-shipsurface` | `prism doctor` route integrity, ship-surface closure | E1–E5 | PR 2C |
| **PR 3** | `huntermcgrew/opus5-port-roster-slim` | Shared core + roster slimming | 20–29 | PR 2E |

Sequencing is forced, not stylistic — see § Cross-PR collisions. Two orderings inside the 2-stack are safety constraints rather than review preferences: **2B before 2D**, because a deny whose remedy the agent cannot perform through its default reading tool is an unsatisfiable gate; and **2C before 2D**, because the deny's remedy is reading documents that do not exist yet.

The original PR 2 (tasks 10–19) is retired wholesale and replaced by A1–E5. Nothing from it shipped — the branch never started, and #457 is a superseded draft — so the replacement drops no landed work. PR 3's tasks 20–29 are unchanged; only its base moves.

---

## Decisions

- **PR 1 lands on #449's existing branch; it is not superseded by a fresh PR.**
  - **Root cause of the question:** #449 is `CONFLICTING` against `main` and has been open since 2026-07-30, which reads like a stalled branch worth abandoning.
  - **Evidence:** `git merge-tree --write-tree origin/main origin/huntermcgrew/thrive-port-opus5-rule-amendments` reports exactly two conflicts — `.prism/lessons.md` (append-order) and `.prism/plans/thrive-port.md` (add/add, because main acquired its own copy via `huntermcgrew/context-delivery-mechanism`). **None of the three rule bodies conflict.** The branch is 4 ahead / 8 behind.
  - **Alternatives considered:** close #449 and re-author the three amendments in a new PR; cherry-pick the three rule commits onto a fresh branch.
  - **Chosen approach:** rebase-or-merge #449 onto `origin/main`, resolve the two mechanical conflicts, and add PR 1's remaining work as further commits on the same branch. Re-authoring throws away two rounds of Eric review fixes (four findings pass 1, two pass 2, all recorded in `thrive-port.md § Review Issues`) and would re-litigate language a human already ruled on.
  - **Implementation guidance:** `.prism/lessons.md` is append-only — take both sides. `.prism/plans/thrive-port.md` — take `origin/main`'s copy wholesale; see the stash Decision below for why the branch copy carries nothing unique.
  - **→ promotion verdict pending close.**

- **`stash@{0}` is stale and carries nothing that is not already on `main` — drop it, do not apply it.**
  - **Evidence:** `git stash show -p stash@{0}` is a single-line `## History` append to `.prism/plans/thrive-port.md` (the 2026-08-01 thrive-PR-inventory entry). `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returns `1` — the line is already on `main`.
  - **Chosen approach:** `git stash drop stash@{0}` as part of task 1, after the grep above is re-run and returns `1`. The prior session's note that "whatever else `stash@{0}` carries may still belong on the branch" (`thrive-port.md § Decisions`, provenance entry) is now answered: it carries nothing else.
  - **→ promotion verdict pending close.**

- **The `git stash drop stash@{0}` this plan calls for was deliberately not executed — reversed by Sol's explicit instruction during PR 1 implementation, not by the implementer's judgment.** The redundancy precondition above still holds — `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returned `1` when Clove ran it (task 1) and again when Briar re-verified it in self-review — so nothing about the "safe to drop" analysis changed. What changed is who owns the drop: the stash is operator data, dropping a stash is irreversible, and no operator was available mid-dispatch to confirm the drop in the moment. Sol's dispatch instructions for this session named the drop as the one step to skip and report on instead.
  - **Current state:** `stash@{0}` is still present on `huntermcgrew/thrive-port-opus5-rule-amendments` as of this Decision. The operator (Hunter) can drop it at will — the precondition that makes it safe to drop has been verified twice and holds.
  - **→ no promotion needed (session-scoped operational note; the underlying redundancy Decision above is what would promote, not this reversal).**

- **The authoring-route deny is scoped to authoring paths only; `code` routes stay nag-only on every verb.** This reverses the recommendation in [ADR-0071](../spec/adrs/_toolkit/0071-architect-context-read-hook.md) (design 2, "a `PreToolUse` gate on `Edit` … adds friction and false positives") and contradicts the live line in `.ai-skills/skills/prism-conductor/shared.md:106`. Both are corrected in PR 2, by ADR and by edit respectively — a carve-out that leaves the tree contradicting itself is worse than no carve-out.
  - **Root cause the carve-out addresses:** architect-context routing is diff-blind (ADR-0071 § Context). The nag names the doc; nothing makes reading it a precondition of the edit. On instruction-layer files — rules, ADRs, skill bodies — an edit made without the governing doc does not merely produce worse code, it produces *wrong spec that later readers execute*.
  - **Why this is not the reverted floor:** ADR-0067's gate sat on the `Stop`/`SubagentStop` report-back channel, so a blocked persona spent its final turns fighting its own gate and one dogfooding agent tried to edit the gate's code. This gate sits on a mid-work `Write`/`Edit` call, is cleared by reading a document, and never touches the report-back turn. [ADR-0069](../spec/adrs/_toolkit/0069-deterministic-verification-is-a-pipeline-stage.md)'s permanent rejection is explicitly scoped — "no gate, of any shape, sits on the turn where a persona reports back to Sol" — and this gate does not. `epic-floor-revert.md § Decisions` ("No hooks survive") left the door open in the same breath: *"If a lightweight `ownership-guard`-only safety is wanted later (write-lane protection without verdict ratification), that is a separate, smaller opt-in — not this revert."*
  - **Alternatives considered:** deny on all routes including code (rejected — a code deny is the friction ADR-0071 named, on a surface where a missed doc costs a review comment, not a wrong rule); keep nag-only everywhere (rejected — the status quo, and the operator has approved the scoped deny); a prose rule instead of a hook (rejected — `context-reuse.md § Architect-context routing is diff-blind` already *is* that prose rule and the gap persisted).
  - **Implementation guidance:** the deny is task 12; the ADR is task 17; the conductor-line edit is task 17. All three ship in PR 2 or PR 2 is incoherent.
  - **→ promotion verdict pending close (promotes to the new ADR).**

- **The shared core lives at `.prism/references/skill-core.md`, not at `.ai-skills/skills/_shared/core.md`.**
  - **Root cause:** portable-skills' `_shared/core.md` sits beside the skills because that roster's skills *are* the install surface. PRISM's are not — `generatePlatformSkills` (`scripts/ai-skills/generate-skills.ts:542-600`) iterates the roster from `.ai-skills/definitions/roles.json` and writes `<targetRoot>/<skillId>/SKILL.md`. A `_shared/` sibling would need a roster exclusion, a copy pass, a `seed-curation.json` classification, an eject-cleanup exemption (eject removes `prism-*` prefixed dirs; `_shared` is not one), and a `package.json#files` entry.
  - **Evidence for the alternative:** `.prism/references/**` already ships (`package.json#files`), already gets a platform copy on every build, and is already the citation shape 31 skill bodies use — 25 cite `context-reuse.md`, 18 cite `references/session-close.md`, 31 cite `session-orientation.md`. `session-close.md` is a partial shared core today; this names the seam and finishes it.
  - **Alternatives considered:** `_shared/` under `.ai-skills/skills/` (rejected above); a build-time partial inline (rejected — `build.ts` has no include mechanism, and inlining reintroduces per-persona copies that fork, which is the exact failure portable-skills' single-shape-owner rule exists to stop).
  - **Chosen approach:** one file, `.prism/references/skill-core.md`, read at Step 0 by every persona before greeting. Quote a fragment, never restate it. A persona that overrides a core section writes a one-line stub under the core's heading name.
  - **→ promotion verdict pending close.**

- **PR 1 removes `session-orientation.md § Lifecycle List` and retargets `response-shape.md`'s state-line trigger, because PR 3 deletes the marker both rules key on.** `response-shape.md:65` reads: *"it fires only when the current run has ordered phases, the same marker `session-orientation.md` § Lifecycle List uses: a skill carries a `## The run, in order` list."* PR 3 deletes all 22 of those headings. Shipping PR 3 first leaves two always-on rules pointing at a marker that exists nowhere — the removal-completeness failure `code-standards.md` names, in its behavior-changed-without-a-token variant. PR 1 owns both rule edits; PR 3 owns the skill-body deletions.
  - **→ promotion verdict pending close.**

- **DoD blocks lose the checklist, keep real criteria — this is Rule 2 applied, not a reversal of the floor-revert.** `epic-floor-revert.md § Decisions` (Shape 2 and its Class A variant) deliberately preserved each skill's `## Definition of Done` because the gate-enforced `types`/`lint`/`tests` criteria were Clove's genuine DoD, merely enforced by the gate. Evidence Rule 2 `[Anthropic]` says explicit verification instructions cause over-verification on Opus 5. These reconcile on one deletion test, already approved as `thrive-port.md` task 4: **does this item tell the model something its defaults or an already-cited always-on rule do not?** Items restating a battery, "types pass", "no stray console.logs", or "full diff read" go. Items carrying skill-specific policy — "No implementation code written", "AC synced to tracker", Clove's build gate — stay. The heading survives wherever real criteria remain, so no acceptance criterion asserts a heading count of zero.
  - **→ promotion verdict pending close.**

- **The `.mjs` runtime owns `compileMatcher`. No tsconfig edit — the premise the old Decision rested on is measured false.** The prior version of this Decision said root `moduleResolution: "node"` "cannot resolve a `.mjs` specifier or a `.d.mts` sidecar" and prescribed adding `"moduleResolution": "bundler"` to `scripts/ai-skills/tsconfig.json`, with a duplicate-matcher fallback.
  - **Root cause of the correction:** the claim was reasoned, not measured. Clove built a probe replicating this repo's tsconfig chain on tsc 5.9.3: `node` + `.d.mts` sidecar **passes**, `bundler` + sidecar **passes**, and both fail identically with TS7016 only when the sidecar is removed. The sidecar is what makes it resolve; the resolution mode is not the variable.
  - **Chosen approach:** move `compileMatcher` into `scripts/ai-skills/hooks/lib/match.mjs`, ship `match.d.mts` beside it, and import it from `verify-manifest-coverage.ts` unchanged. Do not touch `scripts/ai-skills/tsconfig.json`.
  - **Implementation guidance:** the duplicate-matcher fallback is deleted, not kept in reserve — it guards a failure that cannot occur, and a recorded fallback for an impossible failure is an invitation to take it on the first unrelated red build. AC-13 loses its two-path branch for the same reason.
  - **→ promotion verdict pending close.**

- **Consumers receive the hook as a copied file in their own repo, not as a `node_modules` path.** ADR-0071 named the unblock condition as *"once `scripts/ai-skills/hooks/` ships in `files` and that seed is updated to match"* — but a registration pointing into `node_modules/@huntermcgrew/prism/...` reintroduces the dependency the `.mjs` conversion exists to remove (an `npx`-installed consumer may have no such tree). Instead `prism:adopt`/`prism:update` copy the runtime into the consumer's `.claude/hooks/`, and the seeded `settings.json` invokes `node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude`. `files` still gains `scripts/ai-skills/hooks/` because the copy source must be in the tarball, and `RUNTIME_READ_PATHS` gains it because `verify-pack-parity.ts` is the gate that catches an omitted `files` entry (the 0.7.1 `config.schema.json` failure).
  - **→ promotion verdict pending close.**

- **PR 2 stacks on PR 1 rather than reconciling #457 by merge.** #457 is an open draft that refactors the same three files into a `--tool=` dispatcher with a `HARNESSES` table, adds `.cursor/hooks.json`, and hardens `verify-manifest-coverage.ts` against brace globs. Its harness-table *shape* is what evidence § 8 prescribes and PR 2 needs; its *substrate* is TypeScript-via-`tsx`, which is the delivery blocker. Rebuilding the table from scratch in `.mjs` discards a reviewed design; merging #457 first and then rewriting every file it added produces two review passes over the same lines.
  - **Chosen approach:** PR 2 branches from PR 1 and ports #457's `HarnessSpec`/`HARNESSES`/`resolveToolKind`/`extractPatchFilePaths`/foreign-payload-guard design into `.mjs`, citing #457 as the design source in the PR body. #457 is then closed as superseded, not merged — its ADR-0071 link sweep and its `verify-manifest-coverage.ts` brace-glob rejection are carried forward as task 9's explicit sub-items so nothing in it is lost.
  - **Alternatives considered:** merge #457, then convert (rejected — double review of the same lines, and `main` briefly carries a TS runtime the next PR deletes); ship PR 2 without the harness table (rejected — evidence invariant 6 makes the table the only place harness-specific field names may live).
  - **→ promotion verdict pending close.**

- **`thrive-port.md` is superseded by this plan, and its unbuilt tasks that do not fit these three PRs are re-homed here as a named deferred set** (§ Deferred — not in this stack). Leaving a second plan open with five unstarted PRs is the stalled-plan shape this dispatch exists to clear.
  - **→ promotion verdict pending close.**

- **OPEN — TBD, needs Hunter input.** Whether the closing battery in `.prism/rules/session-orientation.md` should scale with task size the way the opening battery now does. Carried forward unresolved from `thrive-port.md § Decisions` (Eric PR #449 pass-2: `close:` carries one verdict token where `open:` has three answer slots, so a collapsed closing shape needs its own definition, not an implied mirror). **Default path (used until resolved):** the closing battery keeps its unconditional four-question form; PR 3 collapses only the per-skill *restatement*, never the rule.

- **OPEN — TBD, needs Hunter input.** Whether prompt-time persona routing (thrive #2275) is worth porting. Evidence § 1 measures it as the difference between an 8–9-file relevant run and a 3-file run that shipped an invisible fix, and PRISM's `skill-routing.md` is the same buried-table shape the hook was written to replace. **Default path (used until resolved):** not in this stack. It is a fourth PR on the same hook runtime PR 2 builds, and stacking it here would make PR 2 unreviewable.

- **Canonical-surface discipline (inherited from `thrive-port.md`, unchanged):** every rule edit lands in `.prism/rules/`; `.claude/rules/`, `.codex/rules/`, `.cursor/rules/`, and `templates/install/.prism/rules/` are build-managed mirrors regenerated by `pnpm prism:build`. Every skill edit lands in `.ai-skills/skills/<id>/shared.md`. Editing a mirror is the failure mode. Every task below names source paths only. **Two named exceptions**, both hand-maintained: `AGENTS.md`'s `## Behavioral norms` pointer table (the generated rule-body block below it *is* regenerated by `agents-md-block.ts`), and the two `curated` seed twins this stack touches — `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` and `templates/install/.prism/references/architect/plan-mode.md`, which `checkSeedDrift` only checks for *existence*, never content.
  - **→ promotion verdict pending close.**

- **Task 5's `AGENTS.md § Behavioral norms` instruction says "delete row 8 and renumber the rows below it" — implemented as delete-and-leave-the-gap instead, across both places the number appears.** The table's own header sentence states the numbers are "kept so existing `AGENTS.md §N` cross-references still resolve," and the table already carries a live precedent for this: §7 and §9 are both missing from the compact table (a prior removal left the gap rather than renumbering), and `core-principles` sits at an unnumbered `—` row rather than claiming either slot. The removal-completeness sweep (`code-standards.md § Removal and rename completeness`) surfaced a second, un-named-by-the-task structure sharing the same number space: `AGENTS.md` also carries a full `## N. Title` heading list (lines ~1760–1814, after the generated Tier-1 block) that the compact table indexes — §7 (Project Engineering Standards) and §9 (Ownership & Handoff) exist there with real content, which is *why* the compact table skips them (their target isn't a single `.prism/rules/*.md` file, so the table's `Rule` column has nothing to point at). This confirms the numbers are a single shared space across both structures, not two independent ones.
  - **Chosen approach:** deleted §8's content in both places and left the numbering gap (`6 → — → 10 → 11 → 12` in the table; `7 → 9` in the heading list), matching the §7/§9 precedent. `AGENTS.md § 8` was the one live citation of the retired section (in ADR-0006, which this same task flips to deprecated with a superseding note). Two ADRs *do* cite §11 and §12 by number as "live specification" — `0007-cross-agent-handoff-accountability.md:33` and `0008-pre-compaction-checkpoint.md:35` — and renumbering either would have broken both; their existence is the strongest argument for leaving the gap rather than the absence this Decision originally claimed (Eric, PR #449 pass 3).
  - **Alternatives considered:** renumbering literally as instructed (rejected — contradicts the shared invariant stated one line above the table, on no evidence the invariant no longer holds).
  - **→ no promotion needed (implementation-tactical; the §7/§9 gap precedent already governs future removals from this number space).**

- **Deny scope is universal — every route denies; there is no per-route data and no manifest schema change.** Supersedes both the earlier `AUTHORING_PREFIXES` constant and the value-position `deny: true` discriminator drafted against it.
  - **Root cause of the question:** a hook constant listing `.prism/**` subpaths can never fire on consumer application code, so the gate would have shipped to PRISM's own repo only. The obvious repair — per-route opt-in data — turned the manifest into a schema-versioned surface PRISM has no way to migrate, because `.prism/architect/manifest.json` is consumer-owned and `applyFilePass` skips consumer-owned paths on every update.
  - **Alternatives considered:** value-position `{ docs, deny }` objects with a minor bump; a top-level `"deny"` section; a hard v2 migration with a major bump.
  - **Chosen approach:** deny is behavior, not data. The manifest stays flat — no flag, no sections, no schema change, no migration, no version bump. A route existing *is* the opt-in. What a consumer routes is what a consumer gets gated on; app code is unrouted until they author docs for it, so no route means no fire, by design.
  - **Implementation guidance:** the safety property that per-route data was carrying now has to come from validation. Reject catch-all patterns at validation time, and make the rejection **computable** rather than a hardcoded blacklist: reject any pattern `p` where `compileMatcher(p)("")` returns `true`. Verified against the live matcher — `"**"` and `"*"` both accept the empty string; `".prism/**"` does not. The stub's `"**"` route is deleted.
  - **→ promotion verdict pending close.**

- **Announce once, enforce at write. The nag is retired as an enforcement mechanism.**
  - **Root cause:** operator testing measured habituation at roughly six nags — after that the emission reads as boilerplate and stops changing behavior. Forced reading did change behavior.
  - **Chosen approach:** a read of a routed path names each unread doc exactly once per session and never repeats it. Enforcement is the write-time deny alone. There is no fallback nag arm for hosts without `PreToolUse` deny, because there are none in scope: Claude, Cursor, and Codex all support it. Thrive's "Codex has no `PreToolUse`" was a registration choice in thrive's tree, not a platform limit — verified against Codex's hooks documentation.
  - **Implementation guidance:** the dedup state gains an `announced` array alongside `read`. `announced` suppresses repeat emission; `read` is the only thing that clears a deny.
  - **→ promotion verdict pending close.**

- **The compaction reset fires on `PostCompact`, not `PreCompact`, and no-session-id is a no-op.**
  - **Root cause:** `PreCompact` fires before the context is dropped, so state deleted there can be re-credited by the tail of the pre-compaction conversation. `PostCompact` fires after, which is when "the model may no longer have read this" becomes true.
  - **Chosen approach:** `PostCompact`, dispatched through the same `--tool=` entry point as every other arm so it stays portable across harnesses. With no session id in the payload: no-op, one stderr line, exit 0. The 12-hour age sweep the earlier draft carried is deleted — it was a second age constant for the same concern `STALE_STATE_FILE_AGE_MS` (24h, `architect-route.ts:270`) already owns, and under a deny gate it would re-deny an unrelated concurrent session.
  - **→ promotion verdict pending close.**

- **Decision guards are not built.** A mechanism that would gate edits deleting or overriding a plan's `## Decisions` entries fails the deletion test — the operator has never had a plan Decision deleted or overridden. No `ask` mechanism, no plan parser. If the need ever appears, a Decision worth protecting gets its own one-thing doc and a route; the existing mechanism already covers it with nothing new built.
  - **→ promotion verdict pending close.**

- **Dedup state stays in the repo. The `os.tmpdir()` move is reversed before it ships.**
  - **Root cause of the reversal:** a shared `/tmp` state file opens a symlink-write surface (CWE-377/59) and, worse under a deny gate, a state-poisoning bypass — anything that can write a predictable `/tmp` path can pre-credit docs and defeat the gate. The prune path is also hardcoded to `path.join(repoRoot, ".prism")` (`architect-route.ts:287`), so the earlier claim that pruning "works unchanged" under the move was false.
  - **Alternatives considered:** `os.tmpdir()` keyed on `hash(repoRoot) + sessionId`; a per-user directory under `os.homedir()`.
  - **Chosen approach:** state stays at `<repo>/.prism/architect-route-state.<session>.json`, and `prism adopt` appends the two ignore lines to the consumer's `.gitignore` so the files never dirty a consumer's working tree.
  - **Implementation guidance:** this reverses the documented "PRISM does not write your `.gitignore` for you" policy at `install-layout.md § Consumer overlay`. The reversal is deliberate and narrow — two lines, append-only, idempotent, guarded on the lines not already being present — and the doc is corrected in the same PR rather than left contradicting the code.
  - **→ promotion verdict pending close.**

- **Credit is full-read-only, and the deny message names the exact command that satisfies it.**
  - **Root cause:** credit keys on `tool_input.file_path` (`claude-post-read.ts:52`), which a Bash payload never carries, and `Grep` is unregistered. This repo's own active output style instructs agents to read with `cat`, `head`, and `sed -n`. Under a deny that combination is an unsatisfiable gate: read the doc via Bash, get no credit, retry the write, get denied again.
  - **Second root cause:** no `offset`/`limit` handling exists anywhere in `scripts/ai-skills/hooks/` — `extractArchitectDocPath` (`architect-route.ts:68-75`) inspects the path only, so `Read(limit=1)` credits a whole doc today.
  - **Chosen approach:** one rule covers both. **Credit lands only on a read with no range restriction.** For `Read`, that means `tool_input.offset` and `tool_input.limit` are both absent. For Bash, that means a bare `cat <path>` — `head`, `tail`, and `sed -n 'X,Yp'` extract the path for *announce* purposes but never credit. `Grep` is registered as `search`: it extracts paths, never credits.
  - **Implementation guidance:** this only works if the remedy is stated, not inferred, so the deny message names the literal command: ``read these in full first, then retry: `cat <path>` ``. That is a three-line predicate, not a heuristic, and it fails safe — an under-credited read costs one re-read, while an over-credited one silently defeats the gate. This closes the `Read(limit=1)` gap the earlier draft accepted; it was cheap once the Bash-credit rule forced the same question.
  - **→ promotion verdict pending close.**

- **The gate is friction, not a wall — ADR-0072 says so plainly rather than pretending otherwise.**
  - **Root cause of the question:** `.claude/settings.json`, `.claude/hooks/`, and `scripts/ai-skills/hooks/**` are unrouted, so the hook's registration, its source, and its delivered artifact are each editable ungated. Routing them was the obvious repair.
  - **Alternatives considered:** route and guide the hook's own surface.
  - **Chosen approach:** do not route it. In a consumer repo `.claude/settings.json` is the consumer's own file, and gating it means PRISM blocking a user's first edit to their own editor configuration — the same cold-start failure the universal-deny design already rejected. A gate whose own registration is unrouted is honest friction; a gate that blocks edits to the consumer's settings to protect itself is a wall that consumers will remove wholesale.
  - **Implementation guidance:** ADR-0072's `## Consequences` states the bypass in one sentence — deleting the registration, the hook file, or setting `PRISM_HOOK_DENY_DISABLE=1` each disables the gate, all three are trivial, and none is prevented. The compensating control is visibility, not prevention: `prism doctor` gains a hook-registration check, so a removed or unregistered hook becomes a reported finding rather than a silent absence.
  - **→ promotion verdict pending close.**

- **Subagent session-id semantics are unestablished and are probed before the deny arm is written, not after.**
  - **Root cause:** if a subagent shares its parent's session id, a child's read credits the parent and the gate is silently defeated. If it gets a distinct id, a child wedges against a deny whose remedy the parent already performed, invisibly. Both are real; nothing in this tree establishes which one Claude Code does.
  - **Chosen approach:** task B4 runs the probe against a live host and records the answer as a Decision. The design branches are pre-specified so the probe's outcome selects a branch rather than reopening the design — shared id means the deny arm keys on the id plus the transcript-visible agent identity where the harness exposes one, and the ADR names credit-leak as a known consequence; distinct id means the parent's `read` array is inherited by the child at first use, keyed on a parent-session field in the payload.
  - **Implementation guidance:** the probe is a `[HITL]` task — it needs a live session with a real subagent dispatch and cannot be synthesized from fixtures. Task D2 does not start until B4's Decision is recorded, and whichever branch is taken gets its own test leg.
  - **→ promotion verdict pending close.**

- **Writing guides, the stub's route targets, and `skills-ecosystem.md` split now rather than on touch.** File grain otherwise keys on load mechanism: always-on rules may group (`code-standards-js` stays one file), and routed docs split until the "and" test passes, on touch. These three are the exception because they are the deny's remedy documents — a forced read has to be cheap, and `skills-ecosystem.md` is 404 lines covering the roster, ticket types, workflows, plan-section ownership, AC format, handoffs, and two build-time output guards. Making someone read all of it to edit one skill file is the habituation failure in a new costume.
  - **→ promotion verdict pending close.**

- **The ship surface is four things plus dependency closure, enforced mechanically.** Skills (personas plus skill-forge), rules, writing guides, and the runtime (hooks, stub, doctor). Everything link-reachable from those ships; everything else — PRISM's own plans, self-dev ADRs, self-dev references — stays home. `SPEC.md` earns its place through closure: it is the tier-system meta-doc, cited by the shipped `code-standards.md` and routed by the stub's first key. Atlas's onboarding dependencies ride the same closure. Closure is computed and enforced in `pnpm prism:check`, not asserted in prose — an unenforced closure claim goes stale on the first new cross-reference.
  - **→ promotion verdict pending close.**

- **PR 2 splits into five stacked PRs (2A–2E) and its tasks are lettered, not renumbered.** The single PR 2 carried a runtime port, a delivery fix, a credit-channel widening, a documentation set, an enforcement gate, and two new validation surfaces. Reviewed as one diff it is unreviewable, and the ordering constraints between its parts are real safety constraints rather than preferences — the credit channel has to be in `main` before the deny is, or the remedy is unperformable.
  - **Alternatives considered:** renumbering tasks 10–29 continuously across the new stack.
  - **Chosen approach:** new tasks carry per-PR letter IDs (`A1`, `B2`, `C3`, …). Renumbering would move PR 3's tasks 20–29 and break every cross-reference already written against them, to buy nothing — the letters map one-to-one onto the stack cut lines, which is the thing a reader needs to navigate.
  - **Implementation guidance:** tasks 10–19 are retired wholesale and replaced by A1–E5. Nothing from 10–19 shipped — PR 2 never started, and #457 is a superseded draft — so no already-landed work is dropped by the replacement.
  - **→ promotion verdict pending close.**

- **PR 2A was built against a plan amendment that had not yet been committed anywhere; the amendment is landed on this branch, and every `A1`–`A8` citation in the branch's commits now resolves.** Clove's session read the split task list through an absolute path that resolved into the shared main checkout rather than this worktree, so the content it built to was correct but its provenance was unverifiable from the branch — the branch's own `opus5-port.md` still carried the unsplit `### PR 2` (tasks 10–19, deny bundled in). This entry replaces the `OPEN` Decision that recorded the problem; the commit carrying this entry is the resolution.
  - **Root cause:** the amendment was written into the main checkout's working tree and never committed, so no branch and no remote ref carried it when the implementation lane was dispatched.
  - **Alternatives considered:** landing the amendment on `main` ahead of the stack; confirming the old unsplit PR 2 as the shape that should have shipped.
  - **Chosen approach:** land the amendment on PR 2A's branch. Plans ride their PRs here and PR 0 did exactly this; 2B–2E branch from 2A's head and inherit the plan with the code it governs. A plan-only commit on `main` would be the extra chore PR that convention exists to avoid. Confirming the unsplit shape was rejected on the merits, not on sunk cost — the split's ordering constraints are safety constraints (credit before deny, guides before deny), and the unsplit PR 2 bundles a deny whose remedy no consumer could perform.
  - **Implementation guidance:** every `A1`–`A8` reference in `9fe03b74` and `8e160178`, commit bodies and source comments alike, resolves against `### PR 2A` as landed here. No implementation changed; only the plan's provenance did. Branch 2B from this branch's head rather than from `origin/main`, or the same gap reopens one PR later.
  - **→ no promotion needed (run-mechanics correction specific to this stack; the durable pattern is captured in `.prism/lessons.md`).**

---

## Cross-PR collisions

This is the reason the stack is planned as one unit rather than by parallel planners. Each row names the file, the colliding tasks, and the owner. PR 1 has merged; its column is kept because PR 3 still rebases around its edits.

| File | PR 1 touched | 2-stack touches | PR 3 touches | Owner / resolution |
| --- | --- | --- | --- | --- |
| `.prism/rules/session-orientation.md` | task 6 — delete § Lifecycle List | — | — | **PR 1 owned.** PR 3 deletes the markers this section mandated; the rule had to stop requiring them first. |
| `.prism/rules/response-shape.md` | task 6 — retarget the state-line trigger | — | — | **PR 1 owned.** Same forced order. |
| `.prism/rules/context-reuse.md` | task 5 — citation-list entry | D3 — the diff-blind clause gains a mechanical enforcer | — | **2D owns the new sentence.** Different section from PR 1's list line. |
| 11 × `.ai-skills/skills/*/shared.md` | task 5 — remove the handoff-check paragraph | — | tasks 19–23 — slim the same bodies | **PR 3 rebases on PR 1.** |
| `.ai-skills/skills/prism-conductor/shared.md` | — | D6 — § Enforcement | task 24 — new § Talking to the operator | **2D owns § Enforcement; PR 3 owns § Talking to the operator.** Neither crosses. |
| `scripts/ai-skills/verify-manifest-coverage.ts` | — | A2 — matcher import; A6 — catch-all and brace-glob rejection | — | **2A owns both.** No later PR in the stack touches it. |
| `.prism/architect/manifest.json` + `_toolkit/manifest.base.json` | task 5 — drop the retired rule's route key | A6 — delete any catch-all pattern; C5 — add the guide routes | — | **2A owns deletion, 2C owns addition.** Sequenced, not concurrent — 2C branches from 2A. |
| `templates/install/.prism/architect/manifest.stub.json` | — | A6 — delete the `**` route; C4 — rewrite routes onto the guides | — | **Same split, same sequence.** |
| `.claude/settings.json` + `templates/install/.claude/settings.json` | — | A5 — `PostToolUse` and `PostCompact`; D1 — `PreToolUse` | — | **2A owns the file's first correct form; 2D adds one event.** 2D rebases on 2A through 2C. |
| `scripts/ai-skills/hooks/hook.mjs` | — | A4 creates it; B1–B2 widen credit; D1/D3/D4 add arms | — | **Sequential by construction.** Each PR in the stack bases on the previous, so there is no concurrent edit. |
| `scripts/ai-skills/hook-gate.test.ts` | — | A7 creates it; B3, D7 extend it | — | **Append-only across the stack.** No PR rewrites another's cases. |
| `.prism/architect/_toolkit/skills-ecosystem.md` | task 5 — handoff-check sweep | C1 — split into four files | task 29 — document the shared core and the two new skills | **2C owns the split; PR 3 rebases onto the post-split file.** Reversing the order makes task 29 a conflict against a file that no longer holds the roster sections it edits. Its curated seed twin moves with it. |
| `.ai-skills/definitions/seed-curation.json` | — | C7 — classify the new files; E5 — trim to the closure | — | **2C classifies, 2E trims.** 2E branches from 2C, so the trim sees the classifications. |
| `.prism/architect/_toolkit/install-layout.md` + its seed twin | — | C6 — `.gitignore` policy correction and § Hook runtime; D9 — § Write gate | — | **2C then 2D**, different sections of the same doc. |
| `AGENTS.md` § Behavioral norms table | task 5 — delete row 8 (hand-authored) | — | — | **PR 1 owned.** |

**Order inside the 2-stack is forced by three rows and two safety constraints.** 2A → (2B ∥ 2C) → 2D, with 2E off 2C, then PR 3 off 2E. 2B before 2D because the deny's remedy has to be performable first; 2C before 2D because the remedy's documents have to exist first. 2B and 2C touch disjoint files and could land in either order — they are drawn as separate branches off 2A rather than a chain so a review round on one does not hold the other.

---

## Implementation Tasks

Tasks are grouped by PR, then by persona heading per ADR-0018. Tasks are numbered continuously across PRs so cross-references are unambiguous. Unless a task states otherwise, verification is `pnpm prism:build` (regenerates mirrors, runs `prism:test`) followed by `pnpm prism:check` (adds type-check, manifest verify, crossref lint, spec-scope lint, pack parity), both from the repo root, both expected green.

### PR 1 — Rules retune

#### Clove (implementation)

**1. Bring `#449` current and clear the stale stash.**
   - `git fetch origin && git checkout huntermcgrew/thrive-port-opus5-rule-amendments && git merge origin/main`. Merge, not rebase — the branch is pushed and reviewed (`git-conventions.md § Keeping a Branch Current`); the squash-already-upstream trap does not apply because #449 has not merged.
   - Resolve `.prism/lessons.md` by taking **both sides** — it is append-only and the two additions are independent.
   - Resolve `.prism/plans/thrive-port.md` by taking `origin/main`'s copy wholesale (`git checkout --theirs` during the merge, then verify).
   - Before dropping the stash, confirm it is redundant: `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` must print `1`. Then `git stash drop stash@{0}`. If it prints `0`, stop and report — the stash is not redundant and this Decision is wrong.
   - Retitle the PR to `chore: Retune the always-on rule layer for Opus-5`.
   - **Verify:** `git status -s` clean; `pnpm prism:build && pnpm prism:check` green.

**2. Add the delegation tiebreaker to `.prism/rules/subagent-strategy.md`.** #449 already removed *"when you're unsure whether to spend the compute, spend it."* This adds thrive #2259's inverse, which is missing. Append to `**How to apply:**`, after the existing "Don't spawn subagents to verify" bullet:

   > - When unsure whether work is delegation-shaped, do it yourself. An inline read that turns out to have been delegable costs one extra read; a dispatch that turns out not to have been costs a round trip and a report-back that may never arrive.

   **Why this text:** the motivating incident happened in this repo — an architect dispatch on this exact material fanned out to two research subagents, stalled twice, and returned malformed twice with no plan file written. Sequence: after task 1. **Verify:** build + check; `grep -c "do it yourself" .prism/rules/subagent-strategy.md` returns `1`.

**3. Condition-gate `.prism/rules/demand-elegance.md`.** Evidence § 1 names this rule by example as license phrasing — its `## Purpose` opens *"For non-trivial changes, pause and ask 'is there a more elegant way?'"*, which reads as a standing licence to reshape. Replace the `## Purpose` paragraph and the first two `**How to apply:**` bullets so the **firing condition leads**:

   > ## Purpose
   >
   > When a change has a design with tradeoffs — more than one shape would work, and the shapes differ in what they cost later — stop before presenting it and ask whether a cleaner solution exists. A mechanical edit does not get this pause.
   >
   > **Why:** the first working version of a change with real design choices is rarely the clean one, and once it is in the tree the hacky shape becomes the pattern the next change copies. Stating the firing condition first is what keeps the rule from reading as a standing licence to reshape unrelated code — thrive PR #2273 measured that framing costing 2 out-of-scope files per run on this model class, against 0 with no project config loaded.
   >
   > **How to apply:**
   >
   > - The test for whether this rule fires: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits do not.
   > - When the rule fires and the fix feels hacky, step back and ask what the clean solution is knowing everything you now know. When it does not fire, ship the obvious version.

   Keep the third bullet unchanged. **Do not** widen the rule's reach while rewriting it — the reframe is the whole change. **Verify:** build + check; the rendered `.claude/rules/demand-elegance.md` mirror matches byte-for-byte.

**4. Audit all 22 `load: always` rules for license phrasing.** The set is every `.prism/rules/*.md` whose frontmatter declares `load: always` — enumerate it, do not work from this plan's list: `for f in .prism/rules/*.md; do sed -n '1,6p' "$f" | grep -q '^load: always' && echo "$f"; done`. Baseline measured 2026-08-13: **22 files, 1,639 lines**. For each, apply one test:

   - **License phrasing** — the rule states an action the model may take, with the condition implied or trailing ("Refactor code you're already modifying…", "For any non-trivial task, enter plan mode first"). Rewrite so the **firing condition is the first clause**.
   - **Condition phrasing** — the rule already leads with when it fires. Leave it alone and record it as swept.

   Report per file as `swept` / `n/a — <reason>`, in the PR body, with a named unit (the rule file). Do not report a summary count without the per-file list — a bounded sweep that reports only a total hides which files were never reached. **Known candidates from a first read** (not the full audit — confirm each against the file): `code-standards.md § Refactor scope`, `plan-before-building.md`, `autonomous-bug-fixing.md`, `core-principles.md`, `self-improvement-loop.md`. **Explicitly out of scope:** `writing-voice.md`, `response-shape.md`, and `branch-plan.md` § Before Closing — all three were rewritten within the last three weeks (#455, #446) and re-touching them here mixes two review conversations. Sequence: after task 3, so `demand-elegance.md` is the worked example the sweep follows. **Verify:** build + check; the PR body carries the per-file table.

**5. Retire `.prism/rules/context-window-handoff-check.md`.** The Decision is already ratified in `thrive-port.md § Decisions` (2232) — a rule whose signals the model cannot measure mid-session produces either theater or silence, and the always-on context cost buys nothing this model class does not do natively. This is the removal; the sweep is the task. Exact sites, verified 2026-08-13 by `grep -rln "context-window-handoff-check\|Context Window Handoff Check" --include="*.md" --include="*.json" --include="*.ts" .`:

   - **Delete:** `.prism/rules/context-window-handoff-check.md`.
   - **Flip to deprecated:** `.prism/spec/adrs/_toolkit/0006-context-window-handoff-check.md` — set `Status: deprecated`, add a one-line superseding note pointing at this plan, and **preserve the three signals in the body** (thrive's ADR-0006 treatment). Do not delete the file.
   - **Manifest route keys:** remove the `".prism/rules/context-window-handoff-check.md"` key from both `.prism/architect/manifest.json` and `.prism/architect/_toolkit/manifest.base.json`.
   - **Hand-authored, not generated:** `AGENTS.md` § Behavioral norms — delete table row 8 and renumber the rows below it. The generated rule-body block further down the file regenerates via `agents-md-block.ts`; do not hand-edit it.
   - **Canonical prose:** `.prism/architect/_toolkit/skills-ecosystem.md`, `.prism/references/architect/plan-mode.md`.
   - **Curated seed twins — hand-edit, they do not regenerate:** `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` and `templates/install/.prism/references/architect/plan-mode.md`. Both are in `seed-curation.json`'s `curated` list, and `checkSeedDrift` only asserts they *exist*.
   - **Seed curation:** `.ai-skills/definitions/seed-curation.json` — the ADR is already in `excluded`; leave that entry (the ADR survives as deprecated). Add `rules/context-window-handoff-check.md` to `excluded` **only if** the seed-write pass would otherwise fail on a missing canonical source; run the build and let it tell you.
   - **11 skill bodies** (`.ai-skills/skills/<id>/shared.md`): `prism-architect`, `prism-changelog`, `prism-code-dev`, `prism-code-review-pr`, `prism-code-review-self`, `prism-debugger`, `prism-design`, `prism-documentation`, `prism-qa-test-plan`, `prism-ticket-start`, `prism-user-stories`. Each carries one sentence of the shape *"Before recommending the next persona, assess context load per AGENTS.md § Context Window Handoff Check."* — delete the sentence, keep the surrounding next-persona guidance.
   - **The remedy survives:** add to `.ai-skills/skills/prism-handoff/shared.md` — the active persona may suggest `/prism-handoff` on session length or self-observed drift, never on a counted proxy, and never auto-invoked.
   - **Everything under `.claude/`, `.codex/`, `.cursor/`, and non-curated `templates/install/`** regenerates. Do not hand-edit any of it.
   - **Verify:** `grep -rn "context-window-handoff-check\|Context Window Handoff Check" --include="*.md" --include="*.json" --include="*.ts" . | grep -v node_modules | grep -vE "^(\./)?\.prism/(plans|audits)/" | grep -vE "^(\./)?(\.claude|\.codex|\.cursor|\.prism)/spec/adrs/_toolkit/0006-" | grep -v "seed-curation.json"` returns nothing (widened from the task-5-era pattern per Eric PR #449 pass 3: the original only excluded the canonical ADR path, so its three generated platform mirrors and the `seed-curation.json` `excluded`-list entry always matched; re-verified against the live tree with the leading-`./` question settled by testing rather than assuming — this repo's `grep -r . ` does not prefix paths with `./`, so both anchored forms are covered). Plans and audits are historical record and are correctly excluded; the deprecated ADR is expected to name itself. Then build + check.

**6. Amend `session-orientation.md` and `response-shape.md` so PR 3 can delete the lifecycle markers.**
   - `.prism/rules/session-orientation.md` — delete the `## Lifecycle List` section entirely (currently at line 45). Its content — "every skill carries a short 'The run, in order' list near the top of its body" — is the mandate PR 3's task 19 removes 22 instances of.
   - `.prism/rules/response-shape.md:65` — the sentence *"it fires only when the current run has ordered phases, the same marker `session-orientation.md` § Lifecycle List uses: a skill carries a `## The run, in order` list"* now cites two things that will not exist. Replace with: *"it fires only when the current run has ordered phases the reader is tracking across replies — a multi-step implementation, a phased review. On a one-shot answer it is noise."* Also update the same file's `## Who runs this rule` paragraph, which repeats the marker citation.
   - **Why this is PR 1's and not PR 3's:** a rule pointing at a marker no skill carries is the changed-behavior variant of a dangling reference — no shared token makes it greppable, so nothing catches it later. Landing the rule change first means PR 3's deletion is a cleanup, not a breakage.
   - **Verify:** `grep -rn "The run, in order" .prism/rules/` returns nothing; `grep -rn "Lifecycle List" .prism/rules/ .prism/references/ .ai-skills/skills/` returns nothing; build + check.

**7. Fold `thrive-port.md` task 3's calibration forward unchanged.** #449 already shipped the opening-battery scaling clause and its two mechanics cross-references, and Eric's pass-2 finding reverted the closing-battery half. No new edit — this task exists so the implementer does not re-apply it. Confirm `.prism/rules/session-orientation.md` still carries the `## Purpose` scaling clause and that line 32's closing battery is unconditional, then move on. **Verify:** read-only.

**8. Mark `thrive-port.md` superseded.** Add under the title: `> Superseded: 2026-08-13 — folded into `.prism/plans/opus5-port.md`; PRs B–H re-homed there or deferred with dispositions.` Append a matching one-line `## History` entry. Do not delete the file (ADR-0047). **Verify:** content-only, no build impact; `pnpm prism:check` for crossref lint.

#### Eli (documentation)

**9. Sweep `docs/` for the retired rule in the same PR.** `grep -rn "context-window-handoff-check\|Context Window Handoff Check" docs/` — update each hit in PR 1, not as a follow-up. **Verify:** the grep returns nothing; `pnpm prism:check` green.

---

### PR 2A — Hook runtime → zero-dependency `.mjs`, registered and actually delivered

Branch `huntermcgrew/opus5-port-hook-runtime` from PR 0's head. Reconciles and supersedes open draft [#457](https://github.com/HunterMcGrew/PRISM/pull/457). **This PR ships no deny.** It converts the runtime, makes it reach consumers for the first time, and turns the nag into announce-once. Shipping it alone is already worth it: today's hook is a permanent silent no-op in every consumer repo.

#### Clove (implementation)

**A1. Port #457's harness table into a zero-dependency `.mjs` runtime.** Create `scripts/ai-skills/hooks/harnesses.mjs`. Port from #457 — read it with `gh pr diff 457 -- scripts/ai-skills/hooks/harnesses.ts`, do not re-derive it.
   - `HarnessSpec` with exactly five members: `toolKinds`, `sessionId`, `filePaths`, `emitNag`, `emitNone`. No name field — tool identity threads explicitly alongside it.
   - A `HARNESSES` table with `claude`, `cursor`, and `codex` rows. Harness-specific field names live **only** inside this table: `session_id` vs `conversation_id`, `hookSpecificOutput.additionalContext` vs `additional_context`, `permissionDecision` vs `permission`/`user_message`/`agent_message`.
   - `resolveToolKind` with the four-value vocabulary: `read`, `write`, `shell`, `search`. An unlisted tool name resolves to `write` — correct for announce purposes (fail toward more context). Task D1 adds the deny-side narrowing; do not add it here.
   - `extractPatchFilePaths` for Codex's `apply_patch` path recovery.
   - **Verify:** `node -e "import('./scripts/ai-skills/hooks/harnesses.mjs').then(m=>console.log(Object.keys(m.HARNESSES)))"` prints `[ 'claude', 'cursor', 'codex' ]`.

**A2. Convert the resolver to `.mjs` and give the matcher one owner. Do not touch any tsconfig.**
   - Rename `scripts/ai-skills/hooks/architect-route.ts` → `architect-route.mjs`, stripping types. Preserve verbatim: `MAX_EMISSION_BYTES = 8000`, `formatNag`'s `(+N more matched)` truncation and its never-emit-zero-docs exception, `toRepoRelativePath`, `findRepoRoot`'s upward walk, `filterDocsOnDisk`, `loadRouteState`'s treat-unrecognized-as-absent, `saveRouteState`'s tmp+rename atomic write, `pruneStaleRouteState`'s 24h sweep of both `.json` and orphaned `.json.tmp`, and `PRISM_HOOK_DISABLE=1`.
   - **The state file location does not change.** It stays `<repoRoot>/.prism/architect-route-state.<session>.json`, and `pruneStaleRouteState` keeps its hardcoded `path.join(repoRoot, ".prism")`. See the `## Decisions` entry reversing the `os.tmpdir()` move.
   - **Credit-on-read from #456 is preserved as it exists, not as previously described.** `resolveArchitectNag` step 1 credits a doc only when `filePath` is itself a doc under `.prism/architect/`, never on emission, and `extractArchitectDocPath` returns `null` for `manifest.json`. **There is no partial-read handling today** — `extractArchitectDocPath` (`architect-route.ts:68-75`) inspects the path only, so `Read(limit=1)` currently credits in full. Preserve the behavior that exists; task B2 adds the range check. Do not "preserve" a partial-read rule that was never written.
   - Move `compileMatcher` verbatim into `scripts/ai-skills/hooks/lib/match.mjs` as its only implementation. Add `scripts/ai-skills/hooks/lib/match.d.mts` declaring `export function compileMatcher(pattern: string): (filePath: string) => boolean;`. Change `scripts/ai-skills/verify-manifest-coverage.ts` to `import { compileMatcher } from "./hooks/lib/match.mjs"` and delete its own copy. **No tsconfig edit** — the sidecar is what makes this resolve, and root `moduleResolution: "node"` handles it on tsc 5.9.3 (measured; see `## Decisions`).
   - **Verify:** `pnpm prism:check-types` green; `pnpm prism:bundle && node dist/cli.js doctor --help` exits 0 (the matcher import reaches the published CLI through `ownership.ts`, so bundling is part of this task's verification, not an afterthought); `grep -hoE 'from "[^"]+"' scripts/ai-skills/hooks/*.mjs scripts/ai-skills/hooks/lib/*.mjs | grep -v 'node:' | grep -v '"\./'` returns nothing.

**A3. Port the 26 tests A2 orphans. Sequence: immediately after A2, in the same commit.**
   - `scripts/ai-skills/architect-route.test.ts` (429 lines, 20 tests) imports `./hooks/architect-route`. **Port it in place** — it is the AC-5 credit-on-read regression surface. An extensionless TypeScript specifier never resolves a `.mjs` file, so the import becomes `./hooks/architect-route.mjs` and resolves through `architect-route.d.mts`, which this task creates alongside the module (same pattern as `match.d.mts` in A2).
   - `scripts/ai-skills/claude-post-read.test.ts` (148 lines, 6 tests) imports `runAdapter` from the module A4 deletes. **Fold its six cases into `scripts/ai-skills/hook-gate.test.ts`** (created in A7) against `hook.mjs`'s `PostToolUse` arm, then delete the file.
   - **Verify:** `pnpm prism:test` green, and the total test count is at least the pre-change count — `pnpm prism:test 2>&1 | tail -3` reports no drop. A silently-lost test is the failure mode this verification exists to catch.

**A4. Write `scripts/ai-skills/hooks/hook.mjs` — the single entry point, dispatching on `--tool=`. Announce arm only.** Every safety check lives in the script, never in a registration matcher — a matcher-less harness silently inherits nothing.
   - **`PostToolUse` arm — announce once.** Resolve the unread doc set for the read path, emit the harness's nag envelope, write nothing when the resolver returns `null`. **Each doc is named at most once per session.** Add an `announced` array to the state file alongside `read`: a doc already in `announced` is excluded from the emission set, and every emitted doc is appended to `announced`. `read` is untouched by announcement — it is the only array that clears a deny in PR 2D.
   - Delete `scripts/ai-skills/hooks/claude-post-read.ts`; its `runAdapter` becomes this file's dispatch path.
   - **Fail open everywhere. No `process.exit()`** — it truncates pending stdout writes; set `process.exitCode` and return, as `claude-post-read.ts` already does and documents.
   - **Foreign-payload guard:** drop a Cursor event name arriving on the `claude` row. Port from #457.
   - **Verify:** `hook-gate.test.ts` announce cases — a first read emits, a second read of a path routing to the same doc emits nothing, and a doc that was announced but never read still blocks in PR 2D (asserted there, not here).

**A5. Register the hooks and make the runtime reach consumers. This task is the delivery blocker; the sub-items are not independent.**
   - `.claude/settings.json` — replace the `tsx`/`node_modules` invocation with two registrations invoking `node`: `PostToolUse` matched `Read|Grep|Bash`, and `PostCompact`. Command form: `node "$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/hook.mjs" --tool=claude`, with `--event=PostCompact` added on the `PostCompact` registration so a compaction does not run the `PostToolUse` arm. The `PreToolUse` registration lands in D1, not here.
   - `templates/install/.claude/settings.json` — currently `{}`, and **currently reaches no consumer**. Ship the same registrations pointed at `node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude`, *and* make the file actually reach a consumer per the next sub-item.
   - `scripts/ai-skills/update.ts` — in `runUpdate`, copy `scripts/ai-skills/hooks/**` from the package root into the consumer's `.claude/hooks/` and `chmod 755` the entry points, then **merge** the registration block into the consumer's `.claude/settings.json` — never overwrite it. Both `prism:adopt` (via `runUpdate`) and `prism:update` inherit this from the one seam. If `templates/install/.claude/settings.json` becomes the merge source, add `templates/install/.claude` to `RUNTIME_READ_PATHS` in `scripts/ai-skills/verify-pack-parity.ts`.
   - **Append the two state-file ignore lines to the consumer's `.gitignore`** in the same seam: `.prism/architect-route-state.*.json` and `.prism/architect-route-state.*.json.tmp`. Append-only, idempotent (skip lines already present), create the file if absent. This reverses the documented "PRISM does not write your `.gitignore` for you" policy — task C6 corrects the doc in the same stack.
   - `package.json#files` — add `scripts/ai-skills/hooks/`. `scripts/ai-skills/verify-pack-parity.ts` — add `{ path: "scripts/ai-skills/hooks", reader: "update.ts runUpdate — hook runtime copied into the consumer's .claude/hooks/", kind: "prefix" }` to `RUNTIME_READ_PATHS`.
   - **Verify:** `grep -c tsx .claude/settings.json templates/install/.claude/settings.json` returns `0` for both; `pnpm prism:verify-pack` green; `npm pack --dry-run --json | grep -c "scripts/ai-skills/hooks/hook.mjs"` returns `1`.

**A6. Reject catch-all routes at validation, computably, and delete the stub's catch-all.**
   - In `scripts/ai-skills/verify-manifest-coverage.ts`, reject any route pattern `p` for which `compileMatcher(p)("")` returns `true`. **Do not blacklist literals.** Verified against the live matcher: `"**"` compiles to `/^.*$/` and `"*"` to `/^[^/]*$/`, both of which accept the empty string; `".prism/**"` compiles to `/^\.prism\/.*$/` and does not. The empty string is the computable test for "this pattern constrains nothing."
   - Delete the `"**"` → `_toolkit/skills-ecosystem.md` route from `templates/install/.prism/architect/manifest.stub.json`. Sweep `.prism/architect/manifest.json` and `.prism/architect/_toolkit/manifest.base.json` for the same pattern and delete it there too if present.
   - Carry forward #457's brace-glob rejection: `{ts,tsx}` keys are rejected at validation because `compileMatcher` escapes braces as literals and such a route silently matches nothing. Port #457's `verify-manifest-coverage.test.ts` case with it.
   - **Verify:** `pnpm prism:verify-manifest` green; a test case asserting `compileMatcher("**")("") === true` and `compileMatcher(".prism/**")("") === false` — the positive control that proves the probe arrives.

**A7. Write the gate suite and wire it into CI.** Create `scripts/ai-skills/hook-gate.test.ts` — a `.test.ts` so `run-tests.ts` discovers it. Thrive's 1,286-line bash suite is not wired into CI; PRISM's is, and that belongs in the PR body.
   - Cover in this PR: the announce-once behavior from A4; `PRISM_HOOK_DISABLE=1` inertness; the foreign-payload guard; no-session-id is a no-op; the six folded cases from `claude-post-read.test.ts`.
   - **Add the cold-start integration leg, and run it against tarball output, not the source tree.** `npm pack` into a temp dir, extract it, run `runAdopt` from the extracted package into a fresh temp git repo, then assert: `.prism/architect/manifest.json` exists, `.prism/SPEC.md` exists, `.claude/hooks/hook.mjs` exists mode 755, the consumer's `.claude/settings.json` carries both registrations, and the two `.gitignore` lines are present. A leg run under `tsx` with `node_modules` present cannot prove the zero-dependency claim — that is why this leg packs first.
   - Deliberately break one assertion and confirm the leg fails. A check that cannot fail is not a check.
   - **Verify:** `pnpm prism:test` green with the new cases counted.

**A8. Close #457 as superseded, not merged.** Comment naming this plan and PR 2A's branch, and confirming what was carried forward: the `HarnessSpec`/`HARNESSES`/`resolveToolKind`/`extractPatchFilePaths` design (A1), the foreign-payload guard (A4), the ADR-0071 link sweep, and the brace-glob rejection with its test (A6). Delete `.cursor/hooks.json` from this tree — an unregistered config file is worse than none. **Verify:** `gh pr view 457 --json state` reports `CLOSED`.

---

### PR 2B — Credit channel: Bash reads, `Grep`, and full-read-only credit

Branch `huntermcgrew/opus5-port-credit-channel` from PR 2A's head. **This PR is a ship-gate for PR 2D, not an enhancement.** Under a deny, a remedy the agent cannot perform through its default reading tool is an unsatisfiable gate. Landing credit before the deny is strictly safer than landing them together.

#### Clove (implementation)

**B1. Widen credit to Bash read commands and register `Grep`.**
   - In `scripts/ai-skills/hooks/harnesses.mjs`, add a `Grep` row resolving to kind `search`, and confirm `Bash` resolves to kind `shell`.
   - In `hook.mjs`'s `PostToolUse` arm, when the kind is `shell`, parse `tool_input.command` for read forms and extract their target paths: `cat <path>`, `head [-n N] <path>`, `tail [-n N] <path>`, `sed -n 'X,Yp' <path>`, `less`/`more <path>`. Record the parsing gaps in a comment on the parser — pipelines, `xargs`, command substitution, and quoted paths containing spaces are deliberately out of scope.
   - `search` kind extracts paths for announce purposes and **never credits**.
   - **Verify:** `hook-gate.test.ts` cases for each of the five shell read forms — each announces, and only `cat` credits (asserted in B2).

**B2. Credit only on a read with no range restriction.**
   - `Read`: credit only when `tool_input.offset` and `tool_input.limit` are both absent. This closes the `Read(limit=1)`-credits-a-whole-doc gap — a real gap today, since no `offset`/`limit` handling exists anywhere in `scripts/ai-skills/hooks/`.
   - Bash: credit only on a bare `cat <path>`. `head`, `tail`, `sed -n`, `less`, and `more` announce but never credit.
   - Under-crediting is the safe direction and it is deliberate: the cost is one re-read, while over-crediting silently defeats the gate.
   - **Verify:** `hook-gate.test.ts` cases — `Read` with `limit: 1` on a routed doc leaves `read` empty; `Read` with no range credits; `cat <doc>` credits; `head -20 <doc>` does not.

**B3. Add the credit-channel cases to the suite.** Every case in B1 and B2 lands in `scripts/ai-skills/hook-gate.test.ts`, plus one negative control: a `Grep` whose results include a routed doc path credits nothing. **Verify:** `pnpm prism:test` green.

**B4. [HITL] Probe subagent session-id semantics against a live host, and record the answer as a `## Decisions` entry.**
   - This cannot be synthesized from fixtures — it needs a live Claude Code session that dispatches a real subagent while the `PostToolUse` hook is registered.
   - **Procedure:** with PR 2A's hook registered, start a session, note its `session_id` from a hook invocation, dispatch a subagent that reads a routed architect doc, then inspect `.prism/` for state files. One file means the ids are shared; two means they are distinct.
   - **Both branches are pre-specified so the outcome selects a branch rather than reopening the design.** Shared id: a child's read credits the parent — the deny arm keys on the session id plus whatever agent identity the harness exposes, and ADR-0072 names credit-leak-via-subagent as a known consequence. Distinct id: the child inherits the parent's `read` array at first use, keyed on the parent-session field in the payload.
   - **Blocks D2.** Do not write the deny arm's session handling until this Decision is recorded.
   - **Verify:** human-run. The evidence is the recorded Decision naming which branch is live and the state-file listing that established it.

---

### PR 2C — Writing guides, stub routes, and the doc splits the deny depends on

Branch `huntermcgrew/opus5-port-writing-guides` from PR 2A's head. Content-only — no runtime change, no gate. It exists before PR 2D because the deny's remedy is reading these documents, and a forced read has to be cheap.

#### Eli (documentation)

**C1. Split `.prism/architect/_toolkit/skills-ecosystem.md` (404 lines) along its existing section boundaries.** Keep `skills-ecosystem.md` as the roster and lifecycle doc (`## Project Context`, `## Skill Roster`, `## Cross-skill Handoffs`, `## Winston's quick-consult mode`, `## Rules for All Skills`). Move out:
   - `## Ticket Types`, `## Common Workflows`, `## Epic vs Story`, `## Bug Report Lifecycle`, `## PR Identifier Flexibility` → new `.prism/architect/_toolkit/ticket-workflows.md`.
   - `## Shared Templates`, `## Plan Section Ownership`, `## Acceptance Criteria Format` → new `.prism/architect/_toolkit/plan-authoring.md`.
   - `## Lessons`, `### Lesson promotion taxonomy` → append into the existing `.prism/architect/_toolkit/audit-workflow.md`.
   - `## Output guards` and its four subsections → new `.prism/architect/_toolkit/output-guards.md`. This is build-internal, maintainer-facing content — mark it excluded in `seed-curation.json` per C7.
   - Each new file opens with a one-paragraph scope statement naming what it covers and what it does not. **Verify:** `pnpm prism:crossref-lint` green (every moved section's inbound references resolve); `wc -l .prism/architect/_toolkit/skills-ecosystem.md` under 200.

**C2. Write the five writing guides at `.prism/references/guides/`.** These are the deny's remedy documents and the stub's route targets. Each is consumer-facing, under 120 lines, and answers one question: how do I author this kind of file here.
   - `writing-a-plan.md` — the plan file shape, one plan per ticket, the `## Decisions` do-not-undo contract, the AC format. Cites `.prism/rules/branch-plan.md` rather than restating it.
   - `writing-a-rule.md` — the placement test (rule vs architect doc vs ADR, citing `.prism/SPEC.md`), the `**Why:** / **How to apply:**` shape, onboarding voice, and the count-rules-not-numbers constraint.
   - `writing-an-architect-doc.md` — what earns a doc (the Deletion Test), the scope statement, and **route-add as part of authoring**: a new doc under `.prism/architect/` is not done until a route names it in `manifest.json`. This is the route-integrity mechanism — no frontmatter, no metadata, the guide carries it.
   - `writing-an-adr.md` — Context / Decision / Consequences, the honest-negative requirement, numbering, and the `_toolkit/` ownership split.
   - `writing-a-skill.md` — the skill body layout, `prism-*` namespace ownership, why a consumer's own skills use their own prefix, and where `prism-skill-forge` fits.
   - Every guide closes with a **route-verify** line: when you edit a doc this guide governs, confirm its route still names it, and run `prism doctor` if unsure.
   - **Verify:** `pnpm prism:crossref-lint` green; `wc -l .prism/references/guides/*.md` — no file over 120 lines.

**C3. Genericize `.prism/SPEC.md` for LLM-agnosticism.** It becomes a shipped, routed, deny-gated document, so PRISM-internal framing in it is friction a consumer pays for nothing.
   - Retitle `# PRISM Spec` → `# Spec Tiers`.
   - Replace the six `.claude/`-prefixed paths (`grep -n '\.claude/' .prism/SPEC.md` lists them) with their canonical `.prism/` equivalents, except where the tier table legitimately names a host-specific skill directory — there, name the mechanism ("the host's skill directory") rather than one host's path. This is the same rule `install-layout.md § Cross-reference convention` already enforces, and the build-time path guard will confirm it.
   - **Verify:** `pnpm prism:check` green (the path guard runs inside it); `grep -c '\.claude/' .prism/SPEC.md` returns `0`.

**C4. Rewrite the consumer stub's routes to point at the guides.** In `templates/install/.prism/architect/manifest.stub.json`, replace the ~20 `_toolkit/spec-editing.md` routes with instruction-layer routes naming the guides:
   - `.prism/plans/**` → `../references/guides/writing-a-plan.md`
   - `.prism/rules/**` → `../references/guides/writing-a-rule.md`
   - `.prism/architect/**` → `../references/guides/writing-an-architect-doc.md`
   - `.prism/spec/adrs/**` → `../references/guides/writing-an-adr.md`
   - `.claude/skills/**` → `../references/guides/writing-a-skill.md`
   - `.prism/SPEC.md` → `../references/guides/writing-a-rule.md` (the placement test is what a SPEC edit needs)
   - The catch-all route is already gone (A6). No route may match the empty string — A6's validation enforces it, and `pnpm prism:verify-manifest` is the gate.
   - **Route values are resolved relative to `.prism/architect/`.** Confirm the `../references/` form resolves through `filterDocsOnDisk` before committing; if it does not, move the guides under `.prism/architect/guides/` instead and update C2's paths in the same commit rather than shipping routes that silently filter to nothing.
   - **Verify:** `pnpm prism:verify-manifest` green; a `hook-gate.test.ts` case asserting each stub route resolves to a doc that exists on disk after `runAdopt`.

**C5. Mirror C4's routes into `.prism/architect/manifest.json` and `.prism/architect/_toolkit/manifest.base.json`** so PRISM's own tree is gated by the same routes it ships. Keep PRISM's existing `_toolkit/*` routes alongside — a path may match both a guide route and a toolkit route, and both docs are named. **Verify:** `pnpm prism:verify-manifest` green.

**C6. Correct the `.gitignore` policy statement.** `.prism/architect/_toolkit/install-layout.md` and its curated seed twin `templates/install/.prism/architect/_toolkit/install-layout.md` both state PRISM does not write a consumer's `.gitignore`. A5 makes that false. Replace with the narrow truth: adopt appends two hook-state ignore lines, append-only and idempotent, and touches nothing else. Add a § Hook runtime section to the same doc covering the delivery path, the state file, and the `PRISM_HOOK_DISABLE` / `PRISM_HOOK_DENY_DISABLE` switches. **Verify:** `pnpm prism:check` green; `grep -rn "does not write your \`.gitignore\`" .prism/ templates/` returns nothing.

**C7. Classify every new file in `.ai-skills/definitions/seed-curation.json` before it ships.** The five guides and the three new architect docs from C1 each need an entry; `output-guards.md` is `excluded` (maintainer-facing build internals), the rest ship. An unclassified new file is auto-mirrored verbatim and `prism:build` prints a warning — treat the warning as a failure. **Verify:** `pnpm prism:build` prints no unclassified-file warning; `pnpm prism:check` reports zero seed drift.

**C8. Sweep `docs/` and `.prism/` for the stale hook narrative.** The old `tsx`-invoked registration and `claude-post-read` are named in prose that A5 makes false. **Verify:** `grep -rn "claude-post-read" docs/ .prism/ --include="*.md" | grep -v '/plans/'` returns nothing; `pnpm prism:check` green.

---

### PR 2D — The deny gate

Branch `huntermcgrew/opus5-port-deny-gate` from PR 2C's head, after PR 2B is in `main`. **Do not start D2 until B4's Decision is recorded.** This is the PR that changes behavior for a human at the keyboard, and every earlier PR in the stack exists to make it satisfiable.

#### Clove (implementation)

**D1. Add the `PreToolUse` deny arm to `scripts/ai-skills/hooks/hook.mjs`.** A write is denied when **all** of these hold — each clause is load-bearing:
   1. Neither `PRISM_HOOK_DISABLE=1` nor `PRISM_HOOK_DENY_DISABLE=1`.
   2. The payload carries a session id. No session id never denies.
   3. `resolveToolKind` returns `write` **from an explicitly listed tool name** — not from A1's unlisted-name fallback. The fallback is correct for announce (more context) and wrong for deny: the next read-shaped tool a vendor ships would be classified `write` and denied, with the remedy unperformable through the tool being denied.
   4. At least one manifest route matches the path.
   5. At least one doc named by a matching route is absent from the session's `read` array and passes `filterDocsOnDisk`.
   - **Deny scope is universal — every matching route denies.** There is no flag, no prefix constant, no code/authoring split. A route existing is the opt-in; an unrouted path is never denied.
   - **The deny message names the literal remedy command**, because an inferred remedy is what makes a gate unsatisfiable:

     > You're editing `<path>`. Read its governing docs in full first, then retry: `cat <doc>` (one line per unread doc).

   - **A deny never writes dedup state**, and never appends to `announced` — a denied write must be able to produce the same message again after the remedy fails.
   - Register `PreToolUse` matched `Write|Edit|Bash` in `.claude/settings.json` and in `templates/install/.claude/settings.json`.
   - **Verify:** D7's suite legs 1 and 2.

**D2. Implement the subagent branch B4 established.** Whichever branch the recorded Decision names, implement exactly that and add its own test leg. Do not implement both. **Sequence: blocked on B4.** **Verify:** the branch-specific leg in D7 plus the HITL leg's subagent step.

**D3. Add the shell-write reroute.** In the `PreToolUse` arm, when `resolveToolKind` returns `shell`, parse the command for `>`, `>>`, `tee`, `tee -a`, and `sed -i` targeting a routed path. Emit, verbatim:

   > You're writing to `<path>` via a shell write — redo this edit with your file-edit tool so the gate can check its prerequisites.

   **The remedy judges no prerequisites at all**, which is what makes it impossible to render unsatisfiable — deny only what you can parse; where you cannot, reroute to a surface that can. Record the deliberately-open gaps in a comment on the parser: word-prefixed redirects (`echo hello>f`), `python -c`, `cp`/`mv`/`dd`. Add one sentence to `.prism/rules/context-reuse.md § Architect-context routing is diff-blind` noting the prose fallback now has a mechanical enforcer and remains the only thing that runs on hosts with no hook. **Verify:** D7 covers each of the five shell forms.

**D4. Add the `PostCompact` dedup reset.** In `hook.mjs`, a `PostCompact` arm deletes the session's state file so docs re-announce and re-gate after compaction — compaction can drop the conversation history that made a doc "read," and leaving the state intact silences that doc permanently. **`PostCompact`, not `PreCompact`** — before the drop, the tail of the pre-compaction conversation can re-credit what was just deleted. With no session id: no-op, one stderr line, exit 0. **No age sweep** — `pruneStaleRouteState`'s existing 24h sweep is the one owner of orphan hygiene, and a second age constant in a second file is the dual-source-of-truth defect this plan already records against itself. **Verify:** D7's `PostCompact` cases, with and without a session id.

**D5. Write `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md`.** Confirm the number with `ls .prism/spec/adrs/_toolkit/ | grep -oE '^[0-9]{4}' | sort -n | tail -1` before writing. `Status: accepted`.
   - `## Context` carries the full history: ADR-0067's floor was reverted because its gate sat on the report-back channel and a blocked persona fought its own gate; ADR-0069 permanently rejects hooks **on that channel specifically**; `epic-floor-revert.md § Decisions` left a lightweight opt-in open in the same breath as "No hooks survive"; ADR-0071 chose nag over deny, and this ADR supersedes that choice with the operator's measurement — roughly six nags to habituation, and forced reads that changed behavior where nags did not.
   - `## Decision` in one sentence: a write to a path matching any manifest route is denied until the route's docs are read; only the `write` kind from an explicitly listed tool, only with a session id, and the remedy is reading a document.
   - `## Consequences` carries the honest negatives, stated plainly rather than hedged. **The gate is friction, not a wall:** deleting the registration from `.claude/settings.json`, deleting `.claude/hooks/hook.mjs`, or setting `PRISM_HOOK_DENY_DISABLE=1` each disables it; all three are trivial; none is prevented, and routing the hook's own surface was rejected because in a consumer repo `.claude/settings.json` is the consumer's file. The compensating control is visibility — `prism doctor`'s hook-registration check (E3) turns a removed hook into a reported finding. Also name: a doc read through a channel the hook never observed still reads as unread; and whichever subagent credit behavior B4 established.
   - **Verify:** `pnpm prism:crossref-lint` green; `ls .prism/spec/adrs/_toolkit/0072-*.md` succeeds.

**D6. Correct the conductor's contradicting line.** `.ai-skills/skills/prism-conductor/shared.md:106` — `### Enforcement is guidance + pipeline stages, never runtime hooks` currently reads *"No `Stop`/`SubagentStop` gates on report-backs, no `PreToolUse` ownership guards on writes."* Replace the second clause: *"No `Stop`/`SubagentStop` gates on report-backs. `PreToolUse` guards are confined to routed paths — a write is held until the route's governing doc is read (ADR-0072); ownership guards on writes stay out."* Adjust the heading if "never runtime hooks" no longer reads true. **PR 3's task 24 also edits this file** — PR 2D owns § Enforcement, PR 3 owns § Talking to the operator. **Verify:** `grep -rn "no \`PreToolUse\` ownership guards on writes" .ai-skills/ .prism/` returns nothing.

**D7. Complete the gate suite — three required legs plus the coverage set.** A gate's tests need three legs and all three are required; thrive shipped an unsatisfiable gate that passed 70/70 because it had only the first two.
   1. **The deny fires.** A `Write` to a routed path with unread docs returns the harness's deny envelope naming the doc paths and the `cat` remedy.
   2. **Seeded state clears it.** With the matched docs pre-written into the state file's `read` array, the same call is allowed.
   3. **A live remedy performed through the gate clears it.** From leg 1's denied state, invoke the **real `PostToolUse` arm** with a full `Read` of each named doc, then re-invoke `PreToolUse` on the original path and assert allowed. This leg exercises the shipped path end to end — seeding is leg 2's job, and a suite that only seeds cannot detect a remedy that does not work. **Run leg 3 a second time with the remedy performed via `cat` through the Bash arm**, because that is how this repo's own output style reads files.
   - Also cover: an unrouted path is never denied on any verb; a `read`-kind tool is never denied; no session id never denies; a deny writes no state and no `announced` entry; each of D3's five shell forms reroutes; `PRISM_HOOK_DISABLE=1` and `PRISM_HOOK_DENY_DISABLE=1` each produce their intended inertness; a doc announced but never read still denies. Add at least two cases against the repo's **live** `.prism/architect/manifest.json` so a manifest edit that breaks routing fails here — scope them to routing, not to which paths deny.
   - **Positive control:** deliberately break the deny and confirm leg 3 fails.
   - **Verify:** `pnpm prism:test` green with the new cases counted.

**D8. [HITL] Run one end-to-end session against a live host.** Every other leg synthesizes its own payloads, which means the suite cannot catch a payload-shape mistake. In a real Claude Code session with the hook registered: confirm the deny fires on a routed write, the message renders legibly in the transcript, a full `Read` of the named doc clears it, a `cat` of the named doc also clears it, and subagent behavior matches what B4 documented. **Verify:** human-run; record the outcome as a `## History` entry naming what was observed, not "worked."

#### Eli (documentation)

**D9. Document the gate as a consumer-facing surface.** Add a § Write gate section to `.prism/architect/_toolkit/install-layout.md` and its curated seed twin: what triggers a deny, what clears it, the two environment switches, and the honest statement that the gate is friction rather than a wall (pointing at ADR-0072). Update `docs/distribution.md` where it describes the hook. **Verify:** `pnpm prism:check` green.

---

### PR 2E — `prism doctor` route integrity and the ship-surface trim

Branch `huntermcgrew/opus5-port-doctor-shipsurface` from PR 2C's head. Independent of PR 2D; sequenced last because it validates the doc set PR 2C establishes.

#### Clove (implementation)

**E1. Add an orphan-doc check to `scripts/ai-skills/doctor.ts`.** A doc on disk under `.prism/architect/` (excluding `manifest.json` and `manifest.base.json`) that no route names is a finding. This is half of the route-integrity closure that replaces per-doc frontmatter: docs-on-disk minus the manifest's value set. **Verify:** `pnpm prism:doctor` on this repo reports the current orphan set (expected non-empty until E5 runs); a `doctor.test.ts` case with a fixture manifest and a fixture doc dir asserts one finding, plus a positive control where the doc is routed and no finding is produced.

**E2. Add a dead-route check.** A route naming a doc absent from disk is a finding. This is the other half of the closure, and it is what makes route-add-at-authoring (C2) verifiable rather than aspirational. **Verify:** `doctor.test.ts` case with a manifest naming a missing doc asserts one finding, with a positive control.

**E3. Add a hook-registration check.** A repo with `.claude/hooks/hook.mjs` present but no matching registration in `.claude/settings.json` — or a registration pointing at an absent file — is a finding. This is ADR-0072's named compensating control: the gate cannot prevent its own removal, so removal becomes visible instead. **Verify:** `doctor.test.ts` cases for both directions.

**E4. Compute and enforce ship-surface closure.** New `scripts/ai-skills/ship-closure.ts`, wired into `pnpm prism:check`.
   - **Roots:** skills (`prism-*` personas plus `prism-skill-forge`), `.prism/rules/**`, `.prism/references/guides/**`, and the runtime (`scripts/ai-skills/hooks/**`, the stub, `doctor.ts`).
   - Walk repo-root-absolute markdown references transitively from the roots. The resulting closure is the ship set.
   - Fail when a file in the ship set is marked `excluded` in `seed-curation.json` (a shipped file references something consumers cannot reach), and fail when a file marked shippable is outside the closure (dead weight in the seed).
   - Reuse `crossref-lint.ts`'s reference extraction rather than writing a second parser — a second link parser is the dual-source-of-truth defect this plan already records twice.
   - **Verify:** `pnpm prism:check` green; a unit test with a fixture tree asserting both failure directions plus a clean-closure control.

**E5. Trim the ship surface to the closure E4 computes.** Mark as `excluded` in `seed-curation.json` everything outside it — PRISM's own plans, self-dev ADRs, self-dev references. Everything link-reachable from the four roots ships, including `SPEC.md` (routed by the stub's first key and cited by the shipped `code-standards.md`) and Atlas's onboarding dependencies. **Do the trim after E4 lands and reports**, so the exclusion list is E4's output rather than a hand-guess. **Verify:** `pnpm prism:check` green; `pnpm prism:build` prints no unclassified-file warning.
---

### PR 3 — Shared core and roster slimming

Branch from PR 2E's head. **Freeze the output style before measuring anything** — evidence Rule 4 measured an output-style change moving chat output +113%, more than twice what the entire slim-vs-fat redesign moved. Any before/after word count taken across a style change is meaningless.

**The word-count target is an expectation, never a gate.** If the keep-list and the number conflict, the keep-list wins and the conflict gets reported. Never cut protected content to hit a number.

**Do not re-port these deletions** (evidence § 7 — tried and refused, or deleted and restored, and all four of the restored set were caught by a *reviewer*, not by the slimming pass): the Opening Orientation Battery; Briar's diff-only reading; a persona's closing ceremony; a persona's dispatched-runs section; the evidence-format gradeability bar; any typed contract something downstream parses; run-control state files; pinned review ranges; escape conditions (*"these aren't verification; they're routing"*); and the `description` frontmatter, which is never slimmed — *"slimming a body is fine; slimming a description costs invocations."*

Three questions before any deletion: **Does anything else *say* this, written, where the reader arrives** — not "could the model infer it"? **Does the evidence measure the right surface?** **Is the proposed repair "repoint the citers"** — because that means N copies of a single-owner procedure, and you should restore instead.

#### Clove (implementation)

**20. Create `.prism/references/skill-core.md` — the shared core.** One file, not two (evidence § 5: splitting a ~1,500-word core to save ~116 words per invocation costs a maintenance surface the source repo had already been burned by). Sections, each a **pointer plus the fact it establishes**, never a restatement:
   - `## Orientation` — the opening battery, citing `session-orientation.md`, with the no-user-available calibration stated once.
   - `## The plan is the working memory` — plan lookup, citing `.prism/references/plan-lookup.md` and `branch-plan.md`.
   - `## Reading before writing` — architect-context routing and the diff-blind clause, citing `context-reuse.md`; note that authoring paths are now gated (ADR-0072, PR 2).
   - `## Reporting back` — the report-back schema when dispatched by Sol, quoting `lib/report-back.md § Canonical dispatch schema` as a fragment, never restating it. **Typed contracts are quoted, never paraphrased** — something downstream parses this.
   - `## Closing` — the closing battery and session close, citing `session-orientation.md` and `.prism/references/session-close.md`.
   - `## Context budget` — kept deliberately; it is on the reversal list.

   **Single-owner content stays with its owner** — retro procedure to Iris, audit procedure to Zoe, design procedure to Pixel, conductor paths to Sol. Nothing that belongs to one persona goes in the core.

   Add `.prism/references/skill-core.md` to `.ai-skills/definitions/seed-curation.json` as **non-curated** (it should mirror verbatim). **Verify:** build + check; the file appears at `templates/install/.prism/references/skill-core.md` and in all three platform mirrors.

**21. Add the Step-0 core pointer to all 31 skill bodies.** In each `.ai-skills/skills/<id>/shared.md`, immediately before the greeting/intro section, one line: *"Step 0, before greeting: read `.prism/references/skill-core.md`."* Use the same relative-link form the file already uses for `.prism/` citations (`[…](../../../.prism/references/skill-core.md)`), so the link resolves in the consumer's platform tree. **Never a literal profile path.** A persona overriding a core section writes a one-line stub under that section's heading name — the sanctioned place to *modify* a core section is a `Persona notes on the shared core:` sub-list, not a restatement. **Verify:** `grep -l "skill-core.md" .ai-skills/skills/*/shared.md | wc -l` returns `31`; `pnpm prism:check` (crossref lint) green.

**22. Delete the 22 `## The run, in order` headings.** All 22 live in `.ai-skills/skills/*/shared.md` (four further files mention the phrase in prose — those go too). PR 1 task 6 removed the two always-on rules that mandated them, so this is a clean deletion with no dangling mandate. **Sequence: strictly after PR 1 merges.** **Verify:** `grep -rn "The run, in order" .ai-skills/skills/` returns nothing; `grep -rn "The run, in order" .prism/rules/ .prism/references/` returns nothing (PR 1 already cleared these — if either returns a hit, PR 1 regressed and this task stops).

**23. Collapse the 30 `## Closing Re-Orientation Battery` sections to a single line each.** Measured baseline: 30 files carry the `##` heading; 31 mention the phrase. **The mechanism is not deleted — the restatement is.** `session-orientation.md` remains the single owner of both batteries and its `## Sessions` `open:`/`close:` persistence contract is untouched. Per `thrive-port.md` task 4's already-approved one-pointer shape: each body keeps **one** pointer at open (task 21's Step 0 covers it via the core) and **one** line at close, folded into the deliverable sentence task 24 writes. Delete the `##` heading and its prose. **Verify:** `grep -c "^## Closing Re-Orientation Battery" .ai-skills/skills/*/shared.md | grep -v ":0"` returns nothing, **and** `grep -l "session-orientation.md" .ai-skills/skills/*/shared.md | wc -l` still returns `31` — the pointer survives, only the section goes. Both halves are required; the first alone would pass if the mechanism were deleted outright.

**24. Dedup the 28 Definition-of-Done blocks.** Apply the deletion test from `## Decisions`: does this item tell the model something its defaults or an already-cited always-on rule do not?
   - **Delete:** items restating a battery (measured: 10 occurrences of "Battery answered" across 4 files), "types pass"/"lint passes"/"no stray console.logs"/"full diff read", and anything restating a `load: always` rule.
   - **Keep:** skill-specific policy — "No implementation code written" (Winston), "AC synced to the ticket tracker", Clove's real build/test criteria (`epic-floor-revert.md`'s Class A variant preserved these deliberately and they are still genuine DoD, not gate residue).
   - **Keep the one line naming the deliverable** under each surviving heading. Where every item fails the test, the heading goes with them and one deliverable sentence replaces the section.
   - This is judgment-bounded — **read** each Class A body (Clove, Sage, Atlas), do not sweep them. **Verify:** `grep -o "Battery answered" .ai-skills/skills/*/shared.md | wc -l` returns `0`; the PR body carries a per-skill `swept` / `n/a — <reason>` table with the skill as the named unit; build + check.

**25. Replace prescribed read sequences with exit-condition questions.** Evidence Rule 1 `[measured]` — the highest-leverage change: external research calls 0 → 17, chat words 1,856 → 917, dependency coverage 8-prose-mentions/18-tasks → 14/14 explicit. The mechanism, verbatim: *"A prescribed read batch doesn't suppress the rule — it suppresses the rule's trigger condition. The model never forms an external-system claim, because the reads never surface a question the repo can't answer."*

   **The trap, stated so it cannot be missed: "four questions" is not the mechanism.** The Opening Orientation Battery is already four questions and produces zero research, because its questions are about the *request*. The rewrite works only if **at least one question is about constraints originating outside the repo**. A rewrite without one has changed the shape and kept the problem.

   Scope: the skills carrying a fixed startup read batch — `prism-architect` (the Batch 1 / Batch 2 block), `prism-code-dev`, `prism-code-review-self`, `prism-code-review-pr`, `prism-debugger`. For each, replace the enumerated read list with exit conditions naming **the fact each read must establish**, plus one outside-facing question of this shape:

   > What does this change depend on that this repo does not define — a vendor API, a host runtime, a platform behavior, an upstream contract — and what is the current fact about it?

   Closing move, kept verbatim as the calibration: *"An unanswerable question is a task, not an assumption."* **Keep** calibration reads that already say what they are for — *"a read instruction paired with the fact it establishes is rule 1 done right."* **Verify:** each rewritten skill's exit-condition block contains an outside-facing question — human evidence, named per skill in the PR body; build + check.

**26. Add `.ai-skills/skills/tdd/`.** Persona-less reference, ~67 lines. Three anti-patterns, each **with its tell** — the tell is what makes it usable: *implementation-coupled* (a refactor breaks the test though behavior did not change), *tautological* (the assertion recomputes the expected value the same way the code does), *horizontal slicing* (all tests written, then all implementation). State explicitly that refactoring is not part of the red-green loop. Register in `.ai-skills/definitions/roles.json` with `"type": "utility"` and **no** `persona` field — `generate-skills.ts:435` throws if a utility carries a persona, and `:603`/`:622` skip agent emission for utilities, which is correct here. Add its row to `.prism/rules/skill-routing.md § Utility skills`, not to the persona routing table.

   **This skill is a persona-less reference: no greeting, no Step-0 core pointer, no orientation batteries, no Definition of Done.** It is read for its content, not invoked as a session. Task 21's core pointer and task 23's battery line do not apply to it — that scoping is what keeps AC-8 and AC-17 at `31` rather than `33`. **Verify:** `pnpm prism:build` emits `.claude/skills/tdd/SKILL.md` and **no** `.claude/agents/tdd.md`; `grep -c "skill-core.md" .ai-skills/skills/tdd/shared.md` returns `0`; `pnpm prism:check` green.

**27. Add `.ai-skills/skills/devils-advocate/`.** Extracted from Winston's inline `### Devil's Advocate` section; the standalone is better than the inline one. Four passes, a typed verdict, and an applicability test: *"does this artifact commit to a decision before the evidence exists?"* **Deliberately no name and no personality** — *"a named character with quirks is an invitation to perform skepticism."* Registration and scoping identical to task 26 — `type: "utility"`, no persona, a § Utility skills row, and no core pointer, batteries, or DoD. **Leave Winston's inline section in place** and add a one-line pointer to the skill — deleting it is a separate call, and evidence § 7's reversal list is full of sections deleted by a slimming pass and restored by a reviewer. **Verify:** same as task 26; `grep -c "Devil's Advocate" .ai-skills/skills/prism-architect/shared.md` still returns a non-zero count.

**28. Fold the two remaining `thrive-port.md` skill-body tasks in.**
   - **Anti-meta-loop + `Meta` severity** (`thrive-port.md` task 5) — `.ai-skills/skills/prism-review-loop/shared.md`: a meta finding (a PR body describing the change wrong, a readiness line reporting a closed finding as open, plan hygiene) is real and gets fixed, but never drives another review pass; only subject-surface findings count toward the zero-findings exit. Cite thrive's measured incident — five of nine passes spent on meta churn — in the `**Why:**`.
   - **Sol's operator-communication contract** (`thrive-port.md` task 6) — `.ai-skills/skills/prism-conductor/shared.md`, new `## Talking to the operator`: interim updates are one line; plain words, no coined run-vocabulary; every handle redeemed at first mention; evidence cells one clause. Cite `response-shape.md` rather than restating it. **Do not touch § Enforcement is guidance + pipeline stages** — PR 2 task 17 owns that section.
   - **Verify:** build + check.

#### Eli (documentation)

**29. Document the shared core and the two new skills.** Update `.prism/architect/_toolkit/skills-ecosystem.md` — the roster gains two utility skills and every persona gains a Step-0 core read. **This file has a `curated` seed twin** (`templates/install/.prism/architect/_toolkit/skills-ecosystem.md`) that does not regenerate and has drifted 65 lines behind canonical before; hand-edit both. **Verify:** `pnpm prism:check` green; diff the two files and confirm the delta is only the intentional consumer simplification.

---

## Deferred — not in this stack

Re-homed from `thrive-port.md` so it can close. Each carries its disposition; none is lost.

| thrive-port task | Disposition |
| --- | --- |
| 7 — remove Sol's autonomy dial | **Deferred.** The dial is live and this very run is dispatched under `hobby`. Removing it is a conductor-semantics change with no relationship to the Opus-5 retune; stacking it here makes PR 3 unreviewable. Its own PR. |
| 8 — add Iris to Sol's tiering table | **Deferred**, rides task 7's PR (same table, same file). |
| 9, 10 — declaration line, dispatch shape, Eric's draft hold | **Deferred**, one PR with tasks 7–8. All four edit Sol's dispatch surface. |
| 11 — new `dev-servers.md` rule | **Deferred.** Adding a 23rd `load: always` rule in the same stack that audits the other 22 for context cost is self-defeating. Revisit after PR 1's audit reports actual line counts. |
| 12 — problem-first PR descriptions | **Deferred**, independent and small. |
| 13 — Lilac ZWSP scoping | **Deferred**, independent and small. |
| 14, 15 — CLAUDE.md orientation + Atlas step | **Deferred**, independent. |
| 16 — worktree `node_modules` | **Already landed** — `3d50e8a9` on main (#451). No action. |
| 17 — retire the handoff check | **Folded in** as PR 1 task 5. |
| 1, 2, 3 — the three rule amendments (`verification-before-done.md`, `subagent-strategy.md`, `session-orientation.md`) | **Folded in** as PR 1 tasks 1–2 and 7 (already shipped on #449). |
| 4 — one-pointer battery shape + DoD dedup | **Folded in** as PR 3 tasks 21, 23, 24. |
| 5, 6 — anti-meta-loop, Sol operator contract | **Folded in** as PR 3 task 28. |

Also deferred from the evidence sweep, with reasons: prompt-time persona routing (#2275) — see the OPEN Decision; the three-question evidence gate (#2268); the nine-angle review battery and Briar's file-slice fan-out (`_shared/review-angles.md`); `_shared/verification.md`'s "checks that cannot fail" (its single most transferable rule — *"a control is written against the failure, not against the fix"* — is applied in PR 2 task 16's positive control, but the rule set itself is not ported); build-time partials (#2277); the plugin-marketplace distribution (#2321/#2322).

---

## Acceptance Criteria

Every evidence command below was reasoned against this plan's own task list before being written, per `.prism/lessons.md § AC evidence commands are code — dry-run them at authoring time`. Baselines were measured on `main` at 2026-08-13 and are stated where a criterion asserts a change from one.

### Behavioral

- [ ] **AC-1.** Given a session edits a file whose path matches a manifest route, and a doc that route names is unread, When the `PreToolUse` hook fires on `Write` or `Edit`, Then the write is denied with a message naming each unread doc and the literal `cat` command that clears it.
  - Evidence (machine): `pnpm prism:test` — `scripts/ai-skills/hook-gate.test.ts` leg 1 passes and the asserted message text contains both the doc path and a `cat ` prefix → exit 0. UNMET looks like: the leg fails, or it passes while asserting only the doc path (a message naming a doc without naming how to read it is the unsatisfiable-gate shape). (REQ-1)
- [ ] **AC-2.** Given AC-1's denied state, When the session reads each named doc in full — through the `Read` tool with no range, and separately through `cat` in Bash — and retries the same write, Then the write is allowed in both cases.
  - Evidence (machine): `pnpm prism:test` — `hook-gate.test.ts` leg 3 passes in both its `Read` and `cat` variants, **and** fails when the deny logic is deliberately broken (the positive control). Leg 3 must not seed state directly; seeding is leg 2. UNMET looks like: only the `Read` variant exists, which leaves this repo's own output style unable to perform the remedy. (REQ-1)
- [ ] **AC-3.** Given a session edits a path that matches no manifest route, When the `PreToolUse` hook fires on any verb, Then the write is allowed.
  - Evidence (machine): `pnpm prism:test` — `hook-gate.test.ts` unrouted-path cases pass for `Write`, `Edit`, and `Bash`. UNMET looks like: an unrouted write denied, which is the cold-start failure that made the `**` catch-all unshippable. (REQ-1)
- [ ] **AC-4.** Given a hook payload with no session id, When the `PreToolUse` arm evaluates a routed write, Then it never denies.
  - Evidence (machine): `pnpm prism:test` — `hook-gate.test.ts` no-session case passes. UNMET looks like: a deny envelope returned for a payload with `session_id` absent. (REQ-1)
- [ ] **AC-5.** Given a doc is named in an announcement but never read, When the session writes to a path routing to that doc, Then the write is denied — credit lands on an observed full read of the doc's own path, never on announcement.
  - Evidence (machine): `pnpm prism:test` — the ported `architect-route.test.ts` credit-on-read cases (from #456) pass unchanged against the `.mjs` runtime, plus `hook-gate.test.ts`'s announced-but-unread case. UNMET looks like: the announced-but-unread write is allowed, meaning announcement is crediting. Regression here is the highest-likelihood defect in task A2. (REQ-1)
- [ ] **AC-6.** Given a consumer repo that has run `prism adopt` from the published tarball, When a session reads a routed path, Then the hook fires with no `node_modules` and no `tsx` present.
  - Evidence (machine): `pnpm prism:test` — `hook-gate.test.ts`'s cold-start leg packs the repo with `npm pack`, extracts it, runs `runAdopt` into a fresh temp git repo, and asserts `.claude/hooks/hook.mjs` exists mode 755 and a synthesized `Read` produces an announcement. UNMET looks like: the leg runs under `tsx` against the source tree with `node_modules` present, which cannot prove the zero-dependency claim regardless of whether it passes. (REQ-1)
- [ ] **AC-7.** Given a compaction event, When `PostCompact` fires with a session id, Then that session's dedup state is deleted so docs re-announce and re-gate, and no summary file is written.
  - Evidence (machine): `pnpm prism:test` — `hook-gate.test.ts` `PostCompact` cases pass with and without a session id; the no-session case asserts the file still exists. UNMET looks like: the reset registered on `PreCompact`, where the tail of the pre-compaction conversation can re-credit what was just deleted. (REQ-1)
- [ ] **AC-8.** Given a persona session starts, When it reaches Step 0, Then it reads `.prism/references/skill-core.md` before greeting.
  - Evidence (machine): `grep -l "skill-core.md" .ai-skills/skills/*/shared.md | wc -l` returns `31`. **Note the arithmetic:** PR 3's tasks 26–27 add two more skill directories, but `tdd` and `devils-advocate` are persona-less references that never greet and never run a battery — they get no Step-0 core pointer, so the count stays at 31. UNMET looks like: any number other than 31. (REQ-1)
- [ ] **AC-9.** Given a skill session with no ordered phases, When it replies, Then no state line is emitted and no rule requires a lifecycle list.
  - Evidence (machine): `grep -rn "The run, in order" .ai-skills/skills/ .prism/rules/ .prism/references/` returns nothing after PR 3; `grep -rn "Lifecycle List" .prism/rules/` returns nothing (PR 1, already shipped). UNMET looks like: either grep returning a hit. (REQ-1)
- [ ] **AC-22.** Given a session has already been told about a doc, When it reads another path routing to the same doc, Then the doc is not named again.
  - Evidence (machine): `pnpm prism:test` — `hook-gate.test.ts` announce-once case: first read emits the doc, second read of a different path routing to the same doc emits nothing. UNMET looks like: the second read emits, which is the habituation behavior this replaces. (REQ-1)
- [ ] **AC-23.** Given a consumer has just run `prism adopt`, When they write to an application file the manifest does not route, Then nothing is denied and nothing is announced.
  - Evidence (machine): `pnpm prism:test` — the cold-start leg's follow-on assertion: a synthesized `Write` to `src/index.ts` in the adopted temp repo returns no deny envelope. UNMET looks like: PRISM's first act in a new repo blocking the user's first edit. (REQ-1)

### Non-behavioral

- [ ] **AC-10.** The hook runtime is zero-dependency.
  - Evidence (machine): `grep -hoE 'from "[^"]+"' scripts/ai-skills/hooks/*.mjs scripts/ai-skills/hooks/lib/*.mjs | grep -v 'node:' | grep -v '"\./' | wc -l` returns `0`; `grep -c tsx .claude/settings.json templates/install/.claude/settings.json` returns `0` for both. UNMET looks like: a non-relative, non-`node:` import, or a surviving `tsx` invocation. (REQ-1)
- [ ] **AC-11.** The hook registration reaches a consumer's own `.claude/settings.json`, and merging never clobbers what was already there.
  - Evidence (machine): `pnpm prism:test` — the cold-start leg asserts the adopted temp repo's `.claude/settings.json` carries `PostToolUse`, `PreToolUse`, and `PostCompact`; a second case seeds the consumer file with an unrelated hook first and asserts it survives the merge. UNMET looks like: the test asserting the contents of `templates/install/.claude/settings.json` instead of the consumer's file — the previous form of this criterion, which went green while every consumer received zero hooks. (REQ-1)
- [ ] **AC-12.** The hook runtime ships in the published tarball and the pack-parity gate knows about it.
  - Evidence (machine): `pnpm prism:verify-pack` green; `npm pack --dry-run --json | grep -c "scripts/ai-skills/hooks/hook.mjs"` returns `1`. UNMET looks like: either the grep returning `0` or the gate passing without the path in `RUNTIME_READ_PATHS`. (REQ-1)
- [ ] **AC-13.** `compileMatcher` has exactly one implementation.
  - Evidence (machine): `grep -rn "^export function compileMatcher" --include='*.mjs' --include='*.ts' scripts/ | wc -l` returns `1`. UNMET looks like: `2` — there is no sanctioned duplicate path, because the tsconfig failure the old fallback covered is measured impossible on this repo's tsc. The declaration filter is required, not cosmetic: the unfiltered form counted the `match.d.mts` sidecar that the same Decision mandates, so it returned the value it defines as UNMET while the invariant held. (REQ-1)
- [ ] **AC-24.** Credit lands only on a read with no range restriction.
  - Evidence (machine): `pnpm prism:test` — `hook-gate.test.ts` cases: `Read` with `limit: 1` on a routed doc leaves the state's `read` array empty; `Read` with no `offset`/`limit` credits; `cat <doc>` credits; `head -20 <doc>` does not; a `Grep` returning the doc path credits nothing. UNMET looks like: the `limit: 1` case crediting, which is today's behavior and silently defeats the gate. (REQ-1)
- [ ] **AC-25.** No manifest route matches every path, and the rejection is computed rather than blacklisted.
  - Evidence (machine): `pnpm prism:verify-manifest` green across `.prism/architect/manifest.json`, `_toolkit/manifest.base.json`, and `templates/install/.prism/architect/manifest.stub.json`; a unit case asserts every wildcard-only opening segment is rejected — `**`, `*`, and the three separator-bearing spellings an empty-string probe accepts — while a leading-literal route is not. UNMET looks like: validation that rejects only the spellings someone enumerated, whether as a literal blacklist or as an empty-string probe, which the next catch-all spelling walks past. (REQ-1)
- [ ] **AC-26.** Every writing guide the stub routes to exists, and each is short enough to read under a block.
  - Evidence (machine): `for f in .prism/references/guides/*.md; do [ "$(wc -l < "$f")" -le 120 ] || echo "OVER: $f"; done` prints nothing, and `ls .prism/references/guides/*.md | wc -l` returns the number of distinct guide targets in `manifest.stub.json`. UNMET looks like: a guide over 120 lines, which reintroduces the cost that made the nag fail. (REQ-1)
- [ ] **AC-27.** Route integrity is checkable by the consumer, not asserted in prose.
  - Evidence (machine): `pnpm prism:doctor` reports orphan-doc, dead-route, and hook-registration findings; `doctor.test.ts` covers each with a positive control that produces no finding on a clean fixture. UNMET looks like: a check whose clean case was never exercised, so a typo'd probe reports zero findings and reads as healthy. (REQ-1)
- [ ] **AC-28.** The ship surface is exactly the dependency closure of its four roots, and the closure is enforced.
  - Evidence (machine): `pnpm prism:check` green with `ship-closure.ts` wired in; its unit test asserts both failure directions — a shipped file referencing an excluded file, and a shippable file outside the closure — plus a clean-closure control. UNMET looks like: the closure documented in prose with no failing case, which goes stale on the first new cross-reference. (REQ-1)
- [ ] **AC-29.** A consumer's working tree is not dirtied by hook state.
  - Evidence (machine): the cold-start leg asserts both `.prism/architect-route-state.*.json` ignore lines are present in the adopted repo's `.gitignore`, and that re-running the seam does not duplicate them. UNMET looks like: duplicated lines on a second run, or a state file appearing in `git status --porcelain` in the temp repo. (REQ-1)
- [ ] **AC-30.** Subagent session-id semantics are established by observation, not assumed.
  - Evidence (human): the B4 probe is run against a live host and its result is recorded as a `## Decisions` entry naming which branch is live and the state-file listing that established it; D2 implements that branch and D7 carries its test leg. UNMET looks like: a Decision recorded without the state-file evidence, or D2 implementing both branches defensively. (REQ-1)
- [ ] **AC-14.** The retired handoff-check rule leaves no live references.
  - Evidence (machine): `grep -rn "context-window-handoff-check\|Context Window Handoff Check" --include="*.md" --include="*.json" --include="*.ts" . | grep -v node_modules | grep -vE "^(\./)?\.prism/(plans|audits)/" | grep -vE "^(\./)?(\.claude|\.codex|\.cursor|\.prism)/spec/adrs/_toolkit/0006-" | grep -v "seed-curation.json"` returns nothing. Plans, audits, and the deprecated ADR are excluded deliberately — they are historical record, and ADR-0006 is expected to name itself. UNMET looks like: any surviving hit outside those exclusions. (REQ-1)
- [ ] **AC-15.** The always-on rule layer shrinks by exactly one rule and reports its new size.
  - Evidence (machine): `n=0; t=0; for f in .prism/rules/*.md; do sed -n '1,6p' "$f" | grep -q '^load: always' && { n=$((n+1)); t=$((t+$(wc -l < "$f"))); }; done; echo "$n $t"` prints `21` and a line total below `1639`. Baseline: `22 1639`. UNMET looks like: `22`, or a total at or above the baseline. (REQ-1)
- [ ] **AC-16.** No Definition-of-Done item restates an orientation battery.
  - Evidence (machine): `grep -o "Battery answered" .ai-skills/skills/*/shared.md | wc -l` returns `0`. Baseline: `10`. Uses `grep -o | wc -l`, not `grep -c` — `grep -c` counts matching lines and four files carry more than one occurrence. UNMET looks like: any non-zero count. (REQ-1)
- [ ] **AC-17.** The closing battery's mechanism survives its restatement's deletion.
  - Evidence (machine): `grep -c "^## Closing Re-Orientation Battery" .ai-skills/skills/*/shared.md | grep -v ":0" | wc -l` returns `0` (baseline `30`), **and** `grep -l "session-orientation.md" .ai-skills/skills/*/shared.md | wc -l` returns `31` (baseline `31`, unchanged). Both halves required — the first alone passes if the mechanism were deleted outright. UNMET looks like: the second returning below 31. (REQ-1)
- [ ] **AC-18.** The two new skills register as utilities and emit no agent definitions.
  - Evidence (machine): `ls .claude/skills/tdd/SKILL.md .claude/skills/devils-advocate/SKILL.md` succeeds; `ls .claude/agents/tdd.md .claude/agents/devils-advocate.md` fails for both; `ls .claude/agents/*.md | wc -l` returns `28`, the pre-PR-3 baseline. UNMET looks like: an agent definition emitted for either. (REQ-1)
- [ ] **AC-19.** The tree does not contradict itself about `PreToolUse` guards.
  - Evidence (machine): `grep -rn "no \`PreToolUse\` ownership guards on writes" .ai-skills/ .prism/ | grep -v "^\./\.prism/plans/"` returns nothing; `ls .prism/spec/adrs/_toolkit/0072-*.md` succeeds; `pnpm prism:crossref-lint` green. UNMET looks like: the ADR landing while the conductor line still states the old absolute. (REQ-1)
- [ ] **AC-20.** Every PR in the stack builds and checks clean.
  - Evidence (machine): `pnpm prism:build && pnpm prism:check` green on each branch in the stack. UNMET looks like: a red gate on any branch. Pre-existing Windows path failures, if the run is on Windows, are the known 4 and only the known 4. (REQ-1)
- [ ] **AC-21.** No mirror is hand-edited.
  - Evidence (machine): `pnpm prism:check` reports zero drift. The curated seed twins are hand-edited by design and exempt — `checkSeedDrift` never compares their content, so their correctness is human evidence, verified by diffing each against its canonical partner. UNMET looks like: any reported drift outside the curated set. (REQ-1)
### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-13 | Winston | AC created in plan; no tracker ticket exists for this port | ✓ | N/A |

---

## Sessions

- 2026-08-13 [main] open: Intent — one plan covering three stacked PRs (rules retune, zero-dep hook runtime + authoring deny, roster slimming onto a shared core), with cross-PR file collisions named and owned; Bounds — write only `.prism/plans/opus5-port.md`, no rules/skills/hooks/mirrors, no subagents; Approach — verify every claim against the live tree before writing it, fold `thrive-port.md`'s unbuilt tasks in or defer them with a stated disposition · close: scope held — one file written; five plan-affecting facts corrected against the tree rather than taken from the evidence doc (see `## History`).
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — implement PR 1 (tasks 1-9) exactly as the plan specifies, landing on #449's existing branch; Bounds — PR-1-owned files only per the collision table, stage explicitly (never `-A`/`.`), leave `.prism/plans/conductor/` and `.prism/research/` untracked, leave the stash in place; Approach — work tasks sequentially, `pnpm prism:build && pnpm prism:check` after each, commit per task · close: scope held — the removal-completeness sweep (task 5) surfaced two sites the plan's own grep missed (a second `AGENTS.md` §-numbered heading list at line ~1786, and `templates/install/AGENTS.md.tmpl`, whose extension isn't in the plan's grep's `--include` list) plus one build-tooling gap (orphaned `templates/install` seed mirrors aren't cleaned up on canonical deletion, flagged as follow-up — see Signals in the report-back); one literal-instruction deviation recorded as a Decision (AGENTS.md § Behavioral norms: left the numbering gap instead of renumbering, since the table's own header sentence and an existing §7/§9 gap both establish number-stability as the actual invariant).
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — self-review PR #449 (PR 1 of the opus5-port stack) for correctness before merge, including three items Sol flagged during ratification (spec-scope-lint's silent skip, retirement-sweep completeness, stale lifecycle-marker prose); Bounds — chat-only findings, plan-only commit permitted for `## Review Issues`/`## PR Readiness`, no GitHub posts, no draft-flip, no merge; Approach — read the full 1,282-line canonical diff, run build/type-check/test/crossref-lint gates, dispatch three background sweeps for Sol's three items, independently verify the plan's Decisions against the live tree · close: scope held — 2 minor findings in PR 1's own content (`demand-elegance.md`'s condition-gate rewrite leaves two near-duplicate bullets; task 1's confirmed-redundant stash was never dropped, contradicting the plan's own Decision with no recorded reason), plus 1 confirmed tooling gap outside PR 1's diff (`spec-scope-lint` silently skips this entire 3-PR stack — two independent causes identified in `resolve-live-plan.ts`, reported as a found-bug signal rather than a PR 1 blocker since PR 1's own content was independently verified clean); retirement-completeness and lifecycle-marker-prose sweeps both came back fully clean.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — fix Briar's three self-review findings (demand-elegance.md near-duplicate bullet, the undropped stash deviation, the plan Ticket field blocking spec-scope-lint) in one focused pass; Bounds — the three named findings only, no draft-flip, no merge, no touching resolve-live-plan.ts; Approach — verify the stash-drop precondition before recording the reversal, verify the Ticket reword against the live resolver rather than assuming the regex match · close: scope held — all three findings fixed; the Ticket-field fix independently verified two ways (direct spec-scope-lint run, and a synthetic-branch-name call into findUnfiledPlanCandidatesBySlug). *Retroactively added — this session's own Sessions line was missed at the time; see the lessons.md entry on unverified review remedies for the pattern this gap is adjacent to.*
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — fix Eric's PR #449 pass-3 review (4 Major, 11 Minor) in one focused pass, the headline being AGENTS.md stating two predicates for the retired demand-elegance rule; Bounds — the named findings only, resolve-live-plan.ts and spec-scope-lint.ts off-limits, Spec Minor 5 explicitly out of scope (same underlying lint bug); Approach — sweep for the retired predicate itself rather than trusting the filename-scoped grep, verify every suggested fix against the live tree before writing it in rather than adopting text wholesale · close: scope held — swept beyond the named site and found the same stale predicate in templates/install/AGENTS.md.tmpl (a site outside the plan's own --include list); caught that Eric's suggested ^\./ grep anchor does not match in this repo's grep (tested, not assumed) and used a verified-working pattern instead. *Retroactively added along with the History entry below — 9c6d6d0e recorded the prior session's History entry but not its own or either session's Sessions line; see this session's lessons.md entry.*
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — final fix pass before Sol merges: restore a live carve-out Eric's own pass-2 comment prescribed deleting (a Major regression reintroducing a `load: always` rule / live-persona-workflow conflict), fix four named Minors, close the plan's own Sessions/History bookkeeping gaps, and land a lessons.md entry on unverified review remedies; Bounds — the named findings only, `resolve-live-plan.ts` and `spec-scope-lint.ts` off-limits, no draft-flip, Sol holds the merge gate; Approach — verify Eric's three factual claims (bare bullet, Parker's live Trigger dispatch, empty discriminator grep) independently before applying his suggested text, per the very lesson this session records · close: scope held — carve-out restored on the correct bullet (verified via the same grep Eric used, now non-empty); session-orientation's lost inline Why restored; demand-elegance's Purpose-restating bullet dropped; opus5-port's PR Readiness rewritten against a freshly re-run AC-15 verification (21 rules, 1,601 lines) rather than the stale recorded figure; two retroactive Sessions lines and one retroactive History entry backfilled for the prior two sessions; PR body synced; lessons.md entry appended verbatim as given.

- 2026-08-18 [main] open: Intent — replace PR 2's scope with a task list built against the operator's settled design decisions, transcribe those decisions into `## Decisions`, and propose stack cut lines for approval; Bounds — this plan file only, no code, no conductor run log, nothing in clove's PR 0 lane; Approach — verify every reversed premise against the tree before recording it, and cut the stack on the two safety constraints (credit before deny, guides before deny) rather than on diff size · close: scope held — one file written. Silent decisions named: lettered task IDs instead of renumbering 20–29; guides placed under `.prism/references/guides/` with a resolve-check task rather than assumed to route; the `Read(limit=1)` gap closed rather than accepted, because the Bash-credit rule forced the same question and made the fix three lines. Edge recall: empty manifest is no-fire by design; catch-all rejected by the empty-string test, verified against the live matcher; no-session-id never denies. Unproven and flagged, not asserted: subagent session-id semantics (B4 probes them, and D2 is blocked on the result), and the guide route form `../references/…` — C4 carries a resolve-check before commit rather than a claim.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — implement PR 2A (hook runtime → zero-dependency `.mjs`, registered and delivered, announce-once, no deny), tasks A1–A8 as described in the dispatch prompt; Bounds — A1–A8 files only, no deny gate, no credit-channel widening, no writing guides; Approach — port #457's harness table, convert the resolver, wire consumer delivery, verify with `pnpm prism:check` · close: **drifted — the A1–A8 task list this session was dispatched against was not present in this worktree's own committed `.prism/plans/opus5-port.md`** (resolved since, by the commit that landed the amendment on this branch; see the `## Decisions` entry on PR 2A's uncommitted-plan provenance). The dispatch prompt's task content came from a Read that, by mistake, resolved outside this isolated worktree; the sandbox now refuses re-verifying it. All A1–A8 scope was nonetheless implemented and independently verified against this worktree (`pnpm prism:check` green, 696 tests) because the design is coherent and plausible Winston output, not because it was confirmed against a committed plan. Reported `needs-replan` rather than claiming `done` against task IDs that did not resolve in the branch's own plan file.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — land the PR 2A–2E plan amendment onto this branch so the implementation already on it cites a plan that exists, without losing clove's session record; Bounds — `.prism/plans/opus5-port.md` only, no code, nothing under `.prism/plans/conductor/`, no draft-flip and no merge; Approach — reconcile rather than clobber (amendment as the base, clove's Decision/Sessions/History folded in), then check every `A1`–`A8` citation in the branch's two commits against the landed task list · close: scope held — one file written. Silent decisions named: clove's `OPEN` Decision replaced in place rather than left beside a resolution note, and its two pointers to that entry retargeted so no reference dangles; the amendment landed on the 2A branch rather than on `main`, on the plans-ride-their-PRs convention. Verification honesty: every `A1`–`A8` reference in `9fe03b74` and `8e160178` was grepped out of the commits and matched against `### PR 2A`'s task list — all resolve; A6 and A8 are implemented but never cited by ID, and #457 is confirmed `CLOSED` via `gh`. `pnpm prism:check` exit 0.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — fix Briar's PR 2A Major (settings-merge silently drops a consumer's own `PostToolUse`/`PostCompact` hook) and its paired test-coverage gap; Bounds — `mergeHookSettingsRegistration` and its tests only, no deny code, no rename/matcher/cold-start-leg touches; Approach — identify PRISM's own hook entries structurally by their `.claude/hooks/hook.mjs` command marker, compose within each shared event's array instead of replacing it, verify idempotence directly · close: scope held — `mergeHookSettingsRegistration` now composes via a new `mergeHookEventEntries` helper; 3 tests added covering consumer-hook survival, repeat-run idempotence, and the no-prior-settings path. `pnpm prism:check` exit 0, 699/699 tests (up from 696).
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — re-review PR 2A after `525614dd` fixed the settings-merge Major, and answer Sol's cross-harness question (does the same clobber risk reach Cursor/Codex?); Bounds — the fix, its coverage, and the cross-harness question only, A1–A8 not re-swept, no `PreToolUse`/deny code accepted; Approach — judge the discriminator's semantics rather than trust the green suite, grep `update.ts` for any Cursor/Codex settings-write path before answering · close: scope held — Major confirmed fixed and re-verified independently (699/699, substring-discriminator edge case noted as non-blocking, append-order confirmed harmless since 2A ships no deny arm); cross-harness question answered non-issue — no Cursor/Codex hook-registration delivery exists anywhere in this PR (A8 explicitly deletes `.cursor/hooks.json` rather than registering it), so there's no surface for this bug's pattern to repeat on yet.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — fix all 9 Majors and 8 Minors from Eric's PR #461 review, taking the Windows CI failure first and the two behavioral drifts slowly; Bounds — Eric's findings and their coverage only, no `PreToolUse` or deny code, no touching the rename-inversion mechanism from #460, `spec-scope-lint`'s cross-branch inconsistency left alone as a known defect, PR not marked ready and not merged; Approach — reproduce each behavioral finding before fixing it so the fix has a measured before-state rather than a passing test written after the fact, and commit in stages so the reviewer can diff each · close: scope held — five commits. Silent decisions named: hook-runtime ownership established by a marker line the shipped files carry rather than by a recorded hash, because `.claude/hooks/` sits outside the sync manifest's content root and a hash-less comparison would `.bak` on every version bump; the settings predicate anchored to PRISM's whole invocation shape rather than to the exact current command strings Eric suggested, because exact strings break idempotency the first time a later version changes its flags; stale-file pruning added alongside the enumerated copy, which Eric named as a consequence and the marker makes cheap and safe. Edge cases chosen deliberately: a truncated announcement leaves its dropped tail unannounced so a later read names it; the multi-path Codex loop may overshoot its byte budget by one announcement rather than discard one already marked announced; an unmarked file sharing `.claude/hooks/` is never pruned. Verification honesty: the Windows fix is reasoning about documented `fs.chmod`/`fs.stat` semantics on a platform this session cannot run, stated as reasoning and not as a run; every other fix has a measured before/after — 118 silenced docs to 0, consumer file clobbered to preserved-at-`.bak`, wrapper registration deleted to intact, and the new negative control confirmed to turn the leg red when one assertion is vacated. `pnpm prism:check` exit 0, 712/712.

---

## History

- 2026-08-13 [main]: Plan created by Winston under a Sol fleet dispatch, after a first attempt was interrupted by a process exit with nothing on disk. Three PRs, 29 tasks, superseding `thrive-port.md`; cross-PR collisions tabled with a per-file owner, and the PR 1 → 2 → 3 order shown to be forced rather than stylistic. Five facts were corrected against the live tree during authoring — see the next entry.
- 2026-08-13 [main]: Corrections made against the tree rather than inherited from the evidence doc. (1) `#449` conflicts only in `.prism/lessons.md` and `.prism/plans/thrive-port.md`, not in any rule body, so it is landed rather than superseded. (2) `stash@{0}`'s single line is already on `main`, closing the prior session's open question about what else it carried. (3) The always-on layer is 22 rules, not 20 — same 1,639 lines. (4) `## The run, in order` is 22 headings across 26 mentioning files, and `## Closing Re-Orientation Battery` is 30 headings across 31 mentioning files; the AC evidence commands are written against those measured numbers. (5) `thrive-port.md` task 16 (worktree `node_modules`) already landed as `3d50e8a9` (#451) and is dropped from the deferred set.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Implemented PR 1 tasks 1-9 across nine commits. Merged `origin/main` and retitled PR #449; added the subagent delegation tiebreaker; condition-gated `demand-elegance.md` and `code-standards.md § Refactor scope`; audited all 22 `load: always` rules for license phrasing (per-file table in the PR body); retired `context-window-handoff-check.md` end to end (rule, ADR, manifest keys, `AGENTS.md` table row and a second hand-authored heading list the plan's own grep missed, 11 skill bodies, two curated seed twins, and `templates/install/AGENTS.md.tmpl`); cleared the lifecycle-list markers from `session-orientation.md` and `response-shape.md` (plus a lowercase mention task 6's grep missed); marked `thrive-port.md` superseded. `pnpm prism:build && pnpm prism:check` green after every task. See `## Decisions` for the two deviations recorded during the sweep and a flagged build-tooling gap in the report-back signals.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Briar self-reviewed PR #449. Build, type-check, tests (662/662), and crossref-lint all green; two background sweeps independently confirmed the handoff-check retirement complete and the lifecycle-marker prose clean. Found: `demand-elegance.md`'s new first bullet duplicates its unchanged third bullet; task 1's confirmed-redundant `stash@{0}` was never dropped; `spec-scope-lint` silently skips this whole 3-PR stack (two root causes in `resolve-live-plan.ts`, unrelated to this PR's diff). See `## Review Issues` and `## PR Readiness`.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Fixed Briar's three findings in `4bf12dc8` — deduped the `demand-elegance.md` bullet, recorded the stash reversal as a `## Decisions` entry, reworded `## Ticket` to lead with "Unfiled" (fixes `spec-scope-lint` cause (2), verified against the live resolver; cause (1), `containsTokenRun`, stays open and out of scope per the operator). `## Review Issues` entries 1 and 2 flipped to `fixed`; entry 3 narrowed to the one remaining cause.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Fixed Eric's PR #449 pass-3 review in `9c6d6d0e` — 4 Major, 10 of 11 Minor (Spec Minor 5 out of scope, same lint bug as `## Review Issues` entry 3). Headline: `AGENTS.md`'s Behavioral norms table and `templates/install/AGENTS.md.tmpl` both still stated demand-elegance's retired "non-trivial changes" predicate; found via a predicate sweep, not a filename grep. Also merged `subagent-strategy.md`'s duplicate bullets, resolved `session-orientation.md`'s scaling-clause ambiguity, and fixed ten prose/bookkeeping minors across `demand-elegance.md`, `verification-before-done.md`, `response-shape.md`, `0006-context-window-handoff-check.md`, `skills-ecosystem.md`, `prism-handoff/shared.md`, and this plan. This commit's own `## Sessions` line and this History entry were both missing until the next session added them retroactively — see `.prism/lessons.md`.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Final fix pass before merge. Restored `subagent-strategy.md`'s self-verification carve-out that a prior pass-2 review comment had wrongly prescribed deleting — the deletion left the rule contradicting Parker's own live rubric-dispatch workflow (`prism-prd/step-06-review.md`), a Major confirmed independently (bare bullet, Parker's Trigger-level dispatch, empty discriminator grep) before fixing. Fixed four Minors: `session-orientation.md`'s scaling clause regained its own inline `**Why:**`; `demand-elegance.md`'s Purpose-restating bullet dropped; `## PR Readiness` rewritten against a freshly re-verified AC-15 (21 rules, 1,601 lines); two retroactive `## Sessions` lines and one retroactive `## History` entry backfilled for the two prior review-fix sessions. PR body synced to reflect all three review-fix rounds. Appended a `.prism/lessons.md` entry on treating a reviewer's prescribed remedy as an unverified hypothesis.
- 2026-08-18 [main]: PR 2 re-planned against the grilling gate's settled design and split into five stacked PRs (2A–2E). Deny scope became universal with the manifest flat — no flag, no schema change, no migration — and catch-alls are rejected computably by `compileMatcher(p)("")`; the nag became announce-once; the reset moved to `PostCompact`; decision guards and the `os.tmpdir()` state move were both dropped. Two refutation findings folded in and one recorded Decision corrected: the `moduleResolution` premise at the old line 64 is measured false, so the tsconfig edit and its duplicate-matcher fallback are deleted; the credit channel became a ship-gate ahead of the deny, and the `Read(limit=1)` full-credit gap is closed rather than accepted. See `## Decisions`.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Built the full PR 2A hook-runtime scope (harnesses table, `.mjs` resolver conversion, matcher's single owner, announce-once dedup, consumer-delivery seam in `update.ts`, computable catch-all/brace-glob rejection, `hook-gate.test.ts` with a cold-start `npm pack` leg) against a task list (A1–A8) that was not yet committed to this branch's own `opus5-port.md`. `pnpm prism:check` green (696 tests, 0 fail).
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Landed the PR 2A–2E plan amendment on this branch, reconciled against clove's implementation-session additions. Clove's `OPEN` Decision on the plan's unverifiable provenance is closed and replaced by a normal Decision recording the resolution and the placement reasoning. Every `A1`–`A8` citation in `9fe03b74` and `8e160178` now resolves against `### PR 2A`.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Fixed Briar's PR 2A Major — `mergeHookSettingsRegistration` (`scripts/ai-skills/update.ts:1041`) now composes within each shared event's array (`PostToolUse`, `PostCompact`) instead of replacing it wholesale, via a new `mergeHookEventEntries` helper that identifies PRISM's own entries by their `.claude/hooks/hook.mjs` command marker. Added 3 tests to `update.test.ts` covering consumer-hook survival, repeat-run idempotence, and the pre-existing no-prior-settings path. `## Review Issues` entry flipped to `fixed`; see the entry for the before/after behavior diff.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Briar re-reviewed PR 2A after the fix. Confirmed `525614dd` closes the Major (699/699 tests, semantics judged not just green); noted the `.claude/hooks/hook.mjs` discriminator is a substring match (narrow collision risk, non-blocking) and append-order is harmless while 2A ships no deny arm. Answered Sol's cross-harness question: Cursor and Codex have no hook-registration delivery path in this PR at all (A8 deletes `.cursor/hooks.json` rather than registering it), so the clobber bug's pattern has no surface to repeat on yet — not a new finding. Added `## PR Readiness (PR 2A — Hook runtime, #461)`.

---
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Eli swept the docs surface for staleness the PR 2A diff introduced and fixed eight false claims across seven files. Corrected the nag's characterization from enforcement to announce-once in `context-reuse.md`, ADR-0071's Decision and Consequences sections, and `architect-route.mjs`'s file-header JSDoc (which contradicted its own `resolveArchitectNag` docstring); corrected three shipped-surface inventories that went stale silently — ADR-0063's hand-listed `files` allowlist, `install-layout.md`'s "`scripts/ai-skills/**` is unshipped" claim, and both `docs/` tables still describing `.claude/settings.json` as an empty placeholder with no default hooks; documented hook delivery in `install-layout.md` and its seed twin, Claude-Code-only and explicitly not Cursor or Codex.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Scope note — the seed twin's "PRISM does not write your `.gitignore` for you" sentence and the missing hook-delivery documentation are task C6's assignment under PR 2C, but task A5 in this PR is what made them false (commit `8e160178` introduced `appendHookStateGitignoreLines`; it is absent on `main`). Fixed here per the `## Decisions` implementation guidance that the doc is corrected in the same PR rather than left contradicting the code. C6 still owns the `PRISM_HOOK_DENY_DISABLE` half, which describes the PR 2D deny arm and is not documented here.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Fixed all 9 Majors and 8 Minors from Eric's PR #461 review across five staged commits. The two behavioral fixes: announce-once no longer silences docs `formatNag` truncated away (measured 118 of 500 on a fan-out), and the delivery seam no longer overwrites consumer-owned files or deletes their settings entries. `pnpm prism:check` exit 0, 712/712; see `## Review Issues` for the per-finding table.

## Review Issues

### `demand-elegance.md`'s condition-gate rewrite leaves two near-duplicate bullets

- **Severity:** minor
- **Status:** fixed
- **Fixed in:** `4bf12dc8` — deleted the redundant third bullet; `.prism/rules/demand-elegance.md` now carries the firing-condition test once.
- **File:** `.prism/rules/demand-elegance.md:15,17` (byte-identical in `.claude/`, `.codex/`, `.cursor/`, and `templates/install/` mirrors)
- **Problem:** Task 3's new first bullet — "The test for whether this rule fires: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits do not." — and the third bullet, kept unchanged per the task's own instruction — "The test for which side you're on: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits don't." — now ask the identical question in near-identical wording. This is exactly the always-on-layer bloat AC-15 measures this PR as trimming.
- **Suggested fix:** delete the third bullet (the new first bullet already states the test) or merge the two.

### Task 1's stash drop was never executed, and the deviation isn't recorded

- **Severity:** minor
- **Status:** fixed
- **Fixed in:** `4bf12dc8` — added a `## Decisions` entry ("The `git stash drop stash@{0}` this plan calls for was deliberately not executed…") recording the reversal as Sol's explicit dispatch instruction, not the implementer's judgment, with the redundancy precondition's two independent verifications (Clove's task-1 run, Briar's self-review re-run) both cited. `→ no promotion needed` verdict recorded.
- **File:** N/A — local git state (`stash@{0}` on this checkout), not part of the pushed branch or diff
- **Problem:** the plan's Decision and task 1 both say to run `git stash drop stash@{0}` once `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returns `1`. Re-run during this review, it returns `1` — the documented precondition for dropping holds. The stash is still present (`git stash list` shows `stash@{0}` with the exact description the plan names). The implementation session's own `## Sessions` opening-battery line states a Bound of "leave the stash in place," contradicting the Decision, with no `## Decisions` entry explaining the reversal — unlike the properly-documented AGENTS.md renumbering deviation from the same session.
- **Suggested fix:** run `git stash drop stash@{0}` now, or add a `## Decisions` entry recording why it was deliberately kept.

### `pnpm prism:spec-scope-lint` silently skips this entire PR stack

- **Severity:** major (tooling gap outside PR 1's diff — does not block PR 1; its own content was independently verified clean via `crossref-lint`, build, tests, and two full-tree sweeps)
- **Status:** open — cause (2) fixed, cause (1) remains and is out of scope for PR 1
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts` (not touched by this PR — the operator has ruled that build tooling does not ride this rules PR; a second, independent bug in `discriminatorFor` (builds `prism-changelog/` with a trailing slash against the plan's slash-free `prism-changelog`, ~10-25 false positives once cause (1) is relaxed) makes the eventual fix two-part, not one)
- **Problem:** `resolveLivePlan` never resolves `.prism/plans/opus5-port.md` as the live plan for branch `huntermcgrew/thrive-port-opus5-rule-amendments`, so `spec-scope-lint` — the mechanical gate `.claude/rules/followup-scope.md § Spec content never rides an unrelated ticket` names — silently no-ops (`pnpm prism:check` prints "no live plan resolved for this branch — skipping" and continues green) instead of running on a PR that edits 8 always-on rule files. Two independent causes were confirmed by executing the resolver's own logic against this branch and plan. **Cause (2) is now fixed:** the plan's `## Ticket` field was reworded in `4bf12dc8` to open with "Unfiled — no tracker ticket…", which matches `UNFILED_TICKET_RE`; independently verified by calling `findUnfiledPlanCandidatesBySlug` with a synthetic branch name containing `opus5-port` in matching order, which correctly resolved this plan. **Cause (1) remains open and is this PR's local frame's edge:** `containsTokenRun` requires the branch's tokens to contain the plan-filename's tokens as a contiguous, in-order run; branch `thrive-port-opus5-rule-amendments` tokenizes to `[thrive,port,opus5,rule,amendments]`, which does not contain `[opus5,port]` in that order (the branch predates the plan's rename from `thrive-port.md`) — so `pnpm prism:spec-scope-lint` still prints "no live plan resolved for this branch — skipping" on this exact branch. PR 2 and PR 3's branch names (`opus5-port-hooks-mjs`, `opus5-port-roster-slim`) satisfy cause (1) as written, so they get real coverage once this fix lands.
- **Suggested fix:** relax `containsTokenRun` in `resolve-live-plan.ts` to unordered set-containment (needed specifically for PR 1's pre-rename branch name), and fix `discriminatorFor`'s trailing-slash mismatch in the same change — landing either alone regresses the other. Neither fix sits in PR 1's local frame (`.claude/rules/code-standards.md § Refactor scope`) — route as its own follow-up, ideally landed before PR 2 branches so the stack gets real spec-scope coverage.

### Eric's PR #461 review — 9 Majors, 8 Minors

- **Severity:** major
- **Status:** fixed
- **File:** `scripts/ai-skills/update.ts`, `scripts/ai-skills/hooks/*.mjs`, `scripts/ai-skills/verify-manifest-coverage.ts`, `scripts/ai-skills/verify-pack-parity.ts`, `scripts/ai-skills/hook-gate.test.ts`, `scripts/ai-skills/architect-route.test.ts`, `scripts/ai-skills/update.test.ts`
- **Problem:** nine Majors, one of which turned the Windows CI leg red, and two of which were behavioral drifts invisible from either side alone — announce-once marking docs announced that `formatNag` then truncated away, and a delivery seam that silently overwrote consumer-owned files while an unanchored marker deleted their settings entry.
- **Fixed in:** `b10a993a` (Windows leg), `5bbff71b` (announce truncation), `512adc1b` (consumer clobber, all three arms), `528d8b15` (catch-all predicate, three-manifest gate, pack parity, negative control), `df7a4fff` (Minors).

Per-finding disposition:

| Finding | Disposition |
| --- | --- |
| S1 — delivery seam clobbers consumer files (copy, marker, coverage) | fixed — all three arms |
| S2 — executable-bit assertion cannot pass on Windows | fixed — leg skipped on `win32` |
| S3 — catch-all probe not equivalent to "constrains nothing" | fixed — leading-literal-segment requirement |
| P1 — `templates/install/.claude` absent from `RUNTIME_READ_PATHS` | fixed |
| P2 — negative control is a tautology | fixed — control now breaks real delivered state |
| P3 — announce-once silences truncated docs | fixed — `formatNag` reports what it named |
| P4 — AC-13's evidence command returns its own UNMET value | fixed — AC amended to exclude declarations |
| P5 — catch-all gate reads one of three manifests | fixed — all three checked structurally |
| P6 — AC-29's gitignore assertion is a substring, idempotency untested | fixed — both globs asserted as whole lines, plus a repeat-run unit case |
| S4 / P7 — `resolveToolKind` and `toolKinds` unverified | fixed — kept and pinned, per the routing call |
| S5 — changelog and session voice in comments shipped to consumers | fixed |
| S6 — Codex `apply_patch` routes only the first path | fixed — walks every path under a byte budget |
| S7 — `main()` has no rejection handler | fixed |
| S8 — tarball can leak; leg mutates `dist/` | leak fixed; the `dist/` write is inherent to `prepack` and out of this PR's frame |
| S9 — `.d.mts` sidecars hand-maintained, nothing checks them | partly fixed — `checkJs` now enforces the `.mjs` JSDoc; sidecar-vs-implementation comparison is a follow-up (see below) |
| S10 — two `update.ts` functions untested | fixed — both exported and covered, including dry-run and gitignore branches |
| P8 — scope creep | no action — Eric found none material |

### Nothing compares a `.d.mts` sidecar against its implementation

- **Severity:** minor
- **Status:** open — follow-up
- **File:** `scripts/ai-skills/hooks/*.d.mts`
- **Problem:** `scripts/ai-skills/tsconfig.hooks.json` closes half of S9 — with `allowJs`/`checkJs` the `.mjs` JSDoc annotations are enforced, verified by introducing a JSDoc-contradicting call and watching only the new config report it. It does not close the other half. TypeScript resolves the `.d.mts` when an importer names the `.mjs`, so it type-checks importers against the declaration and never compares the declaration to the implementation; a probe that drifted `formatNag`'s declared return type produced no error from that config. A drift is caught today only when some test happens to use the drifted shape.
- **Suggested fix:** emit declarations from the `.mjs` with `tsc --declaration --emitDeclarationOnly --allowJs` into a temp dir and assert the exported signatures match the checked-in sidecars, ignoring comments. Confirmed feasible — the generated output carries the same signature lines — but it is a new build gate rather than a config flag, so it belongs in its own change.

---

## PR Readiness (PR 1 — Rules retune, #449)

- [x] No critical or major issues in PR 1's own diff — all 4 Majors from Eric's pass-3 review fixed (`9c6d6d0e`), including the one pass-2 regression Eric's own earlier comment introduced (the deleted Parker step-06 carve-out, restored this session). The one remaining open Review Issue (`spec-scope-lint`'s `containsTokenRun` cause) is a pre-existing tooling gap outside this PR's files, owned by a separate prerequisite PR
- [x] No stray console.logs or debug artifacts — N/A, no code in this PR
- [x] All debugged issues resolved — none recorded
- [x] Build passes — last run: 2026-08-13. `pnpm prism:build`, `pnpm prism:check-types`, `pnpm prism:test` (662/662), and `pnpm prism:crossref-lint` all green. `pnpm prism:spec-scope-lint` skipped (see Review Issues) — not a PR 1 regression, a pre-existing plan/branch-name resolution gap
- [x] Task 4's required per-file audit table is present in the PR body and independently spot-checked accurate (4 unaudited "known candidate" files confirmed correctly `n/a` — each already leads with its firing condition)
- [x] AC-15 re-verified directly after this session's edits: 21 `load: always` rules, 1,601 total lines (< the 1,639-line baseline; down from 1,604 at the prior checklist update)
- [x] PR description up to date — synced to reflect the two review-fix rounds and this session's findings
- [ ] Lasting decisions promoted to architect context — all `## Decisions` entries above carry "→ promotion verdict pending close," correctly deferred to plan close rather than PR 1

**Last updated:** 2026-08-13

---

### `refreshHookRuntime`'s settings merge can silently drop a consumer's own `PostToolUse`/`PostCompact` hook

- **Axis:** standards
- **Severity:** major
- **Status:** fixed
- **Fixed in:** `525614dd` — `mergeHookSettingsRegistration` now composes within each event's array via a new `mergeHookEventEntries` helper instead of replacing it. Ownership of "PRISM's own entry" is decided structurally: any hook object whose `command` contains `.claude/hooks/hook.mjs` (`HOOK_ENTRY_POINT_MARKER`) is PRISM's; everything else in that event's array is the consumer's and is kept. On each run, PRISM's own prior entries are dropped and its current entries appended after the consumer's, so re-running the merge never duplicates PRISM's registration and never drifts the consumer's. Non-shared event names are unaffected — they still pass through the outer object spread untouched.
- **File:** `scripts/ai-skills/update.ts:1041` (`mergeHookSettingsRegistration`)
- **Problem:** the merge is `{ ...targetSettings.hooks, ...sourceSettings.hooks }` — a shallow merge at the top level of `hooks`. For an event name PRISM doesn't register (e.g. a consumer's own `SessionStart` hook), this is additive and safe. For `PostToolUse` and `PostCompact` — the two names PRISM does register — a consumer's own pre-existing array for that same event name is replaced wholesale by PRISM's array, not merged into it. The function's own docstring says "never overwriting an existing registration block," which is true for other event names but false for these two. Task A5's plan text ("merge the registration block … never overwrite it") reads as the same overwrite-anything-existing intent the docstring states, and the current shape doesn't fully deliver it.
- **Class:** shallow-merge-drops-sibling-array — a two-level structure (`hooks.<eventName>[]`) merged only at the top level, so writing a new value for a key a consumer might already occupy discards their content instead of composing with it.
- **Sweep:** `grep -rln "mergeHookSettingsRegistration\|refreshHookRuntime" scripts/` returns only `update.ts` itself — no test file references either function, so there is no coverage proving the "never overwrite" claim, and none catching a regression on it. The cold-start integration leg in `hook-gate.test.ts` doesn't reach this either — it runs `adopt` into a fresh consumer with no pre-existing `.claude/settings.json`, so the merge always takes the "target has no `hooks`" branch there.
- **Suggested fix:** either merge within the event-name array (append PRISM's hook object only if an equivalent one isn't already present) or detect a foreign registration under the same event name and warn/preserve it alongside PRISM's rather than replacing it. Add a test seeding a consumer `.claude/settings.json` with a pre-existing `PostToolUse` array for an unrelated tool and asserting it survives the merge.
- **Verified (re-review, `525614dd`):** semantics judged, not just the green suite. `isPrismOwnedHookEntry` matches `command.includes(".claude/hooks/hook.mjs")` — a substring check, not an anchored path match, so a consumer whose own hook entry happens to reference a path containing that exact segment would misclassify as PRISM's; the collision requires a consumer to reuse PRISM's own relative path convention, which is possible but narrow — noted, not blocking. "Append after the consumer's" is arbitrary but harmless for 2A: this PR ships no deny arm (confirmed via grep, per Angle Coverage's Security line), so no entry on the shared event can block another, and ordering carries no semantic weight until a future PR adds one. 3 new tests (`consumer-hook survives`, `repeat-run non-duplicating`, `no-prior-settings`) plus the full suite re-run: 699/699 (up from 696, confirming the 3 additions land as new tests, not replacements).
- **Cross-harness scope (answered, not a new finding):** `refreshHookRuntime` (`update.ts:976`) and `mergeHookSettingsRegistration` write only to `<consumer>/.claude/hooks/` and `<consumer>/.claude/settings.json` — grepped the full `update.ts` for `hooks.json`, `.codex/config`, and any Cursor/Codex settings-write path; none exists. This isn't an oversight this PR introduced: task A8 explicitly deletes `.cursor/hooks.json` from the tree ("an unregistered config file is worse than none"), and no task in A1–A8 adds a Cursor or Codex delivery seam. The `HARNESSES` table in `harnesses.mjs` makes the hook script's *dispatch logic* harness-generic, but PR 2A's *delivery* mechanism only reaches Claude. Cursor and Codex have no mergeable registration surface in this PR at all, so there's nothing for this bug's pattern to repeat against — the consumer-hook-clobber risk is Claude-only until a later PR builds Cursor/Codex delivery, at which point this same fix's shape (compose within the array, not replace it) is the thing to carry forward.

### Angle Coverage

- Structural: `swept` — diff limited to the 24 files in the pinned range; no structural surprises beyond the settings-merge finding above.
- Contract: `swept` — `HarnessSpec`/`HARNESSES`, `compileMatcher`, `resolveArchitectNag`, `runPostToolUseArm`/`runPostCompactArm` signatures inspected directly; match plan A1/A2/A4 specs.
- Behavioral: `swept` — announce-once, foreign-payload guard, no-session-id no-op, `PRISM_HOOK_DISABLE=1`, catch-all/brace-glob rejection all read and cross-checked against their test cases.
- State/lifecycle: `swept` — state file location, atomic write, 24h prune, `read`/`announced` array semantics all verified against `architect-route.mjs` directly (unchanged from the pre-existing implementation plus the new `announced` array, per Decision).
- Security: `swept` — no deny arm shipped (confirmed via grep for `PreToolUse`/`deny` across the hook runtime and both `settings.json` files); `.gitignore` append is append-only and idempotent; no secrets or credentials touched.
- Performance: `swept` — no new hot paths; hook runs once per matched tool call, same shape as the pre-existing TS version.
- Test coverage: `swept` — 20/20 tests ported from `architect-route.test.ts`, all 6 folded from `claude-post-read.test.ts` into `hook-gate.test.ts` under new names, cold-start leg genuinely runs `npm pack` output (2.3s in a live run, not a stub); the settings-merge gap this axis previously found is now closed by 3 tests in `525614dd` (consumer-hook survival, repeat-run idempotence, no-prior-settings), re-verified this pass. 699/699 total.
- Spec and doc consistency: `swept` — every A1–A8 citation traced against the landed code; no divergence from plan intent found. `525614dd`'s docstring rewrite for `mergeHookSettingsRegistration` now accurately states its own "never overwrite" behavior — the previous mismatch between the docstring's claim and the code's shallow-merge behavior is resolved.
- Citation integrity: `swept` — Decisions' cross-references (ADR-0071, #457, tsconfig measurement) checked against the actual diff; the reversed tsconfig Decision is correctly reflected in the diff (no tsconfig edit present).
- Docs impact: `n/a` — no `docs/` surface touches this diff.

**Last updated:** 2026-08-18

---

## PR Readiness (PR 2A — Hook runtime, #461)

- [x] No critical or major issues — all 9 Majors and 8 Minors from Eric's review are fixed; see `## Review Issues` for the per-finding record
- [x] Types correct — no `any`, no unsafe `as`. `prism:check-types` now also runs `tsc` with `allowJs`/`checkJs` over `hooks/**`, so the runtime's JSDoc annotations are enforced rather than decorative
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — the delivery seam's clobber, marker, dry-run, prune, and gitignore-idempotency branches are covered, the announce-truncation boundary is pinned, and the cold-start leg carries a control that breaks real delivered state. `pnpm prism:check` exit 0, 712/712
- [x] All debugged issues resolved — none recorded for PR 2A
- [x] Build passes — last run: 2026-08-18. `pnpm prism:check` exit 0, 712/712
- [ ] PR description up to date — not synced this pass; the review-fix scope is recorded here and in the branch's commit messages
- [ ] Lasting decisions promoted to architect context — deferred to plan close per the verdict-gate convention

**Last updated:** 2026-08-18
