# Analysis: curated-seed-twin boundary rule — pressure test

> Analysis artifact, not an implementation plan. No `## Implementation Tasks` by design — the deliverable is a verdict on the rule, and the fix sequencing it implies.

## Ticket

None. Pressure-test dispatched before any further twin is fixed against the boundary rule, per the seed-twin thread (`.prism/plans/followup-seed-twin-skills-ecosystem.md`, `.prism/plans/followup-seed-twin-install-layout.md`).

---

## Goal

Dry-run the amended curation boundary against every remaining canonical-newer curated twin plus a control sample, and answer whether the rule holds, needs a third amendment, or has a scope hole no rule closes.

---

## Verdict up front

**The rule did not hold.** Two more amendments, on top of the two already recorded — and the count is itself the finding. Five amendments across three files is not a rule meeting exotic edge cases; it is a rule that was derived from one file's evidence and generalized too early.

The sharper finding is upstream of any amendment: **the boundary rule re-derives a decision an accepted ADR already made, and comes out narrower than it.** ADR-0064 § "ADR references split into two lanes" authorizes genericizing illustrative examples; the boundary rule's "subtraction and tokenization only" forbids it. The in-flight lane is about to land that contradiction on the architect surface. It is cheap to fix and it should be fixed before that PR merges — see `## Defects in the in-flight plan`.

What survived unchanged: **Test 3.** Every subject-matter call across twelve files decided cleanly, including four the audit expected to be hard. Test 3 is the load-bearing test and it is sound.

---

## Scope correction — eight remaining, not seven, and the date signal is unsound

Recomputed from `git log -1 --format=%cs` on each `curated` pair. Nine entries have a canonical partner with a newer last-commit date:

`rules/branch-plan.md`, `rules/skill-routing.md`, `references/architect-context.md`, `references/micro-file-step-machine.md`, `references/review-docs-impact.md`, `architect/_toolkit/documentation.md`, `architect/_toolkit/install-layout.md`, `templates/bug-report.md`, `spec/adrs/_toolkit/README.md`.

Minus `install-layout.md` (already planned) leaves **eight**, not seven. `skills-ecosystem.md` is not in the nine at all — its twin is *newer* than canonical because #429 touched it, which is the recency-reset the upstream plan already named.

More importantly, the date signal missed a stale file entirely. **`rules/implementation-task-detail.md` has identical last-commit dates on both sides (2026-07-20) and is materially stale** — the twin is missing the whole `[HITL]` mechanic (canonical line 56 and the entire `### When to apply [HITL]` section, lines 60–72). It was picked up here only because it was pulled as a *control*. Any detector keyed on recency misses it, which is a third independent miss to add to the two the upstream plan already recorded.

---

## Per-file verdicts

The rule under test: the three ordered tests from `followup-seed-twin-skills-ecosystem.md` § The curation boundary, plus Amendment A (Test 2's third authority — `package.json#files` — and its extension to commands) and Amendment B (the attribute-to-PRISM idiom).

Verdict key: **CLEAN** — the rule decides every difference and certifies the twin correct as-is. **DECIDED** — the rule decides every difference; the twin is stale and the fix is mechanical. **GAP** — at least one difference falls outside all three tests or lands ambiguously between them.

| File | Verdict | Summary |
| --- | --- | --- |
| `references/architect-context.md` | **DECIDED** | Twin missing array-valued manifest support (canonical lines 13, 21). No tokens, no references, no maintainer content. Straight copy-forward. |
| `templates/bug-report.md` | **DECIDED** | Twin missing `## Confidence`, the evidence-grade inline tag, and `## Refuted Hypotheses`. Sole reference (`branch-plan.md § Debugged Issues`) ships. Straight copy-forward. |
| `references/micro-file-step-machine.md` | **GAP** (minor) | Twin missing the lighter/full variant sections and two roster bullets. All personas named ship; `.prism/<persona>-state.json` is runtime-created and exempt. **The gap:** canonical's Iris bullet reads `(Wave 2 PR 5, retrospective persona)` — a reference to PRISM's own development history. Not a path (Test 2 has no target to resolve), not build/publish content (Test 3's enumeration doesn't reach it). Falls through all three. See Amendment C.3. |
| `rules/skill-routing.md` | **DECIDED, coupled** | Twin missing only the plan-only-commit exception paragraph (canonical 83–84). Decides cleanly. **But it is one half of a two-file change** — see `branch-plan.md` below. Neither file's diff reveals the coupling. |
| `rules/branch-plan.md` | **GAP** (material) | Twin missing `## Landing a plan-only commit` (canonical 164–179) — the other half of the skill-routing change. Three gaps in one file: (a) the section's `**Why:**` cites "the 2026-07-20 run" and the conductor-as-lander rejection — PRISM's own incident record, falls through all three tests; (b) canonical line 135's `THR-1775 audit` ships as `An early-Phase audit` in the twin — **gate-forced**, not judgment (see Amendment C.1); (c) canonical line 197's `Sol auto-dispatches Iris` ships as `the orchestrator auto-dispatches the retro persona`. |
| `spec/adrs/_toolkit/README.md` | **GAP** (material) | Twin correctly drops the 40-row ADR index (Tests 2 and 3 agree). **The gap:** canonical lines 54–55 cite `AGENTS.md § 0` and `ADR-0003` concretely; the twin ships `A skill file or rule has a one-line summary ... (e.g. \`See ADR-NNNN for...\`)`. That is neither subtraction nor tokenization — it is **genericization**, which the rule forbids and ADR-0064 authorizes. See Amendment D. |
| `architect/_toolkit/documentation.md` | **GAP** (material) | Canonical's two extra crossref rows point at `scripts/ai-skills/*.ts` and `docs/adopting-into-existing-repos.md` — correct omission, decided by Amendment A. **The gap:** the twin's Cross-Reference Map is not canonical's table minus rows. It is a two-row generic template using `${documentation.location}`, wrapped in explanatory prose (`The map is per-team and lives at the bottom of this file once your team's docs are populated`) that **exists nowhere in canonical**. Twin-only authored content, in direct violation of "direction of flow is always canonical → twin." |
| `references/review-docs-impact.md` | **GAP** (material) | Twin carries the retired two-audience model (`docs/user/`, `docs/dev/`); canonical moved to flat `docs/` under ADR-0058. **The gap is that neither text is correct for a consumer.** Canonical's `docs/` is PRISM's own rendered `documentation.location`, not a universal convention — it passes Tests 2 and 3 and *looks* generic, so a verbatim copy silently ships PRISM's doc layout as the consumer's. The twin's own sibling (`documentation.md`) already uses `${documentation.location}` for exactly this. See Amendment C.2. |

### Control sample — twins not flagged as suspect

The rule has to certify a correct twin as correct. Three of four did.

| File | Verdict | Summary |
| --- | --- | --- |
| `rules/architect-doc-verification.md` | **CLEAN** | Identical dates, identical line counts, one differing line. Twin drops the `ADR-0023` link and de-identifies `THR-1775 ... PR #1925` to `An early-Phase architect doc ... the PR`. Both correct; both gate-forced. The rule + the two gates certify this twin correct with no residue. This is the shape a settled twin should have. |
| `references/worktree-mode.md` | **CLEAN** | Differs by one character — canonical carries a curly apostrophe (U+2019) in `each other's`, the twin an ASCII one. Zero semantic content. Worth recording only because it means **no future parity check can assume byte-equality even on a fully-current twin**; the comparison has to normalize. |
| `references/architect/plan-mode.md`, `architect/_toolkit/qa-test-planning.md` | **CLEAN** (by inspection) | Twin newer than canonical; no canonical-side delta pending. Not diffed in depth. |
| `rules/implementation-task-detail.md` | **GAP** — and a false negative | Not flagged by any signal; materially stale (missing the entire `[HITL]` mechanic). Twin also genericizes both worked examples (`ADR-0029` → `writing-voice.md`) and drops the Pocock attribution note — the latter **gate-forced**, because that paragraph contains `Linear/GitHub` and `\bLinear\b` fails the seed guard. Separately: both surfaces cite `templates/claude/rules/writing-voice.md`, and **`templates/claude/` does not exist** — a dangling reference on canonical as well as the twin, inside a blockquote where `crossref-lint` doesn't see it. |

---

## Amendment C — Test 1 needs an authority and two more treatments

Test 1 as promoted reads: *values specific to one install (repo, org, tracker, default branch) ship as `${TOKEN}` literals*. That covers values which **have a token**. Three classes found across five files do not, and the twins already handle all three — by instinct, and in one case under threat of a red build.

Note the asymmetry this exposes: after Amendment A, Test 2 has three authorities (`seed-curation.json`, the seed tree, `package.json#files`) and a named command surface. Test 1 has none. "Is this value install-specific?" is currently a judgment call where it could be a lookup.

**C.1 — Guarded literals with no token: de-identify.** `SEED_DOGFOODING_PATTERN` (`scripts/ai-skills/literal-guard.ts:48-49`) fails the build if `Thrive`, `TracTru`, `THR-*`, `thrive.*`, `PRISM-NNN`, `de-thriving`, or `\bLinear\b` reaches the seed. There is no `${TOKEN}` for "the incident that motivated this rule." The practiced treatment is de-identification: `THR-1775 audit` → `an early-Phase audit` (`architect-doc-verification.md:11`, `branch-plan.md:135`), and outright dropping where the sentence can't survive it (`implementation-task-detail.md`'s Pocock note, which contains `Linear/GitHub`). **A curator who follows the rule as written and copies canonical verbatim gets a red build.** That alone makes this non-optional.

The guard's own doc comment is also the authority for a question the rule leaves open: `Sol`, `Iris`, and `ADR-NNNN` are *deliberately absent* from the pattern — "legitimate framework content that ships to consumers." That settles the `branch-plan.md:197` case against the twin (see `## The twins contradict each other` below) and independently confirms the in-flight lane's task 3.

**C.2 — PRISM's own rendered values that look generic: generalize to the config key.** `docs/` is PRISM's `documentation.location`, not a convention. It passes Tests 2 and 3 and reads as neutral, which is exactly why it slips through. `.ai-skills/config.schema.json:158` carries `documentation.location`, `audience`, and `keepsDevDocs` — **the config schema's key set is Test 1's authority**, the same way `seed-curation.json` and `package.json#files` are Test 2's. If a canonical value corresponds to a config key, it is install-specific no matter how generic it looks.

**C.3 — PRISM's own provenance references: drop or de-identify.** `Pocock's to-issues skill`, `Wave 2 PR 5`, `the 2026-07-20 run`, `epic-phase-1-foundation.md tasks 13–19`, `PR #1925`. Not paths — Test 2 has no target to resolve. Not build/publish content — Test 3's enumeration (npm packaging, `scripts/ai-skills/**`, `dist/cli.js`, the release ritual, the literal guards) doesn't reach a PR number or a wave name. They fall through all three tests, and the twins drop them consistently and correctly, with nothing sanctioning it.

**The amendment:** Test 1 widens from *identifier tokenization* to **identifier and provenance neutralization**, with two authorities (`config.schema.json` key set; `SEED_DOGFOODING_PATTERN` plus `literal-allowlist.json`) and three treatments — tokenize when a token exists, de-identify when a gate forbids the literal, generalize when the value is PRISM's own rendered instance of a per-team setting.

---

## Amendment D — the transformation set is four, not two, and ADR-0064 is the upstream authority

The rule states: *curation is subtraction and tokenization only — never paraphrase-for-its-own-sake*. The twins practice four transformations, and two of them are already ratified elsewhere:

1. **Subtraction** — rule-sanctioned.
2. **Tokenization** — rule-sanctioned (widened by Amendment C).
3. **Attribution to PRISM** — Amendment B, named from the install-layout twin's practice at lines 59, 66, 70.
4. **Genericization** — replacing a PRISM-specific instance with a placeholder of the same kind so the *instruction* survives. `AGENTS.md § 0` + `ADR-0003` → `A skill file or rule ... (e.g. \`See ADR-NNNN for...\`)` (`spec/adrs/_toolkit/README.md:54-55`). `ADR-0029` → `writing-voice.md` in both worked examples (`implementation-task-detail.md:61-67`). A concrete PRISM table replaced by a two-row `${documentation.location}` template (`documentation.md:111-116`).

Genericization is not subtraction and not tokenization, so the rule as written forbids it. **ADR-0064 explicitly authorizes it:** "Illustrative example — the ADR number is a *sample of the citation form*, not a link to follow ... Genericize the PRISM-specific number/topic, keep the instruction. Mechanical; no distillation." ADR-0064 also already owns the ADR half of Test 2 (item 1: every ADR is born `excluded`; item 4: `runInstallAdrGate` in `crossref-lint.ts:871` forbids any `ADR-NNNN` under `templates/install/`).

**The amendment is therefore two-part, and the second part matters more than the first:** the transformation set gains genericization, *and* the boundary section cites ADR-0064 as its upstream authority rather than re-deriving it. Two independent records of one rule is precisely the drift this rule exists to prevent — and this instance already produced a contradiction on its first meeting.

One residue worth recording: `documentation.md`'s twin goes past genericization into **authored twin-only prose**. That is a fifth thing, and it should not be sanctioned — it is the `renames` pattern (`SPEC.md` → `SPEC.md.tmpl`, `manifest.json` → `manifest.stub.json`) leaking into a `curated` file. If a twin genuinely needs to be a consumer-facing template rather than a curated subset, the honest mechanism is a rename entry, not silent divergence inside `curated`.

---

## The twins contradict each other, and the rule resolves it

`branch-plan.md`'s twin de-names PRISM personas: canonical's `Under Sol the retro *is* involuntary — Sol auto-dispatches Iris at run close` ships as `Under an orchestrated run ... the orchestrator auto-dispatches the retro persona`.

The in-flight lane's **task 3 does the exact opposite** on the same words — changing `skills-ecosystem.md`'s twin from `outside an orchestrated run` to `outside a Sol run`.

Two shipped files, opposite conventions on the same concept. The rule resolves it, and task 3 is on the right side: `literal-guard.ts:39-42` states in terms that `Sol` and `Iris` are deliberately un-guarded because they are framework content that ships. So `branch-plan.md`'s de-naming is unsanctioned paraphrase — the very thing the rule's own second Decision condemns — and it must be reverted to canonical's wording when that twin is fixed.

This is the rule working. It is also the rule's scope hole in one frame: nothing would ever have surfaced that contradiction, because both files pass every gate and neither one's delta touches the other's.

---

## The structural question — does the rule need a fourth test, a duty, or something else?

**Neither. The honest answer is that no rule closes this, and the detector as currently scoped doesn't close it either.**

The reasoning, plainly:

**A fourth test cannot work, by construction.** The three tests are applied by whoever is copying content forward. If nobody is copying, no test fires — a fifth test, a tenth test, all of them fire exactly as often as the first three, which is: only on the delta. The hole is *when the rule runs*, not *what it asks*. Adding a test to fix a scope problem is a category error.

**A periodic re-examination duty is weak in a predictable way.** "Someone should re-read every twin against the boundary sometimes" is a rule with no trigger, no owner, and no failure state. PRISM has the right shape for this already — Zoe, the cadence-driven audit persona — and extending her auditable surface to the seed twins is cheaper than tooling and would have found `implementation-task-detail.md`. But a duty produces a finding only when someone invokes it, and the twins that most need it are the ones nobody is thinking about. It is a real improvement and an insufficient one.

**The change-parity detector (#441) does not close it either, and this audit adds a third proof.** It catches "canonical moved, twin didn't." It does not catch (a) content that was wrong when the twin was first curated — `install-layout.md`'s ~70% retained maintainer content is the standing example; (b) drift whose recency signal was reset by a partial sweep — #429 on `skills-ecosystem.md`; and now (c) **drift where both sides carry identical commit dates** — `implementation-task-detail.md`, which no recency comparison of any kind will flag.

What actually closes the gap is two things, and only one of them is tooling:

1. **A date-independent structural comparison.** The detector rescoped off recency entirely: compare heading sets and reference classes between each pair, on every build, and report the delta. Heading-set conformance is already the shape the in-flight plan's AC-6 and the install-layout plan's AC-6 use as their acceptance criterion — it works, it is cheap, and it has no date dependency. `implementation-task-detail.md` fails a heading-set comparison instantly. Note the normalization requirement from the `worktree-mode.md` control: even a fully-current twin is not byte-identical.

2. **A recorded per-file classification, written once per twin.** The install-layout plan's S1–S7 table is the model: every canonical section absent from the twin, classified correct-omission or missing-in-error, with the deciding test named. Once that table exists, "this content is already shipping and nobody re-reads it" stops being an invisible default and becomes a reviewable claim — the next editor diffs against the table rather than against canonical's history, and a correct omission stops looking like a defect to be "fixed" back in. This is the part a rule *can* carry: not a duty to re-examine, but a requirement that the examination leave a durable artifact.

The rule should say all of this about itself. A rule that names its own limit — "these tests govern the delta being copied forward and nothing else; already-shipping content is out of their reach by construction, and is covered by the per-file classification table plus the structural detector" — is more useful than one that reads as complete and quietly isn't. That sentence is the single highest-value line to add to the boundary section.

---

## Individually or swept?

**Swept, in one PR, after the rule settles — with two files pulled out and one file added.**

Sweep together (six): `architect-context.md`, `bug-report.md`, `micro-file-step-machine.md`, `branch-plan.md`, `skill-routing.md`, `spec/adrs/_toolkit/README.md`, plus **`implementation-task-detail.md`**, which no signal flagged and which belongs in the sweep on the evidence above.

Three reasons:

1. **`branch-plan.md` and `skill-routing.md` are one canonical change landing in two twins.** Fixed in separate PRs, the intermediate state ships a `skill-routing.md` twin pointing at `branch-plan.md § Landing a plan-only commit` — a section that does not exist in the twin. The coupling is invisible from either file's diff. Cross-twin reachability is already a known failure mode here: the install-layout plan's task 3 caught a twin citing `skills-ecosystem.md § Output guards`, a section deliberately omitted from *that* twin.
2. **Six of the seven need the same amendments applied.** Planned individually, each plan re-derives them — which is exactly the failure that produced this pressure test. One sweep applies one settled rule once.
3. **The edits are small relative to their planning overhead.** These seven deltas together are smaller than the single `skills-ecosystem.md` delta. Seven plans for seven files this size is ceremony exceeding the work.

**Pull out and route to the install-layout consumer-framed lane (two):** `architect/_toolkit/documentation.md` and `references/review-docs-impact.md`. Both turn on the `docs/` → `${documentation.location}` decision, which is a substantive consumer-framing call, not subtraction — the same class as install-layout's re-scoping, and the same human scope call. `documentation.md` additionally carries authored twin-only prose that needs a rename-vs-curate decision. Folding these into a mechanical sweep would either ship PRISM's doc layout as the consumer's convention, or quietly make a framing decision inside a catch-up PR.

**Sequencing:** amendments C and D land on the boundary section first — ideally folded into the in-flight lane's task 8 rather than as a third amendment pass, since that section does not exist yet and amending an unmerged section is cheaper than amending a merged one. Then the sweep. The structural detector is independent and can proceed in parallel.

---

## Defects in the in-flight plan

`followup-seed-twin-skills-ecosystem.md` is being implemented in another lane. Read-only here. One defect is worth correcting before it merges; two are informational.

**1. Task 8 will land a section that contradicts ADR-0064 — flag prominently, cheap to fix.** Task 8 appends the boundary rule to `.prism/architect/_toolkit/install-layout.md` carrying "curation is subtraction and tokenization only" from this plan's `## The curation boundary`. ADR-0064 § "ADR references split into two lanes" explicitly authorizes genericizing illustrative examples, and `spec/adrs/_toolkit/README.md`'s twin already practices it on the shipped surface. As written, task 8 puts a rule on the architect surface that forbids what an accepted ADR permits and what the seed already does. **The fix is small:** task 8 adds genericization as a third sanctioned transformation and cites ADR-0064 as the upstream authority for the ADR half of Test 2 and for the genericization lane. Doing it now costs a paragraph in an unmerged task; doing it later costs an amendment PR against a merged section that other plans have already begun citing.

**2. Task 3 is correct, and now mechanically justified.** Its reasoning was consistency-based ("the twin's own roster table names him"). `literal-guard.ts:39-42` supplies the harder ground: `Sol` and `Iris` are deliberately excluded from the dogfooding pattern as "legitimate framework content that ships to consumers." Worth citing if the task is touched for any other reason; not worth touching on its own. The plan does not know that `branch-plan.md`'s twin practices the opposite convention — that is a scope fact, not an error in the task.

**3. AC-7 encodes a rule that is right for this file and wrong as a template — Minor.** AC-7 requires `grep -cE '...|@huntermcgrew/prism|...'` to return `0` against the twin. Correct for `skills-ecosystem.md`, which has no reason to name the package. But `@huntermcgrew/prism` **ships literally** — it is the string a consumer types, established in the install-layout audit and load-bearing in that twin's first-contact section. AC-7 is the AC a future editor will copy to the next twin, where it would forbid the correct text. Recommend narrowing the pattern or annotating the intent inline. Not a blocker for this PR.

The crossref-lint correction already reported stands: `crossref-lint` resolves seed references against the monorepo root, so it goes green on exactly the unshipped-path class Test 2 condemns. Task 9 calls it "the load-bearing gate for Test 2." It is load-bearing for the *ADR* sub-class — `runInstallAdrGate` (`crossref-lint.ts:871`) is a real gate for that — and not for the unshipped-path sub-class.

---

## Decisions

- **The boundary rule needs two more amendments (C and D), and the count is the finding.** Five amendments across three files means the rule generalized from one file's evidence too early.
  - **Root cause:** the rule was derived from `skills-ecosystem.md`, whose deltas happen to be pure subtraction and pure ADR-dropping. Every transformation the other twins practice — de-identification, generalization to a config key, genericization, attribution — is absent from that one file's evidence.
  - **Alternatives considered:** (a) treat each as per-file judgment; (b) add a fourth and fifth test; (c) widen the existing tests and name the practiced transformations.
  - **Chosen approach:** (c). (b) implies these are different *kinds* of question — they are not; C.1–C.3 are all "is this value install-specific," and genericization is a transformation, not a test. (a) is what produced the drift.
  - **Implementation guidance:** fold into the in-flight lane's task 8 while that section is still unmerged.
  - → to be promoted to `.prism/architect/_toolkit/install-layout.md` (via the in-flight task 8, or a follow-up amendment if that PR merges first)

- **The boundary rule cites ADR-0064 rather than re-deriving it.** ADR-0064 already owns the ADR half of Test 2 and authorizes the genericization lane.
  - **Root cause:** the rule was written from observed file evidence without checking whether a ratified decision already governed part of the ground. It came out narrower and contradicted the ADR on first contact.
  - → to be promoted to `.prism/architect/_toolkit/install-layout.md`

- **Test 3 held across every file and needs no amendment.** Twelve files, including four hard cases (the ADR index, PRISM's build-pipeline crossref rows, the substitution-pass sections, the guards' implementation). The audience discriminator decided all of them. Both amendments and both prior amendments land on Tests 1 and 2.
  - → no promotion needed (a negative result; recorded so a future pass doesn't re-test it)

- **The rule's scope hole is closed by a recorded per-file classification plus a date-independent structural detector — not by a fourth test and not by a duty.** A test only fires when someone is copying; a duty has no trigger; recency-based detection has three demonstrated misses.
  - **Root cause:** the tests govern the delta by construction. Nothing re-examines already-shipping content, so a twin can be compliant on every line ever copied into it and still be wrong.
  - **Alternatives considered:** (a) fourth test; (b) periodic re-examination duty, likely as a Zoe surface extension; (c) change-parity detector as scoped in #441; (d) heading-set/reference-class structural diff, date-independent, plus a required per-file classification table.
  - **Chosen approach:** (d), with (b) as a worthwhile cheap addition. (a) is a category error. (c) misses install-layout's original mis-curation, misses recency resets, and misses identical-date drift — three proofs, one of them new here.
  - **Implementation guidance:** the boundary section should state its own limit in one sentence. The detector is a separate ticket; the classification table is the artifact each twin's fix already produces.
  - → no promotion needed (the mechanism call belongs to the detector ticket; the self-limit sentence promotes with amendments C and D)

- **The remaining twins are swept in one PR, minus two routed to the consumer-framing lane, plus one the date signal missed.** Reasoning in `## Individually or swept?`.
  - → no promotion needed (sequencing call for this thread)

---

## Signals — out of scope for this analysis

1. **`rules/implementation-task-detail.md` is stale and no signal flagged it.** Missing the entire `[HITL]` mechanic. Add to the sweep. Its discovery via the control sample is the strongest single argument against recency-based detection.
2. **`templates/claude/` does not exist and is cited on both surfaces.** `implementation-task-detail.md` canonical line 75 and twin line 61 both reference `templates/claude/...`. Dangling in canonical too, inside a blockquote where `crossref-lint` doesn't see it. Separate from the twin work — canonical needs the fix as much as the twin does.
3. **`documentation.md`'s twin may want a `renames` entry rather than a `curated` one.** It carries authored consumer-facing template prose that exists nowhere in canonical — structurally the same thing `SPEC.md.tmpl` and `manifest.stub.json` are, but without the honesty of a rename. A scope question for the consumer-framing lane.
4. **A twin can never be assumed byte-identical to canonical even when fully current.** `worktree-mode.md` differs by one Unicode apostrophe. Any structural detector must normalize.

---

## Sessions

- 2026-07-23 [main] open: Intent — dry-run the amended boundary rule against every remaining curated twin plus controls and report whether it holds; Bounds — one analysis artifact under `.prism/plans/`, no code, no twin edits, read-only on the in-flight plan; Approach — diff every pair mechanically before judging, include known-good twins so the rule is tested on certification as well as detection, and check whether a ratified decision already governs the ground before proposing an amendment · close: scope held

---

## History

- 2026-07-23 [main]: Winston pressure-tested the curation boundary against eight canonical-newer curated twins plus four controls. Rule did not hold — two more amendments (Test 1 gains authorities and two treatments; genericization is sanctioned and ADR-0064 is the upstream authority), Test 3 survived every case. Recorded that the scope hole needs a date-independent detector plus a recorded per-file classification, not a fourth test; flagged that the in-flight lane's task 8 will land a section contradicting ADR-0064.
