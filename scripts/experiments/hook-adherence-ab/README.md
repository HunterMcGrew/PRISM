# Hook adherence A/B harness

Falsification harness for the architect-context read hook (`scripts/ai-skills/hooks/architect-route.ts` and `claude-post-read.ts`, ADR-0071). Built by plan `.prism/plans/context-delivery-mechanism.md` task 9.

**No arm has been run yet.** This directory is the harness only — building it and proving the grader with `--self-test` is a separate step from spending the 60 runs the matrix costs. Running the matrix is a deliberate operator decision (model tier, cost ceiling) made separately from landing this harness.

## What this measures

**Adherence, not read-count.** Architect-context routing already keys on the working diff (`prism-architect` startup step 4), so a prompt-driven task carries an unrelated diff and the target path's own doc never loads through that route — that premise is already established, not something to re-prove. What isn't established is whether injecting the doc content via the hook actually changes what the agent does. So each run is graded on whether the *governing constraint from the architect doc shows up in the produced output* — a file left unmodified, a route added in the right place, a rebuild invoked instead of a hand-edit — not on whether the hook fired or the agent happened to read a file.

Two arms, identical except one environment variable:

- **Control:** `PRISM_HOOK_DISABLE=1`. The hook stays registered and still fires; it returns empty and exits 0 (the kill switch in `claude-post-read.ts`).
- **Variant:** `PRISM_HOOK_DISABLE` unset.

Three prompts, each run 10 times per arm (60 runs total):

- **P1** (`prompts/p1-architect-doc.md`) — add a new architect doc and wire it up. Graded on whether it lands under `_toolkit/`, gets a manifest route, and that route is in the live manifest, not just the base template.
- **P2** (`prompts/p2-canonical-file.md`) — asked to "bring the Cursor mirror current." The adherent answer refuses the literal instruction: the mirror is generated output, so the fix is `pnpm prism:build`, not a hand-edit. Graded on: the mirror is untouched, the response names the rebuild mechanism, and the canonical file itself is untouched.
- **P3** (`prompts/p3-control.md`) — negative control. Targets `README.md`, which matches zero patterns in `.prism/architect/manifest.json`, so the hook has nothing to inject for this prompt's own target. Graded on a Tier-1 formatting constraint (`code-standards.md` § Whitespace — no doubled blank lines) that reaches both arms identically via the generated `AGENTS.md` block. If P3 separates by any margin, the harness is measuring noise, not the hook.

Every P1/P2 criterion lives only within the first 4000 bytes of its architect doc (`install-layout.md`'s § "The bifurcation" and § "Ownership is path-decidable") — that is all `MAX_DOC_INJECTION_BYTES` lets the variant arm receive, so a criterion past that boundary would grade both arms as non-adherent and dilute the contrast toward zero.

## The positive control

A null result is uninterpretable unless the hook is proven to have fired. `resolveArchitectDoc` writes `.prism/architect-route-state.<session_id>.json` on every injection and nowhere else; the control arm's kill switch returns before that write ever runs. `grade.ts` checks that file's existence and its `injected` array as part of every grade:

- Variant arm, P1/P2: the state file must exist **in the worktree** and its `injected` array must contain `_toolkit/install-layout.md`.
- Control arm, every prompt: the state file must not exist.
- Variant arm, P3: no expectation either way.

A run whose arm expectation fails is `void_reason=positive_control` and excluded from its cell's mean. More than 2 void runs in a 10-run cell means the cell — and the harness, not the hook — is broken.

## The falsifier

> The hook fails to earn its keep if, on P1 and P2 combined, the variant arm's mean criteria-passed exceeds the control arm's by fewer than 2 criteria per 10 runs, or if P3 separates by any margin. On that result: PR 1's hook is reverted and architect-context routing ships as task 4's prose clause alone, which costs nothing per `Read` and needs no consumer config surface.

One precondition gates it:

> A null result only falsifies the hook when the positive control passed. If the variant arm's runs do not show `_toolkit/install-layout.md` in `injected_docs`, the hook never fired and the run measured nothing — fix the harness and re-run.

Write the outcome into `context-delivery-mechanism.md`'s `## Decisions` and into ADR-0071 either way — a null result is a finding, not a reason to quietly re-run until the numbers cooperate.

## Files

- `prompts/p1-architect-doc.md`, `p2-canonical-file.md`, `p3-control.md` — one prompt per file, exact text used in every run.
- `grade.ts` — the mechanical grader. `npx tsx grade.ts --dir <worktree> --prompt p1|p2|p3 --arm control|variant --session-id <id>` grades one run; `npx tsx grade.ts --self-test` proves the grader against the committed fixtures under `fixtures/`.
- `run.sh` — loops arms x prompts x runs, preparing a fresh worktree per run under `.claude/worktrees/`, invoking the agent, grading the result, and appending a row to the results TSV.
- `fixtures/p2-adherent/`, `fixtures/p2-non-adherent/`, `fixtures/p2-control/` — hand-authored run directories the self-test grades, standing in for real worktrees without spending a run. `p2-adherent` and `p2-non-adherent` both carry a state file (hook fired; only the answer quality differs). `p2-control` carries none (kill switch active).
- `results/` — where `run.sh` writes `<YYYY-MM-DD>-run.tsv` plus a sibling `DECISION.md`. Empty except `.gitkeep` until a matrix actually runs.

## Results TSV columns

`date`, `prompt` (`p1|p2|p3`), `arm` (`control|variant`), `run_index`, `model`, `session_id`, `exit_status` (`ok`, `timeout`, or `error:<code>` — the actual non-zero, non-142 exit code, so a fast clean failure is never confused with a real 600s kill), `hook_fired` (`yes|no`), `injected_docs` (semicolon-joined, or `-`), `criteria_passed`, `criteria_total`, `void_reason` (`-|timeout|positive_control`).

## Running the matrix

Not part of this PR — recorded here for whoever runs it next.

```sh
MODEL=<full-model-id> BUDGET=<per-run-usd-ceiling> ./run.sh
```

- `MODEL` must be a full model id, never an alias — a matrix that straddles an alias rotation is two experiments, not one. `run.sh` writes `$MODEL` into every TSV row so the pin is auditable after the fact.
- `CLAUDE_BIN` overrides the default `/Users/hunter/.local/bin/claude`.
- `RUNS_PER_CELL` overrides the default 10 (60 total runs).
- Run one smoke run per arm on P2 before the full matrix and confirm the variant row shows `hook_fired=yes` with `_toolkit/install-layout.md` in `injected_docs`, and the control row shows `hook_fired=no`. If the variant smoke run says `no`, stop — the worktree preparation or hook registration is broken, and the remaining runs would produce a confidently wrong null.
- Every run wraps the agent invocation in a 600s portable timeout (`perl -e 'alarm shift; exec @ARGV'` — neither `timeout` nor `gtimeout` exists on this machine). A timed-out run is recorded with `exit_status=timeout`, `void_reason=timeout`, and excluded from its cell's mean.
