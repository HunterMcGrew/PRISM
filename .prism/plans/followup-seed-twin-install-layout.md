# Plan: followup-seed-twin-install-layout

## Ticket

None. Post-merge same-scope follow-up to the curated-seed-twin thread, per [`.prism/rules/followup-scope.md`](../rules/followup-scope.md) — a follow-up PR off `main`, no new ticket. This is item 1 of the recommended follow-up order in `.prism/plans/followup-seed-twin-skills-ecosystem.md` § Signals.

Branch: `huntermcgrew/prism-followup-seed-twin-install-layout`
PR body opener: `Follow-up to #429 / the seed-twin thread. No new ticket per .prism/rules/followup-scope.md.`

---

## Goal

Fix the consumer-visible wrong instructions in `templates/install/.prism/architect/_toolkit/install-layout.md` — a shipped twin that tells a cold consumer to run `adopt` without ever mentioning `init` — and classify every one of its seven missing canonical sections as correct-omission or missing-in-error, so the 91-line gap stops reading as undifferentiated drift.

---

## Blocking dependency — read this before starting

**Implementation does not start until the `followup-seed-twin-skills-ecosystem` PR merges.**

That lane's task 8 appends a new `## Curated seed twins: the curation boundary` section to canonical `.prism/architect/_toolkit/install-layout.md` — the same file task 6 below amends, and the source of truth every task here reads. Verified absent from canonical as of this writing (`grep -c 'curation boundary' .prism/architect/_toolkit/install-layout.md` → 0), so the section this plan amends does not yet exist.

Two consequences:

- Task 6 **amends** the boundary section rather than creating it. If task 6 finds no `## Curated seed twins: the curation boundary` heading in canonical, the upstream lane has not merged — stop and re-check, do not create the section from scratch.
- The new boundary section is itself maintainer-only under its own Test 3 (a consumer never curates seed twins). **It must not be copied into `templates/install/.prism/architect/_toolkit/install-layout.md`** — not by task 6's amendment either. AC-9 asserts this in both directions.

**Resolved 2026-07-24:** The upstream PR merged as `49a489d` (#442). The boundary section was corrected twice after this plan was written — genericization named as a third sanctioned transformation (ADR-0064), and the recency-detector recommendation replaced with a date-independent structural diff citing issue #441. Task 6 amended the section as it stood at implementation time, not as described in this plan's original text below.

---

## Background — severity, and why this is worse than the skills-ecosystem drift

Canonical is 225 lines, the twin 134. Both are `curated` in `.ai-skills/definitions/seed-curation.json` (line 81), so `checkSeedDrift` checks existence only and `mirrorSeed` never writes them — there is no mechanical staleness signal, exactly as the skills-ecosystem plan established.

Three facts set the severity above that plan's:

1. **The failure is loud and blocks first contact.** The twin's `## First-contact adoption: \`prism:adopt\`` section never mentions `init`. Canonical documents `init` as required step 1, and `adopt` refuses when `config.json` is absent (canonical line 94: "If adopt detects that `config.json` is missing, it stops and tells the consumer to run `init` first"). A consumer following the shipped twin runs `adopt`, gets refused, and has no instruction telling them what to do — the twin is the document that would have said.
2. **It is auto-loaded, not sought out.** `.prism/architect/manifest.json:46` routes `.prism/**` → `_toolkit/install-layout.md`. Every consumer agent that edits anything under `.prism/` loads this doc as authoritative context. Wrong instructions here reach agents without anyone going looking.
3. **It shipped in the published npm `0.8.0`.** `templates/install/` is in `package.json#files`. Consumers installing today receive it.

Severity call: **Major**, bounded. Loud-failing wrong instructions on the first-contact path, in auto-loaded durable agent context — but self-limiting, because `adopt`'s refusal message names `init`, so a consumer who reads the error recovers without the doc.

---

## The curation boundary, as applied here

This plan applies the three ordered tests promoted to canonical `install-layout.md` by the upstream lane, restated in one line each (cite-don't-restate per [`implementation-task-detail.md`](../rules/implementation-task-detail.md) § Cite, don't restate — the tests' full statement and reasoning live in that section, not here):

- **Test 1 — identifier tokenization.** Install-specific values ship as `${TOKEN}`.
- **Test 2 — reference reachability.** A cross-reference ships only if its target ships.
- **Test 3 — subject matter.** Content about building, publishing, or maintaining PRISM itself never ships; content about what a consumer's own install does ships even when the mechanism lives in PRISM's scripts.

Plus the constraint that governs all three: curation is **subtraction and tokenization only**, direction of flow always canonical → twin.

`install-layout.md` is Test 3's hardest case and the boundary did not survive it unchanged. See `## Findings` below — the amendment lands in task 6.

### Reachability facts this audit established

Test 2 needs a target set. These are the facts, verified:

| Target class | Ships to a consumer? | Evidence |
| --- | --- | --- |
| `templates/install/.prism/**` content | Yes | `package.json#files` includes `templates/install/` |
| `.prism/{rules,architect,spec,references,templates}/**` | Yes | in `package.json#files` |
| `scripts/ai-skills/**` | **No** | `package.json#files` has no `scripts/` entry — the tarball ships `dist/` only |
| `docs/**` | **No** | not in `package.json#files`; `docs/content/dev/architecture/install-layout.md` does not exist in the monorepo either |
| Numbered ADRs | **No** | every `spec/adrs/_toolkit/NNNN-*.md` is `excluded` in `seed-curation.json` |
| `.prism/plans/**` | **No** | canonical-only by design |
| Commands `prism init\|adopt\|update\|doctor\|eject` | **Yes** | `scripts/ai-skills/cli.ts` `USAGE`, lines 24–28 — the whole consumer surface |
| Commands `pnpm prism:build`, `pnpm prism:check` | **No** | PRISM-repo package scripts; no `build` or `check` subcommand exists on the consumer CLI, and neither `init` nor `adopt` writes `prism:*` scripts into a consumer `package.json` |

The consumer invocation form is `npx @huntermcgrew/prism <sub>` (README lines 26–37, 166–169), never `pnpm prism:<sub>`. The package name `@huntermcgrew/prism` ships literally: it is PRISM's own identifier, identical for every consumer, so it is not a Test 1 token — and `SEED_DOGFOODING_PATTERN` (`scripts/ai-skills/literal-guard.ts:48-49`) does not match it.

---

## Heading-set delta — every missing section classified

Seven canonical sections are absent from the twin. **Five are correct omissions; two are missing in error** (one of those partially — a single paragraph inside it is a correct omission). The 91-line gap is mostly the boundary working, not drift.

| # | Canonical heading (lines) | Verdict | Deciding test and evidence |
| --- | --- | --- | --- |
| S1 | `## Consumer content sources through one seam` (78–86) | **Correct omission** | Test 3. Entirely about how PRISM sources and guards its *own* package content — `resolvePrismContentRoot`, its two call sites, `runConsumerSeedLiteralGuard`, `SEED_DOGFOODING_PATTERN`, `literal-allowlist.json`. A consumer never chooses a content root; they run `adopt`. Test 2 independently condemns every path it names (`scripts/ai-skills/**` unshipped). The one consumer-relevant residue — content arrives from the curated seed — is already carried by the twin's retained `## The templates/install seed surface`. |
| S2 | `## First-contact adoption: \`prism init\` then \`prism adopt\`` (88–100) | **Missing in error — partial** | Steps 1–3 and the split rationale (lines 90–98) pass all three tests: no install-specific identifiers, `@huntermcgrew/prism` is reachable, and "a consumer runs these commands" is Test 3's positive case verbatim. **Tasks 1–2.** The `**The config write path honors both ticket systems.**` paragraph (line 100) is a **correct omission** — `writeOnboardingConfig`/`toOnDiskConfig` in unshipped `scripts/ai-skills/lib/onboarding-config.ts`, plus changelog-voice ("this closed the write-side gap"). Two tests agree independently: it also contains `Atlas's existing Linear output`, and `\bLinear\b` is a build-failing seed literal. |
| S3 | `## Steady-state persona-skill distribution` (115–135) | **Missing in error** | Passes Test 3's positive case more cleanly than any other section in the file: what `update` gives the consumer, that their own tokens are used, that their own skills are never touched, that removed personas are cleaned up, that re-running is a no-op. A consumer reading the shipped twin has no idea `update` renders the roster at all. Needs three Test 2 drops — **task 3**. |
| S4 | `## Two substitution passes, two surfaces` (137–146) | **Correct omission** | Test 3. Two of the three passes are build-time; the stated "practical consequence" is advice to whoever writes a class-level guard — a PRISM maintainer. Line-numbered internals throughout (`build.ts:207`, `build.ts:111`, `generate-skills.ts:348-353`). **Conditional on task 3:** the one consumer-visible fact here (your tokens land in skill bodies) is carried by S3's "The consumer's tokens, not PRISM's" paragraph. Before task 3 lands, omitting S4 loses that fact; after, it does not. |
| S5 | `## Optional tokens must default in \`deriveTokenMap\`` (148–160) | **Correct omission** | Test 3. An authoring rule for whoever edits shipped skill bodies and PRISM's own token map — `scripts/ai-skills/lib/tokens.ts`, `optional-token-coverage.test.ts`, both unshipped. A consumer never edits `deriveTokenMap`. |
| S6 | `## Packaging-parity gate` (204–206) | **Correct omission** | Test 3, the clearest case in the file. `npm pack`, `prepublishOnly`, `RUNTIME_READ_PATHS`, the 0.7.1 publish incident. A consumer never packs or publishes. |
| S7 | `## Bundle-safe entry detection` (208–218) | **Correct omission** | Test 3. A code-authoring rule for PRISM's own CLI bundle — esbuild config, `isDirectCliEntry`, the transitive import graph, `cli-bundle.test.ts`. A consumer runs `dist/cli.js`; they never build it. Consistent with the twin's `## Where to look` correctly lacking canonical's `lib/cli-entry.ts` bullet. |

**Count: 5 correct omissions (S1, S4, S5, S6, S7) + 1 correct-omission paragraph inside S2; 2 missing in error (S2 steps, S3).**

The twin adds no headings canonical lacks. Its heading set is a strict subset of canonical's once S2's stale heading text is corrected.

### Twin-only defects outside the heading delta

Three defects live in retained twin content, not in the missing-section set:

- **D1 — `pnpm prism:build` / `pnpm prism:check` × 12 occurrences on 8 lines** (12, 14, 57, 72, 100, 111, 123, and 14/72/100/111 carry two each). These name commands that **do not exist on the consumer CLI**. Same defect class as the `init` bug. **Out of scope — see `## Signals`.** The fix is not subtraction: twin line 14's "Editing a platform copy directly is drift — `pnpm prism:check` flags it" needs the *substantively different* consumer-side statement (nothing flags it in their repo; the next `prism update` overwrites it). That is re-authoring, which changes blast radius and is the human's call.
- **D2 — `pnpm prism:adopt` / `pnpm prism:update` on lines 76, 83, 85.** Real consumer commands in the maintainer invocation form. **In scope** — these sit inside the first-contact section tasks 1–2 restructure, so they are in the local frame per [`code-standards.md`](../rules/code-standards.md) § Refactor scope, and task 1 would otherwise leave the same command named two ways in adjacent paragraphs.
- **D3 — unshipped `scripts/ai-skills/*.ts` paths on lines 76, 100, 123, 131, 132.** **Partially in scope:** line 76 only, because tasks 1–2 already modify that line. The rest are in sections this plan does not touch — same follow-up as D1.
- **D4 — twin line 134 cites `docs/content/dev/architecture/install-layout.md`**, which is not in `package.json#files` **and does not exist in the monorepo**. Twin-only line; canonical has no such bullet. **In scope** — one line, hard Test 2 failure, and unlike D1 the fix is pure subtraction.

The local-frame line is deliberate and drawn by rule, not convenience: this plan edits the sections it restructures, plus one pure-subtraction dangling reference. It does not sweep the file.

---

## Findings — the boundary rule did not survive unchanged

Two amendments. Both are cheap; the second is the one that matters.

### Amendment A — Test 2's target set must include the tarball and the command surface

Test 2 as promoted says: check the target against `seed-curation.json` and the `templates/install/.prism/` tree. That is necessary and insufficient, on three counts this audit found:

- **The tarball is a third authority.** `scripts/ai-skills/**` is in neither the seed tree nor `seed-curation.json`, so the test as written never asks about it — yet `package.json#files` proves it is unshipped, and nine seed files reference it anyway.
- **Commands are references too.** The rule reads as being about file paths. `pnpm prism:build` is not a path, passes the test as written trivially, and is exactly as unreachable as a dangling ADR link. The consumer command surface (`cli.ts` `USAGE`) is the authority.
- **`crossref-lint` does not gate this class.** The upstream plan's task 9 calls crossref-lint "the load-bearing gate for Test 2." For unshipped-path references it is not: the linter resolves seed references **against the monorepo root**, where `scripts/ai-skills/build.ts` exists. It goes green on precisely the references Test 2 condemns. This class needs grep against `package.json#files`, not lint. Recording this matters more than the amendment itself — the upstream plan asserts a gate that does not hold for the class most likely to recur.

### Amendment B — the twin already practices a treatment the rule cannot express, and Test 3 needs it named

Subtraction-and-tokenization-only cannot fix D1. But the twin **already solved this correctly in three places**, without the rule sanctioning it:

- Twin line 70: canonical's "`pnpm prism:build` keeps it in parity automatically; `writeSeedMirror()` in `scripts/ai-skills/build.ts` writes…" ships as "**The PRISM build** keeps it in parity automatically."
- Twin lines 59 and 66: canonical's `[.ai-skills/docs/compatibility.md](…)` link ships as "**PRISM's internal** `.ai-skills/docs/compatibility.md` … **(monorepo-only, not shipped to consumers)**."

That is a real idiom: **when a shipping sentence names an unreachable command, path, or document, attribute the mechanism to PRISM rather than naming a thing the reader cannot reach** — the minimum edit that removes the unreachable reference, which is the same carve-out Test 2 already grants dangling ADR links. The rule under-describes what the file already does. Task 6 names it.

### The finding the amendments do not fix

Stated plainly, because it is worth more than the fix: **`install-layout.md`'s twin is not a curated subset of canonical — it is a lightly-trimmed copy of a maintainer document.** Roughly 70% of the 134 retained lines describe PRISM's own build pipeline: the platform-copy mechanics, seed-curation enforcement, the path guard, drift detection, crossref lint. A consumer runs none of it. Under Test 3 read honestly, **more maintainer content survives in the twin than was omitted from it** — the omissions (S1, S4, S5, S6, S7) are correct, and the retentions are the problem.

Applying Test 3 honestly to this file therefore implies a smaller, consumer-framed document — what you receive, how you adopt, how you update, what is yours versus PRISM's — not a trimmed maintainer doc. That is a re-authoring, it changes the blast radius from a content catch-up to a rewrite of shipped auto-loaded agent context, and the same command-form defect spans six other seed files. It is the human's scope call, not this plan's. Routed to `## Signals`.

The boundary rule survives as a rule. What this file proves is that it is a *sufficient* test for what to omit and an *insufficient* one for what to retain — nothing in the three tests ever asks whether already-shipping content still passes them.

---

## Implementation Tasks

All tasks are content-only markdown edits; no build effect except the verification pass in task 7. **Task 6 is blocked on the upstream merge** (see `## Blocking dependency`). Tasks 1–2 are sequential (2 depends on 1's insertion point); tasks 3, 4, 5 are independent of everything; task 7 runs last.

Line numbers below are as of this writing. Tasks 1–2 shift every later line in the twin by the length of their insertion — **execute tasks 3 and 4 by anchor text, not by line number, if they run after tasks 1–2.**

Copy canonical text **verbatim** except where a task names a drop. Do not re-wrap or rephrase.

### Clove (implementation)

1. **Rename the first-contact heading and insert the two-command steps** — `templates/install/.prism/architect/_toolkit/install-layout.md:74`. **Done.**

2. **Fix the command form in the retained adopt narrative** — same file, the three lines immediately following task 1's insertion. **Done.** Line 85's quoted `assertConsumerIsEstablished` error string verified unchanged.

3. **Insert the `## Steady-state persona-skill distribution` section** — same file. **Done.**

4. **Delete the dangling docs bullet** — same file. **Done.**

5. **Verify the five correct omissions stay omitted** — same file. **Done — verified via grep, none re-added.**

6. **Amend the curation boundary section** — `.prism/architect/_toolkit/install-layout.md` (**canonical only**). **Done.** Section confirmed present at implementation time (post-#442 merge); amended in place per the section's actual final wording, not the plan's original restatement of it (the section was corrected twice after this plan was written — see `## Blocking dependency` resolution note).

7. **Verify** — **Done.** `pnpm run prism:check` exit 0 (load-bearing gate); `pnpm run prism:crossref-lint` exit 0; `pnpm run prism:check-types` and `pnpm run prism:test` pass; `pnpm run prism:build` passes and is idempotent (second run produces zero further diff). `git diff --name-only origin/main` lists five files, not three — see `## Decisions` for why this is expected, not scope creep.

---

## Decisions

- **Implementation is blocked on the `followup-seed-twin-skills-ecosystem` PR merging.** That lane creates the canonical `## Curated seed twins: the curation boundary` section this plan amends in task 6 and reads as its source of truth throughout.
  - **Root cause:** the two follow-ups were split by file, but the boundary rule is a shared artifact one of them creates and the other extends.
  - **Alternatives considered:** (a) restate the three tests here and let both lanes land independently; (b) fold this plan into the upstream PR; (c) sequence.
  - **Chosen approach:** (c). (a) creates the exact re-enumeration drift the boundary rule exists to prevent, and would put two versions of the tests in the tree on day one. (b) turns a focused content fix into a surface-wide sweep, defeating the reason either is a follow-up PR.
  - **Implementation guidance:** task 6 verifies the section exists before amending and stops if it does not.
  - **Resolved 2026-07-24:** merged as `49a489d` (#442); task 6 proceeded.
  - → no promotion needed (sequencing fact specific to these two lanes)

- **Five of the seven missing sections are correct omissions, not drift.** S1, S4, S5, S6, S7 are all Test 3 maintainer content — sourcing PRISM's own package, build-time substitution mechanics, PRISM's token-authoring rule, npm packaging, and PRISM's CLI bundle build. Two are missing in error: S2's numbered steps and S3 in full.
  - **Root cause:** the 91-line gap reads as undifferentiated staleness. It is mostly the boundary working correctly; the instructional defect is concentrated in one section.
  - **Implementation guidance:** task 5 exists specifically so the correct omissions do not get "fixed" back in by a future reader working from the raw heading diff.
  - → no promotion needed (per-file classification; the general rule is the boundary section)

- **Test 2's target set gains the published tarball and the consumer command surface; the attribution idiom is named as a sanctioned minimum edit.** Amendments A and B in `## Findings`.
  - **Root cause:** Test 2 was written against file paths and the seed tree. `scripts/ai-skills/**` is unshipped but invisible to that check, and `pnpm prism:build` is a reference the test as written does not even recognize as one.
  - **Alternatives considered:** (a) leave the rule and treat these as per-file judgment; (b) add a fourth test for commands; (c) widen Test 2's target set and name the existing idiom.
  - **Chosen approach:** (c). A fourth test (b) implies commands are a different kind of thing than paths — they are not; both are references whose targets must be reachable. (a) is what produced the defect.
  - **Implementation guidance:** task 6.
  - → promoted to `.prism/architect/_toolkit/install-layout.md`

- **`crossref-lint` is not the gate for the unshipped-path class, contrary to the upstream plan's task 9.** It resolves seed references from the monorepo root, where `scripts/` exists, so it passes on every reference Test 2 condemns. The gate for this class is grep against `package.json#files`; `pnpm prism:check` (seed literal guard + path guard) is the gate for the literal and platform-path classes.
  - **Root cause:** a verification claim was asserted from the linter's stated purpose rather than from its resolution root.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` (task 6, second bullet)

- **D1 — the `pnpm prism:build` / `prism:check` references — is out of scope, and the reason is that subtraction cannot express the fix.** Twin line 14 ("Editing a platform copy directly is drift — `pnpm prism:check` flags it") needs a substantively different consumer-side claim: nothing flags it in their repo; the next `prism update` overwrites it. That is re-authoring shipped auto-loaded agent context.
  - **Alternatives considered:** (a) sweep all 12 occurrences in this plan; (b) leave them entirely; (c) fix only the occurrences inside sections this plan already restructures.
  - **Chosen approach:** (c), with the boundary drawn by [`code-standards.md`](../rules/code-standards.md) § Refactor scope rather than by convenience — the first-contact section is the local frame because tasks 1–2 restructure it. (a) would leave the plan half-rewriting a document whose framing is the actual defect, without the human having agreed to that. (b) would ship `npx @huntermcgrew/prism adopt` and `pnpm prism:adopt` in adjacent paragraphs.
  - **Known limitation, stated honestly:** the twin still names two nonexistent commands after this plan lands. That is a smaller defect than the one being fixed — `prism:check` in a mechanism paragraph misleads; a missing `init` blocks first contact — but it is the same class, and the plan does not close it.
  - → no promotion needed (scope call recorded here; `## Signals` carries the follow-up)

- **The twin retains more maintainer content than it omits.** Roughly 70% of the 134 retained lines describe PRISM's build pipeline. Applying Test 3 honestly implies a consumer-framed rewrite, not a reconciliation.
  - **Root cause:** the three tests decide what to omit when copying canonical forward. Nothing in them ever re-examines content already shipping — so a twin created by trimming a maintainer doc stays a maintainer doc, and every subsequent pass only asks about the delta.
  - **Scope:** **out of scope — needs a human scope call.** It changes blast radius from a content fix to a rewrite of auto-loaded shipped agent context, and the same defect class spans six other seed files.
  - → no promotion needed (recorded as the finding; `## Signals` carries it)

- **Task 7's verification bullet and AC-6/AC-10's exact-count evidence undercount by one file/one heading each — both are pre-existing state this plan didn't create.** (1) Editing canonical `.prism/architect/_toolkit/install-layout.md` unconditionally triggers `prism:build`'s platform-copy pass (`.claude/`, `.codex/`, `.cursor/` mirrors), which is a *different* mechanism from the seed-write pass that "curated" exempts — the plan's "exactly three paths" / "build regenerates neither" phrasing conflated the two, so `git diff --name-only origin/main` correctly lists five files (twin, canonical, three mirrors) plus the plan file, not three. (2) AC-6's "exactly five lines" undercounts the `## Curated seed twins: the curation boundary` heading, which already existed in canonical on `origin/main` before this plan started (confirmed via `git show origin/main:...`) and correctly stays canonical-only — the diff is six lines, not five, and that sixth line is intentional per `## Blocking dependency`, not a defect.
  - **Root cause:** both discrepancies stem from the same source — this plan's exact-count verification bullets were drafted before the upstream `#442` merge finalized the boundary section's exact final state, and neither anticipated the platform-mirror side effect of a canonical architect-doc edit (a mechanism the very file under edit documents in its own `## The bifurcation` and `## What gets copied; what stays canonical-only` sections).
  - **Implementation guidance:** verified `pnpm prism:check` exit 0 (the load-bearing gate per task 7's own framing) and confirmed `pnpm run prism:build` is idempotent (a second run produces zero further diff) — both prove the change is content-only and correctly scoped despite the file/heading count mismatch.
  - → no promotion needed (plan-authoring gap specific to this ticket's exact-count phrasing; not a generalizable rule)

---

## Acceptance Criteria

### Behavioral

- [x] **AC-1** — Given a consumer with a cold repo reading the installed install-layout doc, When they look for how to start, Then `prism init` is documented as the required first command with what it writes.
  - **Evidence** (`machine`): `grep -c 'npx @huntermcgrew/prism init'` → `1`; `grep -c '\.ai-skills/config\.json'` → `2`. Verified.

- [x] **AC-2** — Given a consumer who runs `adopt` before `init`, When they consult the doc, Then it states that adopt stops and tells them to run `init` first.
  - **Evidence** (`machine`): `grep -c "tells the consumer to run \`init\` first"` → `1`. Verified.

- [x] **AC-3** — Given a reader scanning the section headings, When they reach first-contact adoption, Then the heading names both commands.
  - **Evidence** (`machine`): new heading present (`1`), old heading absent (`0`). Verified.

- [x] **AC-4** — Given a consumer wondering what `prism update` does to their skill directories, When they read the steady-state section, Then all four invariants are stated.
  - **Evidence** (`machine`): all four grep checks return `1`. Verified.

- [x] **AC-5** — Given a consumer copying a command out of the first-contact section, When they run it, Then it exists on the consumer CLI.
  - **Evidence** (`machine`): `pnpm prism:` count in first-contact section range → `1` (the untouched quoted error string, as expected). Verified.

- [x] **AC-6** — Heading-set conformance: exactly the five allowlisted maintainer-only headings are absent from the twin, and the twin adds none.
  - **Evidence** (`machine`): diff shows six canonical-only headings (the five allowlisted S1/S4/S5/S6/S7 plus `## Curated seed twins: the curation boundary`, which is pre-existing on `origin/main` and correctly stays canonical-only per `## Blocking dependency` — see the Decisions entry on this discrepancy). Zero lines on the twin-only side. Substantively verified; the plan's literal "five lines" undercounts by the pre-existing boundary heading.

- [x] **AC-7** — The added content introduces no unreachable reference, and the one pre-existing dangling reference outside the mechanism sections is gone.
  - **Evidence** (`machine`): `grep -cE 'ADR-[0-9]|docs/content/|prism-242'` → `0`; `grep -c 'skills-ecosystem.md § Output guards'` → `0`; `pnpm run prism:crossref-lint` exit 0. Verified.

- [x] **AC-8** — Test 1 holds and no rendered value or dogfooding literal leaked in.
  - **Evidence** (`machine`): `grep -cE '\bLinear\b|PRISM-[0-9]+'` → `0`; `pnpm run prism:check` exit 0 (runs `runConsumerSeedLiteralGuard`). Verified.

- [x] **AC-9** — The boundary amendments land on the architect surface, canonical-only.
  - **Evidence** (`machine`): canonical has `package.json#files` (≥1) and `crossref-lint` (≥1) inside the boundary section; twin has `curation boundary` → `0`. Verified.

- [x] **AC-10** — The change is content-only and touches nothing else.
  - **Evidence** (`machine`): `pnpm run prism:check`, `prism:crossref-lint`, `prism:check-types`, `prism:test`, and `prism:build` all pass; `pnpm run prism:build` is idempotent (second run: zero further diff). `git diff --name-only origin/main` lists five files (twin, canonical, three platform mirrors), not three — see the Decisions entry explaining this is the expected platform-copy side effect of any canonical architect-doc edit, not scope creep.

- [ ] **AC-11** — A consumer who has never seen PRISM can get from cold repo to adopted using the twin alone.
  - **Evidence** (`human`): unresolved — requires a human cold-read of the twin. Not machine-checkable.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-23 | Winston | AC generated | followup-seed-twin-install-layout | N/A — no ticket per followup-scope.md |

---

## Signals — out of scope for this plan

Three, in severity order. Deliberately absent from `## Implementation Tasks`.

1. **The curated twins name commands consumers cannot run.** `pnpm prism:build` / `pnpm prism:check` appear across seven seed files: `architect/_toolkit/install-layout.md`, `architect/_toolkit/business-layer.md`, `architect/onboarding.md`, `references/onboarding/output-contract.md`, `references/onboarding/modes.md`, `rules/implementation-task-detail.md`, `rules/code-standards.md`. The consumer CLI has no `build` and no `check` subcommand, and neither `init` nor `adopt` writes `prism:*` scripts into a consumer `package.json`. Same defect class as the `init` bug this plan fixes. The attribution idiom from Amendment B is the fix shape for most occurrences; a few (twin line 14) need a substantively different consumer-side claim.

2. **`install-layout.md`'s twin needs re-scoping, not reconciling.** The `## Findings` conclusion: ~70% of retained lines describe PRISM's own build pipeline, so more maintainer content survives than was omitted. Applying Test 3 honestly implies a consumer-framed document — what you receive, how you adopt, how you update, what is yours versus PRISM's. This is a rewrite of shipped auto-loaded agent context and needs a human scope call before anyone starts. It subsumes signal 1 for this file.

3. **The boundary rule has no re-examination pass.** The three tests decide what to omit when copying canonical forward; nothing ever asks whether already-shipping content still passes them. That is the structural reason signal 2 exists and why it will recur in the other eight canonical-newer curated twins. Pairs with the change-parity detector recorded as a mechanism call in the upstream plan — detection catches *new* drift; neither catches content that was wrong when the twin was first curated.

Each is a separate follow-up. Signal 2 is a scope question for the human before it is a ticket.

---

## Sessions

- 2026-07-23 [main] open: Intent — audit the curated `install-layout.md` seed twin against canonical under the three-test boundary and plan the fix for the consumer-visible `init` omission; Bounds — plan file only, no code, no twin edits, no branch; Approach — classify every missing section with its deciding test before proposing any edit, and verify reachability against `package.json#files` and the CLI's own command surface rather than assuming · close: scope held
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — implement the bounded delta fix (tasks 1–7) against the twin and the now-merged canonical boundary section, per Sol dispatch; Bounds — the twin, canonical `install-layout.md`'s boundary section, and this plan file only; do not copy the boundary section into the twin; do not sweep D1/D3 outside the local frame; Approach — apply each task's exact edit verbatim, verify every AC's machine evidence directly, run `pnpm prism:check` as the load-bearing gate · close: scope held — five files changed beyond the plan's literal "three paths" (twin, canonical, plan) are the three platform-copy mirrors, an expected and required side effect of any canonical architect-doc edit, not scope drift; recorded as a Decision
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — self-review the branch for correctness, scope discipline, and the build, confirming no mirror was hand-edited and `pnpm prism:check` passes seed drift; Bounds — review only, no source edits, plan-only commit permitted; Approach — independently re-run the verification gate in an isolated detached worktree, re-check every AC's machine claim, and sweep for rename-completeness gaps the diff wouldn't surface · close: scope held — found one Minor (stale ADR-0059 heading citation), no critical/major; verdict needs-fix
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — fix Briar's Minor finding (stale ADR-0059 heading citation) per Sol dispatch and re-run `pnpm prism:check`; Bounds — the one-line citation fix in canonical ADR-0059 plus the build-regenerated platform mirrors, no other source edits; Approach — apply the exact suggested fix, run `pnpm prism:build` to refresh mirrors, verify idempotence, then `pnpm prism:check` as the load-bearing gate · close: scope held — four files changed (canonical + three mirrors), matching Briar's suggested fix exactly
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — self-review pass 2 (post-fix) covering correctness, scope discipline, and the build per Sol dispatch; Bounds — review only, no source edits, plan-only commit permitted; Approach — independently re-verify every AC's machine evidence against the committed twin/canonical text, confirm the three platform mirrors stay byte-identical to canonical, and re-run `pnpm prism:check` as the load-bearing gate · close: scope held — one new Minor found (malformed clause in canonical's Test 2 tarball/command-surface paragraph), no critical/major; verdict needs-fix
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — self-review pass 3 (post-fix) covering correctness, scope discipline, and the build per Sol dispatch; Bounds — review only, no source edits, plan-only commit permitted; Approach — independently re-run `pnpm prism:check`/`prism:build` from a detached checkout at the branch tip, re-verify the malformed-clause fix and mirror byte-identity, sweep for rename-completeness gaps, and check the PR body against the plan's own attribution record · close: scope held — one new Major found (PR #443's body opener misattributes this follow-up to an unrelated port instead of #429/the seed-twin thread), no critical; verdict needs-fix
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — self-review pass 4 (post-fix) covering correctness, scope discipline, and the build per Sol dispatch; Bounds — review only, no source edits, plan-only commit permitted; Approach — resynced this worktree to the actual PR branch tip (it was stale at main), independently re-ran `pnpm prism:check`/`prism:build` twice for idempotence, verified every twin claim against the real `init.ts`/`adopt.ts`/`cli.ts` source, confirmed heading-set conformance by direct grep, confirmed the three mirrors changed identically to canonical for this PR's own diff hunks, and re-verified the PR #443 body fix · close: scope held — no new findings; verdict done
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — fix Eric's round-2 PR review findings (three Minors, no Major/Critical) and re-run `pnpm prism:check` per Sol dispatch; Bounds — the twin's `.gitignore` clause, `compatibility.md:10`/`:44`, ADR-0044's superseded-in-part banner, and the PR body — no other source edits, no rewriting ADR-0044's Decision/Consequences prose; Approach — apply each suggested fix, fold in the `.agents/` staleness per Eric's own stated preference rather than filing a new issue, verify `pnpm prism:build` idempotence and `pnpm prism:check` as the load-bearing gate, reply inline on the two threads where the fix involved a decision · close: scope held — three findings fixed, six files changed (twin, ADR-0044 canonical + 3 mirrors, compatibility.md), no new issue filed since fold-in was the chosen path
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout] open: Intent — fix Eric's round-3 PR review findings (one Major, one Minor) and re-run `pnpm prism:check` per Sol dispatch; Bounds — `.ai-skills/docs/compatibility.md` lines 3/7/53 and the twin's `.gitignore` sentence at line 63 — no other source edits; Approach — apply each suggested fix verbatim, repost the two round-2 thread replies that had landed as bare scratchpad paths instead of their contents, verify `pnpm prism:build` idempotence and `pnpm prism:check` as the load-bearing gate, reply inline on both new threads · close: scope held — two findings fixed (two files changed, no mirror side effect since neither file is platform-copied), two stale round-2 replies corrected in place via PATCH

---

## History

- 2026-07-23 [main]: Winston audited the `install-layout.md` seed twin — seven missing canonical sections classified as five correct omissions (S1, S4, S5, S6, S7, all Test 3 maintainer content) and two missing in error (S2's init steps, S3 in full), plus four twin-only defects of which two are in scope. Seven tasks, blocked on the upstream skills-ecosystem merge; boundary rule amended twice (Test 2 gains the tarball and the command surface; the attribution idiom named). Recorded the larger finding that the twin retains more maintainer content than it omits — a re-scoping question routed to `## Signals` for a human call; see Decisions.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Clove implemented all seven tasks — renamed the first-contact heading and inserted the `init`/`adopt`/Atlas steps, fixed the retained command forms, inserted the steady-state persona-skill-distribution section, deleted the dangling `docs/` bullet, verified the five correct omissions stayed omitted, and amended canonical's curation-boundary section (Test 2's tarball/command-surface gap, the crossref-lint caveat, the attribution idiom) as it stood post-`#442` merge. `pnpm prism:check` exits 0; build is idempotent. See Decisions for the plan-authoring gap in task 7/AC-6/AC-10's exact-count evidence (platform-mirror side effect and the pre-existing boundary heading), neither a code defect.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Clove fixed Briar's Minor finding — updated canonical ADR-0059's stale heading citation (`§ First-contact adoption: \`prism:adopt\`` → `\`prism init\` then \`prism adopt\``) and ran `pnpm prism:build` to refresh the three platform mirrors. `pnpm prism:check` exits 0 (571/571 tests); rerunning `pnpm prism:build` produced zero further diff.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Briar ran self-review pass 2 — independently re-verified every AC's machine-evidence claim against the committed twin and canonical text, confirmed the three platform mirrors stay byte-identical to canonical (no hand-edit), and re-ran `pnpm prism:check` in the branch's tip (exit 0, build idempotent). One new Minor: a malformed "neither…yet ship in neither" clause in canonical's Test 2 tarball/command-surface paragraph — see Review Issues.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Clove fixed Briar's pass-2 Minor — rephrased canonical's Test 2 tarball clause to the suggested "yet are unshipped in the tarball too" wording and ran `pnpm prism:build` to refresh the three platform mirrors. `pnpm prism:check` exits 0 (571/571 tests, crossref-lint, manifest-coverage, verify-pack-parity).
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Briar ran self-review pass 3 — independently re-ran `pnpm prism:check` and `pnpm prism:build` from a detached checkout at the branch tip (exit 0 both times, 570-571/571 tests, zero diff on rebuild), confirmed the malformed-clause fix landed verbatim and the four mirrors stay byte-identical to canonical, and swept for stale references to the renamed heading (none found). One new Major: PR #443's body opener names an unrelated thread instead of the plan's own specified attribution — see Review Issues.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Clove fixed Briar's pass-3 Major — edited PR #443's body via `gh api` (GitHub PATCH) to open with the plan-specified "Follow-up to `#429` / the seed-twin thread" line, replacing the misattributed thrive#2196/#439 opener. No repo files changed; `pnpm prism:check` re-verified exit 0.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Briar ran self-review pass 4 — independently re-verified `pnpm prism:check` (570/571 tests, crossref-lint, manifest-coverage, pack-parity) and `pnpm prism:build` idempotence (two runs, zero diff), confirmed the three mirrors changed identically to canonical for this PR's diff hunks (no hand-edit), verified twin claims against real CLI source (`init.ts`, `adopt.ts`, `cli.ts` USAGE), confirmed heading-set conformance by direct grep against AC-6/AC-9, and re-verified PR #443's body opener. No new findings.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Clove fixed all six of Eric's PR #443 review findings — filed issue #444 and added the pointer sentence (Major), fixed the verification-caveat wording and the line-number citation (Minors, canonical § Curated seed twins), fixed the twin's "identical skill output" drift, added `--slack-channel` to the Optional flags list (canonical + twin), and corrected the stale `.agents/` Phase-2 claim to match the shipped repo-relative behavior (canonical + twin). `pnpm prism:build` is idempotent; `pnpm prism:check` exits 0 (571/571 tests). Replied on the Major and `.agents/` threads explaining the decisions taken; spawned a follow-up task for the identical `.agents/` staleness in `compatibility.md`/ADR-0044 (out of this PR's diff).
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Clove fixed Eric's round-2 PR review findings (three Minors, no Major/Critical) — twin's `.gitignore` claim converted to an actionable instruction, `compatibility.md:10`/`:44` corrected to match the shipped repo-relative `.agents/` behavior (folded in rather than left as a session chip), ADR-0044 given a second `Superseded-in-part-by: ADR-0062` banner paragraph following its existing ADR-0058 convention, and the PR body's overclaiming bullet qualified with the `#444` pointer. `pnpm prism:build` idempotent (six files, zero further diff); `pnpm prism:check` exits 0 (571/571 tests). Replied inline on both Minor threads with the reasoning.
- 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]: Clove fixed Eric's round-3 PR review findings — `compatibility.md` § Install-Script Scope no longer contradicts the `.agents/` correction nine lines above it (no PRISM destination is currently outside the repo; two framing echoes at lines 3/7 dropped too), and the twin's `.gitignore` sentence split so the "not because population is unshipped" contrast lands against the clause it's actually contrasting with. Also corrected two round-2 thread replies that had landed as bare scratchpad file paths instead of their contents (PATCHed in place with the original drafted text). `pnpm prism:build` idempotent (two files, zero further diff); `pnpm prism:check` exits 0 (571/571 tests, crossref-lint, manifest-coverage, pack-parity). Replied inline on both new threads.

---

## Debugged Issues

---

## Review Issues

### Stale ADR-0059 heading citation after the first-contact rename

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/_toolkit/0059-first-contact-adopts-via-seed-and-sync.md:41`
- **Problem:** Task 1 renamed the twin's heading from `## First-contact adoption: \`prism:adopt\`` to `## First-contact adoption: \`prism init\` then \`prism adopt\``. ADR-0059 cites the old heading verbatim (`§ First-contact adoption: \`prism:adopt\`.`) as a pointer into `install-layout.md`; that citation is now a dangling reference to a heading that no longer exists. Per `code-standards.md` § Removal and rename completeness, the diff alone doesn't surface this — the ADR is a file the rename never opened, and `crossref-lint` doesn't check prose heading citations, only path-shaped references (confirmed clean on this branch). Three platform mirrors of the ADR (`.claude/`, `.codex/`, `.cursor/spec/adrs/_toolkit/0059-*.md`) carry the same stale text and will self-correct once canonical is fixed and rebuilt.
- **Suggested fix:** Update canonical `.prism/spec/adrs/_toolkit/0059-first-contact-adopts-via-seed-and-sync.md:41` to cite the new heading text, then `pnpm prism:build` to refresh the three platform mirrors.
- **Fixed in:** canonical citation updated to `§ First-contact adoption: \`prism init\` then \`prism adopt\`.`; `pnpm prism:build` regenerated the three platform mirrors (four files changed total). `pnpm prism:check` exit 0 (571/571 tests, crossref-lint, manifest-coverage, verify-pack-parity); rerunning `pnpm prism:build` produced zero further diff.

No critical or major issues. Everything else checked out: `pnpm run prism:check` (571/571 tests, crossref-lint, manifest-coverage, verify-pack-parity) passes clean in an isolated worktree at this branch's tip; `pnpm run prism:build` is idempotent (zero diff on rerun, confirming the `.claude`/`.codex`/`.cursor` architect-doc mirrors are build-generated, not hand-edited — their divergence from canonical is expected dogfood token-substitution, not drift); every AC-1–AC-10 machine claim re-verified independently (init/adopt ordering, dangling `docs/` bullet removed, five correct omissions still absent, zero Linear/ticket literals, S3 verbatim-copy with only the documented in-scope command-form fixes). AC-11 remains open pending a human cold-read, as the plan already notes. The one Minor (stale ADR-0059 heading citation) is fixed — see Review Issues.

### Malformed sentence in Test 2's new tarball/command-surface paragraph

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:236` (and its byte-identical `.claude/`, `.codex/`, `.cursor/` mirrors)
- **Problem:** "`scripts/ai-skills/**` and `docs/**` appear in neither the seed tree nor the seed-curation manifest, yet ship in neither the tarball" pairs "neither" with a single item (the tarball) instead of the paired "neither…nor" construction the rest of the sentence uses — the clause doesn't parse as clean English, though the intended meaning (they're unshipped in the tarball too) is still recoverable from context.
- **Suggested fix:** Rephrase to something like "…yet are unshipped in the tarball too, so a reference into them is exactly as dangling as an unreachable ADR citation." Edit canonical only — the platform mirrors regenerate from it via `pnpm prism:build` on the next build pass; do not hand-edit the mirrors.
- **Fixed in:** canonical rephrased exactly as suggested; `pnpm prism:build` regenerated the three platform mirrors (four files changed total). `pnpm prism:check` exit 0 (571/571 tests, crossref-lint, manifest-coverage, verify-pack-parity).

Pass 2 (post-ADR-0059-fix) re-verified every AC-1–AC-10 machine claim independently against the current committed twin and canonical text (init/adopt heading and ordering, command-form fixes, steady-state section content and its Test 2 drops, dangling-docs deletion, the five correct omissions still absent, zero Linear/ticket-literal/ADR/`docs/content`/`prism-242` references in the twin), confirmed the three platform mirrors stay byte-identical to canonical (`pnpm prism:check` reports "Generated outputs are in sync" — no hand-edit), and re-ran the full `pnpm prism:check` gate clean (571/571 tests, crossref-lint, manifest-coverage, verify-pack-parity). One new Minor found, above — a prose-only defect with no functional or test impact. AC-11 remains open pending a human cold-read.

### PR #443 body opener misattributes this follow-up's origin

- **Severity:** `major`
- **Status:** `fixed`
- **File:** PR #443 description (GitHub, not a repo file)
- **Problem:** This plan's own `## Ticket` section (line 8) specifies the PR body opener as `Follow-up to #429 / the seed-twin thread. No new ticket per .prism/rules/followup-scope.md.` — #429 is the seed-twin skills-ecosystem lane this plan is item 1 of (per `.prism/plans/followup-seed-twin-skills-ecosystem.md` § Signals, whose own PR body opener correctly reads "Follow-up to #429"). The shipped PR #443 body instead opened with "Follow-up to the thrive#2196 worktree-lifecycle port (PR #439)" — a completely unrelated piece of work (git log: `b441d6e chore: Port thrive PR 2196 — Worktree lifecycle + removal classifier (`#439`)`). This misattributed the follow-up's lineage in the permanent merge record and contradicted both the plan's explicit instruction and `followup-scope.md`'s traceability requirement ("cites the specific decision... that produced it").
- **Suggested fix:** Edit PR #443's body (`gh pr edit 443 --body ...`) to open with the plan-specified line: "Follow-up to `#429` / the seed-twin thread. No new ticket per `.prism/rules/followup-scope.md`." Keep the rest of the existing Summary/Test plan content, which is otherwise accurate.
- **Fixed in:** PR #443's body opener replaced with the plan-specified line via the GitHub API (`gh pr edit` errored on an unrelated Projects-classic GraphQL deprecation, so the edit went through `gh api repos/huntermcgrew/PRISM/pulls/443 -X PATCH`); rest of the Summary/Test plan content unchanged. Verified the live body now opens with "Follow-up to `#429` / the seed-twin thread."

No issues found — 2026-07-24 [huntermcgrew/prism-followup-seed-twin-install-layout]. Pass 4 independently re-ran every machine gate from a resynced worktree (this worktree's checkout was stale at `main`'s tip before the review started, corrected via `git reset --hard` against the PR branch since it carried no unique work): `pnpm prism:check` (570/571 tests, crossref-lint, manifest-coverage, pack-parity, all clean), `pnpm prism:build` run twice with zero diff on the second run, confirmed the three platform mirrors changed identically to canonical within this PR's own diff hunks (the byte-level differences found elsewhere in the files are pre-existing dogfooding token substitution on lines this PR never touched), verified every twin claim about `init`/`adopt` behavior against the real `scripts/ai-skills/init.ts`/`adopt.ts`/`cli.ts` source, re-confirmed heading-set conformance (S1/S4/S5/S6/S7 absent, the two in-scope headings present, the boundary section correctly not copied into the twin) by direct grep, confirmed `install-layout.md` is `curated` in `seed-curation.json` so the twin/canonical divergence is intentional, and re-verified PR #443's body opener is still the plan-specified attribution line. No new findings.

### Eric's PR #443 review findings

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:237` (§ Curated seed twins: the curation boundary, Test 2)
- **Problem:** The PR authors the Test 2 command-reachability rule in the same commit as a worked-example file (this file's own twin) that violates it 15 times, with no signal anywhere that the deferral is intentional — a future editor sees a clean rule with no pointer to the known-outstanding gap.
- **Suggested fix:** Land a one-line pointer to a filed follow-up issue right after the paragraph naming the command-surface authority.
- **Fixed in:** Filed [issue #444](https://github.com/HunterMcGrew/PRISM/issues/444) (scoped to the Test 2 command-reachability backlog across curated twins — distinct from #441's detector work) and added the pointer sentence after canonical line 237. Twin's 15 occurrences stay deferred to #444 per the plan's own `## Signals` reasoning — unchanged.

### Eric's Minor: verification-caveat wording overstates a gate that doesn't exist

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:239`
- **Problem:** "That class is checked by grep against `package.json#files`, not by lint" reads as a gate that runs somewhere. No runner exists — `verify-pack-parity.ts` checks the opposite direction (runtime-read paths present in the tarball), not that prose references resolve within it.
- **Suggested fix:** State the absence plainly: caught only by manual grep, no gate covers it today.
- **Fixed in:** Rephrased to "That class is caught only by grepping seed content against `package.json#files` by hand — no gate covers it today."

### Eric's Minor: line-number citation into a file this PR shifted

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:245`
- **Problem:** Cited twin lines 59/66/70 as the attribution-idiom worked examples — correct at time of writing, but any future edit above line 70 silently invalidates the citation, and nothing lints this file's reference classes.
- **Suggested fix:** Cite stable section headings instead of line numbers.
- **Fixed in:** Replaced with "§ Direct-write tool outputs and § The templates/install seed surface in `templates/install/.prism/architect/_toolkit/install-layout.md` are the worked examples" — verified both cited headings actually contain the three attribution-idiom instances (twin lines 59, 66 in § Direct-write tool outputs; line 70 in § The templates/install seed surface).

### Eric's Minor: twin drops a citation but adds a claim canonical never makes

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/install-layout.md:101`
- **Problem:** Twin's "so `adopt` and `update` produce identical skill output" is true but twin-only — canonical says "without duplication," never "identical skill output." A true-and-twin-only sentence is the worst kind for drift: it reads as intentional, so it survives, and canonical never gains it.
- **Suggested fix:** Minimum edit removing the unreachable plan-citation: "Both entry points reach the same render step without duplication."
- **Fixed in:** Applied exactly as suggested.

### Eric's Minor: `--slack-channel` missing from `init`'s Optional flags list

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:92` (inherited identically in the twin)
- **Problem:** `--slack-channel` is a real optional flag (`init.ts:178`, `onboarding-config.ts:217`) missing from the Optional flags list, which reads as exhaustive.
- **Suggested fix:** Fix upstream in canonical first, then mirror — the twin's line is faithful to canonical's (now-stale) list.
- **Fixed in:** Added to canonical's Optional flags list; twin's identical line updated to match.

### Eric's Minor: steady-state section contradicts twin line 63 on whether `.agents/` is populated

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:67` (root; twin's identical line inherited the same staleness)
- **Problem:** Line 67 claims `.agents/` is an outside-the-repo, per-user destination awaiting a not-yet-shipped Phase-2 install script. The newly-added § Steady-state persona-skill distribution section (~40 lines below, same file) says the opposite: every `prism update` renders `.agents/skills/<id>/SKILL.md` today. Both are correct about *something* — line 67 describes ADR-0044's original `~/.agents/skills/` (home-directory) plan; the steady-state section describes what ADR-0062 actually shipped (a repo-relative `.agents/skills/`, confirmed via `git check-ignore -v` resolving against this repo's own gitignored dogfood copy) — but only one of them is true of the file the consumer is holding.
- **Fixed in:** Rewrote line 67 to state the current, shipped behavior (repo-relative `.agents/skills/`, populated by every `prism adopt`/`prism update`, gitignored as machine-local output rather than as unshipped) and cross-reference the steady-state section. Mirrored into the twin (dropping the ADR-0062 citation per Test 2 — numbered ADRs don't ship to consumers). `.ai-skills/docs/compatibility.md` and ADR-0044 carry the identical stale claim but are outside this PR's diff — flagged as a follow-up (spawned task, not filed as a ticket per `followup-scope.md`'s file-overlap signal). **Superseded by round 2 below** — Eric's round-2 review found no open issue covered the deferral, so it was folded in rather than left as a session chip.

### Eric's round-2 Minor: twin's `.gitignore` claim unverifiable in a consumer repo

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/install-layout.md:63`
- **Problem:** "It stays gitignored as machine-local output" is true of PRISM's own monorepo (`.gitignore:7`) but nothing PRISM ships makes it true for a consumer — `adopt.ts`/`update.ts`/`init.ts` never touch `.gitignore`, and `templates/install/` ships no `.gitignore` of its own. A Codex consumer gets the rendered roster written into a tracked working tree.
- **Suggested fix:** Convert the unverifiable claim into an actionable instruction — "…and belongs in your `.gitignore` as machine-local output (PRISM does not write your `.gitignore`; the render is regenerated on every `prism update`)."
- **Fixed in:** Applied close to verbatim. Canonical line 67 is untouched — accurate as written, since it describes this repo's own `.gitignore:7`, not a consumer's; the twin genuinely needed different wording here, not a drift correction.

### Eric's round-2 Minor: corrected `.agents/` bullet cites two documents that still say the opposite

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/docs/compatibility.md:10`, `:44`; `.prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md:28`
- **Problem:** Canonical's corrected `.agents/` bullet (line 63) names `.ai-skills/docs/compatibility.md` § Per-Tool Directory Ownership and ADR-0044 as its own authorities — both still carry the pre-correction claim that `.agents/skills/` is a home-relative, outside-the-repo destination (`~/.agents/skills/`). The round-1 fix deferred this as a spawned session task rather than a durable record.
- **Suggested fix:** Fold in (walking `followup-scope.md`'s four signals: subject-matter adjacency, size, and persona alignment all say same-scope; only file overlap says splits — one signal isn't the two the rule requires for a new ticket).
- **Fixed in:** `compatibility.md:10` and `:44` corrected to state the shipped repo-relative behavior, matching canonical's corrected bullet. `compatibility.md:53` left untouched — genuinely correct, describes the still-unshipped home-relative Phase-2 destination, a different thing. ADR-0044 is a historical decision record, not rewritten in place; instead extended its existing `Superseded-in-part-by` convention (already used for ADR-0058's paired-doc retirement on this same file) to add `ADR-0062`, with a second banner paragraph naming exactly what's retired (the `.agents/` destination claim) and what replaces it. The Decision/Consequences prose stays as the as-written historical record.

### Eric's round-2 Minor: PR body's "Fixed retained command forms" overclaims

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** PR #443 description (GitHub, not a repo file)
- **Problem:** The body's bullet reads as complete, but the fix landed only in the first-contact section (3 of 14 unreachable-command occurrences); issue #444 tracks the rest. Under squash-merge this body becomes the permanent commit message.
- **Suggested fix:** Add a trailing qualifier: "(in the first-contact section; the rest are tracked in #444)."
- **Fixed in:** Applied via `gh api` PATCH — "in the first-contact section; the rest of the file's unreachable-command occurrences are tracked in #444."

### Eric's round-3 Major: `compatibility.md` § Install-Script Scope still contradicts the round-2 `.agents/` correction

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/docs/compatibility.md:53` (§ Install-Script Scope), also lines 3 and 7
- **Problem:** Line 53 called `~/.agents/skills/` "The Codex per-user skills root" and told Codex consumers to hand-wire it themselves — the opposite of round-2's own correction nine lines above (line 44: `.agents/skills/` is repo-relative and populated by every `prism adopt`/`prism update`). No code backs the home-relative destination (`grep -rn "homedir\|~/.agents\|~/.codex" scripts/ai-skills/*.ts` → nothing; no `install-codex` script; `codexAgentsRoot` is repo-relative), and canonical `install-layout.md:70` cites this exact section by name as "the full reasoning" three lines under the corrected bullet — the same citation-chain failure this whole PR exists to fix, reintroduced one hop out. The round-2 plan entry recorded leaving line 53 as deliberate ("describes the still-unshipped home-relative Phase-2 destination, a different thing"); that reasoning doesn't survive the last sentence's hand-wire instruction.
- **Suggested fix:** Eric's suggested replacement bullet, plus dropping "which destinations need install scripts" from the doc summary (line 3) and "plus Codex's per-user installation" from the § Runtime Expectations lead-in (line 7) — both carry the same stale framing.
- **Fixed in:** Applied Eric's suggested bullet verbatim at line 53 ("No PRISM destination is currently outside the repo... retained for future tool integrations whose destination genuinely lives outside the repo") and both framing drops. `docs/ai-skills/compatibility.md` and `docs/ai-skills/syncing.md` carry the identical stale claim but are separate narrative docs outside this PR's diff — flagged as a follow-up signal, not swept in.

### Eric's round-3 Minor: twin's `.gitignore` sentence has a dangling em-dash contrast

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/install-layout.md:63`
- **Problem:** The round-2 reframe (claim → instruction) was correct, but the inserted em-dash aside sat between "as machine-local output" and the "not because population is unshipped" contrast, leaving the trailing clause read as dangling off `prism update` on first pass.
- **Suggested fix:** Split the aside into its own sentence so the contrast stays adjacent to what it contrasts with.
- **Fixed in:** Applied verbatim: "It belongs in your `.gitignore` as machine-local output, not because population is unshipped. PRISM does not write your `.gitignore` for you, and the render regenerates on every `prism update`."

### Two round-2 thread replies posted as bare scratchpad paths instead of their contents

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** PR #443 review threads (GitHub, not a repo file)
- **Problem:** The `.gitignore` thread reply and the ADR-0044 thread reply were each posted as a literal `@/private/tmp/.../reply-*.md` string — `-f body=@file` sends the string, `-F body=@file` reads the file. The reasoning behind both decisions was invisible to anyone reading the PR.
- **Fixed in:** PATCHed both comments in place with their originally-drafted content (`gh api ... -F body=@file`, not `-f`).

## PR Readiness

- [x] No critical or major issues (two Minors fixed pre-review — stale ADR-0059 heading citation, malformed Test 2 clause; one Major fixed pre-review — PR #443 body opener misattribution; Eric's round-1 PR review found one Major + five Minors, all fixed; Eric's round-2 re-review found three new Minors, no Major/Critical, all fixed; Eric's round-3 re-review found one new Major + one new Minor, both fixed — see Review Issues)
- [x] `pnpm run prism:check` passes (seed literal guard + path guard) — independently re-verified 2026-07-24 (pass 2, pass 3 from a detached checkout, post-round-1-fixes, post-round-2-fixes, and again post-round-3-fixes)
- [x] `pnpm run prism:crossref-lint` passes
- [x] `pnpm run prism:check-types` passes
- [x] `pnpm run prism:test` passes
- [x] `pnpm run prism:build` passes and produces no unexpected diff (idempotent after round-3 fixes: `.ai-skills/docs/compatibility.md` and the twin — two files, zero further diff on a second run; neither file is platform-copied so no mirror side effect this round)
- [x] PR description up to date — opens with the follow-up attribution line; "Fixed retained command forms" bullet qualified per round-2 fix
- [x] Lasting decisions promoted to architect context (task 6)
- [x] Upstream `followup-seed-twin-skills-ecosystem` PR merged before implementation started (`49a489d`, #442)
- [x] Eric's PR review findings addressed — round 1 (one Major, five Minors), round 2 (three Minors), and round 3 (one Major, one Minor), all fixed; issue #444 filed for the deferred command-reachability backlog; two round-2 thread replies corrected from bare scratchpad paths to their actual content

**Last updated:** 2026-07-24 [Clove — Eric's round-3 PR review findings fixed]
