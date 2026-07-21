# Evaluation: dist/cli.js drift fix (#425) + post-run backlog triage

> Winston, evaluate mode — 2026-07-21, on `main` @ `5992152`. Dispatched post-Sol-run.
> Scope: recommendation for issue #425 and do/later/don't triage of #418, #427–#430. No code written.

## Orientation

- **Intent:** pick the durable fix for the `dist/cli.js` bundle-drift class, and triage five follow-up issues into do / later / don't.
- **Ambiguity:** none load-bearing. "Measure branch-plan.md's cost" resolved by measurement (below). Determinism resolved empirically, not by inspection.
- **Bounds:** this file is the only write. No branches, issues, PRs, or source changes. (The determinism test rebuilt `dist/cli.js` in place and restored it via `git checkout` — tree verified clean after.)
- **Approach:** evidence first — rebuild-and-hash the bundle, read ADR-0063 and the prism-248 plan for what was actually decided, read each issue against its cited surface.

---

## Question 1 — durable fix for #425 (dist/cli.js bundle drift)

### Verdict: Option 2 — gitignore `dist/`, build in `prepare` + keep `prepublishOnly`

Not because option 1 is broken — it isn't — but because option 2 deletes the drift class where option 1 gates it, and the wall option 2 appears to knock down turns out not to be load-bearing.

### The determinism finding (the crux, resolved empirically)

Option 1 is **not** a flaky-CI generator. Tested, not inferred:

- Rebuilt the bundle twice from current `main`; both rebuilds and the committed `dist/cli.js` hash to the same SHA-256 (`7f7c6786…`). Byte-reproducible on this machine, this lockfile.
- esbuild is pinned **exactly** by `pnpm-lock.yaml` (`0.28.1`), so CI with a frozen lockfile builds with the same compiler. The `^0.28.1` devDep range only moves when the lockfile moves — and a lockfile-driven byte change is *real* drift the gate should catch, not flake.
- `.gitattributes` already forces `* text=auto eol=lf` on every platform — added precisely because `build.ts --check` does byte-exact compares of generated output on Windows CI. The infrastructure for byte-exact generated-output gating exists and is battle-tested on the seed mirror.
- `bundle.ts` output has no timestamps or absolute paths (esbuild path comments are cwd-relative; pnpm scripts run from the package root).

So the "option 1 is only viable if reproducible" gate passes. **Option 1 is a legitimate fallback.** The recommendation is a choice, not a forced move.

### Why option 2 anyway

**1. Tracking `dist/` was never a documented decision.** I read `prism-248.md` and ADR-0063 looking for the load-bearing wall before proposing to move it. ADR-0063's three invariants are: (1) runtime resolves the package root by walking to the `@huntermcgrew/prism` `package.json` (`findPrismPackageRoot`), (2) `files` is an inclusion allowlist with the leak-audit ritual, (3) `bin` → compiled `dist/cli.js` with a node shebang. **None of the three requires the bundle to be git-tracked.** Tracking fell out of "commit what you built at publish time," not a recorded constraint — there is no Decision bullet anywhere in prism-248 or the ADR saying "track dist in git because X." Option 2 changes only where the bundle materializes from (build lifecycle vs. git); all three invariants survive untouched.

**2. The gitignored-but-shipped pattern already exists in this exact package.** ADR-0063's Consequences section documents it: `.prism/.sync-manifest.json` is gitignored yet ships, "because `files` operates on the working tree and `prepublishOnly`'s `prism:build` emits it before pack." npm's `files` allowlist overrides `.gitignore` — proven in every published tarball since 0.7.0. Option 2 is not a new pattern; it's extending an existing one from a JSON manifest to the bundle.

**3. Option 1's recurring cost lands exactly where this repo lives: parallel fleet runs.** A drift gate in `prism:check` forces every PR touching CLI source to carry a rebuilt bundle blob. Last night's run merged five PRs, several touching `scripts/ai-skills/`. Under option 1, each parallel lane rebuilds `dist/cli.js`; the first merge to `main` invalidates every other open lane's bundle — guaranteed merge conflicts in a machine-generated blob, red checks cascading across lanes, agent rounds burned on rebase-rebuild churn. That is not a hypothetical: it is the shape of every future Sol run that touches the CLI. Option 2 has zero cross-lane interaction because the artifact doesn't exist in git.

**4. Option 2 fixes the global-link staleness that option 1 leaves half-fixed.** Today a `pnpm link --global` consumer gets whatever bundle was last committed — stale between publishes (that *is* #425). `docs/adopt-prism.md` already instructs "when you pull a newer PRISM commit, run `pnpm install` in the clone again." With a `prepare` script, that existing instruction becomes structurally true: install triggers a fresh bundle. Option 1 keeps the link path only as fresh as the last drift-gate-forced commit.

### The three consumer install paths under option 2

| Path | Effect | Why |
| --- | --- | --- |
| **npm / npx** | Unaffected | `prepublishOnly` already runs `prism:bundle` before every publish; `files` includes the gitignored `dist/` (the `.sync-manifest.json` mechanism). Add `prepack` (below) so a bare `npm pack` is also covered. |
| **Vendored checkout** | Unaffected | The documented steady state is `pnpm prism:adopt` in-clone — runs via `tsx`, never touches `dist/`. And `prepare` gives the clone a fresh bundle at install anyway. |
| **Global link** | **Improved** | `pnpm link --global` needs `dist/cli.js` to exist — `prepare` builds it at `pnpm install`, so a fresh clone + install yields a working `prism` binary, and pull + install refreshes it. Today this path serves a stale bundle. |

**Undocumented-path caveat:** installing PRISM as a *git-URL dependency* (not one of the three documented paths) would rely on the consumer's package manager running `prepare` with devDeps — and pnpm 10 would block esbuild's own postinstall on the consumer side. Not a documented path; note it in `docs/adopt-prism.md` as unsupported rather than engineering for it.

### What has to change (blast radius)

No runtime source changes. `findPrismPackageRoot` / `resolveSelfPrismSource` walk to `package.json`, not to `dist/` — unaffected.

1. **`.gitignore`** — add `dist/` under the existing "PRISM build outputs" stanza; `git rm --cached dist/cli.js`.
2. **`package.json`** — add `"prepare": "pnpm run prism:bundle"` (runs on fresh clone + `pnpm install` and on link; pnpm runs the root project's own lifecycle scripts, and esbuild's postinstall approval is already handled per #422/#424 — Sol confirmed `pnpm install` on `main` is clean). Add `"prepack": "pnpm run prism:bundle"` so a bare `npm pack` can never produce a bundle-less or stale-bundle tarball. Keep `prepublishOnly` as-is.
3. **`verify-pack-parity.ts`** — add `{ path: "dist/cli.js", kind: "file" }` to `RUNTIME_READ_PATHS` (reader: the `bin` entry). This makes the existing tarball gate the enforcement that the bundle exists and ships — the parity check becomes the safety net for the whole change.
4. **Docs** — `docs/adopt-prism.md` (global-link section: fresh clone needs `pnpm install` before the bin exists — the existing prose is nearly there already) and `docs/publishing-prism.md` (the "`dist/cli.js` is present" checklist line stays valid; prepack guarantees it).
5. **ADR-0063** — one-paragraph amendment note: the bundle is now build-time-materialized, not tracked; invariants 1–3 unchanged; `.sync-manifest.json` precedent generalized. Not a new ADR — the decision's reasoning is unchanged.
6. **Verification (the fresh-clone AC):** `git clone` → `pnpm install` → `node dist/cli.js` prints the usage banner and `which prism` works after `pnpm link --global`. Plus `npm pack --dry-run` shows `dist/cli.js` in the tarball from a tree where `dist/` is gitignored.

Size: small — one focused Clove PR. Ships cleanly before the pending 0.8.0 publish and makes that publish safer, not riskier.

### Devil's advocate

- **Risks:** the main one is lifecycle-script fragility — if `prepare` fails silently on some contributor setup, the bin is missing instead of stale. Mitigation: missing is a loud, obvious failure ("no such file"); stale is the silent one we're eliminating. #425 existed for eight days because stale is invisible. Second risk: a contributor pulls without reinstalling and runs a stale *local* bundle — their machine only, and `prism:doctor` can warn.
- **Tradeoffs:** option 1 is genuinely smaller (~30 lines into an existing check, determinism proven above) and was Sol's lean. Rejected because it converts a one-time migration into a permanent per-PR tax with cross-lane conflict costs in fleet runs — arranging the complexity well instead of deleting it.
- **Why anyway:** the drift class ceases to exist; every ADR-0063 invariant survives; the shipped-but-ignored mechanism is already proven in production tarballs; and the global-link path gets *fresher*, not riskier.
- **Watch for:** first fresh-clone CI run after the change (does `prepare` behave under `--frozen-lockfile`?), and the first `npm pack` from a clean tree — if the tarball ever lacks `dist/cli.js`, the new parity entry goes red before anything ships. If `prepare` proves flaky on Windows CI, fall back to option 1 — it is fully viable per the determinism finding.

---

## Question 2 — backlog triage

| Issue | Verdict | Vehicle & size |
| --- | --- | --- |
| #430 bom-guard trailing-BOM blindness | **Do it** — first | Own small lane (Clove), ~1 file + fixture |
| #427 report-back verdict gap | **Do it** — merged with #428 | One Winston-spec lane, small |
| #428 reviewer plan-commit landing path | **Do it** — merged with #427 | Same lane as #427, small-medium |
| #429 Linear literals in seed twins | **Do it** — before 0.8.0 publish | Own small lane (Clove), mechanical sweep |
| #418 branch-plan.md slim | **Don't do it (as scoped)** | Park; revisit narrowed after `load: skill` has mileage |

### #430 — do it, first

A guard that was in place when the class it guards shipped to npm (0.7.3) is worse than no guard — it manufactures false confidence. Whole-buffer U+FEFF scan + trailing-BOM fixture is a half-day Clove change with a crisp done condition, and it directly protects the pending 0.8.0 publish. Highest value-per-line of the five.

### #427 + #428 — do both, as one ticket

**#427's premise is subtly wrong, which makes it cheaper than filed.** The enum already has the value: `needs-fix` — "a review rung found issues recorded in `## Review Issues`; fixable in-loop; route to the implementer, re-review, stay in-phase." That is exactly "blocking findings, implementation-level, route to Clove." Eric returned `needs-replan`/`blocked` when `needs-fix` was sitting in the table. The fix is wiring, not vocabulary: make Eric's and Briar's "When dispatched by Sol" sections quote the verdict semantics (or at least the `needs-fix` vs `needs-replan` distinction) instead of pointing at the table by reference and hoping. Possibly add one disambiguating example row to `report-back.md`. Small.

**#428: pick option (a)** — Briar pushes plan-only commits, as a narrow, machine-checkable exception to "reviewers never ship" (diff touches `.prism/plans/` only, nothing else). Rejecting (b): making Sol the lander reintroduces the manual-recovery step that failed three times, and does nothing for standalone Briar sessions outside Sol runs, which strand commits identically. The adversarial-review rationale behind "reviewers never push" is about shipping *code*; a plan-file write is the reviewer's own durable record, and stranding it defeats `## Review Issues` as working memory.

**Why merge:** same run provenance, same surfaces (reviewer skill specs + conductor lib + one `branch-plan.md` paragraph), same owner (Winston spec, trivial Clove execution), and each alone is too small to earn a full review cycle. One ticket: "reviewer report-back contract — verdict usage + plan-commit landing path." This also pays for itself on the *very next* Sol run: the two defects cost adjudication rounds and manual recovery three-plus times in one night.

### #429 — do it, before the 0.8.0 publish

Mechanical Clove sweep with a falsifiable done condition (0 hardcoded `Linear` literals across the 11 files where canonical is tracker-neutral). It has publish relevance the issue undersells: `templates/install/` ships in the tarball, so every non-Linear consumer currently receives Linear-hardcoded seed prose. The parked question — whether curated seed twins should get a staleness signal at all, given they diverge from canonical by design — stays parked; byte-parity is the wrong gate for curated content and this sweep neither needs nor resolves that answer. Don't let the open question block the closed fix.

### #418 — don't do it as scoped; I agree with the lean, with sharper reasons

Measured, as asked: `branch-plan.md` is 443 lines / ~24.7 KB — roughly 6k tokens always-on, of which the externalizable half (template, issue schemas, close ceremony, verdict gate) is ~3.5–4k. Unlike the agents-md-slim case (#64), the saving here is *real*, because `load: skill` (#417) moves content out of the always-on set entirely rather than shuffling it between two always-on surfaces. So the token argument survives. The issue still shouldn't run now, for two reasons the token math doesn't capture:

1. **Wrong first candidate for a day-old mechanism.** `load: skill` merged yesterday and has zero operational track record. The plan file is the single most cross-persona load-bearing artifact in the system — Sol's ratification reads `## Debugged Issues`, Iris's charter reads `## Review Issues`, every persona writes `## Sessions`. The failure mode of a skipped trigger-load is *silent*: a persona deep in a long session writes a Debugged Issues entry from memory of the schema, the entry drifts, and everything downstream that parses the section degrades quietly. Proving the mechanism on lower-stakes rules first is cheap; debugging schema drift across a fleet run is not.
2. **The externalizable pieces have unequal risk, and the issue bundles them.** The plan-file *template* is genuinely trigger-shaped — needed once, at creation, by a persona actively following the rule, and mid-life sessions can copy the shape from neighboring entries in the plan they're already editing. The *issue schemas* are the opposite: needed mid-task, at unpredictable moments, by the personas most likely to be deep in context — exactly where trigger-loads get skipped. Externalizing them as one move takes the worst risk to save the smallest marginal tokens.

**Disposition:** close #418 as-scoped, or retitle it to the narrow survivor — "externalize the plan-file template only, after `load: skill` has a proven track record on N lower-stakes rules." The schemas, close ceremony, and verdict gate stay always-on until there's evidence trigger-loads fire reliably in long sessions. ~4k tokens per session is a real but modest saving; a malformed plan contract is a fleet-wide cost. The trade isn't close.

### Sequencing

1. #430 (guard the publish) → 2. #429 (clean the tarball) → 3. 0.8.0 publish → 4. #427+#428 merged ticket (before the next Sol run if possible) → 5. #425 option 2 (any time; also fine before the publish — it makes the publish safer). #418: close or retitle now, no lane.

---

## Closing battery

1. **Scope boundary:** wrote this file only. Rebuilt `dist/cli.js` twice as the determinism experiment and restored it (`git status` clean). Left alone: the `needs-fix` wiring gap in Eric's spec (covered by the #427 verdict above — no separate signal needed) and `.prism/lessons.md`'s leading BOM (explicitly out of #430's scope per the issue).
2. **Unasked assumptions:** (a) that "the three documented consumer paths" are npm/npx, vendored checkout, and global link per `docs/adopt-prism.md` — confirmed against the doc; (b) that the pending publish is 0.8.0 off current `main` — from project memory, affects only the sequencing note; (c) #427+#428 merging assumes Hunter accepts one combined ticket — trivially separable if not.
3. **Edge recall:** determinism was tested on one machine/lockfile — cross-machine byte-identity is inferred from esbuild's exact lockfile pin plus the LF-forcing `.gitattributes`, not observed; flagged in "Watch for." The git-URL-dependency install path is named as unsupported rather than silently ignored.
4. **Verification honesty:** determinism — observed (3× identical SHA-256). ADR-0063 invariants not requiring git-tracking — verified by reading the ADR and prism-248's Decisions (no tracking decision exists). `needs-fix` covering #427's case — verified against `report-back.md`'s verdict table verbatim. Option 2's `prepare`-under-pnpm-10 behavior — deduced from #422/#424's fix plus Sol's clean-install confirmation, not executed; it's the first thing the implementing PR must smoke-test.

> Sessions: 2026-07-21 [main] open: Intent — decide #425 fix + triage 5 follow-ups; Bounds — this file only, no code; Approach — empirical determinism test then verdicts · close: scope held
