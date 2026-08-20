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

- **Read credit is the caller's judgment, opt-in per call, and `resolveArchitectNag` credits nothing by default.**
  - **Root cause of the question:** the resolver credited any read whose path was a doc under `.prism/architect/`, which is the only signal it can see. It cannot tell a whole-file `Read` from `Read(limit: 1)`, a `cat` from a `head -20`, or a real read from a `Grep` that merely names the file.
  - **Alternatives considered:** keep crediting inside the resolver and pass the range fields down to it; add a separate `creditRead` entry point beside `resolveArchitectNag`.
  - **Chosen approach:** a fourth `{ credit }` options argument, defaulting to `false`. Passing the range fields down would give the resolver a Claude-shaped payload concern it has no other reason to know, and a second entry point splits one decision across two call sites that then have to stay in step. Defaulting to `false` means a channel added later under-credits until someone thinks about it — the direction whose cost is one re-read rather than a silently-defeated gate.
  - **Implementation guidance:** `hook.mjs`'s `resolveTargets` is the one place that decides. `read` credits only with no `offset` and no `limit`; `shell` credits only a flagless `cat`; `search` and everything else announce and never credit.
  - **→ promotion pending — PR 2D's ADR-0072 (`## Consequences`) is where the credit channel's coverage and its gaps belong, since they are what makes the deny satisfiable.**

- **A shell command carrying any pipeline, redirect, or substitution character parses to zero targets.**
  - **Root cause of the question:** `cat a | grep b` reads `a`, but `grep -f patterns b` does not read `patterns`, and a parser that tries to tell those apart from a token stream is wrong more often than silence is.
  - **Alternatives considered:** parse the first stage of a pipeline and ignore the rest; shell-tokenize properly with quote handling.
  - **Chosen approach:** bail on `|`, `&`, `;`, `<`, `>`, backtick, and `$(`. Fewer announcements, no wrong credits. A real tokenizer is a dependency this zero-dependency runtime is not paying for.
  - **Implementation guidance:** the gaps are named in a comment on `parseShellReadTargets` — pipelines, redirects, substitution, `xargs`, and paths containing spaces.
  - **→ no promotion needed (parser scope for one function; the comment on it is the durable record).**

- **PR 1 lands on #449's existing branch; it is not superseded by a fresh PR.**
  - **Root cause of the question:** #449 is `CONFLICTING` against `main` and has been open since 2026-07-30, which reads like a stalled branch worth abandoning.
  - **Evidence:** `git merge-tree --write-tree origin/main origin/huntermcgrew/thrive-port-opus5-rule-amendments` reports exactly two conflicts — `.prism/lessons.md` (append-order) and `.prism/plans/thrive-port.md` (add/add, because main acquired its own copy via `huntermcgrew/context-delivery-mechanism`). **None of the three rule bodies conflict.** The branch is 4 ahead / 8 behind.
  - **Alternatives considered:** close #449 and re-author the three amendments in a new PR; cherry-pick the three rule commits onto a fresh branch.
  - **Chosen approach:** rebase-or-merge #449 onto `origin/main`, resolve the two mechanical conflicts, and add PR 1's remaining work as further commits on the same branch. Re-authoring throws away two rounds of Eric review fixes (four findings pass 1, two pass 2, all recorded in `thrive-port.md § Review Issues`) and would re-litigate language a human already ruled on.
  - **Implementation guidance:** `.prism/lessons.md` is append-only — take both sides. `.prism/plans/thrive-port.md` — take `origin/main`'s copy wholesale; see the stash Decision below for why the branch copy carries nothing unique.
  - **→ no promotion needed (branch-routing tactic for one PR; #449 merged as `ccbef3d0`).**

- **`stash@{0}` is stale and carries nothing that is not already on `main` — drop it, do not apply it.**
  - **Evidence:** `git stash show -p stash@{0}` is a single-line `## History` append to `.prism/plans/thrive-port.md` (the 2026-08-01 thrive-PR-inventory entry). `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returns `1` — the line is already on `main`.
  - **Chosen approach:** `git stash drop stash@{0}` as part of task 1, after the grep above is re-run and returns `1`. The prior session's note that "whatever else `stash@{0}` carries may still belong on the branch" (`thrive-port.md § Decisions`, provenance entry) is now answered: it carries nothing else.
  - **→ no promotion needed (one-time working-tree judgment, superseded by the reversal Decision below).**

- **The `git stash drop stash@{0}` this plan calls for was deliberately not executed — reversed by Sol's explicit instruction during PR 1 implementation, not by the implementer's judgment.** The redundancy precondition above still holds — `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returned `1` when Clove ran it (task 1) and again when Briar re-verified it in self-review — so nothing about the "safe to drop" analysis changed. What changed is who owns the drop: the stash is operator data, dropping a stash is irreversible, and no operator was available mid-dispatch to confirm the drop in the moment. Sol's dispatch instructions for this session named the drop as the one step to skip and report on instead.
  - **Current state:** `stash@{0}` is still present on `huntermcgrew/thrive-port-opus5-rule-amendments` as of this Decision. The operator (Hunter) can drop it at will — the precondition that makes it safe to drop has been verified twice and holds.
  - **→ no promotion needed (session-scoped operational note; the underlying redundancy Decision above is what would promote, not this reversal).**

- **The authoring-route deny is scoped to authoring paths only; `code` routes stay nag-only on every verb.** This reverses the recommendation in [ADR-0071](../spec/adrs/_toolkit/0071-architect-context-read-hook.md) (design 2, "a `PreToolUse` gate on `Edit` … adds friction and false positives") and contradicts the live line in `.ai-skills/skills/prism-conductor/shared.md:106`. Both are corrected in PR 2, by ADR and by edit respectively — a carve-out that leaves the tree contradicting itself is worse than no carve-out.
  - **Root cause the carve-out addresses:** architect-context routing is diff-blind (ADR-0071 § Context). The nag names the doc; nothing makes reading it a precondition of the edit. On instruction-layer files — rules, ADRs, skill bodies — an edit made without the governing doc does not merely produce worse code, it produces *wrong spec that later readers execute*.
  - **Why this is not the reverted floor:** ADR-0067's gate sat on the `Stop`/`SubagentStop` report-back channel, so a blocked persona spent its final turns fighting its own gate and one dogfooding agent tried to edit the gate's code. This gate sits on a mid-work `Write`/`Edit` call, is cleared by reading a document, and never touches the report-back turn. [ADR-0069](../spec/adrs/_toolkit/0069-deterministic-verification-is-a-pipeline-stage.md)'s permanent rejection is explicitly scoped — "no gate, of any shape, sits on the turn where a persona reports back to Sol" — and this gate does not. `epic-floor-revert.md § Decisions` ("No hooks survive") left the door open in the same breath: *"If a lightweight `ownership-guard`-only safety is wanted later (write-lane protection without verdict ratification), that is a separate, smaller opt-in — not this revert."*
  - **Alternatives considered:** deny on all routes including code (rejected — a code deny is the friction ADR-0071 named, on a surface where a missed doc costs a review comment, not a wrong rule); keep nag-only everywhere (rejected — the status quo, and the operator has approved the scoped deny); a prose rule instead of a hook (rejected — `context-reuse.md § Architect-context routing is diff-blind` already *is* that prose rule and the gap persisted).
  - **Implementation guidance:** the deny is task 12; the ADR is task 17; the conductor-line edit is task 17. All three ship in PR 2 or PR 2 is incoherent.
  - **→ promotion verdict pending — resolves at PR 2D close, into ADR-0072.**

- **The shared core lives at `.prism/references/skill-core.md`, not at `.ai-skills/skills/_shared/core.md`.**
  - **Root cause:** portable-skills' `_shared/core.md` sits beside the skills because that roster's skills *are* the install surface. PRISM's are not — `generatePlatformSkills` (`scripts/ai-skills/generate-skills.ts:542-600`) iterates the roster from `.ai-skills/definitions/roles.json` and writes `<targetRoot>/<skillId>/SKILL.md`. A `_shared/` sibling would need a roster exclusion, a copy pass, a `seed-curation.json` classification, an eject-cleanup exemption (eject removes `prism-*` prefixed dirs; `_shared` is not one), and a `package.json#files` entry.
  - **Evidence for the alternative:** `.prism/references/**` already ships (`package.json#files`), already gets a platform copy on every build, and is already the citation shape 31 skill bodies use — 25 cite `context-reuse.md`, 18 cite `references/session-close.md`, 31 cite `session-orientation.md`. `session-close.md` is a partial shared core today; this names the seam and finishes it.
  - **Alternatives considered:** `_shared/` under `.ai-skills/skills/` (rejected above); a build-time partial inline (rejected — `build.ts` has no include mechanism, and inlining reintroduces per-persona copies that fork, which is the exact failure portable-skills' single-shape-owner rule exists to stop).
  - **Chosen approach:** one file, `.prism/references/skill-core.md`, read at Step 0 by every persona before greeting. Quote a fragment, never restate it. A persona that overrides a core section writes a one-line stub under the core's heading name.
  - **→ promotion verdict pending — resolves at PR 3 close.**

- **PR 1 removes `session-orientation.md § Lifecycle List` and retargets `response-shape.md`'s state-line trigger, because PR 3 deletes the marker both rules key on.** `response-shape.md:65` reads: *"it fires only when the current run has ordered phases, the same marker `session-orientation.md` § Lifecycle List uses: a skill carries a `## The run, in order` list."* PR 3 deletes all 22 of those headings. Shipping PR 3 first leaves two always-on rules pointing at a marker that exists nowhere — the removal-completeness failure `code-standards.md` names, in its behavior-changed-without-a-token variant. PR 1 owns both rule edits; PR 3 owns the skill-body deletions.
  - **→ no promotion needed (sequencing constraint between PR 1 and PR 3; it lives in PR 3's task text and expires when PR 3 lands).**

- **DoD blocks lose the checklist, keep real criteria — this is Rule 2 applied, not a reversal of the floor-revert.** `epic-floor-revert.md § Decisions` (Shape 2 and its Class A variant) deliberately preserved each skill's `## Definition of Done` because the gate-enforced `types`/`lint`/`tests` criteria were Clove's genuine DoD, merely enforced by the gate. Evidence Rule 2 `[Anthropic]` says explicit verification instructions cause over-verification on Opus 5. These reconcile on one deletion test, already approved as `thrive-port.md` task 4: **does this item tell the model something its defaults or an already-cited always-on rule do not?** Items restating a battery, "types pass", "no stray console.logs", or "full diff read" go. Items carrying skill-specific policy — "No implementation code written", "AC synced to tracker", Clove's build gate — stay. The heading survives wherever real criteria remain, so no acceptance criterion asserts a heading count of zero.
  - **→ promotion verdict pending — resolves at PR 3 close.**

- **The `.mjs` runtime owns `compileMatcher`. No tsconfig edit — the premise the old Decision rested on is measured false.** The prior version of this Decision said root `moduleResolution: "node"` "cannot resolve a `.mjs` specifier or a `.d.mts` sidecar" and prescribed adding `"moduleResolution": "bundler"` to `scripts/ai-skills/tsconfig.json`, with a duplicate-matcher fallback.
  - **Root cause of the correction:** the claim was reasoned, not measured. Clove built a probe replicating this repo's tsconfig chain on tsc 5.9.3: `node` + `.d.mts` sidecar **passes**, `bundler` + sidecar **passes**, and both fail identically with TS7016 only when the sidecar is removed. The sidecar is what makes it resolve; the resolution mode is not the variable.
  - **Chosen approach:** move `compileMatcher` into `scripts/ai-skills/hooks/lib/match.mjs`, ship `match.d.mts` beside it, and import it from `verify-manifest-coverage.ts` unchanged. Do not touch `scripts/ai-skills/tsconfig.json`.
  - **Implementation guidance:** the duplicate-matcher fallback is deleted, not kept in reserve — it guards a failure that cannot occur, and a recorded fallback for an impossible failure is an invitation to take it on the first unrelated red build. AC-13 loses its two-path branch for the same reason.
  - **→ promoted to `.prism/architect/_toolkit/install-layout.md` § Hook-runtime ownership and recovery — the zero-dependency constraint, the `.d.mts` sidecar that makes a `.mjs` specifier resolve under the root `moduleResolution`, and `compileMatcher`'s single owner.**

- **Consumers receive the hook as a copied file in their own repo, not as a `node_modules` path.** ADR-0071 named the unblock condition as *"once `scripts/ai-skills/hooks/` ships in `files` and that seed is updated to match"* — but a registration pointing into `node_modules/@huntermcgrew/prism/...` reintroduces the dependency the `.mjs` conversion exists to remove (an `npx`-installed consumer may have no such tree). Instead `prism:adopt`/`prism:update` copy the runtime into the consumer's `.claude/hooks/`, and the seeded `settings.json` invokes `node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude`. `files` still gains `scripts/ai-skills/hooks/` because the copy source must be in the tarball, and `RUNTIME_READ_PATHS` gains it because `verify-pack-parity.ts` is the gate that catches an omitted `files` entry (the 0.7.1 `config.schema.json` failure).
  - **→ promoted to `.prism/architect/_toolkit/install-layout.md` § Hook-runtime ownership and recovery and its curated seed twin — delivery is a copy into the consumer's `.claude/hooks/`, never a `node_modules` path, because an `npx`-installed consumer has no such tree.**

- **PR 2 stacks on PR 1 rather than reconciling #457 by merge.** #457 is an open draft that refactors the same three files into a `--tool=` dispatcher with a `HARNESSES` table, adds `.cursor/hooks.json`, and hardens `verify-manifest-coverage.ts` against brace globs. Its harness-table *shape* is what evidence § 8 prescribes and PR 2 needs; its *substrate* is TypeScript-via-`tsx`, which is the delivery blocker. Rebuilding the table from scratch in `.mjs` discards a reviewed design; merging #457 first and then rewriting every file it added produces two review passes over the same lines.
  - **Chosen approach:** PR 2 branches from PR 1 and ports #457's `HarnessSpec`/`HARNESSES`/`resolveToolKind`/`extractPatchFilePaths`/foreign-payload-guard design into `.mjs`, citing #457 as the design source in the PR body. #457 is then closed as superseded, not merged — its ADR-0071 link sweep and its `verify-manifest-coverage.ts` brace-glob rejection are carried forward as task 9's explicit sub-items so nothing in it is lost.
  - **Alternatives considered:** merge #457, then convert (rejected — double review of the same lines, and `main` briefly carries a TS runtime the next PR deletes); ship PR 2 without the harness table (rejected — evidence invariant 6 makes the table the only place harness-specific field names may live).
  - **→ no promotion needed (one-time reconciliation of a superseded draft; #457 is `CLOSED`).**

- **`thrive-port.md` is superseded by this plan, and its unbuilt tasks that do not fit these three PRs are re-homed here as a named deferred set** (§ Deferred — not in this stack). Leaving a second plan open with five unstarted PRs is the stalled-plan shape this dispatch exists to clear.
  - **→ no promotion needed (plan-lifecycle bookkeeping; § Deferred — not in this stack is the durable half and stays in this plan).**

- **OPEN — TBD, needs Hunter input.** Whether the closing battery in `.prism/rules/session-orientation.md` should scale with task size the way the opening battery now does. Carried forward unresolved from `thrive-port.md § Decisions` (Eric PR #449 pass-2: `close:` carries one verdict token where `open:` has three answer slots, so a collapsed closing shape needs its own definition, not an implied mirror). **Default path (used until resolved):** the closing battery keeps its unconditional four-question form; PR 3 collapses only the per-skill *restatement*, never the rule.
  - **→ no promotion needed (open question — exit condition: Hunter rules on it, or PR 3's collapse of the per-skill battery restatements forces a closing-shape definition that cannot be deferred).**

- **OPEN — TBD, needs Hunter input.** Whether prompt-time persona routing (thrive #2275) is worth porting. Evidence § 1 measures it as the difference between an 8–9-file relevant run and a 3-file run that shipped an invisible fix, and PRISM's `skill-routing.md` is the same buried-table shape the hook was written to replace. **Default path (used until resolved):** not in this stack. It is a fourth PR on the same hook runtime PR 2 builds, and stacking it here would make PR 2 unreviewable.
  - **→ no promotion needed (open question — exit condition: this stack lands and a fourth hook-runtime PR is scheduled, at which point the routing port is planned or dropped on its merits).**

- **Canonical-surface discipline (inherited from `thrive-port.md`, unchanged):** every rule edit lands in `.prism/rules/`; `.claude/rules/`, `.codex/rules/`, `.cursor/rules/`, and `templates/install/.prism/rules/` are build-managed mirrors regenerated by `pnpm prism:build`. Every skill edit lands in `.ai-skills/skills/<id>/shared.md`. Editing a mirror is the failure mode. Every task below names source paths only. **The hand-maintained exceptions** are `AGENTS.md`'s `## Behavioral norms` pointer table (the generated rule-body block below it *is* regenerated by `agents-md-block.ts`), plus every seed twin whose path is listed under `curated` in `.ai-skills/definitions/seed-curation.json` — the build skips those before writing, and `checkSeedDrift` only checks for *existence*, never content, so both halves of a curated pair are edited by hand. That list is the membership rule; it grows as this stack classifies more files, so read it rather than a count.
  - **→ no promotion needed (already codified in `install-layout.md` § Canonical sources and platform mirrors; the two hand-maintained exceptions are scoped to the files this stack touches).**

- **Task 5's `AGENTS.md § Behavioral norms` instruction says "delete row 8 and renumber the rows below it" — implemented as delete-and-leave-the-gap instead, across both places the number appears.** The table's own header sentence states the numbers are "kept so existing `AGENTS.md §N` cross-references still resolve," and the table already carries a live precedent for this: §7 and §9 are both missing from the compact table (a prior removal left the gap rather than renumbering), and `core-principles` sits at an unnumbered `—` row rather than claiming either slot. The removal-completeness sweep (`code-standards.md § Removal and rename completeness`) surfaced a second, un-named-by-the-task structure sharing the same number space: `AGENTS.md` also carries a full `## N. Title` heading list (lines ~1760–1814, after the generated Tier-1 block) that the compact table indexes — §7 (Project Engineering Standards) and §9 (Ownership & Handoff) exist there with real content, which is *why* the compact table skips them (their target isn't a single `.prism/rules/*.md` file, so the table's `Rule` column has nothing to point at). This confirms the numbers are a single shared space across both structures, not two independent ones.
  - **Chosen approach:** deleted §8's content in both places and left the numbering gap (`6 → — → 10 → 11 → 12` in the table; `7 → 9` in the heading list), matching the §7/§9 precedent. `AGENTS.md § 8` was the one live citation of the retired section (in ADR-0006, which this same task flips to deprecated with a superseding note). Two ADRs *do* cite §11 and §12 by number as "live specification" — `0007-cross-agent-handoff-accountability.md:33` and `0008-pre-compaction-checkpoint.md:35` — and renumbering either would have broken both; their existence is the strongest argument for leaving the gap rather than the absence this Decision originally claimed (Eric, PR #449 pass 3).
  - **Alternatives considered:** renumbering literally as instructed (rejected — contradicts the shared invariant stated one line above the table, on no evidence the invariant no longer holds).
  - **→ no promotion needed (implementation-tactical; the §7/§9 gap precedent already governs future removals from this number space).**

- **Deny scope is universal — every route denies; there is no per-route data and no manifest schema change.** Supersedes both the earlier `AUTHORING_PREFIXES` constant and the value-position `deny: true` discriminator drafted against it.
  - **Root cause of the question:** a hook constant listing `.prism/**` subpaths can never fire on consumer application code, so the gate would have shipped to PRISM's own repo only. The obvious repair — per-route opt-in data — turned the manifest into a schema-versioned surface PRISM has no way to migrate, because `.prism/architect/manifest.json` is consumer-owned and `applyFilePass` skips consumer-owned paths on every update.
  - **Alternatives considered:** value-position `{ docs, deny }` objects with a minor bump; a top-level `"deny"` section; a hard v2 migration with a major bump.
  - **Chosen approach:** deny is behavior, not data. The manifest stays flat — no flag, no sections, no schema change, no migration, no version bump. A route existing *is* the opt-in. What a consumer routes is what a consumer gets gated on; app code is unrouted until they author docs for it, so no route means no fire, by design.
  - **Implementation guidance:** the safety property that per-route data was carrying now has to come from validation. Reject catch-all patterns at validation time, and make the rejection **computable** rather than a hardcoded blacklist: reject any pattern `p` where `compileMatcher(p)("")` returns `true`. Verified against the live matcher — `"**"` and `"*"` both accept the empty string; `".prism/**"` does not. The stub's `"**"` route is deleted.
  - **→ promotion verdict pending — resolves at PR 2D close, into ADR-0072.**

- **Announce once, enforce at write. The nag is retired as an enforcement mechanism.**
  - **Root cause:** operator testing measured habituation at roughly six nags — after that the emission reads as boilerplate and stops changing behavior. Forced reading did change behavior.
  - **Chosen approach:** a read of a routed path names each unread doc exactly once per session and never repeats it. Enforcement is the write-time deny alone. There is no fallback nag arm for hosts without `PreToolUse` deny, because no host in scope lacks the capability: Claude, Cursor, and Codex all support it. Thrive's "Codex has no `PreToolUse`" was a registration choice in thrive's tree, not a platform limit — verified against Codex's hooks documentation. **This is a statement about host capability, not about PRISM's delivery.** PR 2A ships a settings-write path for Claude Code only, and no PR in 2B–2E adds one for Cursor or Codex — so the deny, when it lands in 2D, reaches Claude consumers alone. See the harness-delivery Decision below.
  - **Implementation guidance:** the dedup state gains an `announced` array alongside `read`. `announced` suppresses repeat emission; `read` is the only thing that clears a deny.
  - **→ promoted in part to ADR-0071 § Consequences — the announce-once half shipped in PR 2A, together with the emission invariant it needs (a doc is marked announced only if it survived `formatNag`'s truncation into the emitted text). The enforce-at-write half resolves at PR 2D close, into ADR-0072.**

- **The compaction reset fires on `PostCompact`, not `PreCompact`, and no-session-id is a no-op.**
  - **Root cause:** `PreCompact` fires before the context is dropped, so state deleted there can be re-credited by the tail of the pre-compaction conversation. `PostCompact` fires after, which is when "the model may no longer have read this" becomes true.
  - **Chosen approach:** `PostCompact`, dispatched through the same `--tool=` entry point as every other arm so it stays portable across harnesses. With no session id in the payload: no-op, one stderr line, exit 0. The 12-hour age sweep the earlier draft carried is deleted — it was a second age constant for the same concern `STALE_STATE_FILE_AGE_MS` (24h, `architect-route.ts:270`) already owns, and under a deny gate it would re-deny an unrelated concurrent session.
  - **→ promoted to ADR-0071 § Consequences — the `PostCompact` reset arm shipped in PR 2A, so task D4 reduces to its deny-side test coverage.**

- **Decision guards are not built.** A mechanism that would gate edits deleting or overriding a plan's `## Decisions` entries fails the deletion test — the operator has never had a plan Decision deleted or overridden. No `ask` mechanism, no plan parser. If the need ever appears, a Decision worth protecting gets its own one-thing doc and a route; the existing mechanism already covers it with nothing new built.
  - **→ no promotion needed (a decision not to build; there is no mechanism in the tree for a doc to describe, and the deletion-test reasoning stays here as the record of why).**

- **Dedup state stays in the repo. The `os.tmpdir()` move is reversed before it ships.**
  - **Root cause of the reversal:** a shared `/tmp` state file opens a symlink-write surface (CWE-377/59) and, worse under a deny gate, a state-poisoning bypass — anything that can write a predictable `/tmp` path can pre-credit docs and defeat the gate. The prune path is also hardcoded to `path.join(repoRoot, ".prism")` (`architect-route.ts:287`), so the earlier claim that pruning "works unchanged" under the move was false.
  - **Alternatives considered:** `os.tmpdir()` keyed on `hash(repoRoot) + sessionId`; a per-user directory under `os.homedir()`.
  - **Chosen approach:** state stays at `<repo>/.prism/architect-route-state.<session>.json`, and `prism adopt` appends the two ignore lines to the consumer's `.gitignore` so the files never dirty a consumer's working tree.
  - **Implementation guidance:** this reverses the documented "PRISM does not write your `.gitignore` for you" policy at `install-layout.md § Consumer overlay`. The reversal is deliberate and narrow — two lines, append-only, idempotent, guarded on the lines not already being present — and the doc is corrected in the same PR rather than left contradicting the code.
  - **→ no promotion needed (reverses a change that never shipped; the live state-file location is unchanged from ADR-0071's original design, and its two `.gitignore` globs are documented in `install-layout.md`).**

- **Credit is full-read-only, and the deny message names the exact command that satisfies it.**
  - **Root cause:** credit keys on `tool_input.file_path` (`claude-post-read.ts:52`), which a Bash payload never carries, and `Grep` is unregistered. This repo's own active output style instructs agents to read with `cat`, `head`, and `sed -n`. Under a deny that combination is an unsatisfiable gate: read the doc via Bash, get no credit, retry the write, get denied again.
  - **Second root cause:** no `offset`/`limit` handling exists anywhere in `scripts/ai-skills/hooks/` — `extractArchitectDocPath` (`architect-route.ts:68-75`) inspects the path only, so `Read(limit=1)` credits a whole doc today.
  - **Chosen approach:** one rule covers both. **Credit lands only on a read with no range restriction.** For `Read`, that means `tool_input.offset` and `tool_input.limit` are both absent. For Bash, that means a bare `cat <path>` — `head`, `tail`, and `sed -n 'X,Yp'` extract the path for *announce* purposes but never credit. `Grep` is registered as `search`: it extracts paths, never credits.
  - **Implementation guidance:** this only works if the remedy is stated, not inferred, so the deny message names the literal command: ``read these in full first, then retry: `cat <path>` ``. That is a three-line predicate, not a heuristic, and it fails safe — an under-credited read costs one re-read, while an over-credited one silently defeats the gate. This closes the `Read(limit=1)` gap the earlier draft accepted; it was cheap once the Bash-credit rule forced the same question.
  - **→ promotion verdict pending — resolves at PR 2B close.**

- **The gate is friction, not a wall — ADR-0072 says so plainly rather than pretending otherwise.**
  - **Root cause of the question:** `.claude/settings.json`, `.claude/hooks/`, and `scripts/ai-skills/hooks/**` are unrouted, so the hook's registration, its source, and its delivered artifact are each editable ungated. Routing them was the obvious repair.
  - **Alternatives considered:** route and guide the hook's own surface.
  - **Chosen approach:** do not route it. In a consumer repo `.claude/settings.json` is the consumer's own file, and gating it means PRISM blocking a user's first edit to their own editor configuration — the same cold-start failure the universal-deny design already rejected. A gate whose own registration is unrouted is honest friction; a gate that blocks edits to the consumer's settings to protect itself is a wall that consumers will remove wholesale.
  - **Implementation guidance:** ADR-0072's `## Consequences` states the bypass in one sentence — deleting the registration, the hook file, or setting `PRISM_HOOK_DENY_DISABLE=1` each disables the gate, all three are trivial, and none is prevented. The compensating control is visibility, not prevention: `prism doctor` gains a hook-registration check, so a removed or unregistered hook becomes a reported finding rather than a silent absence.
  - **→ promotion verdict pending — resolves at PR 2D close, into ADR-0072.**

- **Subagent session-id semantics are unestablished and are probed before the deny arm is written, not after.**
  - **Root cause:** if a subagent shares its parent's session id, a child's read credits the parent and the gate is silently defeated. If it gets a distinct id, a child wedges against a deny whose remedy the parent already performed, invisibly. Both are real; nothing in this tree establishes which one Claude Code does.
  - **Chosen approach:** task B4 runs the probe against a live host and records the answer as a Decision. The design branches are pre-specified so the probe's outcome selects a branch rather than reopening the design — shared id means the deny arm keys on the id plus the transcript-visible agent identity where the harness exposes one, and the ADR names credit-leak as a known consequence; distinct id means the parent's `read` array is inherited by the child at first use, keyed on a parent-session field in the payload.
  - **Implementation guidance:** the probe is a `[HITL]` task — it needs a live session with a real subagent dispatch and cannot be synthesized from fixtures. Task D2 does not start until B4's Decision is recorded, and whichever branch is taken gets its own test leg.
  - **→ promotion verdict pending — resolves at PR 2B close, on task B4's recorded probe result.**

- **Writing guides, the stub's route targets, and `skills-ecosystem.md` split now rather than on touch.** File grain otherwise keys on load mechanism: always-on rules may group (`code-standards-js` stays one file), and routed docs split until the "and" test passes, on touch. These three are the exception because they are the deny's remedy documents — a forced read has to be cheap, and `skills-ecosystem.md` is 404 lines covering the roster, ticket types, workflows, plan-section ownership, AC format, handoffs, and two build-time output guards. Making someone read all of it to edit one skill file is the habituation failure in a new costume.
  - **→ promotion verdict pending — resolves at PR 2C close.**

- **The ship surface is four things plus dependency closure, enforced mechanically.** Skills (personas plus skill-forge), rules, writing guides, and the runtime (hooks, stub, doctor). Everything link-reachable from those ships; everything else — PRISM's own plans, self-dev ADRs, self-dev references — stays home. `SPEC.md` earns its place through closure: it is the tier-system meta-doc, cited by the shipped `code-standards.md` and routed by the stub's first key. Atlas's onboarding dependencies ride the same closure. Closure is computed and enforced in `pnpm prism:check`, not asserted in prose — an unenforced closure claim goes stale on the first new cross-reference.
  - **→ promotion verdict pending — resolves at PR 2E close.**

- **PR 2 splits into five stacked PRs (2A–2E) and its tasks are lettered, not renumbered.** The single PR 2 carried a runtime port, a delivery fix, a credit-channel widening, a documentation set, an enforcement gate, and two new validation surfaces. Reviewed as one diff it is unreviewable, and the ordering constraints between its parts are real safety constraints rather than preferences — the credit channel has to be in `main` before the deny is, or the remedy is unperformable.
  - **Alternatives considered:** renumbering tasks 10–29 continuously across the new stack.
  - **Chosen approach:** new tasks carry per-PR letter IDs (`A1`, `B2`, `C3`, …). Renumbering would move PR 3's tasks 20–29 and break every cross-reference already written against them, to buy nothing — the letters map one-to-one onto the stack cut lines, which is the thing a reader needs to navigate.
  - **Implementation guidance:** tasks 10–19 are retired wholesale and replaced by A1–E5. Nothing from 10–19 shipped — PR 2 never started, and #457 is a superseded draft — so no already-landed work is dropped by the replacement.
  - **→ no promotion needed (stack-shaping decision, plan-local; the cut lines are recorded in § PR map).**

- **PR 2A was built against a plan amendment that had not yet been committed anywhere; the amendment is landed on this branch, and every `A1`–`A8` citation in the branch's commits now resolves.** Clove's session read the split task list through an absolute path that resolved into the shared main checkout rather than this worktree, so the content it built to was correct but its provenance was unverifiable from the branch — the branch's own `opus5-port.md` still carried the unsplit `### PR 2` (tasks 10–19, deny bundled in). This entry replaces the `OPEN` Decision that recorded the problem; the commit carrying this entry is the resolution.
  - **Root cause:** the amendment was written into the main checkout's working tree and never committed, so no branch and no remote ref carried it when the implementation lane was dispatched.
  - **Alternatives considered:** landing the amendment on `main` ahead of the stack; confirming the old unsplit PR 2 as the shape that should have shipped.
  - **Chosen approach:** land the amendment on PR 2A's branch. Plans ride their PRs here and PR 0 did exactly this; 2B–2E branch from 2A's head and inherit the plan with the code it governs. A plan-only commit on `main` would be the extra chore PR that convention exists to avoid. Confirming the unsplit shape was rejected on the merits, not on sunk cost — the split's ordering constraints are safety constraints (credit before deny, guides before deny), and the unsplit PR 2 bundles a deny whose remedy no consumer could perform.
  - **Implementation guidance:** every `A1`–`A8` reference in `9fe03b74` and `8e160178`, commit bodies and source comments alike, resolves against `### PR 2A` as landed here. No implementation changed; only the plan's provenance did. Branch 2B from this branch's head rather than from `origin/main`, or the same gap reopens one PR later.
  - **→ no promotion needed (run-mechanics correction specific to this stack; the durable pattern is captured in `.prism/lessons.md`).**

- **Cursor and Codex hook delivery is deferred out of this stack, and every doc the deny ships with says so.**
  - **Root cause:** the `HARNESSES` table makes the runtime's *dispatch* host-agnostic, which reads like host coverage. Delivery is a separate seam, and it exists only for Claude: `refreshHookRuntime` writes `<consumer>/.claude/hooks/` and `<consumer>/.claude/settings.json` and nothing else, and task A8 deleted `.cursor/hooks.json` on the reasoning that an unregistered config file is worse than none. A settled design decision that "all three harnesses get the deny" therefore does not ship unless some PR builds two more delivery seams.
  - **Alternatives considered:** fold the two seams into PR 2D alongside the deny; give them their own PR in this stack (a 2F off 2D).
  - **Chosen approach:** neither — defer, and make the deferral visible in the artifacts a consumer reads. Folding into 2D puts three delivery mechanisms and the gate itself in one diff, which is the unreviewable shape § PR map split PR 2 to avoid. A 2F is no better placed: each seam needs its own registration format, its own idempotent merge semantics, and an end-to-end run on that host to be trusted — the same constraint task D8 already imposes for Claude alone — and nothing in 2B–2E depends on it, so it blocks nothing by waiting.
  - **What must not ship is the false claim.** Task D5 (ADR-0072) and task D9 (`install-layout.md` § Write gate) each state that the gate reaches Claude Code only today and name the two missing seams. `install-layout.md` and its curated seed twin already carry the delivery half of this statement.
  - **Exit condition:** its own PR off `main` after this stack lands, one harness per PR, each gated on an end-to-end run against that host. Until then the deferral is the answer, not an oversight.
  - **→ no promotion needed at 2A close (the shipped half — delivery is Claude-only — is already stated in `install-layout.md` and its seed twin; the deny-scope half rides task D5's ADR-0072 and resolves at PR 2D close).**
- **`spec-editing.md` ships to consumers unrouted until PR 2E, deliberately.**
  - **Root cause:** C4 replaced the stub's ~20 `_toolkit/spec-editing.md` routes with guide routes, so the doc still ships in the install seed while no stub route names it. `writing-an-architect-doc.md` § Route-add — written by this same PR — says a doc under `.prism/architect/` is not done until a route names it, so the consumer surface contradicts the PR's own new rule.
  - **Alternatives considered:** give it a stub route in 2C; drop it from the seed in 2C.
  - **Chosen approach:** neither in 2C — defer to PR 2E and record the deferral here. A stub route would re-add the doc the guides were written to replace, and dropping it from the seed is a ship-surface trim, which is exactly what task E5 computes from E4's closure rather than from a hand-guess. Trimming it by hand in 2C would pre-empt that computation with the guess E5 exists to avoid.
  - **Exit condition:** task E5 excludes it from the seed or routes it. Task E1's orphan-doc check makes the state visible in `prism doctor` either way, so it cannot stay unrouted silently.
  - **→ no promotion needed (a two-PR sequencing call inside this stack, resolved at PR 2E close).**

- **The five writing guides are classified `curated` in `seed-curation.json`, not left to auto-mirror.**
  - **Root cause:** C7 requires every new file to carry a classification entry, and `seed-curation.json` has exactly four buckets — `excluded`, `curated`, `seedOnly`, `renames`. There is no bucket meaning "ships, and the build keeps the twin byte-identical." A file in none of them auto-mirrors and counts as unclassified, which is the state C7 exists to forbid.
  - **Alternatives considered:** leave them unclassified and rely on the build warning; add a `mirrored` bucket to the schema.
  - **Chosen approach:** `curated`, matching every other consumer-facing architect doc already in the seed (`install-layout.md`, `skills-ecosystem.md`, `plan-authoring.md`, `ticket-workflows.md`). Leaving them unclassified fails C7 outright and rests on a warning that fires once per artifact lifetime. A `mirrored` bucket is the cleaner schema, but it is a `build.ts` change inside a PR whose own scope line reads "content-only — no runtime change."
  - **The cost this accepts, stated plainly:** `curated` means the build does not write the twin at all — `build.ts:708` skips every `curatedSet` member before `writeFileIfChanged`, where an unclassified file is mirrored unconditionally on every build. So a later edit to a canonical guide never reaches the seed, and nothing mechanical says so. Measured: append a blank line to `.prism/architect/guides/writing-a-plan.md`, run `pnpm prism:build` — the twin's hash is unchanged and `pnpm prism:check` exits 0 over the divergence. The rejected alternative (leave unclassified) was the thing holding the twins in sync. The twins are byte-identical today (`diff -q`, all five). This is the same drift the plan already records against `skills-ecosystem.md`, now accepted deliberately for five more files rather than arrived at by accident.
  - **Follow-up:** a `mirrored` bucket in `seed-curation.json` — one that classifies a file as shipping *and* keeps the build's content comparison on it — would let these five, and any future guide, be both classified and drift-checked. Belongs with E5's ship-surface trim, which is already the task that reasons about seed membership wholesale.
  - **→ no promotion needed (a classification call inside this stack; the schema gap is recorded as follow-up above).**

- **The `mirrored` bucket stays out of PR 2E.** The follow-up above nominated E5 as its home, on the reasoning that E5 already reasons about seed membership wholesale. Judged on arrival and declined.
  - **Root cause of the decline:** E5's membership question is *which files ship*; the `mirrored` bucket's question is *how a shipping file's twin is kept honest*. They share a config file, not a mechanism — the bucket is a `build.ts` write-path and drift-path change, and PR 2E changes what that same code classifies. Two changes to one mechanism in one PR is how a defect hides in the interaction.
  - **Evidence the deferral costs nothing today:** `diff -rq .prism/architect/guides templates/install/.prism/architect/guides` is silent — all five twins are byte-identical. The bucket buys drift *prevention*, not a current fix, and nothing in E1–E5 depends on it.
  - **What changed in its favor:** `ship-closure.ts` now scans a curated file's twin rather than its canonical source, so a twin that drops a link canonical has can surface as a dead-weight finding. That is indirect and partial — it catches link drift, not prose drift — so it lowers the urgency without answering the need.
  - **→ no promotion needed (a sequencing call; the bucket itself remains the open follow-up recorded above).**

- **`ship-closure.ts` measures reachability over the bytes a consumer receives, not over canonical source.** Three fidelity rules, each landed after the literal reading of task E4 reported a number that was mostly fiction (43 findings, of which 37 were artifacts of the measurement).
  - **Root cause:** the ship surface and the canonical tree are not the same text. A `curated` file's twin is hand-maintained and deliberately shorter — canonical rules cite self-dev ADRs that `crossref-lint`'s install ADR gate keeps out of the twin on purpose. Scanning canonical attributed those citations to the consumer surface.
  - **The three rules:** a curated or renamed file is scanned as its seed twin; the walk records an excluded file as reached but never recurses through it, because consumers never receive it and the self-dev ADRs cite each other densely enough to turn one real dangling reference into a cascade; and a `<repo-root>/`-prefixed target resolves, because that is how every persona cites its startup files and `crossref-lint` rightly treats angle brackets as placeholders.
  - **What the third one nearly cost:** without it, `references/plan-lookup.md` and `references/architect-context.md` — read at startup by Clove, Winston, Sasha, Briar, and Mira — both reported as dead weight, and E5's whole job is to exclude what that report names.
  - **Implementation guidance:** each rule has a named unit test in `ship-closure.test.ts`, the relative-link form included. Relative links are followed alongside repo-root-absolute ones even though task E4 names only the latter; `.prism/rules/` files cite each other relatively, so a closure blind to that form trims the documents consumers actually follow.
  - **→ no promotion needed (behavior of one check, documented in its own module header).**

- **`SHIP_CLOSURE_TRACKED_DANGLING_REFS` ships seeded with 14 entries rather than empty.** Every entry is a self-dev ADR cited by path from a `.ai-skills/skills/**` body.
  - **Root cause:** ADR-0064 settled that PRISM ships none of its own ADRs and that each citation distils into the surface that needs it, but its `crossref-lint` gate covers `templates/install/**` only. The skill bodies ship as generated skills and were never swept, so about 34 citation sites across 15 persona files still name ADR files consumers do not receive. E4 is what made that hole visible.
  - **Alternatives considered:** sweep the 34 sites now; ship the ADRs; seed a tracked set.
  - **Chosen approach:** seed a tracked set, following `crossref-lint`'s own `INSTALL_RELATIVE_LINK_TRACKED_VIOLATIONS`, which was seeded with its known set and emptied by the PR that fixed them. Sweeping now means a prose diff across 15 skill bodies in the week PR 3 rewrites every one of them, and shipping the ADRs contradicts ADR-0064.
  - **What keeps this a gate rather than a silence:** the entries are enumerated in source, a citation of anything not listed fails on the first run and on every re-run, and a tracked entry the closure stops reaching fails as stale so the set cannot outlive its cause.
  - **Follow-up:** extend ADR-0064's distillation pass to `.ai-skills/skills/**` and empty the set. Natural home is PR 3, which already rewrites those bodies.
  - **→ no promotion needed (a tracked-debt record; the durable rule is ADR-0064, which already says the right thing).**

- **Subagent context does not travel. Each agent reads for itself, and hook state keys on the agent rather than the session.** This answers B4 and closes it.
  - **What was measured**, all on a live Claude Code host on 2026-08-19: a parent and its subagent share one `session_id`; a subagent's hook payload additionally carries `agent_id` and `agent_type`, which a parent payload never does; both context-delivery paths reach a subagent — `additionalContext` from `PostToolUse` (the child quoted the nag verbatim) and `permissionDecisionReason` from a `PreToolUse` deny (returned intact, `"toolDenialKind":"permission-rule"`).
  - **The measurement error worth carrying forward:** an earlier probe grepped the subagent's transcript for the nag text, got zero hits, and concluded `additionalContext` does not cross the agent boundary. `additionalContext` is never persisted to JSONL while deny reasons are, so a zero-hit grep is the expected result of *successful* delivery. A probe that greps a persisted record measures persistence, not delivery — ask the agent to echo what it received.
  - **Alternatives considered:** let a subagent inherit the parent's `read` set, so a doc the parent read satisfies the child's gate; key state on `session_id` alone and accept the shared budget.
  - **Chosen approach:** state keys on `agent_id ?? session_id` — shipped in #468 (`d6416e96`). Inheritance was rejected because a dispatch may be one agent or many agents in an orchestrated run, and the hook cannot tell which shape it is in from inside a single payload; the safe default is that context does not travel.
  - **The consequence is chosen, not incidental.** A subagent doing routed work pays the read cost fresh even when its parent already read the same doc. That is the trade accepted for the guarantee that no agent's gate is satisfied by reads it never performed.
  - **The datum nobody was probing for, and the strongest one in the run:** the subagent received the nag verbatim and did nothing with it — read no architect doc, changed no behavior. The nag-habituation thesis measured rather than argued, and the clearest evidence that the write-deny is the enforcement and the announce is a courtesy.
  - **Implementation guidance:** D2 no longer implements anything — #468 shipped the keying, so D2 becomes coverage of it under the deny arm. ADR-0072 needs no reconciliation because it is not written yet; its drafted credit-leak-via-subagent consequence is stale and must never be written, and D5's task text is amended to name this consequence in its place.
  - **→ promotion pending — ADR-0072 § Consequences (task D5) is where this lands, alongside the credit channel's other honest negatives.**

- **The shell read parser gates on an allow-list of safe characters, not a deny-list of shell metacharacters.**
  - **Root cause of the question:** `SHELL_CONTROL_CHARACTERS` enumerates what makes a command something other than a plain read. The enumeration already failed twice inside the PR that wrote it — `\n` was missing, so a multi-line command whose first line was a bare `cat` credited every bare token on every later line as fully read (`## Review Issues` § A newline in a Bash command is a command separator), and `#` was added in the same pass. Two escapes from one enumeration is a defect in the shape, not two defects in the contents.
  - **The asymmetry that decides it:** a miss on a deny-list over-credits — a document nobody read is marked read, and the deny gate opens on it. A miss on an allow-list under-credits — one re-read. Every other credit call in this stack is already resolved that way: `{ credit: false }` by default, only `cat` credits, a flagged `cat` does not. The pre-filter is the last place in the channel still resolved the other direction.
  - **What the flip closes for free, none of it a reported finding and all of it the same class:** `$VAR` and `${…}` (only `$(` is denied today), backslash escapes, globs (`*`, `?`, `[…]`), brace expansion, `!` history expansion, and whatever metacharacter the next shell form introduces.
  - **Alternatives considered:** keep the deny-list and add the characters above — rejected, because it re-runs the enumeration that has already failed twice and finds the next character the same way, by review. Shell-tokenize properly — rejected on the zero-dependency constraint, the same reason recorded in the existing parser Decision above.
  - **Chosen approach:** a positive character class tested against the whole command string before tokenizing; anything outside it yields zero targets, which is the existing contract. The class is letters, digits, `_ . / - @ + = , : ~`, both quote characters (so `unquote` keeps working), and space and tab as separators. Newline and carriage return sit outside the class by construction — which is exactly what the deny-list had to remember, and did not.
  - **What it costs, stated plainly:** a path carrying any character outside the class — a `%`, a `#`, a space, a non-ASCII filename — stops crediting. That is under-credit, it costs one re-read, and it is the direction this channel is built to fail in.
  - **Implementation guidance:** fold into D3 rather than opening its own task — same function family, same PR, one verify line. Replace the constant with the positive class and rewrite its JSDoc to say what is allowed rather than what is denied; leave `SHELL_READ_COMMANDS` and the bail-to-zero-targets contract untouched. D3's write-form parser (`>`, `>>`, `tee`, `tee -a`, `sed -i`) is built on the same class rather than a second pre-filter, so the two halves of the parser cannot drift apart.
  - **→ promotion pending — ADR-0072 § Consequences (task D5), in the same bullet that states the credit channel's call-shape gap; this narrows that gap and belongs beside it.**


- **The `.prism/**` catch-all is narrowed to the paths `install-layout.md` actually governs, in all three routing tables.** This answers the cost-of-the-remedy question PR 2C's review (Eric, #463) handed to whoever writes the deny.
  - **Root cause of the question:** a consumer editing `.prism/plans/foo.md` matched both the `.prism/plans/**` guide route and a `.prism/**` catch-all routing to `install-layout.md`. Measured on the seed: 334 lines of forced reading, of which `install-layout.md`'s 180 govern nothing about writing a plan. PRISM's own manifest is worse — 839 lines for the same write, `install-layout.md` and `skills-ecosystem.md` contributing 447 of them through the catch-all alone. PR 2C's premise is that the deny's remedy has to be cheap, and this is where it bends.
  - **Alternatives considered:** keep the catch-all and accept the cost (rejected — it is the habituation failure in a new costume, and it lands hardest on a consumer's first gated write); delete the catch-all outright (rejected — `install-layout.md` would lose its only stub route and become an orphan-doc finding on a fresh install, which is E1's check working correctly against a state this PR created); shorten `install-layout.md` (rejected — the doc is not padded, and trimming a doc to fit a route is fixing the wrong end).
  - **Chosen approach:** replace `.prism/**` with `.prism/custom/**` and `.ai-skills/definitions/**` — the consumer overlay and the definitions files `install-layout.md` genuinely documents. Applied to all three tables rather than the stub alone: PRISM's own repo is where the gate gets dogfooded first, and a narrowing that leaves two of three tables contradicting the third is the inconsistency this plan keeps recording against itself.
  - **What this gives up, stated plainly:** four path classes become unrouted, so they are neither announced nor gated — `.prism/prds/**`, `.prism/qa/**`, `.prism/retros/**`, and `.prism/iris-state.json`, plus `.prism/design/**`, `.prism/handoffs/**`, `.prism/conductor-state.json`, and `.prism/theo-state.json` where a consumer has them. Every one is persona output or persona state. That is the design's own rule rather than an exception to it — a route existing is the opt-in, and a path nobody has written a governing doc for has nothing to force a read of. The list is measured, not estimated: `matchDocsForPath` run over `git ls-files` against the old and new tables reports the same 29 tracked paths lost in all three tables and nothing else.
  - **What the narrowing does not give up:** the instruction layer. `.prism/rules/**` → `_toolkit/spec-editing.md` and `.prism/skills/**` → `_toolkit/skills-ecosystem.md` are routed explicitly in all three tables, because those are the paths ADR-0072 names as its motivating case and the catch-all was the only thing covering some of them. `manifest.json` and `manifest.base.json` previously enumerated most rules one file at a time and silently missed the rest; the glob replaces those entries with the rule that defines the set.
  - **Scope note:** § Cross-PR collisions assigns these three tables to 2A (deletion) and 2C (addition), neither of which is 2D. Both have merged, so there is no concurrent editor; the absorption is recorded here rather than left silent.
  - **→ promotion verdict pending — resolves at PR 2D close, alongside ADR-0072's deny-scope statement.**

- **Task D9's `docs/distribution.md` target was wrong, and the correction went to the two files that actually describe the hook.** `docs/distribution.md` contains no hook description at all — `grep -i hook` returns nothing. The registrations are described in `docs/what-prism-writes.md` and `docs/adopting-into-existing-repos.md`, both of which listed `PostToolUse` and `PostCompact` and went stale the moment `PreToolUse` shipped. Writing a new hook section into `distribution.md` to satisfy the task text as written would have created a third home for content that already has two.
  - **→ no promotion needed (a task-text correction inside this PR; D10's sweep table carries the verify-line consequence).**

- **The shell arm reroutes unless it can prove a command is a read. The write parser is deleted, not repaired.**
  - **Root cause of the question:** three review rounds each found new defects of the same class in the previous round's repair — heredoc terminators, line continuations, retained quote characters, `sudo`/`VAR=value`/paren prefixes — and briar named five more shapes nobody had driven. The scanner was trying to enumerate the ways a shell command can write a file, and that list is wrong the moment the shell grows a form nobody listed. Every miss on it is a silently unfired gate.
  - **Alternatives considered:** fix the eight findings and drive the five unprobed classes (a fourth round of the same); a real shell tokenizer (a dependency this zero-dependency runtime does not pay for, and still not a shell).
  - **Chosen approach:** invert the question, the way the read arm already did. Every path-shaped token in the raw command is a candidate; a candidate is dropped only when the whole command is provably a set of read-only commands and the token is one of their operands. The proof reuses `SHELL_READ_SAFE_CHARACTERS` and `splitShellSegments` unchanged, and is all-or-nothing over the whole command. Every one of briar's eight findings and five unprobed classes fails either the character-class test or the head-token test, so none can produce a proof — unreachable by construction rather than handled one at a time.
  - **Two lists, opposite failure directions, and that is the whole safety argument.** `SHELL_INSPECTION_COMMANDS` misses cost one reroute message on a command that only read; the retired `SHELL_WRITE_COMMANDS` misses cost a silent write. Membership asks whether a command is read-only on plain operands with no in-place mode; `sed` and `git` are decided per call rather than by membership.
  - **Accepted cost:** the arm over-denies. A pipeline, a `$VAR`, a `find`, or any binary off the list gets rerouted whenever it also names a routed path. The message names two performable remedies — move the edit to the file-edit tool, or respell the read as a plain `cat`/`head`/`grep` — and deliberately names no environment-variable escape, because `PRISM_HOOK_DENY_DISABLE=1` is read from the hook process's own environment and an inline assignment on the denied command never reaches it.
  - **The one gap that survives:** a write whose target path never appears in the command text, because it was built from a variable or reached by `cd`-ing first. No scan over a command can see a path the command does not contain, and it is named in the ADR rather than left for a later round to rediscover.
  - **Implementation guidance:** `parseUnprovenShellPaths` is the judgment; `resolveProvenReadPaths` is the proof; `checkInPlaceFlag` survives inside it. `checkPathIsRouted` becomes the batched `filterRoutedPaths` so a command's tokens cost one manifest load rather than one per token.
  - **→ promoted to ADR-0072 (§ Decision, § Consequences) and `.prism/architect/_toolkit/install-layout.md` § Write gate.**

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
   - Each new file opens with a one-paragraph scope statement naming what it covers and what it does not. **Verify:** `pnpm prism:crossref-lint` green (every moved section's inbound references resolve); `wc -l .prism/architect/_toolkit/skills-ecosystem.md templates/install/.prism/architect/_toolkit/skills-ecosystem.md` — both under 200. The twin is `curated`, so no build step syncs it and only naming it here measures it.

**C2. Write the five writing guides at `.prism/references/guides/`.** *(Superseded on placement: the guides ship at `.prism/architect/guides/` — see the `## Decisions` entry "Guide placement resolves to `.prism/architect/guides/`". The path below is the recorded intent, not the shipped location.)* These are the deny's remedy documents and the stub's route targets. Each is consumer-facing, under 120 lines, and answers one question: how do I author this kind of file here.
   - `writing-a-plan.md` — the plan file shape, one plan per ticket, the `## Decisions` do-not-undo contract, the AC format. Cites `.prism/rules/branch-plan.md` rather than restating it.
   - `writing-a-rule.md` — the placement test (rule vs architect doc vs ADR, citing `.prism/SPEC.md`), the `**Why:** / **How to apply:**` shape, onboarding voice, and the count-rules-not-numbers constraint.
   - `writing-an-architect-doc.md` — what earns a doc (the Deletion Test), the scope statement, and **route-add as part of authoring**: a new doc under `.prism/architect/` is not done until a route names it in `manifest.json`. This is the route-integrity mechanism — no frontmatter, no metadata, the guide carries it.
   - `writing-an-adr.md` — Context / Decision / Consequences, the honest-negative requirement, numbering, and the `_toolkit/` ownership split.
   - `writing-a-skill.md` — the skill body layout, `prism-*` namespace ownership, why a consumer's own skills use their own prefix, and where `prism-skill-forge` fits.
   - Every guide closes with a **route-verify** line: when you edit a doc this guide governs, confirm its route still names it, and run `prism doctor` if unsure.
   - **Verify:** `pnpm prism:crossref-lint` green; `wc -l .prism/architect/guides/*.md templates/install/.prism/architect/guides/*.md` — no file over 120 lines. The path is the shipped one, not the superseded `.prism/references/guides/` above, which this PR never creates.

**C3. Genericize `.prism/SPEC.md` for LLM-agnosticism.** It becomes a shipped, routed, deny-gated document, so PRISM-internal framing in it is friction a consumer pays for nothing.
   - Retitle `# PRISM Spec` → `# Spec Tiers`.
   - Replace the six `.claude/`-prefixed paths (`grep -n '\.claude/' .prism/SPEC.md` lists them) with their canonical `.prism/` equivalents, except where the tier table legitimately names a host-specific skill directory — there, name the mechanism ("the host's skill directory") rather than one host's path. This is the same rule `install-layout.md § Cross-reference convention` already enforces, and the build-time path guard will confirm it.
   - Apply the same pass to the curated seed twin `templates/install/.prism/SPEC.md.tmpl`, which `adopt` installs as the consumer's own `.prism/SPEC.md`. No build step mirrors it — a `renames` entry is existence-checked, never content-compared — so the twin only changes when the same edit is made there by hand.
   - **Verify:** `pnpm prism:check` green (the path guard runs inside it); `grep -c '\.claude/' .prism/SPEC.md templates/install/.prism/SPEC.md.tmpl` returns `0` for both.

**C4. Rewrite the consumer stub's routes to point at the guides.** *(Superseded on placement: the `../references/guides/` route values below became `guides/<guide>.md` — see the `## Decisions` entry "Guide placement resolves to `.prism/architect/guides/`", which C4's own resolve-check clause below produced.)* In `templates/install/.prism/architect/manifest.stub.json`, replace the ~20 `_toolkit/spec-editing.md` routes with instruction-layer routes naming the guides:
   - `.prism/plans/**` → `../references/guides/writing-a-plan.md`
   - `.prism/rules/**` → `../references/guides/writing-a-rule.md`
   - `.prism/architect/**` → `../references/guides/writing-an-architect-doc.md`
   - `.prism/spec/adrs/**` → `../references/guides/writing-an-adr.md`
   - `.claude/skills/**` → `../references/guides/writing-a-skill.md`
   - `.prism/SPEC.md` → `../references/guides/writing-a-rule.md` (the placement test is what a SPEC edit needs)
   - The catch-all route is already gone (A6). No route may match the empty string — A6's validation enforces it, and `pnpm prism:verify-manifest` is the gate.
   - **Route values are resolved relative to `.prism/architect/`.** Confirm the `../references/` form resolves through `filterDocsOnDisk` before committing; if it does not, move the guides under `.prism/architect/guides/` instead and update C2's paths in the same commit rather than shipping routes that silently filter to nothing.
   - **Verify:** `pnpm prism:verify-manifest` green; the `hook-gate.test.ts` case "every install-seed route names a doc the seed carries or deliberately withholds", which covers every manifest the seed ships — `manifest.stub.json` and `_toolkit/manifest.base.json` — and treats a `seed-curation.json` `excluded` doc as a permitted absence rather than a dead route.

**C5. Mirror C4's routes into `.prism/architect/manifest.json` and `.prism/architect/_toolkit/manifest.base.json`** so PRISM's own tree is gated by the same routes it ships. Keep PRISM's existing `_toolkit/*` routes alongside — a path may match both a guide route and a toolkit route, and both docs are named. **Verify:** `pnpm prism:verify-manifest` green (structural only — it rejects catch-alls and brace globs, and never checks that a route's doc exists), plus a literal existence pass over PRISM's own two manifests, resolving each route value against `.prism/architect/` rather than against the manifest's own directory:

```bash
python3 -c "
import json, os
for m in ['.prism/architect/manifest.json', '.prism/architect/_toolkit/manifest.base.json']:
    d = json.load(open(m))
    for k, v in d.items():
        for doc in (v if isinstance(v, list) else [v]):
            if not os.path.exists(os.path.normpath(os.path.join('.prism/architect', doc))):
                print('MISSING', m, k, '->', doc)
"
```

returns nothing. C4's seed-side test covers the shipped manifests; nothing else covers the canonical pair this task edits.

**C6. Correct the `.gitignore` policy statement.** `.prism/architect/_toolkit/install-layout.md` and its curated seed twin `templates/install/.prism/architect/_toolkit/install-layout.md` both state PRISM does not write a consumer's `.gitignore`. A5 makes that false. Replace with the narrow truth: adopt appends two hook-state ignore lines, append-only and idempotent, and touches nothing else. Add a § Hook runtime section to the same doc covering the delivery path, the state file, and the `PRISM_HOOK_DISABLE` / `PRISM_HOOK_DENY_DISABLE` switches. **Verify:** `pnpm prism:check` green; `grep -rn "does not write your \`.gitignore\`" .prism/ templates/ | grep -v '/plans/'` returns nothing.

**C7. Classify every new file in `.ai-skills/definitions/seed-curation.json` before it ships.** The five guides and the three new architect docs from C1 each need an entry; `output-guards.md` is `excluded` (maintainer-facing build internals), the rest ship. An unclassified new file is auto-mirrored verbatim and `prism:build` prints a warning.

   **The build warning is not the gate.** `build.ts` pushes to `unclassifiedMirrored` only when `seedFileIsNew`, so the warning fires once per artifact lifetime — the run that first mirrors the file — and every run after that is silent whether or not the file was ever classified. A re-run therefore passes vacuously, which is exactly what a verification step must not do. The re-runnable check is the classification itself:

```bash
for p in architect/guides/writing-a-plan.md architect/guides/writing-a-rule.md \
         architect/guides/writing-a-skill.md architect/guides/writing-an-adr.md \
         architect/guides/writing-an-architect-doc.md \
         architect/_toolkit/ticket-workflows.md architect/_toolkit/plan-authoring.md \
         architect/_toolkit/output-guards.md; do
  grep -q "\"$p\"" .ai-skills/definitions/seed-curation.json || echo "UNCLASSIFIED: $p"
done
```

   **Verify:** the loop above prints nothing; `pnpm prism:check` reports zero seed drift.

**C8. Sweep `docs/` and `.prism/` for the stale hook narrative.** The old `tsx`-invoked registration and `claude-post-read` are named in prose that A5 makes false. **Verify:** `grep -rn "claude-post-read" docs/ .prism/ templates/ --include="*.md" | grep -v '/plans/'` returns nothing; `pnpm prism:check` green. `templates/` is in scope because a curated seed twin never regenerates from canonical — sweeping `.prism/` alone would leave a stale copy shipping to consumers.

---

### PR 2D — The deny gate

**Carried in from PR 2C's review (Eric, #463) — cost of the remedy read, for 2D to weigh.** The consumer stub keeps a `.prism/**` catch-all routing to `install-layout.md`, which C6 grew to 279 lines. A consumer editing `.prism/plans/foo.md` therefore matches both that catch-all and the `.prism/plans/**` guide route, so the deny's remedy is roughly 361 lines of forced reading before the write lands. PR 2C's own opening line is "the deny's remedy is reading these documents, and a forced read has to be cheap" — this is the first place that premise bends, and the call belongs to whoever writes the deny, not to the PR that wrote the guides.

Branch `huntermcgrew/opus5-port-deny-gate` from PR 2C's head, after PR 2B is in `main`. **B4 is answered and D2 is unblocked** — see `## Decisions` § Subagent context does not travel. **Start with D0**, the verify-line re-derivation sweep, before any code. This is the PR that changes behavior for a human at the keyboard, and every earlier PR in the stack exists to make it satisfiable.

#### Clove (implementation)

**D0. Re-derive every verify line in D1–D10 before writing any code.** Do this first; it is not a review step. A verify line went stale seven times across PRs 2C and 2E, and five of those survived both self-review and PR review — they were caught by a sweep run against the class, because a reviewer reads the line and asks whether it is *plausible*, which it always is.

   **The class is: the verify line was not re-derived when the task changed underneath it.** Three axes, all seven instances fitting one of them:
   1. **Reach mis-scoped at authoring** — the command measures one surface where the task changes two. A canonical file without its curated twin (C1, C8); `.prism/` without `templates/`; a structural check standing in for an existence check (C5).
   2. **The command names something the task superseded** — a path that moved, a stub-only test where the task widened the mechanism, a build warning that fires once per artifact lifetime (C2, C4, C7).
   3. **The implementation changed shape mid-PR and the line stayed pinned to the old shape** — E4's Roots and Verify pair, where a constant became a computation. This axis is invisible at authoring time and belongs to D10.

   For each task D1 through D10, answer three questions in writing and record them as a table in `## History` — one row per task, columns *task / disposition (`held` | `fixed` | `amended`) / what the command returns today*:
   - What surface does this task change? Name every file and every twin.
   - Does the command reach all of it? A command that reaches a subset is `amended`, not `held`.
   - What does it return right now, run literally from the repo root? Not reasoned about — run.

   Any correction lands in the task's **Verify** line in this plan, in the same commit as the table. A `held` disposition still requires the command to have been run. **Verify:** content-only — the artifact is the table, and each row's recorded result must be reproducible by re-running the command it names.

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
   - **Verify:** `pnpm prism:test` — D7's suite legs 1 and 2 — **and** `grep -c '"PreToolUse"' .claude/settings.json templates/install/.claude/settings.json` returns `1` for both. The suite never reads either registration file, so the test command alone reaches only half of what this task changes (D0 sweep, axis 1).

**D2. Cover the agent-scoped keying under the deny arm.** B4 is settled and its implementation already shipped — PR #468 (`d6416e96`) keys hook state on `agent_id ?? session_id`, so there is nothing here to implement and no branch left to choose. What remains is proving the deny arm inherits that keying rather than reaching for `session_id` directly: a subagent's deny is evaluated against the subagent's own `read` array, and a parent's read of a doc does not satisfy a child's gate. See `## Decisions` § Subagent context does not travel for the measurements and for why the fresh read cost is chosen rather than tolerated. **Sequence: unblocked.** **Verify:** `pnpm prism:test` — D7's subagent leg in both directions: a deny evaluated with `agent_id` present consults the child's own state file, and a doc read only by the parent does not clear the child's gate. D8's subagent step is a `[HITL]` observation recorded in `## History`, not this task's verification — the original line leaned on it and left the task with no machine check (D0 sweep).

**D3. Flip the shell parser's pre-filter to an allow-list, then add the shell-write reroute on top of it.** Both halves are one task because they are one parser — a second pre-filter beside the first is how the two halves drift apart.

   **First, the flip.** Replace `SHELL_CONTROL_CHARACTERS` in `scripts/ai-skills/hooks/hook.mjs` with a positive character class tested against the whole command string before tokenizing: letters, digits, `_ . / - @ + = , : ~`, both quote characters, and space and tab as separators. Anything outside the class yields zero targets, which is the contract already in force. Rewrite the JSDoc to state what is allowed and why the direction matters, rather than enumerating what is denied. `SHELL_READ_COMMANDS` and the `cat`-only credit rule are unchanged. See `## Decisions` § The shell read parser gates on an allow-list for the reasoning and the accepted cost. **Verify:** `pnpm prism:test` — every existing `parseShellReadTargets` case in `hook-gate.test.ts` passes unchanged, plus one new case per closed class (`cat $DOC`, a backslash escape, `cat *.md`, a brace expansion, and the existing newline case) each asserting zero targets, and a positive control asserting a plain `cat .prism/architect/_toolkit/install-layout.md` still credits — without the control, a class typo that rejects everything passes every other case.

   **Then the reroute.** In the `PreToolUse` arm, when `resolveToolKind` returns `shell`, parse the command for `>`, `>>`, `tee`, `tee -a`, and `sed -i` targeting a routed path. **The write detector cannot reuse the read allow-list** — `>` is outside that class by construction, which is the whole point of the class — so it runs first, on the raw command, and admits exactly those five forms as its only metacharacters. It shares the read parser's tokenizing helpers (`unquote`, whitespace split) and nothing else. Keeping the two in one function family is what stops the write detector from growing a second, looser notion of what a safe command looks like. Emit, verbatim:

   > You're writing to `<path>` via a shell write — redo this edit with your file-edit tool so the gate can check its prerequisites.

   **The remedy judges no prerequisites at all**, which is what makes it impossible to render unsatisfiable — deny only what you can parse; where you cannot, reroute to a surface that can. Record the deliberately-open gaps in a comment on the parser: word-prefixed redirects (`echo hello>f`), `python -c`, `cp`/`mv`/`dd`. Add one sentence to `.prism/rules/context-reuse.md § Architect-context routing is diff-blind` noting the prose fallback now has a mechanical enforcer and remains the only thing that runs on hosts with no hook. **Verify:** `pnpm prism:test` — D7 covers each of the five shell forms — **and** `grep -rln "mechanical enforcer" .prism/rules/context-reuse.md .claude/rules/context-reuse.md .codex/rules/context-reuse.md .cursor/rules/context-reuse.mdc templates/install/.prism/rules/context-reuse.md` names all five. The Cursor mirror carries the `.mdc` extension every file in `.cursor/rules/` uses; naming it `.md` exits 2 and reaches only four of the five surfaces. The test command cannot see the rule sentence this task also writes, and a rule edit that never reaches its build-managed mirrors is the canonical-without-its-surface miss (D0 sweep, axis 1).

**D4. Cover the `PostCompact` dedup reset against the deny arm.** The reset itself shipped in PR 2A (`hook.mjs`'s `PostCompact` arm); what remains here is its deny-side coverage and the reasoning below, which stays because it is what the coverage asserts. A `PostCompact` arm deletes the session's state file so docs re-announce and re-gate after compaction — compaction can drop the conversation history that made a doc "read," and leaving the state intact silences that doc permanently. **`PostCompact`, not `PreCompact`** — before the drop, the tail of the pre-compaction conversation can re-credit what was just deleted. With no session id: no-op, one stderr line, exit 0. **No age sweep** — `pruneStaleRouteState`'s existing 24h sweep is the one owner of orphan hygiene, and a second age constant in a second file is the dual-source-of-truth defect this plan already records against itself. **Verify:** `pnpm prism:test` — D7's `PostCompact` cases, with and without a session id.

**D5. Write `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md`.** Confirm the number with `ls .prism/spec/adrs/_toolkit/ | grep -oE '^[0-9]{4}' | sort -n | tail -1` before writing. `Status: accepted`. **A Consequences bullet states that the gate reaches Claude Code consumers only** — Cursor and Codex support `PreToolUse` but have no delivery seam, per the harness-delivery Decision. **A second Consequences bullet states the credit channel's call-shape gap:** credit is decided from the shape of the call, never the delivered bytes, so a flagless `cat` of a document the host truncates — or a rangeless `Read` past the host's default line cap — is credited in full. Carried from PR 2B's self-review (`## Review Issues` § A `cat` whose output the host truncates still credits in full).
   - `## Context` carries the full history: ADR-0067's floor was reverted because its gate sat on the report-back channel and a blocked persona fought its own gate; ADR-0069 permanently rejects hooks **on that channel specifically**; `epic-floor-revert.md § Decisions` left a lightweight opt-in open in the same breath as "No hooks survive"; ADR-0071 chose nag over deny, and this ADR supersedes that choice with the operator's measurement — roughly six nags to habituation, and forced reads that changed behavior where nags did not.
   - `## Decision` in one sentence: a write to a path matching any manifest route is denied until the route's docs are read; only the `write` kind from an explicitly listed tool, only with a session id, and the remedy is reading a document.
   - `## Consequences` carries the honest negatives, stated plainly rather than hedged. **The gate is friction, not a wall:** deleting the registration from `.claude/settings.json`, deleting `.claude/hooks/hook.mjs`, or setting `PRISM_HOOK_DENY_DISABLE=1` each disables it; all three are trivial; none is prevented, and routing the hook's own surface was rejected because in a consumer repo `.claude/settings.json` is the consumer's file. The compensating control is visibility — `prism doctor`'s hook-registration check (E3) turns a removed hook into a reported finding. Also name: a doc read through a channel the hook never observed still reads as unread; and that **each agent reads for itself** — a subagent doing routed work pays the read cost fresh even when its parent already read the doc, chosen because a dispatch may be one agent or many and the hook cannot tell which from inside. **The drafted credit-leak-via-subagent consequence is stale and must not be written** — #468 closed that leak, and the honest consequence is its opposite. Name the allow-list pre-filter alongside the call-shape gap: credit is refused for any command outside a positive character class, so a path carrying a space or a `%` under-credits by design.
   - **Verify:** `pnpm prism:crossref-lint` green; `ls .prism/spec/adrs/_toolkit/0072-*.md` succeeds; and `grep -rc '0072-write-gate-on-routed-paths.md' .ai-skills/definitions/seed-curation.json scripts/ai-skills/ship-closure.ts` returns `1` for both. Every `_toolkit/` ADR is classified individually under `excluded`, and neither of the first two commands can see a missing classification (D0 sweep, axis 1). The second registration site is `SHIP_CLOSURE_TRACKED_DANGLING_REFS`: task D6 cites the ADR by path from a skill body that ships, so the ADR joins the tracked set the same way its two siblings in that paragraph already have — a fact the implementation surfaced, not one D0 could have predicted (D10 sweep, axis 3).

**D6. Correct the conductor's contradicting line.** `.ai-skills/skills/prism-conductor/shared.md:106` — `### Enforcement is guidance + pipeline stages, never runtime hooks` currently reads *"No `Stop`/`SubagentStop` gates on report-backs, no `PreToolUse` ownership guards on writes."* Replace the second clause: *"No `Stop`/`SubagentStop` gates on report-backs. `PreToolUse` guards are confined to routed paths — a write is held until the route's governing doc is read (ADR-0072); ownership guards on writes stay out."* Adjust the heading if "never runtime hooks" no longer reads true. **PR 3's task 24 also edits this file** — PR 2D owns § Enforcement, PR 3 owns § Talking to the operator. **Verify:** `grep -rn "no \`PreToolUse\` ownership guards on writes" .ai-skills/ .prism/ .claude/ .codex/ .cursor/ | grep -v '^\.prism/plans/'` returns nothing. The original roots missed the four build-managed mirrors carrying the same sentence, and its unfiltered form could never return empty — this plan and `issue-408.md` both quote the old string (D0 sweep, axis 1).

**D7. Complete the gate suite — three required legs plus the coverage set.** A gate's tests need three legs and all three are required; thrive shipped an unsatisfiable gate that passed 70/70 because it had only the first two.
   1. **The deny fires.** A `Write` to a routed path with unread docs returns the harness's deny envelope naming the doc paths and the `cat` remedy.
   2. **Seeded state clears it.** With the matched docs pre-written into the state file's `read` array, the same call is allowed.
   3. **A live remedy performed through the gate clears it.** From leg 1's denied state, invoke the **real `PostToolUse` arm** with a full `Read` of each named doc, then re-invoke `PreToolUse` on the original path and assert allowed. This leg exercises the shipped path end to end — seeding is leg 2's job, and a suite that only seeds cannot detect a remedy that does not work. **Run leg 3 a second time with the remedy performed via `cat` through the Bash arm**, because that is how this repo's own output style reads files.
   - **The subagent leg (D2's verify points here).** A deny evaluated on a payload carrying `agent_id` consults the agent-scoped state file, not the session's: with the parent's state seeded as having read the doc and the child's empty, the child is still denied; with the child's own state seeded, it is allowed. Both directions are required — the first alone passes if the deny never finds any state file at all.
   - Also cover: an unrouted path is never denied on any verb; a `read`-kind tool is never denied; no session id never denies; a deny writes no state and no `announced` entry; each of D3's five shell forms reroutes; `PRISM_HOOK_DISABLE=1` and `PRISM_HOOK_DENY_DISABLE=1` each produce their intended inertness; a doc announced but never read still denies. Add at least two cases against the repo's **live** `.prism/architect/manifest.json` so a manifest edit that breaks routing fails here — scope them to routing, not to which paths deny.
   - **Positive control:** deliberately break the deny and confirm leg 3 fails.
   - **Verify:** `pnpm prism:test` green with the new cases counted.

**D8. [HITL] Run one end-to-end session against a live host.** Every other leg synthesizes its own payloads, which means the suite cannot catch a payload-shape mistake. In a real Claude Code session with the hook registered: confirm the deny fires on a routed write, the message renders legibly in the transcript, a full `Read` of the named doc clears it, a `cat` of the named doc also clears it, and subagent behavior matches what B4 documented. **Verify:** human-run; record the outcome as a `## History` entry naming what was observed, not "worked."

**D10. Re-run the D0 sweep against the implementation as it actually landed, before the PR goes up for review.** D0 catches axes 1 and 2, which are both authoring-time. Axis 3 — the implementation changed shape mid-PR — cannot be seen until the code exists, and it is the axis that produced E4's stale pair after that task had already been reviewed twice.

   Walk each task D1–D10 and diff its final implementation against the task text. **If the mechanism changed — a check became a computation, a constant became a resolver, a file moved, a test widened — the verify line is stale by default and gets re-derived, not re-read.** The prior disposition carries no weight: a line marked `held` in D0 is re-run here from scratch. Re-run every command literally and append the second table to `## History` beside D0's, so a reader can see which lines moved and when.

   The two tables together are the check: D0 alone cannot see an implementation that had not been written yet, and D10 alone cannot distinguish a line that was always wrong from one that went wrong. **Verify:** content-only — two dated tables in `## History`, one row per task in each.

#### Eli (documentation)

**D9. Document the gate as a consumer-facing surface.** Add a § Write gate section to `.prism/architect/_toolkit/install-layout.md` and its curated seed twin: what triggers a deny, what clears it, the two environment switches, and the honest statement that the gate is friction rather than a wall (pointing at ADR-0072). Say plainly that the gate reaches Claude Code only, alongside the delivery statement already in § Hook-runtime ownership and recovery. Update `docs/distribution.md` where it describes the hook. **Verify:** `pnpm prism:check` green — **and** `grep -c '^## Write gate' .prism/architect/_toolkit/install-layout.md templates/install/.prism/architect/_toolkit/install-layout.md` returns `1` for both, plus `grep -c 'PRISM_HOOK_DENY_DISABLE' docs/what-prism-writes.md docs/adopting-into-existing-repos.md` returns at least `1` for both. `install-layout.md` is `curated`, so `checkSeedDrift` tests its twin for existence and never for content, and `prism:check` alone cannot see a canonical-only edit (D0 sweep, axis 1). The task named `docs/distribution.md` as the file describing the hook; it describes none — `what-prism-writes.md` and `adopting-into-existing-repos.md` do, and both listed the pre-2D registrations (D10 sweep, axis 2).

---

### PR 2E — `prism doctor` route integrity and the ship-surface trim

Branch `huntermcgrew/opus5-port-doctor-shipsurface` from PR 2C's head. Independent of PR 2D; sequenced last because it validates the doc set PR 2C establishes.

#### Clove (implementation)

**E1. Add an orphan-doc check to `scripts/ai-skills/doctor.ts`.** A doc on disk under `.prism/architect/` that no route names is a finding — routing tables are skipped by the walk's `.md` filter, since neither `manifest.json` nor `manifest.base.json` is Markdown. This is half of the route-integrity closure that replaces per-doc frontmatter: docs-on-disk minus the manifest's value set. **Verify:** a materialized consumer root (the seed copied out, `manifest.stub.json` renamed to `manifest.json`) reports **no** architect-route finding — a consumer's first `doctor` run has nothing to warn about; `prism doctor` on this repo reports PRISM's own unrouted authoring docs, which is the check working rather than a false alarm; a `doctor.test.ts` case with a fixture manifest and a fixture doc dir asserts one finding, plus a positive control where the doc is routed and no finding is produced.

**E2. Add a dead-route check.** A route naming a doc absent from disk is a finding. This is the other half of the closure, and it is what makes route-add-at-authoring (C2) verifiable rather than aspirational. **Verify:** `doctor.test.ts` case with a manifest naming a missing doc asserts one finding, with a positive control.

**E3. Add a hook-registration check.** A repo with `.claude/hooks/hook.mjs` present but no matching registration in `.claude/settings.json` — or a registration pointing at an absent file — is a finding. This is ADR-0072's named compensating control: the gate cannot prevent its own removal, so removal becomes visible instead. **Verify:** `doctor.test.ts` cases for both directions.

**E4. Compute and enforce ship-surface closure.** New `scripts/ai-skills/ship-closure.ts`, wired into `pnpm prism:check`.
   - **Roots are computed, not listed.** `resolveDefaultRoots` returns three groups: a fixed set (`.prism/rules/**`, `.prism/architect/guides/**`, and the runtime — `scripts/ai-skills/hooks/**`, `doctor.ts`, and both shipped routing tables), every `prism-*` skill directory found on disk, and every architect doc those two routing tables route *to*. Route **values** only — a manifest key is a match pattern for the working diff, not content an install has to contain, so seeding keys would pull the documentation site into the closure.
   - Walk repo-root-absolute markdown references transitively from the roots. The resulting closure is the ship set.
   - Fail when a file in the ship set is marked `excluded` in `seed-curation.json` (a shipped file references something consumers cannot reach), and fail when a file marked shippable is outside the closure (dead weight in the seed).
   - Reuse `crossref-lint.ts`'s reference extraction rather than writing a second parser — a second link parser is the dual-source-of-truth defect this plan already records twice.
   - **Verify:** `pnpm prism:check` green; a unit test with a fixture tree asserting both failure directions plus a clean-closure control; and, because the roots are the definition of the check rather than an argument to it, direct `resolveDefaultRoots` coverage over a fixture repo — both routing tables seeding the closure, a negative control removing one table and asserting the doc it routed becomes dead weight, and an assertion that a non-glob manifest key does **not** become a root.

**E5. Trim the ship surface to the closure E4 computes.** Mark as `excluded` in `seed-curation.json` everything outside it — PRISM's own plans, self-dev ADRs, self-dev references. Everything link-reachable from E4's computed roots ships, including `SPEC.md` (cited by the shipped `code-standards.md`) and Atlas's onboarding dependencies. **Do the trim after E4 lands and reports**, so the exclusion list is E4's output rather than a hand-guess. `_toolkit/spec-editing.md` is named explicitly: PR 2C left it shipping with no stub route naming it, and E5 is where it either leaves the seed or gets a route. **Verify:** `pnpm prism:check` green (its `ship-closure` stage re-runs the closure over the trimmed curation); every route value in **both** shipped routing tables — `manifest.stub.json` and `manifest.base.json` — names a file the seed contains, enforced by `ship-closure` across two directions — a routed doc marked `excluded` is a `shippedButExcluded` failure, and a route naming a doc with no file behind it is an `unbackedRoutes` failure — not by `hook-gate.test.ts`, whose routes are fixtures rather than the shipped tables.
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
  - Evidence (machine): `for f in .prism/architect/guides/*.md; do [ "$(wc -l < "$f")" -le 120 ] || echo "OVER: $f"; done` prints nothing, and `ls .prism/architect/guides/*.md | wc -l` returns the number of distinct guide targets in `manifest.stub.json`. UNMET looks like: a guide over 120 lines, which reintroduces the cost that made the nag fail. (REQ-1)
- [ ] **AC-27.** Route integrity is checkable by the consumer, not asserted in prose.
  - Evidence (machine): `pnpm prism:doctor` reports orphan-doc, dead-route, and hook-registration findings; `doctor.test.ts` covers each with a positive control that produces no finding on a clean fixture. UNMET looks like: a check whose clean case was never exercised, so a typo'd probe reports zero findings and reads as healthy. (REQ-1)
- [ ] **AC-28.** The ship surface is exactly the dependency closure of its four roots, and the closure is enforced.
  - Evidence (machine): `pnpm prism:check` green with `ship-closure.ts` wired in; its unit test asserts both failure directions — a shipped file referencing an excluded file, and a shippable file outside the closure — plus a clean-closure control. UNMET looks like: the closure documented in prose with no failing case, which goes stale on the first new cross-reference. (REQ-1)
- [ ] **AC-29.** A consumer's working tree is not dirtied by hook state.
  - Evidence (machine): the cold-start leg asserts both `.prism/architect-route-state.*.json` ignore lines are present in the adopted repo's `.gitignore`, and that re-running the seam does not duplicate them. UNMET looks like: duplicated lines on a second run, or a state file appearing in `git status --porcelain` in the temp repo. (REQ-1)
- [ ] **AC-30.** Subagent session-id semantics are established by observation, not assumed.
  - Evidence (machine): `pnpm prism:test` — D7's subagent leg asserts a deny evaluated with `agent_id` present consults the child's own state file, and that a doc read only by the parent does not satisfy it. UNMET looks like: the leg passing while the deny reads `session_id` directly, which is the shared-budget behavior #468 fixed and would silently return. **Re-derived 2026-08-19:** the original evidence line was human-only and named an unrun probe plus a D2 that chose between branches. Both are settled — the probe ran, and #468 (`d6416e96`) shipped the keying — so the criterion's remaining risk is regression in the deny arm, which is machine-checkable. The probe record itself lives in `## Decisions` § Subagent context does not travel. (REQ-1)
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
- [ ] **AC-31.** Every task in PR 2D ships a verify line that was re-derived against the implementation as it landed, not inherited from the task as it was authored.
  - Evidence (machine): `## History` carries two dated sweep tables for PR 2D — D0's, dated before the first implementation commit, and D10's, dated after the last — each with one row per task D1–D10 and a disposition of `held`, `fixed`, or `amended`. For every non-`held` row, the corrected command appears in that task's **Verify** line and returns what the table records when run literally from the repo root. Positive control: re-run one `held` row's command and confirm it returns the recorded result — a table of commands nobody ran reads identically to a table of commands that all passed. UNMET looks like: one table instead of two (D0 alone cannot see an implementation that did not exist yet), a `held` disposition on a task whose mechanism changed between the two sweeps, or any command returning something other than what its row claims. (REQ-1)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-13 | Winston | AC created in plan; no tracker ticket exists for this port | ✓ | N/A |

---

- **Guide placement resolves to `.prism/architect/guides/`, not `.prism/references/guides/`.**
  - **Root cause:** C4's fork asked whether the `../references/` route form resolves through `filterDocsOnDisk`. Measured against the live resolver, it does — `filterDocsOnDisk` joins with `path.join`, which normalizes the `../` away. But the credit channel does not follow: `extractArchitectDocPath` credits a read only when the path starts with `.prism/architect/`, so a guide under `.prism/references/` would be announced and never credited, and the deny gate PR 2D clears against the `read` array would be unsatisfiable.
  - **Alternatives considered:** keep `.prism/references/guides/` and widen `extractArchitectDocPath` to credit reads outside the architect directory; keep the location and accept that the deny cannot clear.
  - **Chosen approach:** take C4's own pre-specified fallback and move the guides under `.prism/architect/guides/`. Widening the credit channel is runtime behavior, which PR 2C is explicitly not allowed to change, and it would have shipped a gate whose remedy is unperformable — the exact failure the plan is written against.
  - **Implementation guidance:** route values are `guides/<name>.md`, relative to `.prism/architect/` like every other route. A guide read matches `.prism/architect/**` and so could announce itself; it does not, because `resolveArchitectNag` credits the just-read doc before it filters the announce list.
  - → no promotion needed (the placement is recorded here and enforced by the routes themselves; the authoring obligation it implies is already written into `writing-an-architect-doc.md` § Route-add is part of authoring).

- **The consumer twin of `skills-ecosystem.md` is split alongside canonical, and its two new halves become curated twins.**
  - **Root cause:** `skills-ecosystem.md` is a `curated` seed entry, so its consumer copy is hand-maintained rather than mirrored. Splitting only the canonical file would have left consumers with one 361-line doc whose sections the canonical guides cite as living elsewhere.
  - **Alternatives considered:** drop `skills-ecosystem.md` from `curated` so all four files auto-mirror; leave the twin whole and accept the divergence.
  - **Chosen approach:** split the twin the same way and add both halves to `curated`. Auto-mirroring the whole set was rejected because the moved sections cite PRISM's own `_toolkit/` ADR numbers, which `install-adr-gate` forbids on the consumer surface — curation is the mechanism that already handles exactly that, for exactly this file.
  - **Implementation guidance:** `architect/_toolkit/ticket-workflows.md` and `architect/_toolkit/plan-authoring.md` are `curated`; `architect/_toolkit/output-guards.md` is `excluded` as maintainer-facing build internals. The twins carry no `ADR-NNNN` references. Everything else added by this PR ships verbatim through the default mirror.
  - → no promotion needed (curation-boundary tactics for one file set; the general rule already lives in `install-layout.md` § Curated seed twins).

- **Command segmentation is a character scan, and read credit is judged over the whole command rather than per segment.**
  - **Root cause of the question:** the first segmenter split each line on whitespace and compared whole tokens against a boundary set, so a separator with no space around it (`a;b`, `a&&b`) stayed inside a token and never cut — both round-1 defects recurred in that spelling. Judging each segment's read credit on its own opened a second hole: a heredoc introducer makes the following lines data, so a `tee <<'EOF'` PR body had its own text parsed as commands and credited the docs its prose named.
  - **Alternatives considered:** a regex split on the separators as delimiters (`/\s*(?:\|\||&&|[;|&])\s*/`), which is what the review prescribed; extending the boundary-set enumeration to the unspaced spellings; a real shell tokenizer as a dependency.
  - **Chosen approach:** a single quote-, escape-, and heredoc-aware character scan for both arms, plus a whole-command safe-character gate on the read arm. The regex split was measured and rejected: `sed -i 's/a/b/;s/c/d/' out.md` carries a `;` inside the script, and cutting there strands `out.md` in a segment whose first token is not a write command — the gate stops seeing a real write, which is a worse failure than the one being fixed. Extending the enumeration re-runs the process that has already missed three times. A tokenizer dependency is out on the same zero-dependency constraint recorded above.
  - **Implementation guidance:** the read arm's certainty rule is the whole-command class — `SHELL_READ_SAFE_CHARACTERS` now admits `;` and line breaks as its only separators, and any character outside it refuses the entire command, not the clause carrying it. That is what makes the heredoc unreachable by construction rather than by enumerating `<<`, and it settles the round-2 minor the same way: `cat a && cat b` credits neither, and the JSDoc now says so and says why. The write arm cannot use a class (its whole job is metacharacters), so its correctness rests on the scanner: quotes hold a separator inside a token, and a heredoc body is skipped up to its delimiter.
  - **→ promotion pending — rides ADR-0072's `## Consequences` with the credit channel's other coverage-and-gaps content.**

## Sessions

- 2026-08-20 [huntermcgrew/opus5-port-deny-gate] (clove, dispatched — PR 2D round 2 repair)
  - **Intent** — close briar's two round-2 majors and the minor at the level of the class, so the segmenter stops producing defects of one shape a third time.
  - **Ambiguity** — none load-bearing; assumed the prescribed regex split is a proposal to verify rather than a specification, per the dispatch, and verified it — it regresses a quoted `sed` script and was replaced.
  - **Bounds** — PR 2D's file set: `hook.mjs`, `hook-gate.test.ts`, this plan. Untouched: the conductor run log, the draft flag, the merge, D8.
  - **Approach** — one shared character scanner for both arms plus a whole-command certainty gate on the read arm, and a generated separator-spelling set in the suite so the untested-spelling gap cannot reopen by omission.
  - **Close** — scope held. Six new tests, each confirmed failing against the pre-repair `hook.mjs` and passing after; the three findings are covered end to end through the real arms, not only at the parsers. Two silent decisions named: the heredoc introducer and its delimiter are dropped from the token stream rather than kept (`tee out.md <<'E'` previously yielded `<<'E'` as a phantom write target), and a read command's credit is now refused for the whole command rather than the offending clause, which gives up credit that was previously granted — under-credit costs one re-read. Edge inputs chosen on purpose: unspaced and every-padding separator spelling, `\r\n`, quoted separators, `<<-` and unterminated heredocs, here-strings (`<<<`), and word-prefixed redirects. No claim here is unproven except D8's live-host run, which still goes to the human merge gate.

- 2026-08-20 [huntermcgrew/opus5-port-deny-gate] (briar, dispatched — PR 2D round 2)
  - **Intent** — verify clove's five blocking closures independently rather than accept them, judge the two recorded non-closures, and sweep the repair delta for what the fixes introduced.
  - **Ambiguity** — none load-bearing; assumed the subject surface is `176f35c5..0141691e` reviewed at the full bar and the repair delta gets the regression sweep on top, per review-loop admissibility.
  - **Bounds** — findings to chat and to `## Review Issues`, plus a plan-only commit pushed. Untouched: source, the PR's GitHub surface, the draft flag, the merge.
  - **Approach** — re-derive each claim from the code and from measurement rather than from clove's prose: four mutations run here, three end-to-end probes through the real arms, and the routing loss re-measured with `matchDocsForPath` over `git ls-files`.
  - **Close** — scope held. Round 1's five blocking findings all verify as genuinely closed, and both deferrals hold on their recorded reasons (prettier on a stronger reason than the one given — it is not a dependency of this repo). Two new majors and one minor opened, all three in the shell-segment splitter the repairs introduced, all three reproduced end to end rather than reasoned. Edge inputs chosen on purpose in the probes: unspaced separators, heredoc bodies, `\r\n`, subshells, trailing separators, and quoted-space paths were each exercised deliberately, because the repair's whole surface is where one command ends and the next begins. One claim without proof, unchanged: D8's live-host run, which goes to the human merge gate.

- 2026-08-19 [huntermcgrew/opus5-port-deny-gate] (clove, dispatched — PR 2D)
  - **Intent** — ship the write-deny gate end to end: the arm, the parser flip, ADR-0072, the conductor correction, the suite, the consumer docs, and the two sweeps that grade the verify lines.
  - **Ambiguity** — none load-bearing; assumed D9 is in scope (the dispatch names D0-D10 and no Eli lane exists in this run) and that D8 cannot run from a dispatched session, so it is reported outstanding rather than claimed.
  - **Bounds** — PR 2D's file set per § Cross-PR collisions, plus the three routing tables absorbed under a recorded Decision. Untouched: the conductor run log, `prism-conductor/shared.md` § Talking to the operator, PR 2E's lane.
  - **Approach** — reuse the existing state format and the announce arm's credit channel rather than growing a second reader of either; D0 before code, D10 after.
  - **Close** — scope held, with one recorded absorption (the three routing tables, per the catch-all Decision). Two silent decisions named: `emitDeny` returns `null` on Cursor and Codex rather than guessing an unobserved envelope, and the deny reports only the first gated path in a multi-path payload. Edge inputs chosen on purpose: no session id, no route match, an unlisted tool name, an empty `sed -i ''` operand, and a doc absent from disk all resolve to allow. One claim without proof: D8's live-host run, which is `[HITL]` and unrun — every other claim rests on `pnpm prism:check` exit 0 at 798/798, with the deny deliberately broken to confirm leg 3 fails.

- 2026-08-19 [main] (winston, dispatched — `amend-2d`)
  - **Intent** — settle three plan-level questions so PR 2D starts with no open architectural calls: what B4 established, how the shell parser gates, and how 2D's verify lines stay honest.
  - **Ambiguity** — none load-bearing; assuming ADR-0072 needs no reconciliation because it does not exist yet (task D5 writes it), so the correction lands in D5's task text instead.
  - **Bounds** — `.prism/plans/opus5-port.md` only. No source, no hooks, no conductor run log, no 2D implementation.
  - **Approach** — three `## Decisions` entries plus every task-text amendment each one forces, rather than Decisions alone that D1 would have to re-derive.
  - **Close** — scope held; one file written. Three amendments in, and the B4 Decision forced four downstream corrections that were not in the brief: D2 stops implementing a branch (#468 already shipped it) and becomes coverage, D5 stops naming a placeholder consequence, the 2D header's "do not start D2" block is lifted, and AC-30's evidence was re-derived from human-only to machine — that last one is the same class the third amendment exists to catch, found by applying it to this edit. The allow-list Decision also corrected its own first draft: D3's write detector cannot run on the read allow-list, because `>` is outside that class by construction. Edge behavior chosen on purpose: a path carrying a space, a `%`, or any non-ASCII character stops crediting under the allow-list — under-credit, one re-read, the direction this channel is built to fail in.

- 2026-08-19 [huntermcgrew/opus5-port-credit-channel]
  - **Intent** — make the credit channel match how the agent actually reads (Bash `cat`/`head`/`sed`, `Grep`) and tighten credit to full unranged reads, so PR 2D's deny is satisfiable.
  - **Ambiguity** — none load-bearing; assuming `Grep`'s haystack arrives at `tool_input.path` (Claude's `Grep` carries no `file_path`), and that a shell command containing any control character parses to zero targets rather than being partially parsed.
  - **Bounds** — B1–B3 only, `pnpm prism:check` green, PR opened draft; B4 is `[HITL]` and untouched, and nothing in PR 2C's lane (guides, `SPEC.md`, stub routes, `seed-curation.json`, the skills-ecosystem split).
  - **Approach** — an opt-in `credit` flag on `resolveArchitectNag` plus a `resolveTargets` seam in `hook.mjs`; no new module.
  - **Briar self-review 2026-08-19** — 1 major, 2 minor; see `## Review Issues`. The major is a confirmed over-credit: a newline in a Bash command is not in the parser's bail set.
  - **Close** — scope held. Two pre-existing `architect-route.test.ts` cases needed `{ credit: true }` added, since they asserted the resolver's old always-credit behavior — the assertions are unchanged, only the opt-in. Edge behavior chosen on purpose: an empty or absent command, an unrecognized command name, and a command carrying a control character each yield zero targets; a flagged `cat` announces without crediting. The suite's own control was run — breaking the `offset`/`limit` check made exactly the intended case fail.

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
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — fix all 9 Majors and 8 Minors from Eric's PR #461 review, taking the Windows CI failure first and the two behavioral drifts slowly; Bounds — Eric's findings and their coverage only, no `PreToolUse` or deny code, no touching the rename-inversion mechanism from #460, `spec-scope-lint`'s cross-branch inconsistency left alone as a known defect, PR not marked ready and not merged; Approach — reproduce each behavioral finding before fixing it so the fix has a measured before-state rather than a passing test written after the fact, and commit in stages so the reviewer can diff each · close: scope held — five code commits plus this plan record. Silent decisions named: hook-runtime ownership established by a marker line the shipped files carry rather than by a recorded hash, because `.claude/hooks/` sits outside the sync manifest's content root and a hash-less comparison would `.bak` on every version bump; the settings predicate anchored to PRISM's whole invocation shape rather than to the exact current command strings Eric suggested, because exact strings break idempotency the first time a later version changes its flags; stale-file pruning added alongside the enumerated copy, which Eric named as a consequence and the marker makes cheap and safe. Edge cases chosen deliberately: a truncated announcement leaves its dropped tail unannounced so a later read names it; the multi-path Codex loop may overshoot its byte budget by one announcement rather than discard one already marked announced; an unmarked file sharing `.claude/hooks/` is never pruned. Verification honesty: the Windows fix is reasoning about documented `fs.chmod`/`fs.stat` semantics on a platform this session cannot run, stated as reasoning and not as a run; every other fix has a measured before/after — 118 silenced docs to 0, consumer file clobbered to preserved-at-`.bak`, wrapper registration deleted to intact, and the new negative control confirmed to turn the leg red when one assertion is vacated. `pnpm prism:check` exit 0, 712/712.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — close Eric's 3 re-review Minors on PR #461 (M1 the marker's ownership-parity claim and a data-loss path in prune, M2 `resolveHarnessFromArgv`'s missing test, M3 no Windows leg spawns the hook standalone); Bounds — the three named findings and their coverage only, no `PreToolUse`/deny code, no reopening anything Eric confirmed closed, `.d.mts` sidecar-comparison gate and `spec-scope-lint`'s cross-branch gap stay out; Approach — decide ownership deliberately (content-keyed, since `.claude/hooks/` has no recorded hash) rather than patch the comment alone, add a `.bak` to prune so the decision is also safe, add the two named test cases each finding called for · close: scope held — one commit, one plan record. Silent decision named: `pruneStaleHookRuntimeFiles`'s action for a backed-up removal reuses the existing `"removed-with-backup"` `FileAction` variant (already defined, already used by `applyDeletedFile`) rather than adding a new one — same semantics, no new vocabulary needed. Edge case chosen deliberately: a second prune of the same stale path within one run reuses `backupConsumerFile`'s existing `.bak`/`.bak.N` collision handling, so a repeat prune never clobbers an earlier backup. Verification honesty: `pnpm prism:check` exit 0, 715/715, 0 skipped (up from 712 — measured, not assumed); the M1 fix is proven by the renamed test's own `.bak`-content assertion, not by re-running a hand-reverted before-state.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — close the Major the previous session's own M1 fix introduced (prune re-selecting the `.bak` it wrote, so the recovery guarantee lasts one update cycle) together with the invariant sentence that made the missing filter look safe, plus the paired Minor on the standalone-spawn test's discarded stdout; Bounds — those two findings, their coverage, and the plan entries that overstate the guarantee; the content-keyed ownership decision stays (upheld on its merits), no `PreToolUse`/deny code, no `spec-scope-lint`, no draft-flip, no merge; Approach — reproduce Eric's four-cycle measurement on the unfixed tree before writing the filter, so the fix has a measured before-state rather than a test written after it · close: scope held — one code change across `update.ts` plus two tests. Silent decisions named: the filter matches basenames rather than tracking backups written during the run, because the loop is across runs and a within-run set would not see run N−1's output; the filter is placed before the marker check, so a genuinely stale marked `.bak` is now left in place rather than swept — a recovery copy is the consumer's to delete. Edge recall: `.bak.N` collision names are covered by the same pattern (`/\.bak(\.\d+)?$/`); a `.bak` of an *unmarked* consumer file was already never pruned and still isn't; an empty `.claude/hooks/` still returns early. Verification honesty: the four-cycle loop was measured on both the unfixed and fixed trees (`.bak.bak.bak.bak` to a stable `.bak`), and the new regression test was confirmed to be the only test that turns red when the guard alone is removed. Prettier was not run — all three touched files fail `--check` at HEAD, so `--write` would have swept pre-existing drift into this diff. `pnpm prism:check` exit 0, 716/716, 0 skipped.

---
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — run PR 2A's closing ceremony (Decision verdict gate, lessons, 2A section close) and answer where Cursor/Codex hook delivery goes; Bounds — plan, the uncommitted retro, lessons, architect docs, an ADR if earned; no code, no deny, no conductor-state edits, no ready/merge/approve; Approach — read each promotion target against the Decision that claims it rather than trusting the plan's own verdict lines · close: scope held — plan, `install-layout.md` and its seed twin, ADR-0071, `manifest.json`, `lessons.md`, retro committed. Silent decisions named: verdicts for Decisions whose PR has not shipped are left pending but now name the PR that resolves them, rather than being forced to a verdict nobody can answer yet; the `.d.mts` sidecar Review Issue is carried to a follow-up PR off `main` rather than a ticket, per `followup-scope.md`; `scripts/ai-skills/update.ts` and `hooks/**` gained architect-manifest routes to `install-layout.md`, because promoting the ownership model into a doc the file's own editor never loads would have been a promotion in name only. Edge recall: the two `OPEN` Decisions took the exit-condition verdict variant rather than a promotion call, since neither has an answer to promote. Verification honesty: `pnpm prism:build` then `pnpm prism:check` exit 0, 716/716, and `pnpm prism:spec-scope-lint` verified to resolve this branch's plan rather than skip. Iris's finding 5 (verification asymmetry) was judged already implied by two existing lessons and not appended — recorded here rather than silently dropped.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides] open: Intent — implement PR 2C (writing guides, stub routes, and the doc splits the deny depends on), tasks C1–C8; Bounds — content only, no runtime behavior change, no gate logic, `scripts/ai-skills/hooks/**` untouched and `hook-gate.test.ts` limited to C4's route-resolution case; Approach — resolve C4's route fork empirically before writing a line of the guides, since their location depends on it · close: scope held — C4's fork resolved to the fallback and the guides live at `.prism/architect/guides/` (see the Decision on guide placement). Silent decisions named: the consumer twin of `skills-ecosystem.md` was split the same way as canonical, because a curated twin left whole would have contradicted the canonical docs the guides link to; the two new twins are `curated` like their parent, while `output-guards.md` is `excluded` and the rest ship verbatim; four `_toolkit/` ADR numbers were dropped from moved text rather than kept, because the install-adr-gate forbids them on the consumer surface. Edge recall: a guide read matches `.prism/architect/**` and so would announce itself — crediting fires first in `resolveArchitectNag`, so it never does. Verification honesty: the route fork was measured against the live resolver, not reasoned about; the new stub-route test was confirmed to fail when a route names a missing doc. One self-inflicted incident: a probe cleanup `rm -rf`'d the pre-existing `.prism/references/` tree, caught on the next `git status` and restored from HEAD before anything was committed.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides] open: Intent — clear Briar's six findings on PR #463 so every prose claim about routing matches what C4's stub routes; Bounds — the six named sites plus their curated twins, no runtime change, no PR 2D/2E work; Approach — smallest correct edit per finding, then `pnpm prism:check` · close: scope held, with two adjacent corrections named — tasks E4 and the REQ-1 AC evidence command still said `.prism/references/guides/`, the pre-fallback path the guide-placement Decision already superseded, so both were repointed to `.prism/architect/guides/`. Silent decisions named: the lesson-taxonomy route was added to both copies of `manifest.base.json` as well as `manifest.json`, because leaving the base stale reintroduces the gap on the next adopt; the consumer stub's `.prism/plans/**` route was left alone, since stub composition is PR 2E's lane and the same gap there is visible to task E1's orphan check. C2 and C4's original task text still names the pre-fallback path and was left as written — it is the intent the placement Decision records the fork against. Verification honesty: `pnpm prism:check` exit 0; each fix re-read at its site and the corrected C6 command run (no hits outside `/plans/`); the four route tables re-parsed as JSON rather than eyeballed.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides] open: Intent — clear Briar's re-review (1 major, 3 minors) so the surface `adopt` ships matches the canonical genericizing pass; Bounds — the four named sites plus the plan's own task text, no build-behavior change; Approach — diff the twin against canonical rather than trusting the finding list, and fix each verify command that let the gap read green · close: scope held. Silent decisions named: the consumer twin drops canonical's `(ADR-0047)` citation, because consumers receive no ADR tree and the citation would be a dead reference; the stale `shipping-flow.md § Per-User Overrides` anchor in the twin was repointed to the file itself, since no such heading exists — the same class of correction the major represents. Verification honesty: `pnpm prism:check` exit 0; `grep -c '.claude/'` returns 0 on both SPEC files. Not fixed, deliberately: the `renames`-never-content-compared gap is a build.ts schema change (a rename needs a per-entry mirrored-vs-curated policy, since `manifest.stub.json` is legitimately divergent) — out of a docs PR's lane and larger than a minor, so it is documented in `lib/seed-curation.ts` and emitted as follow-up work.

- 2026-08-19 [huntermcgrew/opus5-port-writing-guides] open: Intent — third-pass review of `d541627..d9beb9ff`, judging the deferral's adequacy and hunting a third canonical-only verify defect; Bounds — findings in chat and the plan's `## Review Issues`, no code, no GitHub writes; Approach — verify each of Eli's claims against source rather than the finding list, then enumerate every PR 2C verify line against the curated-twin list · close: scope held. Silent decisions named: C2's verify glob names the superseded guides path and errors rather than passing, judged covered by the supersede clause added in `d9beb9ff` and independently gated by the repointed REQ-1 AC evidence command, so filed as a note inside the Docs-impact angle rather than a separate finding. Edge recall: C1's twin measures 159 lines and passes, so the finding is the missing gate, not a violated bar. Verification honesty: `build.ts`'s 597-before-609 ordering, the shipped ADR set, the `shipping-flow.md` heading absence, and all six twin diffs were run here; `pnpm prism:check` exit 0 is the user's ratification, not my own run.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides] open: Intent — clear Eric's four PR #463 minors and re-derive every C1-C8 verify line against the class he named rather than against any single list; Bounds — the plan's verify lines, `seed-curation.json` classification, the route-integrity test, and one prose typo; no runtime change, no PR 2D/2E work, no merge; Approach — reproduce each finding against the live tree first, then run every corrected command literally before claiming it green · close: scope held. Silent decisions named: the five guides went to `curated` rather than a new `mirrored` bucket, which is the cleaner schema but a `build.ts` change inside a content-only PR — the drift cost that choice accepts is stated in the Decision rather than left implied; the route-integrity test gained a deliberate-exclusion carve-out instead of failing on `manifest.base.json`, per Eric's "fix the test, not the entry." Two amendments beyond the four findings, both the same class: C5 had no route-existence check at all (`verify-manifest` is structural only) and C8's grep never reached `templates/`. Edge recall: the empty case — a manifest with zero routes — is asserted against, so the test cannot pass vacuously on an empty seed. Verification honesty: `pnpm prism:build` and `pnpm prism:check` both exit 0; all eight corrected verify commands run literally and shown above; the new test negative-controlled by removing `output-guards.md` from `excluded`, which turns exactly that test red; 717/717, and HEAD measures 717 too, so no test was lost (the plan's earlier `716` was stale). Not verified: that a consumer's real `adopt` run resolves these routes — the test asserts against the seed on disk, which is what `adopt` copies, but no end-to-end adopt was run here.
- 2026-08-19 [huntermcgrew/opus5-port-credit-channel] open: Intent — close Briar's PR 2B findings so the credit channel can gate PR 2D; Bounds — `hook.mjs`, `harnesses.mjs`, `hook-gate.test.ts`, and this plan only, no PR 2C/2D lane files; Approach — widen the bail set rather than teach the operand loop what a path is · close: scope held. Silent decisions: kept `less`/`more` in `SHELL_READ_COMMANDS` despite no observed traffic (removing them makes those forms yield zero targets, which is a behavior change without a reason), and bailed on `#` unconditionally, so a path legitimately containing `#` yields no targets — the safe direction. Evidence: `pnpm prism:check` exit 0, 726 pass / 0 fail, new case `ok 327`.
- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface] open: Intent — implement PR 2E (tasks E1–E5) so route integrity and ship-surface membership are computed and enforced rather than asserted; Bounds — `doctor.ts`, a new `ship-closure.ts`, their tests, `seed-curation.json`, and whatever the trim orphans; no PR 2D lane files, no skill-body prose sweep; Approach — land E1–E4, run E4, and take its report as E5's exclusion list · close: scope held, with three corrections named. E4 as literally specified reported 43 dangling references; three separate defects in *my* first implementation accounted for 37 of them (recursing through excluded files, scanning canonical instead of the curated twin, and dropping `<repo-root>/`-prefixed reads as placeholders) — each is now a Decision and a test case. Silent decisions named: the walk skips `.prism/lessons.md`, because working notes name paths freely and one passing mention would pull an arbitrary file onto the ship surface; the ADR template gained a real link from the ADR index rather than an exclusion, because ADR-0064 already ratifies that the template ships and the bare filename was simply unreadable to any path scanner. Edge recall: the empty-tracked-set case is exercised by every unit test, and a tracked entry the closure stops reaching fails as stale rather than sitting forever. Verification honesty: `pnpm prism:check` exit 0 and `pnpm prism:build` exit 0 at HEAD; every check negative-controlled by a deliberate break and each control re-run to confirm it fails twice, not once. Two honest gaps — `pnpm prism:doctor` resolves its consumer root to the *parent* checkout from inside a worktree, so the E1 orphan set had to be re-measured with `--consumer`, and the absence of a build unclassified-file warning is weak evidence here because E5 only removed seed files and that warning fires only on a new one.
- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface]
- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface] open: Intent — clear Briar's PR 2E self-review (2 majors, 6 minors) at the class level, not the instance; Bounds — `ship-closure.ts`, `doctor.ts`, their tests, `seed-curation.json`, `manifest.base.json`, `manifest.stub.json`, and the plan; no version-compare fix (filed separately), no PR 2D lane; Approach — add the second shipped routing table to the closure roots and let the check's own report decide each instance · close: scope held. Silent decisions named: `spec-editing.md` returns to the seed rather than losing its base routes, because ~30 base routes name it and stripping them would empty 24 keys; `output-guards.md` loses its one base route instead of shipping, because the seed literal guard rejects its dogfooding literals and no consumer has a `scripts/ai-skills/` tree; the both-halves-absent hook case reconciles the claim down to the check rather than adding a finding that would fire on every Cursor and Codex install. Edge recall: a consumer root with no `.claude/` tree, a routing table that fails to parse (both manifest reads degrade to no roots), and a stub key with a single string value rather than an array — all pre-existing paths, unchanged. Verification honesty: `pnpm prism:check` exit 0; both new tests negative-controlled (the Windows-separator test re-run against the old substitution fails; the relative-link and tracked-suppression fixtures reach their subject only through the mechanism under test); the consumer-clean claim measured on a materialized seed root, not inferred.
  - **Intent** — judge PR #464's five self-flagged claims and its E1–E5 verify lines against measurement, not against clove's report.
  - **Ambiguity** — none load-bearing; assuming the pinned range is `34f0db16..c19e03a2` and that the plan's `## Review Issues` is the durable home even though the section is shared across the whole opus5-port stack.
  - **Bounds** — findings in chat and the plan's `## Review Issues`; no code fixes, no GitHub writes, no merge.
  - **Approach** — re-measure each claim against the tree (materialize the seed as a consumer root, run both closure controls by hand, diff every manifest's routed set against disk) rather than re-reading the reasoning that produced it.
  - **Close** — scope held. Two majors neither the brief nor clove named: the seed trim leaves `manifest.base.json` routing to a file it deleted, and the new orphan check warns on a clean install. Both are invisible to the two checks this PR adds, because each reads only one of the two shipped routing tables. Silent decisions: reviewed inline rather than fanning out to slice subagents — the diff is two source files plus their tests and one curation list, small enough that cross-file comparison was the whole job and slicing would have hidden it; did not re-run `pnpm prism:check`, taking Hunter's exit-0 ratification and both green CI legs. Edge recall: measured the both-absent hook state, the empty tracked set, the bogus tracked entry, and a dropped tracked entry — the first is silent by construction and now filed. Verification honesty: 746/746 tests, `ship-closure` exit 0 at 370 files reachable, orphan counts (6 seed / 7 canonical) and both tracked-set controls run here; the ADR-0064 scope claim and the guides twin-identity check verified at source. Not verified: that a real `prism adopt` reproduces the 6-orphan warning — I materialized the seed by hand rather than running adopt.
- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface] open: Intent — clear Eric's PR #464 review (2 majors, 2 minors) so the closure's roots mean what the plan says they mean and the function that defines them is exercised; Bounds — `ship-closure.ts`, `doctor.ts`, their tests, and the plan's E4/E5 text; no seed re-trim, no PR 3 work, no action on the 7-orphan follow-up; Approach — drop the key branch, let the check's own report name the tracked entries that fall out, then cover the roots directly · close: scope held. Silent decisions named: E5's "four roots" phrase and its "routed by the stub's first key" clause were corrected in the same pass, because the key branch is what made the second one true and leaving it would have re-stated the defect in prose; the existing Windows-separator test was tightened rather than duplicated, since its `claudehooks` assertion passed on the doubled-separator output it was written to catch; a malformed `settings.json` became an error finding to match `checkArchitectRoutes`, which is a new finding the raw-text scan could not produce. Edge recall: a routing table that fails to parse still degrades to no roots, a manifest value may be a bare string or an array, and a skills dir with no `prism-*` entries yields the fixed roots alone — all covered or unchanged. Verification honesty: `pnpm prism:check` exit 0; the real-repo closure re-run in both directions (336 files, all three report lists empty, `SPEC.md` reached); every new test mutation-checked — reinstating `routed.push(key)`, dropping `manifest.base.json` from the roots, and reverting the hook check to a raw-text scan each kill exactly their intended test and nothing else.

- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface] open: Intent — close the three Briar round-2 minors left unrouted after Eric's pass; Bounds — `doctor.ts`, `ship-closure.test.ts`, and the plan's E5 verify line; no 7-orphan follow-up, no prettier sweep; Approach — widen the orphan scan to the same table pair `ship-closure` reads, then make the two mis-named artifacts say what they measure · close: scope held. Silent decisions named: the base table feeds the dead-route half as well as the orphan half, so both directions share one definition of routed; a base table that fails to parse becomes an error finding, matching the existing `manifest.json` arm; the relative-link fixture's excluded decoration was dropped for an unlinked sibling that actually lands in `shippableOutsideClosure`, so the assertion is non-vacuous. Edge recall: base table absent (skipped, no finding), base table unparseable (error finding), a value that is a bare string rather than an array — covered. Verification honesty: `pnpm prism:check` exit 0 and 756/756 tests; both new doctor tests mutation-checked (stubbing the base read kills exactly those two); the relative-link fixture controlled by removing the link and observing `sibling.md` join the reported list; zero architect-route findings measured on a materialized seed root, not inferred.

- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface] open: Intent — close Eric's re-review minor so `ship-closure`'s verify claim and its behavior match; Bounds — `ship-closure.ts`, its test, and E5's verify line; no seed re-trim, no prettier sweep; Approach — add the existence check as its own report direction rather than narrowing the prose · close: scope held. Silent decisions named: the check runs unconditionally rather than only on default roots, because a shipped route naming an absent doc is a defect whatever roots a caller passes; the route list is deduped, so one doc named by both tables reports once; E5's sentence was tightened alongside the fix so the plan names both directions. Edge recall: manifest absent or unparseable yields no routes and no finding (unchanged), a value may be a bare string or an array, and a fixture repo with no manifests reports nothing. Verification honesty: `pnpm prism:check` exit 0 with all four report lists empty at 336 files; the new test mutation-checked by stubbing `unbackedRoutes` to `[]`, which kills that test and nothing else (15/15 to 14/15). Not verified: no real shipped route is currently unbacked, so the failing path is exercised only by fixture.

- 2026-08-19 [huntermcgrew/opus5-port-deny-gate] open: Intent — clear the two UNMETs from Reese's PR 2D AC verification and make his report discoverable from the plan; Bounds — `hook-gate.test.ts`, the plan's D3 verify line, D3's D10 row, and the plan's `## History`; no conductor run log, no AC-19 evidence-line fix (Winston's, routed separately), no merge or undraft; Approach — make the no-session `PostCompact` case seed state and assert survival rather than assert non-throw, and correct the dead Cursor mirror path rather than narrow the claim around it · close: scope held. Silent decisions named: the AC-7 case asserts both the file's survival and the still-suppressed second announce, because a surviving file that no longer suppresses would satisfy the narrower assertion while defeating what the criterion protects; D3's D10 disposition moved from `held` to `fixed` rather than being reworded in place, since the verify line itself changed. D4's D10 row still reads accurately and was left alone. Edge recall: the no-session payload carries a real repo root now, so the arm's early return is exercised against a directory that does hold state — the case the old `/repo` path could not reach. Verification honesty: `pnpm prism:check` exit 0, 798/798. The AC-7 assertion was mutation-checked twice, and the first mutation is worth recording: removing the `if (!sessionId) return` guard does not kill the test — but not for the reason first recorded here. Corrected on Reese's refutation: the payload yields `null`, not an empty string, so `sessionId.replace` throws a `TypeError` that the surrounding catch swallows, and no prefix is ever built. The survival conclusion stands (the arm deletes nothing either way); the mechanism is a swallowed throw, not an unmatchable prefix. The mutation that does kill it, and only it (57 to 56/57), is widening the no-session prefix to `architect-route-state.`, which is the destructive behavior the criterion names. D3's corrected grep run literally from the repo root — exit 0, all five mirrors named.

- 2026-08-20 [huntermcgrew/opus5-port-deny-gate] (clove, dispatched — PR 2D review round 1)
  - **Intent** — clear Briar's PR 2D self-review (1 critical, 4 majors, 6 minors), correct the two plan claims the record got wrong, and land the branch including her stranded plan commit.
  - **Ambiguity** — none load-bearing; assumed the ADR index table and ADR-0071's frontmatter are in frame even though neither file was in the original diff, because a new ADR joining its own registration is the same edit as writing it.
  - **Bounds** — PR 2D's file set plus the three routing tables already absorbed under the catch-all Decision. Untouched: the conductor run log, D8, the merge and draft state.
  - **Approach** — verify Briar's two structural answers against the code before building on either, then one shared segment splitter rather than two patched arms.
  - **Close** — scope held. One deviation from the prescribed fix, deliberate: Briar's single shared boundary set would have split the read arm on `|`, which credits `cat doc | head -5` as a full read — the exact over-credit the allow-list exists to prevent — so the splitter takes the boundary set as an argument and the read arm passes only `;`. Her inert-`\n` finding checked out and her `:44` correction was honored. Two silent decisions named: the per-rule manifest entries the new `.prism/rules/**` glob subsumes were folded into it rather than left as redundant siblings, and ADR-0072 now *amends* rather than supersedes ADR-0071, because 0071's announce layer still ships. Edge recall: a pipe, a redirect, `&&`, `||`, and `&` each still refuse read credit inside their own segment; an unparseable segment costs only itself; an in-place `sed` in a later segment still yields its own target. Verification honesty: `pnpm prism:check` exit 0 at 805/805, and every claim of coverage above was mutation-confirmed rather than asserted — the whole-command safe-character test, the `filterDocsOnDisk` call, the argv ternary, the install registration, the `.path` fallback, the scope-id guard, the Cursor envelope, and the deny sentence each kill their intended cases and nothing else. Not proven: D8's live-host run, unchanged and outstanding at the merge gate.

- 2026-08-20 [huntermcgrew/opus5-port-deny-gate]
  - **Intent** — stop repairing the write scanner instance by instance and narrow the contract so briar's eight findings and five unprobed classes become unreachable, not handled.
  - **Ambiguity** — none load-bearing; assumed "provably simple" means provably a *read*, since the gate only ever needs to let a read past, and proving a write is the thing no parser can do.
  - **Bounds** — PR 2D's file set. Untouched: the read arm and its credit behavior, `checkInPlaceFlag`, the conductor run log, D8, the merge and draft state.
  - **Approach** — reuse the read arm as the proof rather than building a second notion of a safe command, so there is one character class and one segmenter in the file.
  - **Close** — scope held. The dispatch carried a design call rather than a repair list, and the write parser is deleted rather than fixed; see Decision: The shell arm reroutes unless it can prove a command is a read. Two silent decisions named: `checkPathIsRouted` was renamed to the batched `filterRoutedPaths` because the new arm asks about every token in a command and a per-path entry point would re-read the manifest once per token, and the reroute message was rewritten because the old wording asserted a write on commands the arm now fires on without one. Edge recall: an empty, whitespace-only, or absent command yields no candidates; a command naming no routed path costs one manifest load and returns null; an unterminated quote swallows its separator, which matches what the shell itself does and costs a proof rather than granting one. Verification honesty: `pnpm prism:check` exit 0 at 812/812, and the generated corpus caught one real defect in my own first cut — `${OUT:-path}` fused the `-` onto the path so the candidate matched no route — which is the coverage claim doing its job rather than an assertion about it. Not proven: D8's live-host run, unchanged and outstanding at the merge gate.

## History

- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface]: Implemented PR 2E (E1–E5). `prism doctor` gained orphan-doc, dead-route, and hook-registration checks; new `scripts/ai-skills/ship-closure.ts` computes the ship surface as the dependency closure of its four roots and is wired into `pnpm prism:check`; the six files E4 reported outside that closure are now `excluded`. `pnpm prism:check` exit 0; see Decisions for the three closure-fidelity calls and the tracked-reference deferral.
- 2026-08-19 [huntermcgrew/opus5-port-credit-channel]: Fixed Briar's PR 2B major and one Minor — `SHELL_CONTROL_CHARACTERS` now bails on newline, CR, and `#`, closing an over-credit where a multi-line `cat` first line credited every bare token on every later line, and `filePathFromToolInput`'s comment now matches its unconditional `path` fallback. The truncated-`cat` Minor is deferred into task D5's ADR-0072 `## Consequences` rather than fixed here. `pnpm prism:check` exit 0, 726/726; the three new bail forms were control-checked against the old regex.
- 2026-08-19 [huntermcgrew/opus5-port-credit-channel]: Implemented PR 2B tasks B1–B3 — the credit channel. `resolveArchitectNag` takes an opt-in `{ credit }` flag defaulting to false; `hook.mjs` gained `parseShellReadTargets` and `resolveTargets`, which credit only an unranged `Read` and a flagless `cat`, while `head`/`tail`/`sed -n`/`less`/`more`/`Grep` announce and never credit. `pnpm prism:check` exit 0, 726/726, 1 skipped; the range check was deliberately broken to confirm the suite catches it. B4 is `[HITL]` and untouched.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Fixed Eric's 3 re-review Minors on PR #461. Rewrote `HOOK_RUNTIME_MARKER`'s doc comment off its false parity claim with `applyIncomingFile` and gave `pruneStaleHookRuntimeFiles` a `.bak`-before-delete step, closing the recoverability gap on a marker-carrying file at a non-standard path; added the two `resolveHarnessFromArgv` cases its own docstring called for; added a source-tree `spawnSync` micro-test so the delivered hook runs as its own process on every platform. `pnpm prism:check` exit 0, 715/715, 0 skipped; see `## Review Issues` for the per-finding table.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Fixed the Major the prior session's M1 `.bak` safety net introduced — `pruneStaleHookRuntimeFiles` now skips backup basenames (`BACKUP_BASENAME_PATTERN`), so it no longer re-selects the marker-carrying backup it just wrote and chain-backs it up one suffix per run. Rewrote the docstring invariant that made the missing filter look safe, added a four-run regression test, and closed the paired Minor by asserting the standalone-spawn test's announcement instead of discarding it. `pnpm prism:check` exit 0, 716/716, 0 skipped; the loop was measured before and after (`.bak.bak.bak.bak` to a stable `.bak`).
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
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides]: Cleared Briar's six PR 2C findings — three stale routing claims corrected (`AGENTS.md.tmpl`, `.prism/SPEC.md`, `business-layer.md` and its twin), `_toolkit/audit-workflow.md` added to the `.prism/plans/**` route, C6's verify text scoped to exclude `/plans/`. See Decision: `spec-editing.md` ships to consumers unrouted until PR 2E, deliberately.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides]: Cleared Eric's four PR #463 minors — C1 and C2's verify lines corrected, the five guides classified `curated`, C7's verify replaced with a re-runnable classification loop, the route-integrity test widened to every install-seed manifest with a deliberate-exclusion carve-out, and `output-guards.md`'s dropped `that` fixed. See Decision: the five writing guides are classified `curated`.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides]: Re-derived every C1-C8 verify line against the class Eric named — the verify line was not re-derived when the task changed underneath it — rather than against any single list. Two amendments beyond the reported findings: C5 gained a route-existence pass (`verify-manifest` is structural only), and C8 widened to `templates/` (a curated twin never regenerates). See the sweep table in `## Review Issues`.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides]: Cleared Briar's re-review major and three minors — `SPEC.md.tmpl` received C3's genericizing pass (six `.claude/` paths, the `plan-authoring.md` repoint, the ADR-0047 promotion wording, § Where it lives), `AGENTS.md.tmpl:119` names the `.claude/skills/**` stub key instead of generalizing it, and C3's verify now covers both twins.

- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface]: Cleared Eric's PR 2E review — the closure now seeds route values only, so a manifest key is no longer mistaken for content and the documentation site stops propping up tracked dangling entries (372 reachable files down to 336, all three report lists empty). `resolveDefaultRoots` gained direct coverage, the hook check parses `settings.json` instead of regexing it, and E4's Roots and Verify lines were re-derived to the computation they describe.
- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface]: Cleared Briar's PR 2E review — the closure now walks both shipped routing tables, so a route in either is a promise the seed keeps, and `manifest.stub.json` routes every doc the seed ships, leaving a fresh install with no architect-route warning. Six minors fixed alongside: the unreachable manifest-basename set, the Windows-separator strip, two missing test controls, the hook check's overclaimed scope, and E1's and E5's stale verify lines.
- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface]: Widened `doctor`'s architect-route check to read both shipped routing tables, so a doc routed only by `manifest.base.json` is no longer an orphan to one tool and reachable to the other. Renamed the relative-link closure fixture around the sibling that actually discriminates and pointed E5's verify line at `ship-closure` as its real enforcer.

- 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface]: Cleared Eric's re-review minor — `ship-closure` now reports a shipped route naming an absent doc as its own failure direction (`unbackedRoutes`), closing a gap the reachable-but-excluded direction cannot see because a missing doc is never reached. E5's verify line now names both directions.

- 2026-08-19 [main]: Recorded B4's Decision — subagent context does not travel, state keys on `agent_id ?? session_id` (#468), and the fresh read cost is chosen rather than tolerated. Forced four task corrections: D2 becomes coverage rather than implementation, D5 drops the stale credit-leak consequence, the 2D header's D2 block is lifted, and AC-30's evidence was re-derived to machine.
- 2026-08-19 [main]: Settled the shell parser as an allow-list of safe characters rather than a deny-list of metacharacters, folded into task D3; the deny-list had already failed twice inside its own PR, and a miss on it over-credits while a miss on an allow-list costs one re-read.
- 2026-08-19 [main]: Added the verify-line class check to PR 2D as tasks D0 (pre-flight re-derivation) and D10 (post-implementation sweep) plus AC-31; two tables are required because D0 cannot see an implementation that does not exist and D10 cannot tell an always-wrong line from one that went wrong.

- 2026-08-19 [huntermcgrew/opus5-port-deny-gate]: Ran D0's verify-line re-derivation sweep against tasks D1-D10 before the first implementation commit. Six of ten lines were amended; the corrections are written into each task's **Verify** line in the same commit as this table. Baseline for every command below: `pnpm prism:check` exit 0, 775 tests / 774 pass / 0 fail.

**D0 sweep — verify lines re-derived at authoring time (2026-08-19, pre-implementation)**

| Task | Disposition | What the command returns today |
| --- | --- | --- |
| D0 | `held` | Content-only; the artifact is this table. No command to run. |
| D1 | `amended` | The line named "D7's suite legs 1 and 2" — a leg, not a runnable command — and reached only the test surface while the task also writes two registration files. Amended to `pnpm prism:test` plus a `PreToolUse` presence check on both `.claude/settings.json` and `templates/install/.claude/settings.json`. The registration check returns `0 0` today (neither file carries a `PreToolUse` key). |
| D2 | `amended` | Half the line pointed at D8, which is `[HITL]` and cannot run in a dispatched lane, so the task had no machine verification at all. Amended to name the subagent leg's command on its own and record D8's step as outstanding rather than as verification. `pnpm prism:test` passes today with no subagent deny leg present. |
| D3 | `amended` | `pnpm prism:test` reaches the parser and its cases but not the sentence the task adds to `.prism/rules/context-reuse.md § Architect-context routing is diff-blind` — the same canonical-without-its-surface miss as C1 and C8. Amended to add a grep for that sentence across the rule and its build-managed mirrors. The grep returns nothing today. |
| D4 | `amended` | "D7's `PostCompact` cases" names a leg rather than a command. Amended to the literal `pnpm prism:test`, which returns 775/774/0 today with the `PostCompact` deny-side cases absent. |
| D5 | `amended` | `pnpm prism:crossref-lint` (green today) and `ls .prism/spec/adrs/_toolkit/0072-*.md` (exit 1, no matches) reach the file and its links but not the classification every new file owes `seed-curation.json` — all 65 existing `_toolkit/` ADRs are listed individually under `excluded`. Amended to add the classification check. |
| D6 | `amended` | `grep -rn "no \`PreToolUse\` ownership guards on writes" .ai-skills/ .prism/` returns **3 hits and can never return empty**: one is the live conductor line, and two are this plan and `issue-408.md` quoting the old string. It also misses four build-managed mirrors carrying the same sentence (`.claude/agents/`, `.claude/skills/`, `.codex/agents/`, `.cursor/skills/`). Amended to AC-19's shape — plans excluded, mirrors included — which returns 5 hits today. |
| D7 | `held` | `pnpm prism:test` — exit 0, 775 tests, 774 pass, 0 fail, 1 skipped. Reaches the whole surface the task changes. |
| D8 | `held` | `[HITL]`, human-run, no command by construction. Its artifact is a `## History` entry naming what was observed. |
| D9 | `amended` | `pnpm prism:check` (exit 0 today) **cannot see** either half of what the task changes: `install-layout.md` is `curated`, so `checkSeedDrift` checks its twin for existence and never for content, and `docs/distribution.md` is not compared against anything. Amended to add a § Write gate heading check across both `install-layout.md` copies plus a gate mention in `docs/distribution.md`; all three return nothing today. |
| D10 | `held` | Content-only; the artifact is the second table. No command to run. |

- 2026-08-19 [huntermcgrew/opus5-port-deny-gate]: Implemented PR 2D — the `PreToolUse` deny arm, the allow-list pre-filter and shell-write reroute, ADR-0072, the conductor correction, the gate suite, and the consumer-facing gate docs. `pnpm prism:check` exit 0, 798 tests / 798 pass / 0 fail (baseline 775/774); the deny was deliberately disabled to confirm leg 3 fails. D8 is `[HITL]` and unrun — see `## PR Readiness (PR 2D)`.
- 2026-08-19 [huntermcgrew/opus5-port-deny-gate]: Narrowed the `.prism/**` catch-all in all three routing tables, answering the cost-of-the-remedy question PR 2C's review handed to this PR; see Decision: The `.prism/**` catch-all is narrowed to the paths `install-layout.md` governs.
- 2026-08-19 [huntermcgrew/opus5-port-deny-gate]: Ran D10's sweep against the implementation as it landed. Two lines moved after D0 had already dispositioned them, both invisible at authoring time: D9's named a file that describes no hook, and D5's mechanism grew a second registration site during implementation.

**D10 sweep — verify lines re-derived against the implementation (2026-08-19, post-implementation)**

| Task | Disposition | What the command returns today |
| --- | --- | --- |
| D0 | `held` | Content-only. Its artifact, the first table, is above. |
| D1 | `held` | `pnpm prism:test` exit 0, 798/798. `grep -c '"PreToolUse"' .claude/settings.json templates/install/.claude/settings.json` → `1` and `1`. The arm gained `resolveListedToolKind` during implementation, but the reach of both commands is unchanged by it. |
| D2 | `held` | `pnpm prism:test` exit 0 — the subagent leg asserts both directions. D8's subagent step remains outstanding and is not counted as verification. |
| D3 | `fixed` | `pnpm prism:test` exit 0. The mirror grep named `.cursor/rules/context-reuse.md`, a path that does not exist — every file in `.cursor/rules/` is `.mdc` — so run literally it exited 2 and reached four of the five mirrors. Corrected to `.cursor/rules/context-reuse.mdc`: exit 0, all five named. The write detector grew a segment scanner (`segmentHasInPlaceFlag`) mid-implementation; neither command's reach changed. |
| D4 | `held` | `pnpm prism:test` exit 0 — the `PostCompact` cases pass with and without a session id. |
| D5 | `amended` | **Axis 3.** `ls` succeeds and `crossref-lint` is green, but the ADR acquired a *second* registration site during implementation: D6 cites it by path from a skill body that ships, so `ship-closure` failed until the ADR joined `SHIP_CLOSURE_TRACKED_DANGLING_REFS` beside its two siblings in the same paragraph. D0 could not have seen this — the citation did not exist yet. The re-derived command returns `1` for both files. |
| D6 | `held` | The re-derived grep returns nothing. The five hits D0 measured are all corrected — one source plus four regenerated mirrors. |
| D7 | `held` | `pnpm prism:test` exit 0, 798 tests / 798 pass / 0 fail, 0 skipped. `hook-gate.test.ts` alone: 57 cases, cold-start leg included and passing. |
| D8 | `held` | `[HITL]`, human-run, no command. Unrun in this lane — a dispatched session has no live host. |
| D9 | `amended` | **Axis 2.** `pnpm prism:check` is green and both `## Write gate` headings return `1`, but the task named `docs/distribution.md` as the file describing the hook and it describes none — the description lives in `docs/what-prism-writes.md` and `docs/adopting-into-existing-repos.md`, both of which listed only the two pre-2D registrations. Corrected there; the re-derived command returns `1` for both. |
| D10 | `held` | Content-only. Its artifact is this table. |

- 2026-08-19 [huntermcgrew/opus5-port-deny-gate]: Reese's AC verification of PR 2D — 11 criteria, 9 MET, 2 UNMET — is at `.prism/plans/qa/ac-verification-opus5-port.md`.
- 2026-08-19 [huntermcgrew/opus5-port-deny-gate]: Cleared Reese's two UNMETs. AC-7: the no-session `PostCompact` case now seeds real state and asserts it survives, where it previously only asserted the call does not throw against a path holding no state. AC-31: D3's verify line named `.cursor/rules/context-reuse.md`, a path that does not exist (the Cursor mirror is `.mdc`), so it exited 2 and reached four of five mirrors; corrected, and D3's D10 row moved from `held` to `fixed`.

- 2026-08-20 [huntermcgrew/opus5-port-deny-gate]: Cleared Briar's PR 2D self-review. The critical and the write-arm major share one root cause — both arms tokenized a raw multi-line command instead of segmenting it first — and both are closed by a shared `splitShellSegments`; see the Review Issues entries for the per-finding fixes. The routing narrowing now re-routes `.prism/rules/**` and `.prism/skills/**` in all three tables, and the accepted-losses list is measured rather than estimated.
- 2026-08-20 [huntermcgrew/opus5-port-deny-gate]: Corrected the `## Sessions` mutation note Reese refuted — removing the `PostCompact` no-session guard throws a swallowed `TypeError` rather than building an empty-prefix sweep. The arm is inert either way, so the survival conclusion is unchanged.
- 2026-08-20 [huntermcgrew/opus5-port-deny-gate]: Cleared Briar's PR 2D round-2 review. Replaced the token-comparison segmenter with a quote-, escape-, and heredoc-aware character scan shared by both arms, and moved the read arm's safe-character test back over the whole command with `;` and line breaks admitted as separators. See Decision: Command segmentation is a character scan.
- 2026-08-20 [huntermcgrew/opus5-port-deny-gate]: Narrowed the shell arm to refuse-unless-provable and deleted the write parser; closes all eight of briar's round-3 pass-2 findings and her five unprobed classes. Test coverage moved from enumerated forms to a generated shape corpus crossed with every out-of-class metacharacter. See Decision: The shell arm reroutes unless it can prove a command is a read.

## PR Readiness (PR 2D — The deny gate)

- [x] No critical or major issues known — Briar has not reviewed yet.
- [x] Types correct — `pnpm prism:check-types` exit 0 across both tsconfigs, including `checkJs` over the `.mjs` runtime.
- [x] No stray debug artifacts.
- [x] Tests written for new logic and edge cases — 798/798, `hook-gate.test.ts` at 57 cases with all three required legs, the subagent leg in both directions, and a positive control that fails leg 3 when the deny is disabled.
- [x] All debugged issues resolved — none opened.
- [x] Build passes — `pnpm prism:build && pnpm prism:check` exit 0, 2026-08-19.
- [ ] **D8 is unrun.** The `[HITL]` end-to-end run against a live Claude Code host cannot happen in a dispatched session. Every leg below it synthesizes its own payloads, so the suite cannot catch a payload-shape mistake — that is exactly what D8 exists to catch, and it is the one claim in this PR with no evidence behind it.
- [ ] PR description — written at push; re-sync if scope moves.
- [ ] Lasting decisions promoted — deferred to plan close, per the pending verdicts on the deny-scope, friction-not-a-wall, catch-all, and subagent Decisions.

**Last updated:** 2026-08-19

---

## Review Issues

### A shipped route naming an absent doc is dropped silently

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ship-closure.ts`
- **Problem:** `collectManifestRoutedPaths` yields the route and `expandRoot` returns nothing for a missing path, so a route with no file behind it contributed nothing and reported nothing — while E5's verify line claimed the reachable-but-excluded direction caught it. That direction only fires on a doc that is reached and excluded, which an absent doc never is.
- **Suggested fix:** check route existence directly and report it. Done as `collectUnbackedRoutes`, surfaced on the report as `unbackedRoutes`, printed by `formatShipClosureReport`, and failing the CLI. Covered by `ship-closure.test.ts` "a route naming a doc that does not exist is reported"; stubbing `unbackedRoutes` to `[]` kills exactly that test.

<!-- PR 2E (#464) — Briar self-review 2026-08-19 [huntermcgrew/opus5-port-doctor-shipsurface] -->

### E5 removes `_toolkit/spec-editing.md` from the seed while the shipped `manifest.base.json` still routes to it

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/definitions/seed-curation.json:6` / `templates/install/.prism/architect/_toolkit/manifest.base.json`
- **Problem:** E5's own verify line says `_toolkit/spec-editing.md` "either leaves the seed or gets a route"; it left the seed, and the ~40 routes already naming it in the shipped `manifest.base.json` were not removed, so every install now carries a routing table with a route to a file the install does not have.
- **Class:** a route-integrity check whose root set omits one of the two shipped routing tables.
- **Sweep:** compared each of the three manifests' routed value set against the files on disk beside it (`python3` over `manifest.base.json`, `manifest.stub.json`, `.prism/architect/manifest.json`). `stub(seed)` and `live(.prism)` are both clean. `base(seed)` names two absent docs: `_toolkit/spec-editing.md` (introduced here) and `_toolkit/output-guards.md` (pre-existing, excluded before this PR). Neither new check sees them — `ship-closure.ts` reads only `CONSUMER_STUB_PATH` as a routing root, and `checkArchitectRoutes` reads only `architect/manifest.json`.
- **Suggested fix:** add `manifest.base.json` to the closure's routing roots alongside the stub. That either keeps `spec-editing.md` in the closure (so E5 never excludes it) or makes the dangling base route a reported finding. The pre-existing `output-guards.md` route falls out of the same change.
- **Fixed:** 2026-08-19 — Class closed: `resolveDefaultRoots` now reads both shipped routing tables (`collectManifestRoutedPaths` over `manifest.stub.json` and `manifest.base.json`), so every route in a table a consumer receives is a closure root. With that root added the closure reported both dangling routes. Instance: `architect/_toolkit/spec-editing.md` is no longer excluded — a shipped table routing it is a promise the seed keeps. Pre-existing: the `scripts/ai-skills/**` → `_toolkit/output-guards.md` route is dropped from `manifest.base.json`; the doc carries dogfooding literals the seed guard rejects, and no consumer has a `scripts/ai-skills/` tree to route from.

### `prism doctor`'s new orphan check warns on the product's own default install state

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:470`
- **Problem:** a freshly adopted consumer gets `[WARN] architect-route: 6 architect doc(s) on disk are named by no manifest route` with no misconfiguration of their own, so the check's first impression on every install is a false alarm.
- **Class:** a verify line that was not re-derived when the task it gates changed shape (the class Iris named in the 2C retro).
- **Sweep:** materialized the seed as a consumer root (`templates/install/.prism` → `/tmp/sc/.prism`, stub renamed to `manifest.json`) and ran `doctor --consumer /tmp/sc`: 6 orphans (`_toolkit/business-layer.md`, `closing-messages.md`, `plan-authoring.md`, `qa-test-planning.md`, `skills-ecosystem.md`, `ticket-workflows.md`). Ran the same against the worktree root: 7 orphans, 5 of them the files E5 just excluded. E1's verify reads "expected non-empty until E5 runs" — E5 trims the seed, not canonical routing, so the emptying it assumed was never possible.
- **Suggested fix:** route the 6 in `manifest.stub.json`, or scope the orphan check to docs the consumer authored. Then re-derive E1's verify to the condition that actually holds after E5.
- **Fixed:** 2026-08-19 — `manifest.stub.json` now routes every architect doc the seed ships (skills-ecosystem, ticket-workflows and closing-messages from `.claude/skills/**`, qa-test-planning from the QA skill dir, plan-authoring from plans and templates, business-layer from `.prism/business/**`, spec-editing from the spec surfaces). A materialized consumer root reports zero architect-route findings. The worktree root still reports PRISM's own unrouted authoring docs — a true finding about PRISM's manifest, not a consumer false alarm — and E1's verify now says so.

### `ARCHITECT_MANIFEST_BASENAMES` is unreachable and its test passes on a different mechanism

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:425,447`
- **Problem:** the walk filters `entry.name.endsWith(".md") && !ARCHITECT_MANIFEST_BASENAMES.has(entry.name)`, and neither `manifest.json` nor `manifest.base.json` ends in `.md`, so the second clause is always true and the set never excludes anything.
- **Class:** a test that passes for a reason other than the one it names — the second instance in this PR, after E3's escaped-quote case.
- **Sweep:** read every membership test against the two-element set; the `.md` filter alone makes `runDoctor treats the manifest tables themselves as unroutable, not as orphans` green. The other three architect-route tests and all four hook-registration tests each have a genuine discriminator (verified by reasoning each fixture against the opposite implementation).
- **Suggested fix:** delete the set and the clause, and retitle the test to the `.md` filter it actually exercises — or keep the set and widen the walk to non-`.md` files, if routing tables in other formats are expected.
- **Fixed:** 2026-08-19 — Set and clause deleted; the `.md` filter that was doing the work is documented on `listMarkdownFilesRelative`, and the test is retitled to the filter it exercises.

### The relative-link closure rule has no unit test, and the Decision says it does

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ship-closure.test.ts`
- **Problem:** the plan's Decision states "each rule has a named unit test in `ship-closure.test.ts`" in the same sub-bullet that records following relative links as a deviation from task E4's literal text, but no fixture in the file uses a relative link form.
- **Class:** a claimed test that does not exist.
- **Sweep:** grepped the fixture set for `](../`, `](./`, and backtick-relative forms — zero matches; every fixture writes `.prism/…`. The widening itself is right: `resolveRef` resolves any non-repo-root-prefixed target against the referencing file's directory, and `.prism/rules/` files do cite each other that way.
- **Suggested fix:** add a fixture where a rule cites a sibling as `./sibling.md` and assert the sibling is not reported as dead weight; correct the Decision's claim if any rule is still left unpinned.
- **Fixed:** 2026-08-19 — Added `a relative sibling link is followed, so the sibling it names is not dead weight`: the sibling enters the closure only through `./sibling.md`, so an implementation that dropped the relative form reports it as dead weight. Decision reworded to name the form.

### No positive control for the tracked-dangling path

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ship-closure.test.ts:196`
- **Problem:** every unit test passes an empty tracked set except the stale case, so nothing asserts that a *still-reached* tracked entry is suppressed rather than reported stale; an implementation that never populated `trackedStillReached` would keep the whole suite green.
- **Class:** a check tested in one direction only.
- **Sweep:** ran both controls by hand against the real tree. Adding an untracked-but-reached ADR to the tracked set reports it stale; dropping `rules/skill-authoring.md` from the set surfaces it as `shippedButExcluded`. The mechanism is right in both directions — only the test is missing.
- **Suggested fix:** one fixture with a reached, excluded, tracked file asserting `shippedButExcluded` and `staleTrackedRefs` are both empty.
- **Fixed:** 2026-08-19 — Added `a tracked dangling reference the closure still reaches is suppressed`: an implementation that never populated `trackedStillReached` fails both assertions (the entry would appear in `shippedButExcluded` and in `staleTrackedRefs`).

### The hook-registration check is silent when the runtime and its registration are both gone

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:560`
- **Problem:** ADR-0072 names visibility as the compensating control for a gate that cannot prevent its own removal, but removing both halves produces no finding, and a test (`runDoctor reports no hook finding for a repo with neither a runtime nor a registration`) records that silence as correct.
- **Class:** a compensating control that covers each single failure but not their conjunction.
- **Sweep:** traced all four states. Runtime present + registration absent → reported. Registration present + runtime absent → reported. Both present → silent, correct. Both absent → silent. `checkSeedDelivery` does not cover `.claude/hooks/hook.mjs` either (it iterates `renames` only), so nothing else catches it.
- **Suggested fix:** if `.sync-manifest.json` records the hook as delivered, treat both-absent as a finding; otherwise state the limit in ADR-0072's `## Consequences` rather than leaving the ADR's claim broader than the check.
- **Fixed:** 2026-08-19 — Reconciled the claim to the check rather than the reverse. `checkHookRegistration`'s JSDoc now states the limit and its reason: nothing on disk distinguishes a deleted gate from one never delivered, and a Cursor or Codex consumer has no `.claude/` tree, so reporting both-absent would fire on correct installs. The test is retitled to name the limit instead of recording silence as correct. ADR-0072 is not in this branch (no commit on any branch adds it) — the ADR's `## Consequences` carries the same limit when it lands.

### `resolveHookCommandPath` strips Windows path separators along with JSON escapes

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:545`
- **Problem:** `rawPath.replace(/[\\"']/g, "")` removes every backslash, so a registration written with Windows separators collapses to one token and can never match a real path.
- **Class:** one substitution serving two purposes.
- **Sweep:** checked the other consumers of the raw settings text; `HOOK_COMMAND_PATH_RE`'s `\S*` additionally truncates any registered path containing a space. Both are low blast radius today because installs write `$CLAUDE_PROJECT_DIR/`-prefixed forward-slash paths, which is also what the fixtures use.
- **Suggested fix:** strip only `\"` and `\'` escape pairs and surrounding quotes, leaving other backslashes intact.
- **Fixed:** 2026-08-19 — Now `replace(/\\(["'])/g, "$1").replace(/["']/g, "")`: escaped quotes unescape, bare quotes go, other backslashes survive. New test asserts a Windows-separator registration is reported with its separators intact; it fails against the old substitution.

### E5's `pnpm prism:build` verify gates a condition the task cannot produce

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/opus5-port.md:220`
- **Problem:** "prints no unclassified-file warning" is evidence of nothing here, because that warning fires only on a newly added file and E5 only removes.
- **Class:** the same not-re-derived verify class as the orphan-check finding above; clove self-reported this one.
- **Sweep:** read all five E1–E5 verify lines against what each task landed. E2, E3, and E4's verify lines hold as written. E1's and E5's do not.
- **Suggested fix:** replace with the check E5 can actually fail — the closure re-run, plus a route-existence assertion over both shipped manifests.
- **Fixed:** 2026-08-19 — Replaced with the checks E5 can fail: `pnpm prism:check`'s closure stage, and a route-existence assertion over both shipped routing tables.

### Angle Coverage

- **Runtime behavior** — `swept`. `checkArchitectRoutes` (both halves measured against a materialized consumer seed and the worktree root); `checkHookRegistration` (all four presence states traced); `walkClosure` / `computeShipClosure` (both failure directions and the stale direction measured against the real tree); `formatShipClosureReport` (exit-code paths read).
- **Test efficacy** — `swept`. 8 new closure tests and 8 new doctor tests, each reasoned against the opposite implementation: 14 carry a genuine discriminator; `runDoctor treats the manifest tables themselves as unroutable` does not; the tracked-suppression behavior has no test at all.
- **Spec and doc consistency** — `swept`. Five E1–E5 verify lines (E1 and E5 stale); four new `## Decisions` entries (the closure-fidelity entry overclaims test coverage); `seed-curation.json` and `literal-allowlist.json` edits consistent with the six deleted twins; `manifest.base.json` left contradicting the trim.
- **Citation integrity** — `swept`. ADR-0072's compensating-control claim (broader than the check delivers); ADR-0064's scope claim in the tracked-set comment (verified — its `crossref-lint` gate is `templates/install/**` only); the `crossref-lint` seeded-then-emptied precedent (verified); `install-layout.md:29`'s split-ownership description of `manifest.base.json` (verified, and it is what makes the dangling base route non-fatal today).
- **External-system claims** — `swept`. `$CLAUDE_PROJECT_DIR` expansion and Claude Code's quoted-command form (checked against the fixture and the delivered `settings.json` shape, not from memory); `path.resolve` and `matchAll` semantics (traced, not assumed).
- **Repo writing rules** — `swept`. JSDoc on every new exported and private function, why-not-what inline comments, no tags or ALL CAPS, verb-first function names, no `any` — all clean.
- **Security** — `n/a — the diff adds read-only filesystem checks and a curation-list edit; no auth, input handling, secrets, or trust boundary.`
- **Docs impact** — `swept`. `.prism/architect/_toolkit/install-layout.md` and the ADR index README are touched by the mirror sweep only; no doc describes the ship-closure check yet, which is acceptable while it is a `prism:check` stage rather than a consumer-facing command.
- **Accessibility** — `n/a — no UI in the diff.`

### `AGENTS.md.tmpl` describes a consumer routing table C4 deleted

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/install/AGENTS.md.tmpl:119`
- **Problem:** The consumer's always-read root instruction file tells every new consumer that "manifest routes for spec surfaces (SPEC.md, skills, templates, rules, ADRs, architect, references, plans) load [`spec-editing.md`] alongside `.prism/architect/_toolkit/skills-ecosystem.md`." After C4 rewrote `manifest.stub.json`, the consumer stub routes none of those paths to either doc — `spec-editing.md` is named by zero stub routes and `skills-ecosystem.md` was dropped from the `.prism/**` catch-all. The sentence is now false for every fresh install.
- **Class:** `changed-behavior whose prose home shares no symbol with the change` (`code-standards.md` § Removal and rename completeness)
- **Sweep:** `grep -rn "spec-editing" templates/ .ai-skills/definitions/seed-curation.json` plus a set-difference of stub route values before/after (`d5f77f13` vs `5b6fd401`). Two more prose homes found, both listed below; `manifest.base.json` also still carries the old routes but is PRISM's own base, not the consumer's, so it is correct as-is.
- **Suggested fix:** Rewrite the sentence to name the guide routes the stub now carries, or cut the routing-table claim and leave the standards statement.
- **Fixed:** 2026-08-19 — Rewritten to name the guide routes the stub actually carries, one surface per clause.

### `.prism/SPEC.md` points at `skills-ecosystem.md` for a table C1 moved

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/SPEC.md:71`
- **Problem:** Reads "per the Plan Section Ownership table in `.prism/architect/_toolkit/skills-ecosystem.md`." C1 moved `## Plan Section Ownership` into `_toolkit/plan-authoring.md`; `skills-ecosystem.md` no longer contains it. `SPEC.md` is in this PR's diff (C3) and C3's own framing makes it a shipped, routed, deny-gated document, so the stale pointer is one a forced read will deliver.
- **Class:** `section moved, file-path reference still resolves` — `crossref-lint` validates paths, not section anchors, which is why the build stayed green.
- **Sweep:** `grep -rn "skills-ecosystem.md" --include=*.md .prism/ templates/ .ai-skills/ | grep -v /plans/` then matched each hit's named section against the post-split `## ` headings of `skills-ecosystem.md`. All other hits name § Project Context, § Skill Roster, § Cross-skill Handoffs, or § Rules for All Skills — sections that stayed. This is the only miss.
- **Suggested fix:** Repoint to `_toolkit/plan-authoring.md`.
- **Fixed:** 2026-08-19 — Repointed to `_toolkit/plan-authoring.md`, which carries `## Plan Section Ownership` after the C1 split.

### Lesson promotion taxonomy is no longer routed to the persona that owns it

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/manifest.json` — the `.prism/plans/**` route
- **Problem:** C1 moved `## Lessons` and `### Lesson promotion taxonomy` into `_toolkit/audit-workflow.md`, which is routed only from `.prism/lessons.md`, `.prism/archived/**`, `.prism/audit-state.json`, and `.prism/audits/**`. Lesson promotion happens at plan close, editing `.prism/plans/**` — a path that routes to `spec-editing.md`, `writing-a-plan.md`, and `plan-authoring.md`, none of which carry the taxonomy. Pre-split it arrived automatically through `.prism/**` → `skills-ecosystem.md`.
- **Class:** `content moved out of its reader's route`
- **Sweep:** Enumerated every route pattern in `.prism/architect/manifest.json` against the four post-split files. `matchDocsForPath` unions all matching patterns rather than most-specific-wins, so this is the only reader whose content set shrank against its job; every other route strictly reduced load without losing a section it needs.
- **Suggested fix:** Add `_toolkit/audit-workflow.md` to the `.prism/plans/**` route.
- **Fixed:** 2026-08-19 — `_toolkit/audit-workflow.md` added to the `.prism/plans/**` route in `.prism/architect/manifest.json` and in both copies of `manifest.base.json`. The consumer stub's own `.prism/plans/**` route is left alone — stub route composition is PR 2E's lane.

### `spec-editing.md` ships to consumers with no route naming it

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/spec-editing.md`
- **Problem:** C4 removed the only stub routes that named this doc. It still ships in the install seed, so a consumer receives a document the routing layer can never surface. The guide this same PR wrote — `writing-an-architect-doc.md` § Route-add is part of authoring — states a doc under `.prism/architect/` is not done until a route names it, so the PR contradicts its own new rule on the consumer surface.
- **Class:** `orphaned ship-surface artifact`
- **Sweep:** Set-differenced every stub route value against every `.md` under `templates/install/.prism/architect/`. `spec-editing.md` is the only doc this PR newly orphaned; `business-layer.md`, `qa-test-planning.md`, `onboarding.md`, `stack-detection.md`, `rule-generation.md`, `anchor-substitution.md`, and `closing-messages.md` were already unrouted in the stub on `main`. The two new curated twins (`ticket-workflows.md`, `plan-authoring.md`) also ship unrouted in the stub.
- **Suggested fix:** PR 2E's ship-surface trim is the natural home. Either drop it from the seed there or give it a stub route — but record the disposition now so the contradiction is deliberate rather than missed.
- **Fixed:** 2026-08-19 — Disposition recorded as a `## Decisions` entry (deferred to PR 2E) and named explicitly in task E5, so the deferral is deliberate.

### Consumer `business-layer.md` describes the pre-C4 catch-all

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/business-layer.md:107`
- **Problem:** States "The broader `.prism/**` catch-all still loads `install-layout.md` and `skills-ecosystem.md`; `spec-editing.md` loads via that catch-all too." The consumer stub's `.prism/**` route is now `_toolkit/install-layout.md` alone. The `spec-editing.md` half of the claim was already wrong before this PR (no catch-all ever loaded it); the `skills-ecosystem.md` half is newly wrong.
- **Class:** same as the `AGENTS.md.tmpl` finding — prose home of a routing fact, no shared symbol with the change.
- **Sweep:** covered by the `AGENTS.md.tmpl` sweep above.
- **Suggested fix:** Correct to name only `install-layout.md`, and drop the `spec-editing.md` sentence.
- **Fixed:** 2026-08-19 — Corrected in both the canonical doc and its curated seed twin to name only `install-layout.md`; the `spec-editing.md` sentence is gone.

### C6's verify command as written in the plan cannot return empty

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/opus5-port.md` — task C6's **Verify:** line
- **Problem:** Specifies `grep -rn "does not write your \`.gitignore\`" .prism/ templates/` returns nothing. Six hits remain, all inside `.prism/plans/` — append-only `## History`, `## Decisions`, and `## Review Issues` text that quotes the old policy and cannot be edited out. The target files (`install-layout.md` and its seed twin) are clean, so the task is done; the verify text is what is wrong. C8's verify already carries the `| grep -v '/plans/'` exclusion this one omits.
- **Class:** `verify command scoped wider than the task it gates`
- **Sweep:** Ran both the plan's literal command and the `/plans/`-excluded form. Excluded form returns nothing; the six remaining hits are in `followup-seed-twin-install-layout.md` (3) and `opus5-port.md` (3), all historical.
- **Suggested fix:** Append `| grep -v '/plans/'` to C6's verify, matching C8.
- **Fixed:** 2026-08-19 — C6's **Verify:** line now carries `| grep -v '/plans/'`, matching C8.

### Angle Coverage

- **Correctness / logic:** `swept` — the C4 route fork traced through `filterDocsOnDisk` (`path.join` normalizes `../`, so the route resolves) and `extractArchitectDocPath` (credits only paths under `.prism/architect/`, so a `.prism/references/` guide never enters the `read` array PR 2D clears against). Eli's fallback call is correct and correctly reasoned. One wording note: announce-once bookkeeping means such a guide would announce once per session, not "forever" — the unsatisfiable-deny consequence is the real defect and the plan's Decision states it accurately.
- **Type safety:** `n/a` — no typed source changed beyond one test file.
- **Edge cases:** `swept` — empty-string routes (none; every stub key non-empty), routes naming absent docs (none; verified by the new `hook-gate.test.ts` case and independently by set-difference), guide self-announcement (credited before filtering, so it does not fire).
- **Abstraction / duplication:** `swept` — the four-way split enumerated per route pattern; no route loads three halves, no route loads both `ticket-workflows.md` and `plan-authoring.md`, and every route's load strictly decreased. `output-guards.md` at 44 lines earns its own file because `excluded` is per-file granularity.
- **Spec and doc consistency:** `swept` — C1–C8 each checked against its own verify. C3 (`grep -c '\.claude/' .prism/SPEC.md` = 0), C6 (target files clean), C7 (curation entries confirmed), C8 (`claude-post-read` gone outside plans) pass. Two stale cross-references found and filed above.
- **Citation integrity:** `swept` — three ADR citations stripped from the consumer twins, each verified self-contained (the rule and its reason survive in the sentence; only the pointer to the decision record went). `install-adr-gate` confirmed to forbid `/ADR-\d{4}/` on the install surface, so the stripping was forced rather than discretionary. Eli's report said four; the count is three plus one non-ADR path reference to `.prism/skills/**`, which never ships.
- **Removals and renames:** `swept` — tree-wide search for `skills-ecosystem.md` and `spec-editing.md` across `.md`, `.tmpl`, and `.json`. Three stale prose homes found, all filed above.
- **Docs impact:** `swept` — this PR is the docs change; three doc corrections filed.
- **Tests:** `swept` — one new case (`every consumer stub route names a doc the install seed actually carries`). It asserts existence, resolved the way `filterDocsOnDisk` resolves. `pnpm prism:check` exit 0.


### Consumer `SPEC.md.tmpl` never received C3's genericization

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/install/.prism/SPEC.md.tmpl`
- **Problem:** C3 genericized `.prism/SPEC.md`, but `templates/install/.prism/SPEC.md.tmpl` — the file `adopt` installs as the consumer's own `.prism/SPEC.md` — carries none of it. Tier 4 still hardcodes `.claude/skills/<skill>/SKILL.md`; the non-spec list still names `.claude/worktrees/`, `.claude/changelogs/`, and `.claude/docs/qa/`; the Promotion clause still says "Then delete the plan — git history preserves it", which contradicts ADR-0047; the § Where it lives paragraph is absent; and the Plan Section Ownership pointer still names `skills-ecosystem.md` — the identical Major fixed at `.prism/SPEC.md:71` in `d541627`, unfixed on the surface that ships. C3's verify (`grep -c '\.claude/' .prism/SPEC.md` = 0) was scoped to canonical alone, which is why the task read green.
- **Class:** `curated twin missed by a canonical-only edit and a canonical-only verify`
- **Sweep:** `diff` of `SPEC.md.tmpl` against `.prism/SPEC.md` — 8 divergent hunks, every one a C3 change absent from the twin. `grep -c '\.claude/'` returns 6 on the twin, 0 on canonical. Ran `pnpm prism:build` on a clean tree: exit 0, zero files changed, so no mirror step regenerates this twin. The other two twins this PR touched (`business-layer.md`, `manifest.base.json`) are byte-identical to canonical and are clean.
- **Suggested fix:** Apply C3's genericization to `SPEC.md.tmpl`, including the `plan-authoring.md` repoint and the ADR-0047 promotion wording. Extend C3's verify to both paths.

### `SPEC.md.tmpl` has no drift gate, and `seed-curation.json` implies it does

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `.ai-skills/definitions/seed-curation.json` — the `renames` entry
- **Problem:** `SPEC.md` appears only under `renames` (`SPEC.md` -> `SPEC.md.tmpl`), never under `excluded`, `curated`, or `seedOnly`. A plain renamed mirror reads as "kept in parity by the build," but `pnpm prism:build` leaves the twin untouched and `pnpm prism:check` reports no drift against an 8-hunk divergence. Whichever way it is meant — hand-forked or mirrored — the config and the behavior disagree, which is what let the Major above ship silently.
- **Class:** `curation config states a guarantee the build does not provide`
- **Sweep:** Enumerated all four `seed-curation.json` keys for any `SPEC` entry; only the rename exists. Confirmed empirically by running `prism:build` on a clean tree and re-checking `git status` — no write.
- **Suggested fix:** Either mark it `curated` (drift expected, twin maintained by hand) and add it to whatever check covers curated twins, or make the mirror actually regenerate it. Winston's call; PR 2E's ship-surface lane is the natural home.

- **Deferred because:** the honest fix is a per-entry policy on `renames` (mirrored vs curated), since `manifest.json` → `manifest.stub.json` is legitimately divergent and a blanket content compare would flag it forever. That is a `build.ts` schema change, out of a docs PR's lane. The semantics are now stated in `scripts/ai-skills/lib/seed-curation.ts`, and C3's verify covers both twins so this specific twin is gated by the task that owns it.

### Tasks C2 and C4 still specify the superseded guide path with no pointer to the Decision

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/opus5-port.md` — tasks C2 (line 384, 391) and C4 (lines 399-404)
- **Problem:** Both still name `.prism/references/guides/`, and C4 spells six route values as `../references/guides/<guide>.md`. The guide-placement Decision supersedes them, but neither task carries a pointer to it, so a reader reconciling `manifest.stub.json` against C4's list sees a mismatch with no in-place explanation. Leaving executed task text as the recorded intent is a defensible call — the missing piece is the one clause that makes it legible as intent rather than as a stale instruction.
- **Class:** `superseded instruction with no supersede marker`
- **Sweep:** `grep -rn "references/guides"` across the tree — every hit outside `.prism/plans/` is gone, so the executed surface is fully repointed and this is plan text only. Tasks E4 and AC-26 were repointed in `d541627` and are correct.
- **Suggested fix:** Append one clause to C2 and C4: superseded by the guide-placement Decision; guides live at `.prism/architect/guides/`.

### `AGENTS.md.tmpl` states the skills route without its host qualifier

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/AGENTS.md.tmpl:119`
- **Problem:** The rewritten sentence says "skills to `writing-a-skill.md`", but the only stub key covering skills is `.claude/skills/**`. For a Codex or Cursor consumer reading this same host-agnostic file, no skill path matches. The five other clauses in the sentence are exact against `manifest.stub.json`; this is the one that generalizes a host-specific key. My pass on `5b6fd401` did not flag the stub key itself — that is a miss on my side, not new drift in `d541627`.
- **Class:** `host-specific route described in host-agnostic prose`
- **Sweep:** Checked all six clauses of the sentence against every `manifest.stub.json` key. `.prism/templates/**`, `.prism/plans/**`, `.prism/rules/**`, `.prism/SPEC.md`, `.prism/architect/**`, `.prism/references/**`, and `.prism/spec/adrs/**` all match their claimed guide exactly. Only the skills clause has no host-agnostic key behind it.
- **Suggested fix:** Say "Claude Code skills", or fix the stub key in PR 2E's stub-composition lane and leave the sentence.

### Angle Coverage — re-review of `5b6fd401..d541627`

- **Correctness / logic:** `swept` — all four route tables re-parsed as JSON; `.prism/plans/**` now unions four docs in `manifest.json` and both `manifest.base.json` copies, and the three host mirrors are byte-identical to `.prism/architect/manifest.json`.
- **Type safety:** `n/a` — no typed source in the range.
- **Edge cases:** `swept` — C6's corrected verify run literally (no hits outside `/plans/`); guide line counts 75-85, all under AC-26's 120; AC-26's count clause holds at 5 files against 5 distinct stub guide targets.
- **Abstraction / duplication:** `swept` — the two curated twins Eli edited (`business-layer.md`, `manifest.base.json`) confirmed byte-identical to canonical by `diff -q`. The third twin, `SPEC.md.tmpl`, is not, and is filed above.
- **Spec and doc consistency:** `swept` — `AGENTS.md.tmpl:119` checked clause-by-clause against the stub; `plan-authoring.md:28` confirmed to carry `## Plan Section Ownership` in canonical and in the seed twin; `business-layer.md`'s "as well" phrasing verified non-exhaustive and true in both trees (`.prism/**` loads `install-layout.md` plus `skills-ecosystem.md` in PRISM, `install-layout.md` alone in the stub).
- **Citation integrity:** `swept` — every path named in the rewritten `AGENTS.md.tmpl` sentence and in the repointed E4 roots resolves on disk.
- **Removals and renames:** `swept` — tree-wide `grep` for `references/guides` returns nothing outside `.prism/plans/`; tree-wide `grep` for `skills-ecosystem.md` paired with a moved section name returns exactly one hit, the `SPEC.md.tmpl` Major above.
- **Docs impact:** `swept` — this range is the docs fix; four findings filed.
- **Tests:** `swept` — no new test surface in the range. `pnpm prism:build` exit 0 with zero writes on a clean tree, which is itself the evidence for the drift-gate Minor.

### C1's verify checks the canonical `skills-ecosystem.md` only, not the curated twin C1 also splits

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/plans/opus5-port.md` — task C1's **Verify:** line
- **Problem:** C1's verify reads `wc -l .prism/architect/_toolkit/skills-ecosystem.md` under 200. The task also splits the curated seed twin `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` (named as split in the session-close note, and task 29 already warns this twin "does not regenerate and has drifted 65 lines behind canonical before; hand-edit both"). The twin is not measured. This is the third instance of the C6/C3 class: a verify scoped to canonical on a file whose twin the same task edits. The outcome holds — the twin is 159 lines — so the defect is the gate, not the result; it is the same gate shape that let the `SPEC.md.tmpl` major read green.
- **Class:** `canonical-only verify on a curated twin the task edits`
- **Sweep:** Enumerated every `**Verify:**` line in the plan's PR 2C block (C1-C8) and checked each against the curated-twin list in `seed-curation.json`. C3 now names both SPEC paths (fixed in `d9beb9ff`); C6 already names `.prism/ templates/`; C7 and C8 are tree-wide or build-level. C1 is the only remaining one that names a canonical path whose twin is `curated`. Confirmed the twin exists and was split (159 lines), and confirmed `crossref-lint` does scan `templates/install/.prism` (`crossref-lint.ts:128`), so the first half of C1's verify is twin-covered and only the `wc -l` half is not.
- **Suggested fix:** Extend C1's verify to both paths, matching the shape C3 now uses: `wc -l .prism/architect/_toolkit/skills-ecosystem.md templates/install/.prism/architect/_toolkit/skills-ecosystem.md` — both under 200.
- **Fixed:** 2026-08-19 — C1's verify now names both paths and says why the twin needs naming (it is `curated`, so no build step syncs it).

### Angle Coverage — third pass of `d541627..d9beb9ff`

- **Correctness / logic:** `swept` — the four changed files re-read at `d9beb9ff`; `build.ts:597` (curated content compare) confirmed to precede `:609` (renames existence check) in the loose-file branch, so the deferral's premise holds and adding `SPEC.md` to `curated` would short-circuit the rename arm.
- **Type safety:** `n/a` — the only `.ts` change is a JSDoc block.
- **Edge cases:** `swept` — ran C3's extended verify (0 on both SPEC files) and C1's twin measurement (159 < 200); ran C2's verify literally, which errors on a nonexistent glob (see Docs impact).
- **Abstraction / duplication:** `swept` — all five guide twins and `closing-messages.md` confirmed byte-identical to canonical by `diff -q`; `plan-authoring.md` differs and is correctly listed under `curated`.
- **Spec and doc consistency:** `swept` — every one of Eli's 8 claimed hunks verified present in the twin; both unasked calls verified against the install tree (`spec/adrs/_toolkit/` ships README and TEMPLATE only, so the ADR-0047 citation drop is correct; `templates/install/.prism/references/shipping-flow.md` carries the `pauseBeforeCommit` preference but no `## Per-User Overrides` heading, so repointing at the file rather than the anchor is correct). `AGENTS.md.tmpl:119` verified against `manifest.stub.json:3`, whose key is literally `.claude/skills/**`.
- **Citation integrity:** `swept` — `plan-authoring.md`, `shipping-flow.md`, and the manifest stub key all resolve in the install tree.
- **Removals and renames:** `swept` — the `.claude/` removal from the twin is complete (grep returns 0), and no dangling reference to the removed `skills-ecosystem.md` pointer remains in either tree.
- **Docs impact:** `swept` — one finding filed. C2's verify glob names the superseded `.prism/references/guides/` and errors rather than passing; judged not a separate finding because `d9beb9ff` added the supersede clause covering "the path below," and the 120-line bar it would enforce is independently gated by the REQ-1 AC evidence command, which this PR repointed.
- **Tests:** `swept` — no test surface in the range. `pnpm prism:check` exit 0 and the clean worktree at `d9beb9ff` are the user's ratification, not my own run.
### A newline in a Bash command is a command separator `SHELL_CONTROL_CHARACTERS` does not bail on

- **Axis:** `standards`
- **Severity:** major
- **Status:** fixed
- **Fixed in:** `SHELL_CONTROL_CHARACTERS` is now `/[|&;<>`#\n\r]|\$\(/` — newline, carriage return, and `#` bail alongside the existing metacharacters, and the comment states why the two non-punctuation separators matter. Covered by `parseShellReadTargets: a command separator that is not punctuation still bails` (newline, CRLF, trailing comment). Control checked: all three forms pass the old regex and bail on the new one.
- **File:** `scripts/ai-skills/hooks/hook.mjs:46` (`SHELL_CONTROL_CHARACTERS`), consumed at `parseShellReadTargets`
- **Problem:** the bail set covers `|&;<>` and `` ` ``/`$(` but not a newline, so a multi-line Bash call whose *first* line is a bare `cat` is parsed as one `cat` over every bare token in every later line — each granted full-read credit.
- **Repro:** `parseShellReadTargets("cat a.md\ngrep foo .prism/architect/_toolkit/spec-editing.md")` returns four targets, all `credit: true`, including the routed doc that was only a grep haystack. Verified by running the exported function against the committed source.
- **Why major, not critical:** nothing consumes the `read` array for a deny yet — PR 2D is the first consumer — so no shipped behavior is wrong today. It is the exact over-credit this PR's own Decision calls the unacceptable direction, and this PR is 2D's ship-gate, so it should not cross the merge line open.
- **Class:** the operand loop treats every non-flag token as a path, so anything that is not a path but is not flag-shaped is credited as one.
- **Sweep:** exercised the parser against separator and non-path-token forms — newline (over-credits, above); `#` comments (`cat a.md # note` credits `#` and `note`); `cat -- a.md` (`--` suppresses credit, safe direction); `;`, `|`, `>`, `$(` (all correctly bail). Newline and `#` are the two live cases.
- **Suggested fix:** add `\n` (and `\r`, `#`) to `SHELL_CONTROL_CHARACTERS`, and add the multi-line case to `parseShellReadTargets: the documented gaps yield no targets rather than a guess`.

### The `tool_input.path` fallback is not scoped to search tools, unlike the comment describing it

- **Axis:** `standards`
- **Severity:** minor
- **Status:** fixed
- **Fixed in:** `filePathFromToolInput`'s comment now describes the fallback as covering any tool that names its target at `path` (`Glob` included), and states that anything reaching it through the `write` default is announced and never credited. Comment-only — the code is correct as written.
- **File:** `scripts/ai-skills/hooks/harnesses.mjs:56` (`filePathFromToolInput`)
- **Problem:** the comment says search tools "are the one exception," but the `?? payload.tool_input?.path` fallback is unconditional — any unlisted tool carrying a `path` (Claude's `Glob`, for one) now resolves a target and resolves to kind `write`, producing announce traffic the comment does not describe. Announce-only, so no credit risk.
- **Class:** doc comment narrower than the code it describes.
- **Sweep:** checked every `toolKinds` entry across the three harnesses plus the `write` default; `Glob` is the only unlisted Claude tool with a `path` field, and `Edit`/`Write`/`Bash` are unaffected.
- **Suggested fix:** widen the comment to say the fallback covers any tool that names its target at `path`, and that everything reaching it through the `write` default announces without crediting.

### Shell targets resolve relative operands against the repo root, not the command's `cwd`

- **Axis:** `standards`
- **Severity:** minor
- **Status:** fixed
- **Fixed in:** `resolveTargets`'s `shell` branch now resolves each operand against `payload.cwd` before routing, so a repo-root-relative `cat` issued from a subdirectory resolves where the command would have looked and credits nothing. Covered by `runPostToolUseArm: a relative cat resolves against the payload cwd, not the repo root`, which asserts both directions; control checked by reverting the resolution and confirming the subdirectory leg fails.
- **File:** `scripts/ai-skills/hooks/hook.mjs` (`resolveTargets`, `shell` branch)
- **Problem:** `parseShellReadTargets` returned the raw operand and `resolveArchitectNag` resolved it against the repo root, so a session rooted in a subdirectory issuing a repo-root-relative `cat` failed the command yet credited the doc — `PostToolUse` fires regardless of exit code.
- **Class:** relative path resolved against the wrong base; new surface the shell channel introduces, since `Read` always sends absolute paths.
- **Suggested fix:** `path.resolve(payload.cwd, ...)` in the `shell` branch.

### The operand loop carried per-command grammar for two commands that can never credit

- **Axis:** `simplification`
- **Severity:** minor
- **Status:** fixed
- **Fixed in:** removed the `head`/`tail` `-n` count skip and `sed`'s `operands.slice(1)`. A count or script operand now rides along as a target, costing at most one route lookup that finds nothing — a manifest route never matches a bare number or a `1,5p` script, and A6 rejects catch-all routes. Neither command credits under any circumstances, so the skipped tokens could never have produced an over-credit.
- **File:** `scripts/ai-skills/hooks/hook.mjs` (`parseShellReadTargets` operand loop)
- **Problem:** four lines of code plus five of comment encoded two commands' operand grammar to avoid a lookup that would return `null` anyway.
- **Suggested fix:** delete both branches; update the parser cases that pinned the old single-target shape.

### A `cat` whose output the host truncates still credits in full

- **Axis:** `standards`
- **Severity:** minor
- **Status:** deferred — carried to PR 2D as a named ADR-0072 `## Consequences` gap, per the suggested fix below. Not fixed here on purpose: the credit channel's coverage and its gaps belong beside the deny they make satisfiable.
- **File:** `scripts/ai-skills/hooks/hook.mjs` (`parseShellReadTargets` credit rule), `resolveTargets` (`read` credit rule)
- **Problem:** credit is decided from the *call shape*, never the delivered bytes. A flagless `cat` of a long doc, or a rangeless `Read` past the host's default line cap, is credited as a whole-document read even though the model received a truncated one — the same class of partial delivery the `head`/`offset` rules exist to exclude. It is a narrow gap in practice: routed architect docs are the only credited surface and PR 2C caps the guides at 120 lines.
- **Class:** call-shape proxy for a delivery fact the payload does not carry.
- **Sweep:** the only two crediting paths are the flagless `cat` and the unranged `Read`; both are affected identically, and no third channel credits.
- **Suggested fix:** none required in this PR — record it in PR 2D's ADR-0072 `## Consequences` beside the other named credit-channel gaps, which is where this plan's own Decision already routes coverage-and-gaps content.

### Angle Coverage

- **Correctness** — `swept`; both exported functions exercised against the committed source, all six shell forms plus the four bail forms plus three `Read` range shapes.
- **Edge cases** — `swept`; empty/absent command, unrecognized command, `-`/`--` operands, `-n20` vs `-n 20` vs `-20`, quoted `sed` scripts, multi-file `cat`, newline and `#` separators.
- **Type safety** — `swept`; the three `.d.mts` sidecars (`RouteTarget`, the `credit` option, the `path` field) match their `.mjs` JSDoc; `pnpm prism:check` exit 0 (operator-ratified).
- **Test coverage** — `swept`; every B1/B2 behavior has a case, including B3's Grep negative control. Two gaps named: the newline case above, and no case for multi-file `cat`.
- **Spec conformance** — `swept`; B1, B2, B3 each satisfied against § PR 2B; B4 correctly untouched as `[HITL]`.
- **Scope** — `swept`; nine files, all inside PR 2B's collision-table lane; nothing from PR 2C or 2D's lane touched.
- **Comments and naming** — `swept`; every new comment carries a why, no tags, no ALL CAPS; one inaccuracy found (the `path` fallback comment above).
- **Citation integrity** — `swept`; the plan's two new Decisions match the code they describe, and the History entry's verification claim reproduces.
- **Docs impact** — `n/a`; no consumer-facing doc governs the hook internals, and PR 2C owns the guides.

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
- **Status:** fixed — cause (2) closed in `4bf12dc8`; cause (1) and the `discriminatorFor` trailing-slash defect both closed on `main` by #458 (`76c2f7de`), which is an ancestor of this branch. Verified at PR 2A close: `pnpm prism:spec-scope-lint` on `huntermcgrew/opus5-port-hook-runtime` prints `spec-scope-lint passed`, not the `no live plan resolved` skip
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
- **Carried to:** a follow-up PR off `main` after PR 2A merges, per `.prism/rules/followup-scope.md` § post-merge same-scope — no new ticket. It is not a prerequisite for 2B–2E: the sidecars it would compare are already type-checked against their importers, so a drift shows up as a failing test rather than as a silent deny-side defect.

### Eric's re-review pass on PR #461 — 3 Minors

- **Severity:** minor
- **Status:** fixed
- **File:** `scripts/ai-skills/update.ts`, `scripts/ai-skills/update.test.ts`, `scripts/ai-skills/hooks/hook.mjs`, `scripts/ai-skills/hook-gate.test.ts`
- **Problem:** three same-scope fold-ins from the re-review pass, none merge-blocking.
- **Fixed in:** this session's commit on `huntermcgrew/opus5-port-hook-runtime`.

Per-finding disposition:

| Finding | Disposition |
| --- | --- |
| M1 — runtime marker's doc comment overclaims parity with `applyIncomingFile`; `pruneStaleHookRuntimeFiles` deletes a marker-carrying copy at any path with no recovery | fixed — comment rewritten to state the real content-keyed ownership model (a marked file is replaced unconditionally, edited or not, because there's no recorded hash to diff against outside the sync manifest); `pruneStaleHookRuntimeFiles` now takes a `.bak` before removing, so a consumer's own adaptation at a non-standard path is recoverable instead of silently lost |
| M2 — `resolveHarnessFromArgv` has no test despite its own docstring saying it was separated out to be testable | fixed — two cases added: a well-formed `--tool=` flag resolving to its harness, and an unknown/absent tool resolving to `null` |
| M3 — no Windows leg spawns the delivered hook as a standalone process (the only such spawn sits inside the win32-skipped cold-start leg) | fixed — a source-tree `spawnSync` micro-test with no pack/tar step, placed beside the tool-kind cases per Eric's own suggested siting, carries no `skip` |

**Ownership decision (M1):** content-keyed, not path-keyed. `.claude/hooks/` sits outside the sync manifest's content root, so there is no recorded hash to tell "PRISM's older copy" from "a consumer's hand-edit" the way `applyIncomingFile` can. The marker is the only signal available — a marked file is PRISM's content at whatever version wrote it and is replaced unconditionally, in both `deliverHookRuntimeFile` (the canonical delivery paths) and `pruneStaleHookRuntimeFiles` (a marked file anywhere else under `.claude/hooks/`). What changed is not the ownership model but its honesty and its safety net: the comment no longer claims a parity that content-keying can't provide, and prune backs up before deleting so a marked file at an unrecognized path — plausibly a consumer's own adaptation that carried the marker along — is recoverable rather than gone.

**M1 behavior diff — a consumer's marker-carrying file at a non-standard path (e.g. `.claude/hooks/my-hook.mjs`, adapted from a delivered file):**
- **Before:** `pruneStaleHookRuntimeFiles` matched it as marked-but-undelivered, called `fs.rm` immediately, and reported `action: "removed"` with no `backupPath`. The file was gone with no recovery path.
- **After:** the same match now calls `backupConsumerFile` first (writing `<file>.bak`, or the next free `<file>.bak.N` if a prior backup exists), then removes the original and reports `action: "removed-with-backup"` with `backupPath` set. The file is recoverable from the `.bak` copy, and stays recoverable across every later update run — prune skips backup basenames, so it never re-selects its own output. The as-written version of this fix held the guarantee for exactly one cycle; see the `.bak`-loop entry below for the measurement and the correction.
- Verified by the renamed test `refreshHookRuntime: prunes a marked file it no longer ships, backs it up first, and leaves the consumer's own alongside it` (`update.test.ts`), which asserts the `.bak` file exists with the original bytes, and by `refreshHookRuntime: the backup of a pruned file is not itself pruned on the next run`, which pins the four-run stability.

715/715, 0 skipped (up from 712 — the two `resolveHarnessFromArgv` cases and the standalone-spawn micro-test; no coverage lost, no test renumbered away).

### Prune re-selects its own `.bak`, so the recovery guarantee lasts one cycle

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:1101` (the backup call), `:1060` (the invariant that made the missing filter look safe)
- **Problem:** `backupConsumerFile` copies bytes verbatim, so the backup of a marked file carries `HOOK_RUNTIME_MARKER` and lands inside the directory `pruneStaleHookRuntimeFiles` enumerates. With no backup filter, the next run selected the backup by the same conditions that selected the original. The M1 fix above introduced this while fixing a defect of the same class.
- **Fixed in:** this session's commit on `huntermcgrew/opus5-port-hook-runtime`.

**Measured over four consecutive `refreshHookRuntime` calls against a temp consumer holding a marked `.claude/hooks/my-adapted-hook.mjs`:**

| cycle | before the filter | after the filter |
| --- | --- | --- |
| 1 | `my-adapted-hook.mjs.bak` (1 `removed-with-backup`) | `my-adapted-hook.mjs.bak` (1 `removed-with-backup`) |
| 2 | `my-adapted-hook.mjs.bak.bak` (1) | `my-adapted-hook.mjs.bak` (0) |
| 3 | `my-adapted-hook.mjs.bak.bak.bak` (1) | `my-adapted-hook.mjs.bak` (0) |
| 4 | `my-adapted-hook.mjs.bak.bak.bak.bak` (1) | `my-adapted-hook.mjs.bak` (0) |

Three consequences the loop carried, all closed: the run-N backup was gone by run N+1, so recovery held for one cycle only; every later run emitted a spurious `removed-with-backup` for a file PRISM itself wrote; and the basename grew four characters per run against Windows's 260-character `MAX_PATH`.

**The corrected invariant, and where it lives.** The retired sentence in `pruneStaleHookRuntimeFiles`'s docstring read "A `.bak` this seam wrote is never marked either: a backup is only ever taken of a file that lacked the marker" — true before the M1 fix, false the moment prune began backing up marked files. The replacement, in the same docstring at `update.ts:1060`, states the property the code now holds: backups are skipped **by name** (`BACKUP_BASENAME_PATTERN`, defined beside `HOOK_RUNTIME_MARKER`) rather than by content, because `backupConsumerFile` copies byte for byte and so a backup always inherits its source's marker. A recovery copy is the consumer's to read and delete, never PRISM's to reclaim — which is why the filter also means a genuinely stale marked `.bak` is left in place rather than swept.

### Standalone-spawn micro-test discards the output that proves the arm ran

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hook-gate.test.ts:520`
- **Problem:** `hook.mjs`'s contract is that every failure writes nothing and exits 0, so the exit-0 assertion could not separate a completed announce arm from a fail-open early return at `hook.mjs:264`. The fixture already seeded a full manifest and a matching `Read` payload, then discarded the result.
- **Fixed in:** this session's commit — one `assert.match(result.stdout, /_toolkit\/spec-editing\.md/)`, mirroring what the in-process sibling test already asserts.

716/716, 0 skipped (up from 715 — the prune-stability regression test; the Minor added an assertion to an existing test rather than a new one). Negative control run: removing only the `BACKUP_BASENAME_PATTERN` guard turns exactly one test red, the new one.

### C2's verify names a directory this PR deliberately does not create

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/opus5-port.md` — task C2's **Verify:** line
- **Problem:** the verify read `wc -l .prism/references/guides/*.md`. C2's body carries a supersession parenthetical moving the guides to `.prism/architect/guides/`, but the verify line under it was never amended, so run literally it errors on a nonexistent glob rather than measuring anything.
- **Fixed:** 2026-08-19 — the verify names `.prism/architect/guides/*.md` and its seed twin, and says the old path is superseded. Outcome unchanged: 82/85/75/78/78, identical canonical and seed, all under 120.

### The five guides are unclassified in `seed-curation.json`, and C7's verify cannot detect it

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/definitions/seed-curation.json`; `.prism/plans/opus5-port.md` — task C7's **Verify:** line
- **Problem:** two halves. `grep -c "guides/"` on `seed-curation.json` returned `0`, so C7's own requirement that every new file carry an entry was unmet. And C7's verify rested on the `prism:build` unclassified-file warning, which `build.ts:713-718` emits only when `seedFileIsNew` — once per artifact lifetime, not once per run. A first-run-only warning cannot gate a re-run.
- **Fixed:** 2026-08-19 — the five guides added to `curated`, and C7's verify replaced with a re-runnable per-path loop over `seed-curation.json` plus an explicit statement that the build warning is not the gate and why.

### The seed's `manifest.base.json` routes to a doc C7 excludes from the seed, and the new route-integrity test does not see it

- **Axis:** `tests`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hook-gate.test.ts`; `templates/install/.prism/architect/_toolkit/manifest.base.json:69`
- **Problem:** the seed's base manifest routes `scripts/ai-skills/**` to `_toolkit/output-guards.md`, which C7 excludes from the seed. It fails safe — `filterDocsOnDisk` drops it — but the route-integrity test this PR adds asserts exactly the property it violates and was scoped to `manifest.stub.json` alone.
- **Fixed:** 2026-08-19 — per Eric's call the test changed, not the entry. It now walks every manifest the seed ships and distinguishes the two absences: a doc `seed-curation.json` lists as `excluded` is a permitted withholding, anything else absent is a dead route. Verified as a real gate — this route is the one instance across all four manifests, and canonical's pair is clean.

### `output-guards.md` drops a `that` in its opening sentence

- **Axis:** `docs`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/output-guards.md:3`
- **Problem:** "to catch output token substitution did not fully resolve" — line 14 of the same file has the clause right.
- **Fixed:** 2026-08-19 — corrected in canonical; `pnpm prism:build` propagated it to the three platform mirrors.

### Verify-line re-derivation sweep — C1 through C8, against the class rather than a list

Eric refuted the "C1 is the last survivor" enumeration: it tested one axis (canonical measured while a curated twin goes unmeasured) by walking `seed-curation.json`'s `curated` list, which cannot see a defect on any other axis. C2's was a superseded path and the guides are not curated at all; C6's was grep scope. The class is **the verify line was not re-derived when the task changed underneath it**. Every C1-C8 line re-derived against that class and each corrected command run literally:

| Task | Disposition |
| --- | --- |
| C1 | Fixed — names both `skills-ecosystem.md` paths. |
| C2 | Fixed — superseded guide path corrected, twin added. |
| C3 | Held — already names both SPEC paths (`d9beb9ff`); both return `0`. |
| C4 | Amended — now names the widened install-seed route test rather than a stub-only one. |
| C5 | Amended — `verify-manifest` is structural only and never checks that a route's doc exists, so a literal existence pass over PRISM's own two manifests was added. It returns nothing today. |
| C6 | Held — already scoped `.prism/ templates/` with the `/plans/` filter; returns nothing. |
| C7 | Fixed — build warning replaced with a re-runnable classification loop. |
| C8 | Amended — widened to `templates/`, because a curated twin never regenerates from canonical. Returns nothing at both the old and new scope. |

The two amendments (C5, C8) are the sweep's own yield: neither was a reported finding, and both are the same class — a verify line that stopped covering its task's reach.

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

- [x] No critical or major issues — all 9 Majors and 8 Minors from Eric's first pass, all 3 Minors from the re-review pass, and the Major the M1 fix itself introduced (prune re-selecting its own `.bak`) plus its paired Minor are fixed; see `## Review Issues` for the per-finding record
- [x] Types correct — no `any`, no unsafe `as`. `prism:check-types` now also runs `tsc` with `allowJs`/`checkJs` over `hooks/**`, so the runtime's JSDoc annotations are enforced rather than decorative
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — the delivery seam's clobber, marker, dry-run, prune, and gitignore-idempotency branches are covered, the announce-truncation boundary is pinned, the cold-start leg carries a control that breaks real delivered state, `resolveHarnessFromArgv` has both cases from its own docstring, a source-tree `spawnSync` micro-test proves the standalone-process property on every platform including Windows and asserts the announcement it produces, and a four-run regression test pins that prune never re-selects the backup it wrote. `pnpm prism:check` exit 0, 716/716, 0 skipped
- [x] All debugged issues resolved — none recorded for PR 2A
- [x] Build passes — last run: 2026-08-18. `pnpm prism:check` exit 0, 716/716
- [x] PR description up to date — synced at PR 2A close: the stale plan-authority flag removed (the amendment landed on this branch in `8e160178`), the four review rounds and the final 716/716 recorded
- [x] Lasting decisions promoted to architect context — verdict gate run at PR 2A close; see `## Decisions`. Promoted: `install-layout.md` § Hook-runtime ownership and recovery (plus its curated seed twin) and two ADR-0071 § Consequences bullets

**PR 2A closed:** 2026-08-18 — closing ceremony run on this branch before the merge gate. Retro: `.prism/plans/retros/architect-gate-port/pr-2a.md`. The plan itself stays open; it governs PRs 2B–2E.

**Last updated:** 2026-08-18
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Closing ceremony — PR 2A decisions swept (2 promoted to `install-layout.md` and its seed twin, 2 promoted to ADR-0071, 9 closed as no-promotion here plus 4 already carrying verdicts, 9 left pending against the PR that resolves each), 1 lesson captured (cross-step contracts), threads clear. Recorded a new Decision deferring Cursor and Codex hook delivery out of this stack with an exit condition, and corrected the announce-once Decision's harness claim, which stated host capability in a way that read as delivery coverage. Task D4 reduced to deny-side coverage — its `PostCompact` reset already shipped in 2A.
- 2026-08-19 [huntermcgrew/opus5-port-credit-channel]: Fixed Eric's PR #462 minor — shell operands now resolve against the payload `cwd`, closing a subdirectory-relative `cat` over-credit. Trimmed the operand loop's `head`/`sed` grammar, which guarded lookups that could never credit. Added the relative-`cwd` and `tool_input.path`-fallback test cases.
- 2026-08-19 [huntermcgrew/opus5-port-writing-guides]: PR 2C — split `skills-ecosystem.md` into `ticket-workflows.md`, `plan-authoring.md`, and `output-guards.md` (Lessons appended to `audit-workflow.md`), wrote the five writing guides, genericized `SPEC.md`, and repointed the stub's routes at the guides. The consumer twin was split to match, and its two new halves are curated twins like their parent. See Decision: guide placement resolves to `.prism/architect/guides/`.

## PR Readiness (PR 2C — Writing guides and doc splits, #463)

- [x] No critical or major issues — pass-1's 6 findings and the re-review's major verified fixed at `d9beb9ff`; the deferred `renames` minor accepted; one new minor open (C1's canonical-only verify), plan text only
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — one stub-route integrity case; confirmed to fail when a route names a missing doc
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — `pnpm prism:check` exit 0, 2026-08-19
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context — both PR 2C Decisions carry `no promotion needed` verdicts with reasons

**Last updated:** 2026-08-19 (third pass of `d541627..d9beb9ff`)

---

### Re-review of `c19e03a2..f0f3dc3a` (PR 2E fix pass)

All 2 majors and 6 minors verified `fixed` against measurement, not against the disposition report. Three new minors below.

**Major 1 — both resolutions correct, and they are not opposite.** The discriminator is whether the doc *can* ship. `spec-editing.md` had no blocker, so un-excluding keeps the promise — verified present at `.prism/architect/_toolkit/spec-editing.md` in a materialized install and named by routes in both shipped tables. `output-guards.md` cannot ship: the seed literal guard rejects its dogfooding literals and `literal-allowlist.json` allowlists it on canonical paths only, so dropping the base route is the only resolution available. The dogfood repo keeps the context regardless — PRISM's live `.prism/architect/manifest.json` still routes `_toolkit/output-guards.md` for `scripts/ai-skills/**`. Negative control run: re-adding the base route made `ship-closure` report `output-guards.md` as reachable-but-excluded, so the class is gated and not merely repaired.

**Major 2 — verified independently.** Materialized a consumer root (`cli.ts init` + `cli.ts adopt` into `/tmp/briar-mat`) and ran `cli.ts doctor --consumer`: zero architect-route findings. Separately parsed both shipped tables in that install and confirmed every route value resolves on disk — zero dangling in either direction.

### `ship-closure` and `doctor` disagree on what counts as routed

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:486`
- **Problem:** The fix widened `ship-closure`'s notion of a routing surface to both shipped tables, but `checkArchitectRoutes` still reads only `architect/manifest.json`. A doc routed solely by `manifest.base.json` would be reachable to one shipped tool and an orphan to the other.
- **Class:** `one arm of a two-arm construct widened, its sibling left at the old width`
- **Sweep:** `grep -n "manifest" scripts/ai-skills/doctor.ts` — the orphan scan takes a single `manifest.json` path; nothing in `build.ts` merges base into it. Latent today: every base route also has a stub route, and the materialized install reports zero orphans.
- **Suggested fix:** either read both tables in the orphan scan, or say in `checkArchitectRoutes`'s JSDoc that `manifest.json` is deliberately the only routing surface a consumer's doctor recognizes.

### E5's verify line names a property its nearest test does not enforce

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/opus5-port.md:567`
- **Problem:** The re-derived verify line reads "every route value in both shipped routing tables names a file the seed contains." The test that looks like its enforcer — `hook-gate.test.ts:558` — passes a route naming an `excluded` doc, which is the exact Major 1 condition. The property is genuinely enforced, but by `ship-closure`'s reachable-but-excluded check in a different file.
- **Class:** `a test passing for a reason other than the one it names` (second instance on this PR)
- **Sweep:** read `hook-gate.test.ts:558-610` against the verify line; confirmed the property holds empirically in the materialized install (zero dangling, both tables) and confirmed `ship-closure` is what fails when it stops holding.
- **Suggested fix:** point the verify line at the closure stage as the enforcer, so a reader does not redeem it against the weaker test.

### Relative-link fixture names a file that is not the discriminator

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ship-closure.test.ts:250`
- **Problem:** `.prism/references/reached.md` is named as though it is the subject, but it is excluded and unlinked; the file that actually discriminates is `.prism/rules/sibling.md`. The assertion is sound — without relative-link following, `sibling.md` lands in `shippableOutsideClosure` — but the fixture reads as if it tests something it does not.
- **Class:** `a test passing for a reason other than the one it names` (third instance on this PR)
- **Sweep:** traced both assertions against the opposite implementation; `shippedButExcluded` is the only assertion `reached.md` participates in, and it would hold with the file absent.
- **Suggested fix:** drop `reached.md`, or rename it to say it is the excluded control.

### `resolveDefaultRoots` seeds manifest keys as closure roots

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ship-closure.ts:213`
- **Problem:** A manifest key is a match pattern for the working diff; only values name content an install must contain. Seeding non-glob keys made `docs/`, `AGENTS.md`, `build.ts`, `path-guard.ts`, `paths.json`, and `.prism/SPEC.md` roots — and `docs/` is a directory the walk expands whole. 372 files reachable with key-roots, 336 without.
- **Consequence:** `0035-rule-loading-tiers.md` and `0045-skill-content-disclosure-model.md` stayed "still reached" only through `docs/workflow.md:59` and `docs/personas.md:360`, so the property the tracked list depends on — an entry fails as stale once the closure stops reaching it — was false for those two, and PR 3's exit condition would have read as met when it was not.
- **Suggested fix:** return route values only; delete the two now-stale tracked entries.
- **Fixed:** 2026-08-19 — `collectManifestRoutedPaths` iterates `Object.values`; both tracked entries removed. Closure re-run over the real repo: 336 files, `shippedButExcluded` empty, `shippableOutsideClosure` empty, `staleTrackedRefs` empty, `SPEC.md` still reached through the shipped `code-standards.md` citation. E5's trim is unchanged.

### `resolveDefaultRoots` had no test coverage

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ship-closure.test.ts`
- **Problem:** All 10 tests passed an explicit `roots:` array and nothing in the tree called `resolveDefaultRoots`. Round 1's class fix — reading both shipped routing tables — lives entirely in that function, so a manual negative control was the only thing that had ever verified it. That is also why the Major above survived two review rounds.
- **Suggested fix:** a fixture test covering both tables, a negative control removing one, and a regression test for the key-vs-value fix.
- **Fixed:** 2026-08-19 — four tests added. Each was mutation-checked: reinstating `routed.push(key)` kills only the key-vs-value test; dropping `manifest.base.json` from the roots kills only the both-tables test.

### `checkHookRegistration` regexes raw JSON where its sibling parses it

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:547`
- **Problem:** Reading `settings.json` as text forced hand-unstripping of escaped quotes, reported a Windows registration as `\\.claude\\hooks\\hook.mjs`, and left a malformed settings file silently miscounted rather than reported — while `checkArchitectRoutes` twenty lines up already parses its manifest and reports a parse error as a finding.
- **Suggested fix:** `JSON.parse` plus a walk of `hooks.*[].hooks[].command`.
- **Fixed:** 2026-08-19 — new `collectHookCommands` walks the parsed shape; the escape-stripping regex is gone and a malformed `settings.json` is now an error finding. The existing Windows test's assertion was too loose to catch the doubled separators, so it was tightened; a raw-text mutation now kills it.

### E4's Roots bullet and Verify line were not re-derived when root resolution became a computation

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/opus5-port.md`, PR 2E § E4
- **Problem:** The Roots bullet described a fixed six-item list after round 1 turned root resolution into a computation, and the Verify line was satisfiable without touching the roots at all — which is precisely why they went untested. Third instance of the class Iris named in the 2C retro.
- **Fixed:** 2026-08-19 — the Roots bullet now states the three computed groups and the values-only rule with its reason; the Verify line now names direct `resolveDefaultRoots` coverage, the both-tables case, the removal control, and the key-is-not-a-root assertion. E5's "four roots" and its stale "routed by the stub's first key" clause were corrected in the same pass.

### Angle Coverage — re-review of `c19e03a2..f0f3dc3a`

- **Runtime behavior** — `swept`. `resolveDefaultRoots` and `collectManifestRoutedPaths` (both tables, negative-controlled by a restored base route); `checkArchitectRoutes` (measured on a materialized install and the worktree root); `resolveHookCommandPath` (Windows and POSIX forms traced against both substitutions); `listMarkdownFilesRelative` (the `.md` filter traced against the deleted basename set).
- **Test efficacy** — `swept`. 3 new tests, each reasoned against the opposite implementation: the Windows-separator test discriminates (`claudehooks` appears under the old strip), the tracked-suppression control discriminates, the relative-link test discriminates but on a file its fixture does not name. 41/41 green in the two touched suites.
- **Spec and doc consistency** — `swept`. E1's and E5's verify lines re-read against measurement — E1's now holds in both halves; E5's overstates its enforcer. The `## Decisions` and `## History` entries match what landed.
- **Citation integrity** — `swept`. ADR-0072's absence from every branch (verified); the hook check's narrowed claim (verified against all four presence states); the `build.ts`-mirrors rationale in `TOOLKIT_BASE_MANIFEST_PATH`'s JSDoc (verified — the five copies are byte-identical at HEAD).
- **External-system claims** — `swept`. Claude Code's `$CLAUDE_PROJECT_DIR` quoting and Windows separator form checked against the fixture, not from memory.
- **Repo writing rules** — `swept`. New and revised JSDoc is why-not-what, no tags, no ALL CAPS; no `any`; verb-first naming on the renamed `collectManifestRoutedPaths`.
- **Security** — `n/a — read-only filesystem checks and routing-table edits; no auth, input handling, secrets, or trust boundary.`
- **Docs impact** — `swept`. No shipped doc describes the widened closure roots; acceptable while `ship-closure` is a `prism:check` stage rather than a consumer command.
- **Accessibility** — `n/a — no UI in the diff.`

---

## PR Readiness (PR 2E — Doctor route integrity and ship-surface trim, #464)

- [x] No critical or major issues — Eric's 2 majors and 2 minors fixed; 3 open Briar minors carried
- [x] Types correct — no `any`, no unsafe `as`; `prism:check-types` clean
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — the relative-link rule and the tracked-suppression path now have discriminating tests; the vacuous manifest-table test was retitled to the behavior it actually covers
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-08-19 (`pnpm prism:build` per clove; `run-tests.ts` and `ship-closure.ts` re-run here)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context — four new Decisions, each carrying a `no promotion needed` verdict with a reason

**Last updated:** 2026-08-19

---

## Review Issues (PR 2D — the deny gate on routed paths, #470)

Briar self-review of `176f35c5..9a7d1ebd`, 2026-08-19 [huntermcgrew/opus5-port-deny-gate]. `9d97eb67` landed during the pass and is Reese's AC-report append only — no source, outside the pinned range.

### The gate's own multi-doc remedy, run as one Bash call, credits nothing and re-denies identically

- **Axis:** `standards`
- **Severity:** `critical`
- **Status:** `fixed`
- **Fix:** Fixed by `splitShellSegments`, shared by both arms. The read arm now segments on line breaks and `;` before tokenizing, so the rendered remedy pasted as one Bash call credits every `cat` in it. Verified through the shipped arms end to end: a two-doc route denies, the deny's own remedy lines are fed verbatim to `runPostToolUseArm`, and the re-check returns `null`. Mutation-confirmed — restoring the whole-command safe-character test kills that case and two unit cases, nothing else.
- **File:** `scripts/ai-skills/hooks/hook.mjs:76` (`SHELL_READ_SAFE_CHARACTERS`), message site `hook.mjs:452` (`formatDenyMessage`)
- **Problem:** `formatDenyMessage` renders one `cat` per line, and the read pre-filter rejects any command containing a newline, so a model that pastes a two-line remedy into one Bash call earns zero credit and receives the identical deny — the unsatisfiable-gate shape this PR exists to prevent.
- **Class:** `a remedy message whose rendered form is rejected by the channel that must observe it`
- **Sweep:** Reproduced end to end against the shipped arms — `runPreToolUseArm` on an `Edit` to `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md` (route names 2 docs) → deny; the two `cat` lines fed verbatim as one `runPostToolUseArm` Bash payload → no credit; re-deny byte-identical. Control: the same two `cat`s as separate calls → cleared. Blast radius counted with `compileMatcher` over all three tables: 12 of 61 routes in `.prism/architect/manifest.json`, 10 of 49 in `manifest.base.json`, 8 of 19 in `manifest.stub.json` name 2+ docs — so this reaches consumers, not only PRISM.
- **Suggested fix:** shared with the Major below — segment the command before tokenizing, so a multi-line `cat a` / `cat b` credits per segment. Do not fix by collapsing the message to one line: the one-`cat`-per-line shape is what makes the remedy legible, and the defect is on the read side.

### `parseShellWriteTargets` treats a newline as ordinary whitespace, so one segment's command claims later lines' tokens

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **Fix:** Fixed by the same `splitShellSegments`. Segment boundaries are `\n \r ; | || && &` for the write arm, so a leading `sed -i` no longer claims a later line's tokens; `checkInPlaceFlag` scans within a segment rather than re-deriving the boundary rule. Covered per separator, with a positive counterpart asserting an in-place `sed` in a later segment still yields its own target.
- **File:** `scripts/ai-skills/hooks/hook.mjs:149` (`SHELL_SEGMENT_BOUNDARIES`), consumed at `hook.mjs:196` (`command.trim().split(/\s+/)`)
- **Problem:** a multi-line command whose first segment is `tee` or `sed -i` claims every later non-flag token as a write target, producing a reroute deny that states the command writes to a path it only reads.
- **Class:** `multi-line shell commands parsed as a single command — the same class as the \n escape D3 closed on the read side`
- **Sweep:** `parseShellWriteTargets` exercised over 14 command shapes. Firing cases: `"sed -i 's/a/b/' foo.ts\ncat .prism/rules/code-standards.md"` → `["s/a/b/","foo.ts","cat",".prism/rules/code-standards.md"]`; `"tee /tmp/a.txt\necho hello .prism/architect/manifest.json"` → 4 targets. Through the real arm, `"sed -i 's/a/b/' foo.ts\ncat .prism/architect/_toolkit/install-layout.md"` denies with "You're writing to `.prism/architect/_toolkit/install-layout.md`" — a false statement, and a block on a `cat` the gate elsewhere prescribes. Non-firing controls: `;`-separated equivalent → `null`; `sed` without `-i` → `[]`; `grep -i` → `[]`. The read arm is **not** exposed: `SHELL_READ_SAFE_CHARACTERS` excludes `\n`, so `"cat a.md\ncat b.md"` → `[]` — it fails safe by refusing, which is what produces the Critical above.
- **Suggested fix:** the fix belongs at a shared segment-splitting layer, not in either detector. Adding `"\n"` to `SHELL_SEGMENT_BOUNDARIES` is **inert** — confirmed by mutation: `.split(/\s+/)` consumes the newline before any token can equal `"\n"`, and the mutated build returns the same four targets. Introduce one `splitShellSegments(rawCommand)` splitting on `\n \r ; | || && &` and returning token arrays, then have both arms consume it: the write detector stops crossing segments, and the read arm can credit a per-segment bare `cat` instead of refusing every multi-line command. Patching the two arms separately leaves the next arm exposed, which is the drift `parseShellWriteTargets`'s own JSDoc says the shared helpers exist to prevent.

### The narrowing unroutes four rules and four skill bodies, contradicting ADR-0072's stated purpose

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed`
- **Fix:** Fixed, and the reach was larger than reported — `manifest.base.json` lost six rules, not four. `.prism/rules/**` and `.prism/skills/**` are now routed explicitly in all three tables, and the per-rule enumerations that the glob subsumes were folded into it rather than left as redundant siblings. Re-measured with `matchDocsForPath` over `git ls-files`: all three tables now lose exactly the same 29 tracked paths, every one persona output or state, and the accepted-losses list in `## Decisions` names all of them.
- **File:** `.prism/architect/manifest.json:81`, `templates/install/.prism/architect/manifest.stub.json:21`
- **Problem:** replacing `.prism/**` with `.prism/custom/**` leaves four `.prism/rules/*` files and four `.prism/skills/*` bodies matching zero routes, so the instruction-layer paths ADR-0072 names as its motivating case now get neither a gate nor an announcement.
- **Class:** `a catch-all narrowed to a replacement set that does not cover the catch-all's load-bearing members`
- **Sweep:** old and new tables both evaluated with the repo's own `compileMatcher` over `git ls-files`. Newly unrouted and tracked: `.prism/rules/{design-governance,lazy-artifacts,session-orientation,skill-routing}.md` (the other rules are enumerated individually at `manifest.json:19-44`; these four were not); `.prism/skills/{prism-doc-walker,prism-prd,prism-refactor-scout,prism-retro}/**` (only `prism-conductor` is enumerated, `:64`); plus `.prism/prds/**`, `.prism/qa/**`, `.prism/retros/**`, `.prism/iris-state.json`. Consumer stub additionally loses `.prism/skills/**`, `.prism/design/**`, `.prism/handoffs/**`, `.prism/conductor-state.json`, `.prism/theo-state.json`. `_toolkit/skills-ecosystem.md` itself stays routed in all three tables (`.claude/skills/**` and others), so the PR body's orphan-doc claim holds for both docs — the loss is path coverage, not doc reachability. No mechanical check sees this: `verify-manifest-coverage.ts:40-72` tests six hardcoded probes and `doctor.ts:546` scans orphaned docs, not orphaned paths; `pnpm prism:check` is green on this branch.
- **Suggested fix:** re-add explicit routes rather than restoring the catch-all — at minimum `.prism/rules/**` → `_toolkit/spec-editing.md` in `manifest.json`, and `.prism/skills/**` → `_toolkit/skills-ecosystem.md` in all three tables. Name the remaining accepted losses in the plan's "What this gives up", which currently lists `.prism/design/`, `.prism/retros/`, `.prism/prds/` but not the rules or the skill bodies.

### Nothing tests the delivery path, so the shipped gate could be unreachable end to end

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **Fix:** Fixed on both links. `assertAdoptedConsumerState` asserts the `PreToolUse` registration, that its matcher selects `Write`/`Edit`/`Bash`, and that its command carries `--event=PreToolUse`; a new spawned-process case feeds a routed write on stdin and asserts a deny envelope on stdout, with the same payload minus the flag asserted to reach the announce arm instead. Both mutations Briar named now fail the suite.
- **File:** `scripts/ai-skills/hooks/hook.mjs:728` (`main()` arm dispatch), `templates/install/.claude/settings.json:3` (`PreToolUse` block)
- **Problem:** every gate test calls `runPreToolUseArm` in process, so neither the `--event=PreToolUse` dispatch nor the install template's registration is covered — the two links that carry the gate from a real host to the code under test.
- **Class:** `a feature covered only below the seam that delivers it`
- **Sweep:** mutation, empirically confirmed on a scratch copy — replacing the `eventName === "PreToolUse" ? … : …` ternary with an unconditional `runPostToolUseArm` keeps 57/57 green; deleting the whole `PreToolUse` block from `templates/install/.claude/settings.json` also keeps it green, because `assertAdoptedConsumerState` asserts `PostToolUse` and `PostCompact` only and the negative control rejects on `PostToolUse`. No test in the suite passes `--event=` to a spawned `hook.mjs` at all. This compounds with D8 being unrun: neither the synthetic layer nor a live host currently exercises registration → dispatch.
- **Suggested fix:** extend `assertAdoptedConsumerState` to assert the `PreToolUse` registration and its matcher, and add one spawned-process case passing `--event=PreToolUse` on stdin that asserts a deny envelope on stdout.

### Condition 5 of the deny — the doc still exists on disk — has no test

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **Fix:** Fixed. One case seeds a route naming a doc with no file behind it and asserts the write proceeds. Mutation-confirmed: replacing `filterDocsOnDisk(...)` with `unreadDocs` fails exactly that case.
- **File:** `scripts/ai-skills/hooks/architect-route.mjs:428` (`filterDocsOnDisk` in `resolveUnreadDocs`)
- **Problem:** `runPreToolUseArm`'s JSDoc enumerates five load-bearing deny conditions and the suite covers four; nothing seeds a route naming a doc absent from disk, so a regression here would ship a deny telling the model to `cat` a file that does not exist.
- **Class:** `an explicitly enumerated precondition left out of the suite that covers its siblings`
- **Sweep:** mutation, empirically confirmed — replacing `return filterDocsOnDisk(repoRoot, unreadDocs)` with `return unreadDocs` keeps 57/57 green. The four sibling conditions each do have a killing test (kill-switch, scope id, listed tool kind, route match), so this is a single gap in an otherwise complete set, not a pattern of thin coverage.
- **Suggested fix:** one case seeding a manifest route to a doc name with no file behind it, asserting the write proceeds.

### Six tests pass for a reason other than the one they name

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **Fix:** Fixed, each with the one variable that moves the assertion. The Cursor envelope case uses `Shell` (its only listed deny path) plus a Claude positive control; the `.path` fallback case asserts the announcement it produces; the missing-`file_path` case is retired as behavior-neutral; leg 1 asserts the whole deny message; the no-state case asserts the deny fired first. The no-session case needed more than the suggested fix — a `null` scope id throws downstream and the outer catch returns `null`, so on Claude the guard is indistinguishable from its own removal; the discriminating leg runs on Cursor, whose no-op is `{}` rather than `null`. All five mutation-confirmed.
- **File:** `scripts/ai-skills/hook-gate.test.ts:1343`, `:960`, `:994`, `:160`, `:154`, `:1059`, `:1267`
- **Problem:** each asserts an outcome a second, unrelated cause already produces, so the behavior named in the title is not what the assertion discriminates on.
- **Class:** `a null/empty assertion satisfied by an earlier guard than the one under test`
- **Sweep:** mutation on a scratch copy, all empirically confirmed except the last. `:1343` "a harness with no observed deny envelope writes nothing" — the payload's `tool_name: "StrReplace"` is unlisted, so the arm returns at the kind guard and `emitDeny` is never called; both making cursor's `emitDeny` return an envelope and dropping the `envelope === null` check survive (cursor lists no `write` tool at all — its only reachable deny path is `Shell`). `:960` and `:994` — deleting the `?? payload.tool_input?.path` fallback survives; nothing asserts it positively. `:160` "missing session_id returns null" — the fixture's `cwd: "/repo"` has no manifest, so `loadManifest` throws and the catch returns `null` regardless. `:154` "missing file_path returns null" — the guard is behavior-neutral; the empty loop falls through to the same result. `:1059` leg 1 — rewriting the deny message to bare path plus remedies survives, so "Read its governing docs in full first, then retry" is uncovered. `:1267` "a deny writes no state" asserts `loadRouteState`'s absent-file defaults and would pass if the deny never fired (reasoned, not mutated; backstopped by leg 1). **Premise correction for the run record:** the `runPreToolUseArm: no session id` test at `:44` is *not* in this set — deleting `if (!scopeId) return null;` does fail the suite, because `loadRouteState` swallows the resulting TypeError and returns empty state, so the deny fires and the null assertion breaks.
- **Suggested fix:** give each a positive counterpart differing in exactly one variable — for `:1343` use a `tool_name` cursor's table lists; for `:960`/`:994` assert the `.path` fallback announces on a routed path; for `:160` point the fixture at a repo root with a manifest; retire `:154` or assert the guard's short-circuit directly; extend `:1059` to the full message.

### Two new function names are noun-first, against the repo's verb-first rule

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **Fix:** Fixed — `checkPathIsRouted` and `checkInPlaceFlag`, with the `.d.mts` declaration and both JSDoc references swept. `isForeignPayload` left alone as out of frame.
- **File:** `scripts/ai-skills/hooks/architect-route.mjs:445` (`pathIsRouted`), `scripts/ai-skills/hooks/hook.mjs:243` (`segmentHasInPlaceFlag`)
- **Problem:** `.prism/rules/code-standards.md:63-64` requires a verb-first name and forbids `is`/`has` framing outside TypeScript type guards; neither of these is a type guard.
- **Class:** `predicate helper named as a noun phrase`
- **Sweep:** every function declaration added by the diff — `git diff … | grep -E '^\+(export )?(async )?function '` over `scripts/ai-skills/hooks/`. Ten new functions; the other eight are verb-first (`resolveUnreadDocs`, `resolveListedToolKind`, `parseShellWriteTargets`, `formatDenyMessage`, `formatShellRerouteMessage`, `runPreToolUseArm`, `resolveWriteDenyReason`, `resolveShellRerouteReason`). Pre-existing precedent in the same file: `isForeignPayload` (`hook.mjs:332`), unchanged by this diff and equally against the rule.
- **Suggested fix:** `checkPathIsRouted` / `findInPlaceFlag`, or whatever reads best — the rename touches `pathIsRouted`'s `.d.mts` declaration and two JSDoc references. Leave `isForeignPayload` alone; it is outside the local frame.

### Consumer twin overstates two behaviors of the gate

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **Fix:** Fixed. The heading reads "Shell writes ask you to switch tools" and says the write is refused, and the trigger sentence reads "in this scope" with the subagent consequence spelled out.
- **File:** `templates/install/.prism/architect/_toolkit/install-layout.md` § Write gate
- **Problem:** the shipped copy says shell writes are "redirected, not blocked" when the runtime returns `permissionDecision: "deny"`, and says a doc must be read "this session" when state is keyed per scope, so a subagent is denied after its parent read the doc.
- **Class:** `consumer-voiced rewrite that simplifies past the behavior`
- **Sweep:** every sentence of the new § Write gate section compared against the runtime. The other four claims hold — trigger set, clear-by-full-read, the three disable routes, and the `prism doctor` visibility control all match. The canonical copy says "this scope" and is correct, so the drift is twin-only; the rest of the mirror set is byte-clean (`build.ts --check` reports outputs in sync).
- **Suggested fix:** "Shell writes ask you to switch tools" for the heading, and "has not been read in this session — and a subagent reads for itself" for the trigger sentence.

### ADR and spec registration hygiene

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed`
- **Fix:** Fixed. Both ADR-0071 and ADR-0072 join the index table, and `update.ts`'s comment names `PreToolUse`. The supersession claim resolved the other way: ADR-0071's announce layer still ships alongside the gate, so 0072 now says it *amends* 0071 — the `Supersedes:`/`Superseded-by:` frontmatter the README mandates does not apply, and ADR-0070's "Amends ADR-0035" is the precedent.
- **File:** `.prism/spec/adrs/_toolkit/README.md:124`, `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md:1-6`, `scripts/ai-skills/update.ts:1265`
- **Problem:** ADR-0072 is absent from the ADR index table, claims to supersede ADR-0071 without the frontmatter the README mandates on either side, and `update.ts`'s comment enumerates the events both sides register without the `PreToolUse` this PR adds.
- **Class:** `a registration or enumeration that a new member did not join`
- **Sweep:** grepped every registration surface for `0072` and for `0071` — `seed-curation.json:74` and `ship-closure.ts:102` are both correctly updated; the README table ends at `0070`, and ADR-0071 is missing from it too, so the index gap is pre-existing and repeated rather than introduced. `0071-architect-context-read-hook.md:4` still reads `Status: accepted` with no `Superseded-by:`. The `update.ts` merge code itself is generic over event names and handles `PreToolUse` correctly — only the prose drifted, which is `code-standards.md` § Removal and rename completeness on a changed behavior with no token to grep.
- **Suggested fix:** add both ADRs to the index table; add `Supersedes: 0071` to 0072 and the matching `Superseded-by:` to 0071, or soften 0072's body to "narrows" if the supersession is partial; add `PreToolUse` to the `update.ts` comment.

### Plan bookkeeping shape

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `deferred`
- **Deferred because:** two governing rules prescribe two shapes for a `## Sessions` entry — `branch-plan.md` § Battery Persistence the single line, `_shared/core.md` § Opening Orientation Battery the dated block of four bullets plus a Close. Most of this plan's entries, including three besides the one flagged, use the block. Normalizing the flagged entry alone would move the inconsistency rather than close it, and reconciling the two rules is spec work outside PR 2D's file set. The catch-all Decision's verdict is left to resolve at close, as suggested.
- **File:** `.prism/plans/opus5-port.md` — `## Sessions`, and the catch-all `## Decisions` entry
- **Problem:** the two 2026-08-19 `## Sessions` entries use different shapes (multi-line sub-bullets vs. the canonical single-line `open: … · close: …`), and the catch-all Decision's verdict reads "promotion verdict pending — resolves at PR 2D close", which is not one of the three forms `branch-plan.md` § Decision verdict gate defines.
- **Class:** `bookkeeping written in a shape the governing rule does not define`
- **Sweep:** every `## Sessions` line and every `## Decisions` verdict sub-bullet in the plan checked against `branch-plan.md` § Battery Persistence and § Decision verdict gate. All five new `## History` entries are within the 3-sentence cap; both new Decisions carry the required Root cause / Alternatives considered / Chosen approach depth shape; the catch-all entry's "What this gives up" and "Scope note" are the documented-absorption shape `followup-scope.md` asks for.
- **Suggested fix:** normalize the first Sessions entry to the single-line form; the verdict resolves at close, so leave it and let the gate catch it there.

### Angle Coverage — PR 2D, `176f35c5..9a7d1ebd`

- **Runtime behavior** — `swept` — 13 items enumerated, 13 verdicts. `runPreToolUseArm` (traced against all five documented conditions, each toggled); `parseShellWriteTargets` (14 command shapes, 2 defects); `segmentHasInPlaceFlag` (four `-i` spellings plus the boundary stop); `parseShellReadTargets` under the new positive class (`\n`, `%`, quoted-space, and `$VAR` forms — the quoted-space case yields two fragment targets, not the zero its JSDoc claims, harmless since no route matches a fragment); `resolveUnreadDocs` (read-only confirmed, `announced` correctly ignored); `pathIsRouted`; `resolveListedToolKind` and `resolveToolKind` (fallback reaches announce only); `formatDenyMessage` (defect above); `formatShellRerouteMessage`; `resolveWriteDenyReason` (first-gated-path only, as documented); `resolveShellRerouteReason` (operands resolved against payload `cwd`); `main()` dispatch. Fail-open on every throw confirmed; no state written on any deny path.
- **Test efficacy** — `swept` — 20 items enumerated, 20 verdicts. 6 tests that survive mutation of the line they name, 9 behaviors with no test, 5 mutations correctly killed (the `PreToolUse` scope-id guard, the segment-boundary reset, the `PostCompact` prefix, the `announced`-ignored rule, and the shell reroute's prerequisite-free remedy). Legs 1–3 of the PR's own claim check out structurally: `assertRemedyClearsTheGate` seeds nothing, denies through the real `PreToolUse` arm, remedies through the real `PostToolUse` arm, and re-denies. Suite re-run independently here: 57/57.
- **Spec and doc consistency** — `swept` — 16 items enumerated, 16 verdicts. Canonical and consumer `install-layout.md`, `docs/adopting-into-existing-repos.md`, `docs/what-prism-writes.md`, `AGENTS.md`, `context-reuse.md` and its four mirrors, the conductor skill and agent adapters, both `settings.json`, three routing tables, `seed-curation.json`, `ship-closure.ts`, `update.ts`, and the plan. Two drifts found (consumer twin, `update.ts` comment); the rest match the code.
- **Citation integrity** — `swept` — 14 items enumerated, 14 verdicts. Every factual claim in ADR-0072 resolved against the runtime line it describes, plus `install-layout.md:155`'s § Hook runtime cross-reference (heading exists at `:145`) and the ADR index table. All content claims hold; the two failures are registration, not content.
- **External-system claims** — `swept` — 11 items enumerated, 11 verdicts. Claude Code's `PreToolUse` event name, `hookSpecificOutput.hookEventName`, `permissionDecision: "deny"`, `permissionDecisionReason`, matcher regex semantics (unanchored, so `NotebookEdit` matches `Edit` and correctly falls through the unlisted-name guard to no deny), `$CLAUDE_PROJECT_DIR`, the tool names `Write`/`Edit`/`Bash`/`Read`/`Grep`, Cursor's `additional_context`, Codex's envelope, `PostCompact`. Ten verified against the repo's own fixtures and the settings contract. **One unverified:** the deny envelope's shape is asserted from a live probe recorded in `## Decisions`, not from a run of this code, and D8 has not run — carried to the human merge gate, not closable from a dispatched session.
- **Repo writing rules** — `swept` — `verdict-only`.
- **Security** — `swept` — 2 items enumerated, 2 verdicts. The permission-decision boundary (the gate is self-imposed friction with three documented disable routes, no auth or secret surface, and it fails open on every error) and the shell-command parsing surface (path text is interpolated into a model-facing message only, never executed; the `sed` flag regex backtracks on a long `-`-prefixed token but the input is agent-authored and local).
- **Docs impact** — `swept` — 3 items enumerated, 3 verdicts. Hook runtime → `install-layout.md` (canonical updated, twin drifts per the Minor above); `docs/adopting-into-existing-repos.md` and `docs/what-prism-writes.md` both correctly extended.
- **Accessibility** — `n/a — no UI in the pinned range.`

---

## Review Issues (PR 2D round 2 — `176f35c5..0141691e`, #470)

Briar self-review of the repair head `0141691e`, 2026-08-20 [huntermcgrew/opus5-port-deny-gate]. Round 1's five blocking findings re-verified independently rather than accepted; two of the repairs introduced new defects of the same class they closed.

**Round 1 closures verified.** The critical (multi-doc remedy earns no credit) reproduces as fixed — a two-line remedy fed to the real `PostToolUse` arm credits both docs. The routing narrowing re-measured independently with `matchDocsForPath` over `git ls-files`: all three tables lose exactly the same 29 tracked paths, every one under `.prism/prds/`, `.prism/qa/`, `.prism/retros/`, or `.prism/iris-state.json`, and each table gains the `.ai-skills/definitions/**` widening the plan's `## Decisions` names — clove's count and characterization both hold. The remaining three closures were mutation-checked here, not read: dropping the `!scopeId` guard in `runPostToolUseArm`, replacing the `PreToolUse` dispatch ternary with an unconditional `runPostToolUseArm`, swapping `filterDocsOnDisk(...)` for `unreadDocs`, and deleting the `PreToolUse` block from `templates/install/.claude/settings.json` each fail the suite. Suite re-run here: 805/805, `pnpm prism:build && pnpm prism:check` exit 0.

**Deferred items — both reasons hold.** Plan bookkeeping: `branch-plan.md` § Battery Persistence and `_shared/core.md` § Opening Orientation Battery genuinely prescribe two different `## Sessions` shapes, and `followup-scope.md` § Spec content never rides an unrelated ticket forbids folding that reconciliation into 2D without a `## Decisions` entry naming it — so deferring is not merely defensible, it is what the rule asks for. Prettier: the stated reason understates the case; prettier is not a dependency of this repo at all (`pnpm exec prettier` → command not found, no `format` script in `package.json`), so there is nothing to run rather than drift to weigh.

### A separator with no surrounding whitespace is invisible to `splitShellSegments`, so both round-1 defects recur in that spelling

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:216` (`splitShellSegments`), boundary sets at `:180` and `:199`
- **Problem:** `splitShellSegments` splits each line on whitespace and then compares whole tokens against the boundary set, so `a;b`, `a|b`, and `a&&b` carry their separator inside a token and never break a segment — the write arm resumes claiming operands across the separator, and the read arm refuses the segment outright.
- **Class:** `a shared fix that inherits the tokenizer defect it was extracted to remove`
- **Sweep:** proven end to end through the real arms, not the parsers. Probe B — `sed -i s/a/b/ /tmp/other.ts;cat src/index.ts` through `runPreToolUseArm` returns "You're writing to `src/index.ts` via a shell write", a false statement about a path the command only reads, and a block on a `cat`; this is round 1's write-arm Major verbatim. Probe C — the deny's own two remedy lines rejoined as `cat <doc>; cat <doc>` through `runPostToolUseArm` earn zero credit and the write re-denies; this is round 1's Critical in a narrower spelling. Parser level, `parseShellWriteTargets("sed -i s/a/b/ first.ts;cat .prism/rules/x.md")` → `["s/a/b/","first.ts;cat",".prism/rules/x.md"]`, and the `|` and `&&` unspaced forms return the same shape. Why the suite is green on it: the separator loop at `hook-gate.test.ts:1656` iterates `["\n","\r\n"," ; "," && "," | "," & "]` — every non-newline member is space-padded, so the tested spelling is the one that works and the common one is untested. Controls: every spaced form and both line-break forms behave correctly, and `SHELL_SEQUENTIAL_BOUNDARIES`' spaced `;` credits both docs as designed.
- **Fix:** `splitShellSegments` is now a character scan that cuts at every unquoted `;`, `&&`, `||`, `|`, `&`, and line break, so spacing is irrelevant; both boundary `Set`s are gone. The prescribed regex split was tried first and rejected on measurement — `sed -i 's/a/b/;s/c/d/' out.md` cuts inside the script and loses `out.md`, turning a false deny into a missed real write. The `:1656` loop is now generated from separator × spacing rather than enumerated, so an untested spelling cannot recur by omission, and the same generator drives a new end-to-end case asserting `sed -i s/a/b/ /tmp/other.ts<sep>cat <routed>` does not reroute. Both new cases fail against the pre-repair `hook.mjs`.

### Splitting on line breaks credits `cat` lines that are heredoc content, marking an unread doc read

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:125` (`parseShellReadTargets`), `:216` (`splitShellSegments`)
- **Problem:** every line of a multi-line command is now treated as its own command, so a heredoc body is parsed as commands — a `tee`/`cat` redirect whose document text happens to contain a line beginning `cat <doc>` credits that doc as fully read, and the write gate opens on a document nobody opened.
- **Class:** `a credit channel that resolves an ambiguity toward crediting, against its own declared fail direction`
- **Sweep:** proven end to end. Probe A — seed a routed path, confirm the baseline deny, then feed `runPostToolUseArm` a single Bash payload of `tee /tmp/pr-body.md <<'E'` / `cat .prism/architect/<doc>` / `E`; the subsequent `runPreToolUseArm` on the same target returns `null`. The doc was never read. This inverts the direction `SHELL_READ_SAFE_CHARACTERS`' own JSDoc (`hook.mjs:62-66`) gives as the reason the class is an allow-list: "A miss on a deny-list marks an unread document read and opens the write gate on it; a miss on an allow-list costs one re-read." Before this repair, any `\n` refused the whole command, so no heredoc credited anything — the direction was correct and the line-break split reversed it. Reachability is not theoretical here: `.prism/rules/bash-output-minimization.md` prescribes heredoc-to-file for PR bodies, and a PR body about this hook contains exactly such `cat` lines. Controls: the segment holding the `<<'E'` introducer is correctly refused (its `<` fails the per-token class), which is precisely why only the *body* lines get through; `(cat doc)`, `cat doc | head -5`, and `cat -n doc` all behave.
- **Fix:** the safe-character test moved back over the whole raw command, with `;` and line breaks admitted to the class so the multi-line remedy still credits. Any `<` refuses the entire command, so the heredoc is unreachable without enumerating `<<` — the certainty rule rather than one more named construct. The scanner also skips heredoc bodies for the write arm, where no class can apply, and drops the introducer instead of yielding `<<'E'` as a phantom target. Covered at the parser and end to end through `runPostToolUseArm`; both cases fail against the pre-repair `hook.mjs`.

### The read arm drops a segment's unconditional first command along with its conditional second

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:199` (`SHELL_SEQUENTIAL_BOUNDARIES` and its JSDoc)
- **Problem:** with `&&`, `||`, `|`, and `&` left out of the read boundary set, the separator stays inside the segment and fails the per-token class, so `cat a.md && cat b.md` credits neither — including `cat a.md`, which ran unconditionally.
- **Class:** `a conservative default applied one clause wider than its own justification`
- **Sweep:** all four omitted separators checked in both spaced and unspaced form; every one yields `[]` for the whole segment. The JSDoc reads "`&&` and `||` are conditional — the second command may never have run", which justifies dropping the second command and is silent on the first; the code drops both, so the comment describes a narrower behavior than the code has. `;` and the line breaks are the only forms that credit at all.
- **Fix:** decided the second way, and the decision now covers more than `&&`. The whole command is refused whenever any part of it leaves the safe class, and the JSDoc says so and gives the reason the heredoc supplied: a construct the class does not model can change what the *following* clauses mean, so no clause's credit is safe once one is unparseable. The test name changed from "segment" to "command" to match.

### Angle Coverage — PR 2D round 2, `176f35c5..0141691e`

- **Runtime behavior** — `swept` — 9 items enumerated, 9 verdicts. `splitShellSegments` (both boundary sets, spaced and unspaced, `\n`/`\r\n`, heredoc, subshell, trailing separator — 2 defects); `parseSegmentReadTargets` (per-token class equivalence with the old whole-command test confirmed: the union of a segment's token characters is the command's characters minus whitespace, and whitespace was already in the class); `parseSegmentWriteTargets` (fresh state per segment, `>`/`>>`/`tee`/`tee -a`/`sed -i` all still resolve); `checkInPlaceFlag` (end-of-array scan equivalent to the old boundary-stopped scan, since the splitter has already cut); `parseShellReadTargets` and `parseShellWriteTargets` end to end through `runPostToolUseArm`/`runPreToolUseArm`; `checkPathIsRouted` rename (call sites and `.d.mts` swept); `matchDocsForPath` accumulate-all semantics confirmed, so `.prism/skills/prism-conductor/**` keeps `spec-editing.md` and gains `skills-ecosystem.md`.
- **Test efficacy** — `swept` — 5 items enumerated, 5 verdicts. Four mutations run here and all killed (`!scopeId` guard, `PreToolUse` ternary, `filterDocsOnDisk`, install-template `PreToolUse` block). The fifth is the `:1656` separator loop, which passes on space-padded spellings only — the gap behind the Major above. The suite as shipped: 805/805 here, independently.
- **Spec and doc consistency** — `swept` — 6 items enumerated, 6 verdicts. Consumer `install-layout.md` § Write gate (heading now "Shell writes ask you to switch tools", trigger reads "in this scope" with the subagent consequence stated — both round-1 drifts closed); `update.ts` comment; the ADR index rows; the three routing tables against each other; `manifest.stub.json`'s reformat is whitespace-only against its content change. The `.ai-skills/definitions/**` widening is documented at the plan's `## Decisions` and is not an undeclared scope change.
- **Citation integrity** — `swept` — 3 items enumerated, 3 verdicts. ADR-0072's amends-not-supersedes resolution matches ADR-0070's "Amends ADR-0035" precedent and needs no `Supersedes:` frontmatter; both ADR rows carry accurate summaries; the round-1 finding's own claim that the index gap predated this PR holds — 0071's row is new here too.
- **External-system claims** — `not reached — unchanged since round 1, which swept 11 items.` The one unverified item there, the live deny envelope, is D8 and still goes to the human merge gate.
- **Repo writing rules** — `swept` — `verdict-only`. The renamed `checkPathIsRouted`/`checkInPlaceFlag` satisfy `code-standards.md` § Naming; the new JSDoc blocks are why-first and tag-free; one comment describes narrower behavior than its code, recorded as the Minor above.
- **Security** — `swept` — 1 item enumerated, 1 verdict. The heredoc over-credit is a correctness defect in self-imposed friction, not a privilege boundary — the gate has three documented disable routes and fails open on every throw, so a false credit costs enforcement, not access.
- **Docs impact** — `n/a — the repair delta touches no doc surface the round-1 sweep did not already cover.`
- **Accessibility** — `n/a — no UI in the pinned range.`

---

## Review Issues (PR 2D round 3 pass 1 — probes over `0141691e..c628e5f3`, #470)

Pass 1 of a two-pass round: the three probes only, run against the exported
functions rather than taken from clove's mutation table. The parser hunt on the
write arm's hand-rolled scanner is pass 2 and is not covered here.

No issues found — 2026-08-20 [huntermcgrew/opus5-port-deny-gate] — pass 1 scope only.

### Probe results — all three green

Harness: direct `await import()` of `scripts/ai-skills/hooks/hook.mjs`, calling
`parseShellReadTargets` / `parseShellWriteTargets` on literal command strings.

- **Unspaced-separator reroute.** `tee a.md;cat b.md`, `tee a.md&&cat b.md`, and
  `tee a.md|grep x b.md` each return exactly `["a.md"]` — the write arm cuts at
  the unspaced separator and no longer claims the following segment's operand.
  The spaced control `tee a.md ; cat b.md` returns the same, so the two spellings
  now agree. `sed -i s/x/y/ a.md;cat b.md` returns `["s/x/y/","a.md"]`: the cut
  holds, and the script operand riding along as a bogus target is the documented
  trade, not a regression.
- **Rejoined two-`cat` remedy.** `cat one.md; cat two.md`, the `\n`-joined form,
  the unspaced `cat one.md;cat two.md`, and the single-command `cat one.md two.md`
  all return both paths with `credit: true`. The remedy the deny message prints is
  performable in every spelling a model is likely to paste.
- **Heredoc credit.** `tee out.md <<'E'\ncat secret.md\nE` returns `[]` from the
  read arm — the body-named document earns no credit. Confirmed the refusal is by
  construction and not by heredoc enumeration: `<` is outside
  `SHELL_READ_SAFE_CHARACTERS`, so the whole command is refused before
  `splitShellSegments` runs. Appending a genuine `cat real.md` after the delimiter
  still returns `[]`, which is the whole-command refusal costing a real clause its
  credit — the intended direction, one re-read.
  The write arm on the same input returns `["out.md"]`, so the heredoc's own
  target is still gated.

### Adjudication — clove's override of the regex-split prescription is correct

Round 2 prescribed splitting on `/\s*(?:\|\||&&|[;|&])\s*/`. Run against
`sed -i 's/a/b/;s/c/d/' out.md`, that regex yields
`["sed -i 's/a/b/", "s/c/d/' out.md"]` — `out.md` lands in a segment whose head
token is `s/c/d/'`, which is in neither `SHELL_WRITE_COMMANDS` nor
`SHELL_READ_COMMANDS`, so the write is never claimed. The character scanner
returns `["s/a/b/;s/c/d/","out.md"]` and keeps it. A missed real write is the
worse failure direction than a false deny, so the override stands and the
round-2 prescription is withdrawn.

---

## Review Issues (PR 2D round 3 pass 2 — scanner fuzz over `0141691e..c628e5f3`, #470)

Briar pass 2, 2026-08-20 [huntermcgrew/opus5-port-deny-gate]. One job: break `splitShellSegments`. Driven as real inputs through the exported `parseShellWriteTargets`/`parseShellReadTargets` in a node harness, not read from the source. 51 inputs across seven shape classes; five root causes found, three of which fail toward a missed real write.

**Failure direction is the organizing axis.** A false deny costs one re-read and a reroute message. A missed real write is the gate silently not firing on a routed path, which is the failure this whole arm exists to prevent. The three missed-write causes are recorded first.

### Line continuation injects the newline into the path, and under CRLF drops the write target entirely

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:286` (the unquoted `\\` branch of `splitShellSegments`)
- **Problem:** the escape branch copies the *next* character into the token verbatim, so a backslash-newline continuation — which the shell deletes outright — becomes a literal newline inside the following token; under CRLF the backslash eats only the `\r` and the surviving `\n` cuts the segment, so the continued command's write target lands in a segment whose head token is the path itself and is never claimed.
- **Class:** `an escape rule that copies the escaped character instead of interpreting the pair`
- **Sweep:** three continuation spellings driven through `parseShellWriteTargets`, all against `tee` + a routed path. `tee \\` + `\n` + `.prism/plans/x.md` → `["\n.prism/plans/x.md"]` — a path no manifest route can match, so the gate does not fire. `tee \\` + `\r\n` + `.prism/plans/x.md` → `["\r"]` — the real target is gone completely. The indented form `tee \\` + `\n  .prism/plans/x.md` → `["\n",".prism/plans/x.md"]` survives, because the leading space ends the poisoned token before the path starts; that accident is the only reason the multi-line `sed -i` shape in the suite passes. CRLF is not a hypothetical input class here — `parseShellWriteTargets` already has a passing CRLF separator case, and `tee a.md\r\ntee b.md` resolves both targets correctly, so the same input carrying a continuation is reachable by the same route.
- **Suggested fix:** treat `\\` immediately followed by `\n`, or by `\r\n`, as consuming both characters and contributing nothing to the token, before the general escape copy. Leave the general branch alone — it is correct for `tee out\;md`, verified → `["out;md"]`.
- **Fix:** Fixed by construction — `\\` sits outside `SHELL_READ_SAFE_CHARACTERS`, so a continuation costs the command its proof and every routed path it names is rerouted. The candidate scan strips backslashes before matching, so the path survives the continuation intact. Covered by the `tee \\\n<path>` and `\\\r\n` rows of `everyUnprovableShape`.

### Quote characters are kept in the token and only stripped when they wrap the whole of it

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:281` (quote-open branch appends the quote), `:100` (`unquote`)
- **Problem:** the scanner tracks quote state per character but writes the quote characters into the token anyway, then re-derives the unquoted form with `unquote`'s `/^(["'])(.*)\1$/`, which only matches a token wrapped end to end. Every partially-quoted path therefore reaches the route matcher with quote characters still in it and matches nothing.
- **Class:** `information the scanner already has, discarded and then guessed at downstream`
- **Sweep:** six quoting shapes driven through `parseShellWriteTargets`, all naming the same routed path. Adjacent splice `tee ".prism/plans"/x.md` → `[".prism/plans\"/x.md"]` with both quotes retained. Mid-token `tee .prism/'plans'/x.md` → `[".prism/'plans'/x.md"]`. Unterminated single `tee '.prism/plans/x.md` → `["'.prism/plans/x.md"]`; unterminated double the same shape. Nested `tee ".prism/plans/'x'.md"` → `[".prism/plans/'x'.md"]` — here the outer pair *is* stripped and the inner literal quotes correctly survive, so this one is right and is the control. Escaped quote inside a double quote `tee ".prism/plans/x\\".md"` → `[".prism/plans/x\\\".md"]`, retaining the backslash the shell removes. Controls that behave: `tee ".prism/plans/my plan.md"` and `tee .prism/plans/my\\ plan.md` both → `[".prism/plans/my plan.md"]`, and single-quoted `tee '.prism/plans/x\\.md'` correctly keeps its literal backslash.
- **Suggested fix:** stop appending the quote character in the quote-open and quote-close branches, so the token carries the shell's own value and `unquote` becomes redundant on splitter output. This is a change to shared code both arms consume, so it needs its own check against the read arm — `parseSegmentReadTargets` calls `unquote` on operands and `SHELL_READ_SAFE_CHARACTERS` admits `"` and `'`, so the read arm's behavior should be re-measured rather than assumed unchanged.
- **Fix:** Fixed by construction — the candidate scan strips quote characters from the raw command before matching, so an adjacent splice, a mid-token quote, and an unterminated quote all still contain the literal path. `unquote` is unchanged and still serves the read arm. Covered by `QUOTE_SPLICES`.

### Unquoted `$(…)` and backtick substitution containing a separator cuts the segment and loses the target, which is the opposite of the direction the JSDoc claims

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:203-206` (the JSDoc's "What it still does not model" list), `:267` (the separator branch)
- **Problem:** the scanner has no substitution state, so a `;`, `&&`, or `|` inside an unquoted `$(…)` or backticks cuts a segment the shell would not cut, and the real write target — which follows the substitution — ends up in a segment whose head token is not a write command. The JSDoc lists this gap but describes it as "costing a missed cut rather than a wrong one"; measured, it is a *spurious* cut, and its cost is a missed real write.
- **Class:** `a documented gap whose stated failure direction is inverted, in a design that rests on knowing which way each gap fails`
- **Sweep:** four substitution shapes. `tee $(echo a; echo b)/.prism/plans/x.md` → `["$(echo","a"]`, routed path gone. Backtick equivalent → `["`echo","a"]`, same. `echo hi > $(pwd; :)/.prism/plans/x.md` → `["$(pwd"]`, same. Bounded by quoting: `tee ".prism/plans/$(a; b)x.md"` and the single-quoted twin both return the full token intact, so the break needs the substitution to be *unquoted*, which is why this is Minor and not Major — and `mkdir -p $(dirname x; true) && tee .prism/plans/x.md` survives because the `&&` cut happens to land after the damage. Substitution without a separator is unaffected in either arm.
- **Suggested fix:** the code gap is a legitimate thing to leave open at this narrowness. The JSDoc line is not — correct it to say that an unquoted substitution containing a separator produces an extra cut and can drop a real write target, so the next reader weighing whether to close it knows it is on the unsafe side of the ledger.
- **Fix:** Fixed — the code gap stays open and is now unreachable (`$` and `` ` `` are outside the character class both callers test first), and `splitShellSegments`' JSDoc gap list states the correct failure direction for each of its two remaining gaps.

### An indented delimiter ends a plain `<<` heredoc that bash would not end, and the remaining body is parsed as commands

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:371` (`skipHeredocBodies`, the `.trim()` comparison)
- **Problem:** the terminator test trims every body line before comparing it to the delimiter, which is `<<-`'s rule applied unconditionally — a plain `<<` heredoc whose body contains an indented copy of its own delimiter terminates there, and every remaining body line is handed to the segmenter as commands.
- **Class:** `one form's relaxation applied to the strict form it was meant to sit beside`
- **Sweep:** five heredoc bodies driven through `parseShellWriteTargets`. `tee .prism/plans/x.md <<'E'` with a body of `  E` then `tee .prism/plans/GHOST.md` then `E` → `[".prism/plans/x.md",".prism/plans/GHOST.md"]` — the second target is document text, not a write. The redirect spelling of the same shape yields `.prism/rules/GHOST.md` the same way, so the leak is not specific to `tee`. It needs the post-termination text to itself parse as a write: the same body with `rm -rf .prism/plans/GHOST.md` yields only the real target, which is why this is Minor rather than Major. Controls, all correct: `<<-E` with a tab-indented terminator terminates as it should and the following real command is still claimed; a body line exactly equal to the delimiter with no indentation terminates, which is bash's behavior too, not a bug; and a well-terminated body containing `a; b && c | d` or `echo hi > /etc/passwd` yields nothing extra.
- **Suggested fix:** compare the raw line to the delimiter for `<<`, and only trim for `<<-`. `readHeredocDelimiter` at `:328` already detects the `-` but discards it — carry that bit onto `pendingHeredocs` alongside the delimiter so `skipHeredocBodies` can honor it. Note `<<-` strips leading *tabs* only, not spaces, so `.trim()` is not the right test for that arm either.
- **Fix:** Fixed by construction — `<` is outside the character class, so no heredoc reaches the proof, and the redirect target is rerouted along with every other path the command names. Covered by the two heredoc rows of `everyUnprovableShape`.

### `#` is not a comment, so every word of a trailing comment becomes a write target

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:240` (the `splitShellSegments` character loop has no `#` case), `:475` (the operand-claiming branch of `parseSegmentWriteTargets`)
- **Problem:** the scanner treats `#` as an ordinary character, so on a `tee`/`sed -i` segment every word after a trailing comment is claimed as a written path — and a comment that names a routed doc produces a reroute for a file the command never touches.
- **Class:** `a shell metacharacter absent from a scanner that models the others`
- **Sweep:** `tee .prism/plans/x.md # see .prism/rules/foo.md` → `[".prism/plans/x.md","#","see",".prism/rules/foo.md"]`. The last element is a real routed path and denies on it. Bounded to the trailing-comment position: `tee .prism/plans/x.md\n# see .prism/rules/foo.md` → `[".prism/plans/x.md"]`, because the line break cuts first and the comment line's head token is `#`, which is in neither command set. The `>`-redirect spelling is unaffected — only the `tee`/`sed -i` operand loop claims bare words. This is the same shape as the junk-operand trade the write arm's JSDoc already accepts at `:409` ("a non-flag operand that is not a path … rides along as a target no manifest route can match") — the difference is that a comment can and does contain a path a route *does* match, so the stated reason for accepting the trade does not hold here.
- **Suggested fix:** cut the segment at an unquoted `#` that begins a token, the same way the loop already cuts at a separator. Naming this in the JSDoc's gap list instead is the cheaper option but a worse one — the gap list's other members cannot produce a matching path, and this one can.
- **Fix:** Fixed by construction — `#` is outside the character class, so a trailing comment costs the command its proof. A routed path named in the comment now reroutes alongside the real target, which is the safe direction. Covered by the `tee <path> # see the note` row.

### `<<<` leaves a stray `<` write target

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:275` (the heredoc guard's `command[index + 2] !== "<"` arm)
- **Problem:** the guard correctly declines to treat `<<<` as a heredoc, but the first two `<` characters have already been consumed by the guard's own lookahead path on the next iteration, leaving a one-character `<` token that the operand loop claims as a write target.
- **Class:** `a guard that declines a construct without rewinding what it looked at`
- **Sweep:** `tee .prism/plans/x.md <<<"hi"` → `[".prism/plans/x.md","<"]`. Harmless in effect — `<` matches no manifest route, so no deny fires — which is why this is recorded at Minor and could equally sit under `## Cleanup Items`. Recorded as a finding rather than cleanup because it is evidence the `<`-handling arm has an off-by-one the other heredoc cases do not exercise, and the next edit to that guard should know.
- **Suggested fix:** consume the whole `<<<` run in the guard and emit nothing, matching how the `<<` arm drops its own introducer.
- **Fix:** Fixed by construction — `<` is outside the character class. Covered by the `tee <path> <<<"hi"` row.

### A command prefix hides the write command from the head-token test, and grouping parens ride along into the path

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/hook.mjs:461` (`parseSegmentWriteTargets`, the `segmentCommand === null` branch)
- **Problem:** the segment's *first* token is taken as its command, so anything that legitimately precedes a command — `sudo`, `env`-style `VAR=value` assignments, `nohup`, `time`, `command`, or a `(`/`{` group opener — becomes the head token, `segmentWrites` stays false, and a real `tee` or `sed -i` write is never claimed; separately, a group's closing `)` is not a scanner boundary, so it fuses onto the last operand of a redirect inside the group.
- **Class:** `a positional assumption about where a command name sits, in a grammar that allows prefixes`
- **Sweep:** thirteen prefix shapes driven through `parseShellWriteTargets`, every one naming the same routed path. Eight return `[]` — no target, no deny, gate silent: `(tee .prism/plans/x.md)`, `{ tee .prism/plans/x.md; }`, `sudo tee …`, `FOO=bar tee …`, `sudo sed -i 's/a/b/' …`, `echo hi | sudo tee …`, `nohup tee …`, `time tee …`. Two controls behave: bare `tee .prism/plans/x.md` and `echo hi | tee .prism/plans/x.md` both → `[".prism/plans/x.md"]`, so the pipeline cut itself is fine and the prefix is the whole cause. The `>`-redirect spelling is *not* affected by prefixes, because the `>` branch runs before the head-token test — `{ echo hi > .prism/plans/x.md; }` and `FOO=bar echo hi > .prism/plans/x.md` both resolve correctly. The one redirect shape that does break is the paren group: `(echo hi > .prism/plans/x.md)` → `[".prism/plans/x.md)"]`, a path with a trailing paren that matches no route. None of this class appears in the write arm's documented gap list at `:405`, which names word-prefixed redirects, interpreters, and `cp`/`mv`/`dd` — so a reader auditing what the gate misses would not find it.
- **Suggested fix:** two independent changes. For the prefix class, skip leading tokens that cannot be a command name before fixing `segmentCommand` — a `VAR=value` assignment, and a small set of transparent prefixes (`sudo`, `env`, `command`, `nohup`, `time`) — or, if that list is judged unbounded, state the gap in the JSDoc so it is a known miss rather than an invisible one. For the paren, treat unquoted `(` and `)` as token boundaries in `splitShellSegments` the way `;` already is. Weigh the prefix list against likelihood before expanding it: `sudo tee` is the common idiom in general shell use but rare against a `.prism/` path, while `(`/`{` grouping and `VAR=value` are what a model composing a multi-part command actually emits.
- **Fix:** Fixed by construction — a prefix cannot make a command *provable*, and only a proof clears a path. `sudo`, `env`-style assignments, `nohup`, `time`, and `command` are generated against `tee`, `tee -a`, and `sed -i` in `COMMAND_PREFIXES`; the paren and brace groups are outside the character class. The write arm's gap list at `:405` is gone with the parser it described.

### The separator generator closes the axis that already failed and leaves the axes that failed today enumerated

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hook-gate.test.ts:1722` (`everySeparatorSpelling`)
- **Problem:** the generator is separator × spacing, and only the spacing half is closed by construction — spacing is a genuine closed set of four, but the separator half is still a hand-written array of seven literals, so the enumeration moved up one level rather than going away.
- **Class:** `a generator that parameterizes the axis that already broke and hardcodes the rest`
- **Sweep:** the deeper problem is not the separator array's contents but its breadth. `splitShellSegments` now takes seven kinds of input that change segmentation — separators, quoting, escapes, heredocs, command substitution, comments, and command prefixes — and the generator covers exactly one of them, while a green run of it reads as "segmentation is covered." It is not: this pass broke five root causes across four of the six uncovered kinds, all behind 811/811. The JSDoc at `:1714` states the principle exactly right — "a list is only as good as whoever remembers to extend it, and the omission is invisible in a green suite" — and then the array one line below is that list. The assertion shape is fine: one expected value across all 28 spellings is correct for this axis, and the depth is not the weakness.
- **Suggested fix:** the honest answer is that no generator over separator spellings can cover this, because the scanner's input space is no longer one axis. Add a table-driven case set over the other six kinds — one row per shape with its expected targets — and let each finding above contribute its repro as a row. Generating the separator spellings is still worth keeping; it just should not be read as segmentation coverage, and the JSDoc should say which axis it closes rather than implying it closed the problem.
- **Fix:** Fixed — the generator is replaced. `everyUnprovableShape` generates across every input kind that has broken a hand-rolled parser plus the five unprobed classes, and `CHARACTERS_OUTSIDE_THE_CLASS` crosses every metacharacter with three positions, all asserting one outcome. The separator × spacing axis survives as a matched pair (a write after a separator loses the proof; two reads across it keep it) so a splitter that cut nowhere cannot pass.
### Angle Coverage — PR 2D round 3 pass 2, write-arm scanner fuzz

- **Runtime behavior** — `swept` — 7 items enumerated, 7 verdicts, over 51 inputs driven through the exported `parseShellWriteTargets`/`parseShellReadTargets`. Separators (clean, control); quoting (defect: retained quote characters); escapes (defect: line continuation); heredocs (defect: unconditional trim; `<<-`, unterminated bodies, two-heredoc, and delimiter-as-substring all clean); command substitution (defect: unquoted separator cuts, quoted forms clean); comments (defect: `#` not modeled); command prefixes (defect: head-token displacement, plus the paren fusing onto a redirect operand). `checkInPlaceFlag` swept separately across seven `sed` spellings with no false positive or negative found — that arm is correct.
- **Test efficacy** — `swept` — 1 item enumerated, 1 verdict: the separator × spacing generator, recorded as the Major above. Five root causes shipped behind a green 811.
- **Spec and doc consistency** — `swept` — 2 items enumerated, 2 verdicts. `splitShellSegments`' JSDoc gap list states the substitution gap's failure direction backwards; the write arm's gap list at `:405` omits the command-prefix class entirely. Both recorded above.
- **Citation integrity** — `n/a — this pass added no citations and re-read none.`
- **External-system claims** — `n/a — bash's own semantics were the reference for every expected value, and each is stated inline in its finding rather than cited.`
- **Repo writing rules** — `not reached — out of pass scope; swept at round 3 pass 1 and round 2, and this pass touched no prose.`
- **Security** — `swept` — `verdict-only`. The missed-write classes cost enforcement of self-imposed friction, not access — unchanged from round 2's verdict.
- **Docs impact** — `n/a — no doc surface in this pass's scope.`
- **Accessibility** — `n/a — no UI in the pinned range.`

**Unprobed, handed to clove as gaps rather than findings:** interpreter-mediated writes (`python -c`, `node -e`), `cp`/`mv`/`dd`, process substitution `>(…)`, `exec` redirections, and arithmetic/parameter expansion containing separators. Each is plausibly reachable; none was driven this pass. **All five are closed by the contract narrowing** — each fails either the character-class test or the head-token test, so none can produce a proof, and each is now a generated row in `everyUnprovableShape`.

---

## Review Issues (PR 2D round 4 — false-proof hunt over `d7378ab9..7072ff13`, #470)

Briar round 4, 2026-08-20 [huntermcgrew/opus5-port-deny-gate]. One job: forge a false proof — a command `parseUnprovenShellPaths` certifies as read-only that actually writes. Driven as real inputs through the exported function in a node harness, then each forged command run against a real filesystem to confirm it writes. Twenty-one inputs; **six confirmed false proofs and one confirmed arbitrary-execution vector**, all from three root causes.

**The refusal mechanism holds.** The controls confirm it: `tee <path>`, `cp a.md <path>`, `sed -i <path>`, `sed --in-place <path>`, and `sort --output=<path>` all reroute. A character outside the class, a head token off the list, and a flag-form output target each cost the command its proof exactly as designed. Every finding below is a leak in *what the list admits*, not in how the proof is enforced — which means each is a membership repair, not a redesign.

**The unifying root cause.** The arm inverted its *command* judgment to an allow-list and left its *flag and operand-position* judgment on allow-everything. `resolveProvenReadPaths` skips any token starting with `-` without asking what that flag means, and `checkSegmentOnlyReads` reads only the head token. So a read-only command's own write mode — expressed as a flag value, a trailing operand, or a script clause — walks through the proof untouched. The command list asks "is this command read-only on plain operands"; nothing asks "are these operands plain."

### `sort -o <path>` is certified read-only and writes the path

- **Axis:** `standards`
- **Severity:** `critical`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/hook.mjs:445` (`SHELL_INSPECTION_COMMANDS` membership of `sort`) and `:604` (`resolveProvenReadPaths`' unconditional flag skip)
- **Problem:** `sort` is on the read-only list, and `resolveProvenReadPaths` drops `-o` as a flag and then adds the following token to the proven-read set, so `sort -o <routed-path> in.md` proves a write to be a read and the gate never fires.
- **Class:** `a listed read-only command whose output target arrives as a flag value the proof skips`
- **Sweep:** `parseUnprovenShellPaths("sort -o .prism/architect/_toolkit/install-layout.md input.md")` → the routed path is absent from the result (proven read-only). Confirmed writing: `sort -o victim1.md in.txt` created and populated `victim1.md`. The `=` spelling is safe by accident — `sort --output=<path>` reroutes, because `PATH_SHAPED_RUN` splits the path off the flag as a candidate while the whole `--output=<path>` token is skipped as an operand and never enters the proven set. Two spellings of one flag, opposite verdicts.
- **Suggested fix:** remove `sort` from `SHELL_INSPECTION_COMMANDS`. It is not read-only on plain operands — it has an output mode, which is the list's own stated disqualifier ("is this command read-only on plain operands, with no in-place-write mode? If the answer needs a 'usually', it stays out"). The structural fix that closes this whole class is in the last finding below.

### `uniq <in> <out>` and `xxd <in> <out>` are certified read-only and write their second operand

- **Axis:** `standards`
- **Severity:** `critical`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/hook.mjs:445` (`SHELL_INSPECTION_COMMANDS` membership of `uniq` and `xxd`)
- **Problem:** both take an optional second positional operand that is an *output* file, not an input. The proof treats every non-flag token as a read operand, so the write target is dropped from the candidate set.
- **Class:** `a listed read-only command whose output target is a trailing positional operand, indistinguishable from an input by position alone`
- **Sweep:** `parseUnprovenShellPaths("uniq input.md <routed>")` and `("xxd input.bin <routed>")` both certify read-only. Confirmed writing: `uniq u.txt victim2.md` created `victim2.md` holding the deduped input; `xxd h.txt victim3.md` created `victim3.md` holding the hex dump. Swept the rest of the list for the same shape — `od`, `nl`, `cut`, `tr`, `wc`, `file`, `stat`, `diff`, `ls` take no output operand; `tr` takes no file operands at all. `uniq` and `xxd` are the only two.
- **Suggested fix:** remove both from `SHELL_INSPECTION_COMMANDS`. Neither is recoverable by counting operands — `uniq in` and `uniq in out` differ only in arity, and an arity rule would be one more enumeration of the kind this arm exists to stop making.

### `git diff|log|show --output <path>` is certified read-only and writes the path

- **Axis:** `standards`
- **Severity:** `critical`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/hook.mjs:534` (`checkSegmentOnlyReads`' `git` branch)
- **Problem:** the `git` branch proves read-only from the subcommand alone. Every subcommand in `GIT_INSPECTION_SUBCOMMANDS` that emits a diff — `diff`, `log`, `show` — accepts git's `--output=<file>` diff option, and in the space-separated spelling the path lands in the proven-read set through the same unconditional flag skip as `sort -o`.
- **Class:** `a per-call read-only judgment made from the subcommand while the write mode lives in a flag`
- **Sweep:** all three spellings certify read-only through `parseUnprovenShellPaths`: `git diff --output <routed>`, `git log -p --output <routed>`, `git show HEAD --output <routed>`. Confirmed writing against a real repo: each of the three created the named file carrying the diff or log output. The subcommand resolver itself is sound in the safe direction — `git -C <dir> status` resolves its subcommand to `<dir>`, finds no match, and refuses; a flag-only `git` refuses. The leak is exclusively the flag.
- **Suggested fix:** refuse the proof for any `git` segment carrying a token matching `/^--output/` or a bare `-o`, in addition to the subcommand test. This is narrower than the structural fix below and is the minimum that closes the confirmed case.

### `sed`'s `w` script command writes, and long-option abbreviation evades `checkInPlaceFlag`

- **Axis:** `standards`
- **Severity:** `critical`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/hook.mjs:527` (`checkSegmentOnlyReads`' `sed` branch) and `:635` (`checkInPlaceFlag`)
- **Problem:** `sed` is decided per call by in-place *flag* detection alone, but `sed`'s write capability is not confined to a flag. The `w <file>` command and the `s///w <file>` flag inside the *script operand* both write an arbitrary path, carry no `-` prefix, and sit entirely inside `SHELL_READ_SAFE_CHARACTERS`. Separately, `checkInPlaceFlag`'s `/^--in-place/` misses GNU getopt's unambiguous long-option abbreviations, and `/^-[a-zA-Z]*i/` cannot match them either because the second character is `-`.
- **Class:** `a write mode expressed in a command's data operand rather than its flags, plus a flag matcher pinned to one spelling of a flag the parser accepts under many`
- **Sweep:** four inputs certified read-only by `parseUnprovenShellPaths`: `sed -n 'w <routed>' input.md`, `sed 's/a/b/w <routed>' input.md`, `sed --in <routed>`, `sed --i <routed>`. Confirmed writing (macOS BSD sed): `sed -n 'w victim4.md' h.txt` created `victim4.md` holding the input; `sed 's/hi/yo/w victim5.md' h.txt` created `victim5.md` holding the substituted line. The `w`-command leak is worse than a spelling gap — the routed path is not merely un-rerouted, it is *added to the proven-read set* by `scanPathShapedTokens` running over the script operand, so the arm actively launders it. **Confidence on the abbreviation half is `Deduced`, not `Confirmed`:** GNU sed is not installed on this machine, so `sed --in` was not run. The deduction is that GNU `getopt_long` accepts any unambiguous prefix and `--in-place` is sed's only long option beginning `--i`; the harness result showing both spellings certified read-only *is* confirmed, only the underlying sed behavior is not. It does not change the fix.
- **Suggested fix:** two parts, both required. Refuse the proof for any `sed` segment whose non-flag operands contain `w` or `W` adjacent to a path-shaped run — or, simpler and in the arm's own spirit, refuse `sed` outright unless every one of its non-flag operands is a plain path-shaped token with no script punctuation (`s`, `w`, `W`, `/`, `;` inside a quoted operand). And replace `/^--in-place/` with a prefix-of test: any token where `"--in-place".startsWith(token)` and the token is longer than `--` counts as in-place.

### `rg --pre <cmd>` executes an arbitrary program under a read-only proof

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/hook.mjs:445` (`SHELL_INSPECTION_COMMANDS` membership of `rg`), same class at `:534` for `git grep -O`
- **Problem:** `rg --pre <program>` runs `<program>` once per searched file; `git grep -O<cmd>` opens matches in an arbitrary pager command. Both are on the read-only surface and both hand control to a program the arm cannot see, which can write anything.
- **Class:** `a listed read-only command with a flag that executes another program`
- **Sweep:** `parseUnprovenShellPaths("rg --pre ./x.sh foo <routed>")` and `("git grep -O ./x.sh foo")` both certify read-only. Confirmed execution: a `--pre` script writing a marker file to `/tmp` was invoked and the marker appeared. `git grep -O` was not driven against a real repo (it wants a pager/tty) — that half is `Deduced` from the documented flag. Held at Major rather than Critical because the write does not come from the command text: it needs a pre-existing executable at a path the model must already control, so the blast radius is narrower than the four Criticals above, where the command alone is sufficient.
- **Suggested fix:** covered by the structural fix below. A targeted fix would refuse `rg` carrying `--pre`, `--pre-glob`, or `--hostname-bin`, and `git grep` carrying `-O`/`--open-files-in-pager`.

### Structural: the proof allow-lists commands but allow-everythings flags

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/hook.mjs:604` (`resolveProvenReadPaths`' `if (token.startsWith("-") && token !== "-") continue;`)
- **Problem:** four of the six findings above are one defect wearing four hats. The command list was inverted to fail safe; the flag handling was not. An unrecognized flag is silently assumed to be a modifier rather than an output target or an exec hook, which is precisely the deny-list posture the arm's own JSDoc says three earlier rounds proved wrong.
- **Class:** `an inverted judgment applied at one level of a grammar and not the level below it`
- **Sweep:** every leak in this pass that is not a positional-operand leak (`sort -o`, `git --output`, `rg --pre`, `git grep -O`) enters through this one line. The two positional leaks (`uniq`, `xxd`) enter through the sibling assumption that a non-flag token is an input.
- **Suggested fix:** apply the arm's own inversion one level down — refuse the proof whenever a segment carries **any** flag token not on a per-command allow-list of known-inert flags. The existing per-command lists are the natural home: `SHELL_INSPECTION_COMMANDS` becomes a map from command to its allowed flag set (most entries can allow a small fixed set, or none, since a bare `cat`/`grep`/`wc` is the shape this arm actually needs to certify). Cost is one more reroute message on an unusual-but-harmless flag, which is the direction this whole arm is built to fail in; benefit is that the next flag nobody enumerated cannot produce a proof. Combined with dropping `sort`, `uniq`, and `xxd` from the list and hardening `sed`, this closes every finding in this pass by construction rather than one at a time.

### The ADR and install-layout both bound the surviving gaps at "One", which the six Criticals above refute

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `open`
- **File:** `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md:64` (§ Consequences) and `.prism/architect/_toolkit/install-layout.md:161` (§ Write gate), plus the three build-managed mirrors of each
- **Problem:** the gap statement itself is honest and correctly reasoned — a path built from a variable or reached by `cd` genuinely cannot be seen by a scan over the command text, and naming it beats letting a later round rediscover it. What is not honest is the quantifier. Both files say **"One** gap survives by construction," and the ADR describes the proof's basis as "a list of commands that read their operands and write nothing." Three members of that list write, so the description is false of its own contents and the count is false of the design.
- **Class:** `an admitted limitation immediately bounded by a completeness claim nobody verified` — `.prism/rules/writing-voice.md` § Anti-pattern: Reassurance that introduces a new claim, which names this exact shape: the sentence right after an admission is the likeliest place to assert something unproven
- **Sweep:** both prose homes of the claim, canonical and mirrored — `grep -rn "One gap survives by construction"` returns the ADR and `install-layout.md` in all four surfaces. The variable/`cd` gap is the only one either file names. The two gaps this pass confirmed are of a different kind and neither is mentioned: a command wrongly on `SHELL_INSPECTION_COMMANDS`, and a write mode reached through a flag value or a trailing operand the proof skips. A reader auditing the arm against this ADR would conclude the list needs no per-entry scrutiny, which is precisely the audit that finds `sort -o`.
- **Suggested fix:** two edits, and the second survives the Criticals being fixed. Drop "One" — the variable/`cd` gap is *a* gap that survives by construction, not the only one. Then add the gap that is structural rather than incidental: membership on the read-only list is a human judgment, and a command wrongly admitted is a silent write. That is the ADR's own stated failure-direction argument turned honestly on itself — it currently says a list miss "costs one reroute message," which is true of a command *missing* from the list and false of one wrongly *on* it. Both directions belong in the same bullet.

### The reroute message states its remedy as a command swap when the real constraint is whole-command

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/hook.mjs:866` (`formatShellRerouteMessage`)
- **Problem:** "If the command only reads, spell it as a plain `cat`, `head`, or `grep`" reads as a head-token swap, but the proof is all-or-nothing over the whole command. `cat <doc> | head -5` and `grep foo <doc> > /tmp/out` both start with a named command and both still reroute, because the pipe and the redirect sit outside the character class. A model that follows the message literally and adds a pipe gets the identical message back with no new information, which is a remedy loop the message could have prevented in one clause.
- **Class:** `a remedy stated at the wrong grammatical scope — token-level advice for a whole-command rule`
- **Sweep:** the message's other claims check out. It no longer asserts a write — "so everything else counts as a write" is framing, not an assertion about this command — which was the round-1 defect and is genuinely closed. The three named commands are all on `SHELL_INSPECTION_COMMANDS`, so the advice is sound as far as it goes; the list is much wider, and under-promising is the right direction. "Redo this edit" does presume an edit one clause before the hedge arrives, which is a wording nit rather than a second finding.
- **Suggested fix:** add the scope to the last sentence — "spell it as a plain `cat`, `head`, or `grep` with no pipe, redirect, or substitution."

### Judgments on the three unasked questions — all three hold

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/hook-gate.test.ts:1792` (`everyProvableRead`)
- **Problem:** two of the three hold outright and are recorded here as verdicts rather than defects. The third — clove's argument that `everyProvableRead`'s enumeration "is now the specification rather than a list someone must remember to extend" — does not hold, and this pass's six Criticals are the evidence against it.
- **Class:** `a test whose passing direction is the one that can be wrong`
- **Sweep:** three judgments.
  - **`checkPathIsRouted` → `filterRoutedPaths`: sound, and the rename is complete.** Per-path semantics are preserved exactly — a `toRepoRelativePath` of `null` excludes the path, matching the old `false` return — input order is preserved, and the empty-input short-circuit avoids a manifest load the old shape would also have skipped. The batching is genuine: the shell arm now asks about every path-shaped token, so a per-path entry point would parse the manifest once per token. Swept for remnants across the whole tree: `checkPathIsRouted`, `parseShellWriteTargets`, `SHELL_WRITE_COMMANDS`, and `SHELL_CONTROL_CHARACTERS` appear only inside `.prism/plans/opus5-port.md`'s own history, which is the correct place for a retired name.
  - **The env-var omission is correctly reasoned.** Verified against the code rather than the claim: `PRISM_HOOK_DENY_DISABLE` is read at `hook.mjs:909` via `process.env` inside `runPreToolUseArm`, which runs in the hook process the host spawns with the host's own environment. A `PRISM_HOOK_DENY_DISABLE=1 tee <path>` inline assignment would scope to the denied command's own subshell, which never runs because the call is denied. Naming it in the message would have been a false remedy. The escape stays documented in the ADR's § Consequences, where it *is* true — the reader there is a human who can export it.
  - **`everyProvableRead` is a sample, not a specification.** The generated half of the claim holds: `CHARACTERS_OUTSIDE_THE_CLASS` produces three cases per character, and `everyUnprovableShape` crosses six command prefixes and five quote splices against a shared expected outcome, so adding a shape is one appended string. The enumerated half does not. The actual specification of what the arm lets past is `SHELL_INSPECTION_COMMANDS` ∪ `GIT_INSPECTION_SUBCOMMANDS` ∪ the `sed` rule; `everyProvableRead` names 12 of the 32 inspection commands and 2 of the 9 git subcommands, and every leak this pass found sits in the uncovered remainder — `sort`, `uniq`, `xxd`, `git show`, and `sed` with a script operand. The list is precisely the artifact whose non-extension hid them. **The deeper problem is that extending it would not have helped.** A passing `everyProvableRead` row asserts "the arm certifies this command as read-only," which is the *provable* direction — a row reading `sort -o <path> in.md` would pass today and enshrine the defect. The suite has no assertion anywhere that a listed command actually writes nothing, because no unit test can have one.
- **Suggested fix:** derive the read cases from the constants instead of restating them — iterate `SHELL_INSPECTION_COMMANDS` and `GIT_INSPECTION_SUBCOMMANDS` directly, asserting each certifies a bare `<command> <path>`. That makes coverage complete by construction, which is the property clove is claiming and the current shape does not have. It also does the thing the enumeration cannot: adding a command to the list forces a test row into existence, so the membership judgment gets a second human reading at the moment it is made. Pair it with a comment on each list stating that membership is the one place in this arm where a mistake is silent, since the test can only ever check the arm against the list and never the list against reality.

### Angle Coverage

- **Runtime behavior** — `swept` — 7 items enumerated, 7 verdicts. `parseUnprovenShellPaths` driven over 21 forged commands (6 false proofs, 1 exec vector, 6 controls behaving correctly); `checkSegmentOnlyReads` across all 32 `SHELL_INSPECTION_COMMANDS` entries and all 9 `GIT_INSPECTION_SUBCOMMANDS` entries for output-operand and output-flag capability; `resolveProvenReadPaths`' flag skip and operand collection; `checkInPlaceFlag` against four in-place spellings plus two long-option abbreviations; `scanPathShapedTokens`' quote/backslash stripping (confirmed it cannot admit an out-of-class character, because the class test runs on the raw command and over-generating candidates is the safe direction); `filterRoutedPaths` per-path equivalence; `formatShellRerouteMessage`. Six forged commands additionally run against a real filesystem and confirmed to write.
- **Test efficacy** — `swept` — 3 items enumerated, 3 verdicts: `everyUnprovableShape` and `CHARACTERS_OUTSIDE_THE_CLASS` generative and sound; `everyProvableRead` a sample whose passing direction cannot detect this pass's defects, recorded as the Minor above.
- **Spec and doc consistency** — `swept` — 2 items enumerated, 2 verdicts: ADR-0072 § Consequences and `install-layout.md` § Write gate, both carrying the "One gap" overclaim, recorded as the Major above. The rest of both rewrites tracks the implementation accurately.
- **Citation integrity** — `swept` — 1 item enumerated, 1 verdict: the ADR's own § Consequences cross-references resolve, and `pnpm prism:check` reports crossref-lint, install-adr-gate, and install-relative-link-gate all green.
- **External-system claims** — `swept` — 8 items enumerated, 6 confirmed by execution (`sort -o`, `uniq`, `xxd`, `sed 'w'`, `sed 's///w'`, `git diff|log|show --output`, `rg --pre`), 2 `Deduced` and labelled as such in their findings (GNU sed long-option abbreviation, `git grep -O`).
- **Repo writing rules** — `swept` — `verdict-only`. The new JSDoc is why-first and tag-free; the two prose surfaces carry the quantifier defect recorded above, which is a `writing-voice.md` violation rather than a style nit.
- **Security** — `swept` — `verdict-only`. Unchanged from round 2 in kind: the gate enforces self-imposed friction, not access, so a false proof costs enforcement rather than a boundary. `rg --pre` is the one finding that touches execution, and it grants nothing the model could not already do directly.
- **Docs impact** — `swept` — 1 item enumerated, 1 verdict: `install-layout.md` § Write gate needs the same quantifier fix as the ADR, in the canonical file and its three mirrors.
- **Accessibility** — `n/a — no UI in the pinned range.`

---

## PR Readiness (PR 2D — the deny gate on routed paths, #470)

- [ ] No critical or major issues — **round 4 opened four Criticals and three Majors, all `open`.** Six forged read-only proofs on commands that write (`sort -o`, `uniq <in> <out>`, `xxd <in> <out>`, `git diff|log|show --output`, `sed 'w <path>'`, `sed 's///w <path>'`), each confirmed writing against a real filesystem, plus one confirmed arbitrary-execution vector (`rg --pre`). Round 3 pass 2's findings remain `fixed`; rounds 1 and 2 remain `fixed` and independently verified.
- [x] Types correct — no `any`, no unsafe `as`; `.d.mts` sidecars match their implementations
- [x] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases — the generated half holds: `everyUnprovableShape` crossed with `CHARACTERS_OUTSIDE_THE_CLASS` × three positions, all asserting one outcome. `everyProvableRead` is a sample rather than the closed set it is described as — it names 12 of 32 inspection commands and 2 of 9 git subcommands, and every round-4 leak sits in the uncovered remainder. Derive it from the constants (round 4 Minor).
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-08-20 (`pnpm prism:check` exit 0, 812/812)
- [ ] PR description up to date — needs a line on the round-2 segmenter rewrite and the round-3 contract narrowing
- [ ] Lasting decisions promoted to architect context — the catch-all Decision's verdict resolves at plan close

**Outstanding for the human merge gate:** D8's live-host run. It needs a real Claude Code session and cannot be closed from a dispatched one.

**Last updated:** 2026-08-20 (round 4 false-proof hunt — `pnpm prism:check` re-run green after the plan write, tree clean)
