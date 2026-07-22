# Evaluation: artifact-inventory review scan for Briar & Eric

> Winston, evaluate mode — first pass 2026-07-22, on `main` @ `97eb5ae`. Dispatched by Sol (evaluate-with-a-verdict; autonomy internal).
> **Empirical override — 2026-07-22.** The first-pass verdict ("WORTH IT BUT LIGHTER — ship one prose Structural Scan Item") is superseded by direct A/B evidence the operator produced in a parallel experiment. The prose remedy was built, tested across 23 blind runs at three model tiers, and found inert. This file now stands as the **"evaluated, do not ship as prose"** record.
> Scope: this file is the only write. No edits to `review-frameworks.md`, the reviewer skills, or any mirror. Nothing ships.

---

## Verdict: SUPERSEDED BY EVIDENCE — do not ship the prose Structural Scan Item

Do not add the artifact-inventory item to `.prism/references/review-frameworks.md`. The gap it targets is real and the diagnosis below (activation, not loading) still holds — but the *prose remedy* was A/B-tested against a live experiment and produced **zero recall lift at Opus, Sonnet, or Haiku**. For PRISM specifically the case is airtight: our reviewers run **Eric = Opus, Briar = Sonnet** — the exact tiers the experiment found already at ceiling without the bullet. A prose item would cost surface in a loaded reference and buy nothing for the models that actually run our reviews.

The diagnosis was right; the *layer* was wrong. Ship nothing here.

---

## The empirical override — what the experiment showed

The operator built the prose remedy this eval designed and ran it as a blind A/B against a matched control. The data:

- **Prose bullet — 23 blind runs across Opus / Sonnet / Haiku: zero recall lift at any tier.** A "new-artifact inventory" bullet was added to the portable Briar/Eric review specs and measured against the byte-identical spec without it. Opus and Sonnet were already at ceiling on the target defects without the bullet — nothing left for prose to lift. Haiku skimmed the added discipline-prose the same way it skims code, and could not execute it. The bullet was removed; the skill files were reverted byte-identical.
- **Mechanical pre-review hook — the remedy that worked.** A deterministic script that inventories new declarations plus generic rule-joins and injects that fact-sheet into the reviewer's context as CI-style text moved Haiku target recall from **33% → 80%**, produced **zero clean-artifact false flags across 11 runs**, and caused no degradation at the ceiling tiers.

Evidence archive, for the reader who wants the tallies: `~/.claude-work/experiments/review-inventory-ab/` — `results/HOOK-TALLY.md`, `HAIKU-TALLY.md`, `SONNET-TALLY.md`, `FINAL-TALLY.md`, and `DECISION.md`.

### The compute hierarchy — why prose was the wrong layer

The experiment generalizes past this one check into a validated ordering:

**deterministic code > injected context > prose.**

Each check belongs at the **lowest layer that can express it**. An inventory of new declarations and generic rule-joins is *deterministically computable* — a script can enumerate every new function, utility, file, comment, and generic rule-join without a model in the loop. Expressing that sweep as prose asks a model to do, probabilistically and on every run, work a script does exactly once and for free. That is the wrong layer by construction:

- **Prose is the weakest channel** because it only fires if the model's reasoning path happens to reach and act on it during the pass. That activation is precisely what varies across tiers and runs — so a ceiling-tier model that already covers the check gains nothing, and a floor-tier model that skims prose gains nothing. The one population prose could help (a mid-tier model that would activate a sweep it wouldn't otherwise think of) didn't materialize in the data.
- **Injected context is the middle layer** — the right home when a check needs a model to *judge* something, but the facts to judge against can be gathered deterministically. The hook lives here: the script gathers the inventory, the model reads it as CI-style fact-sheet text it cannot skip, and judges each entry.
- **Deterministic code is the strongest** for anything fully mechanical — no model, no variance, no run-to-run drift.

This is the sharper form of the same insight the first pass reached with "latent-but-loaded ≠ activated-at-the-artifact." The first pass was right that loading ≠ firing. It was wrong to conclude that *prose placement* manufactures the trigger reliably — the experiment shows prose placement fires only where the model would have fired anyway. A **mechanical injection** manufactures the trigger; prose does not.

---

## The validated remedy is a mechanical hook — and porting it is a separate question

The thing that works is the **mechanical pre-review hook**, currently living portable-only at `~/.claude-work/hooks/pre-review.sh`. It is not part of PRISM's distribution today, and this eval does **not** decide that it should be.

Whether to port the hook into PRISM is a **separate, dogfood-gated question** — not this eval, and not a 0.8.0 lane. The reasons to keep it separate:

- **PRISM's real reviewer tiers don't need it.** Eric = Opus and Briar = Sonnet are the tiers the experiment found already at ceiling. The recall win the hook demonstrated was concentrated at the Haiku tier, which PRISM does not run for review. So the hook's payoff for PRISM's own reviews is small — its value is portability to consumers who may run cheaper reviewer tiers.
- **A hook is distribution machinery, not a reference edit.** Porting it means a script, an install/wire-up path, and a decision about how it injects into each consumer's reviewer context — a real design question that deserves its own evaluation and its own dogfood run before it ships to consumers.
- **Dogfood first.** Run the hook against PRISM's own repo across a few real review lanes before deciding whether it earns a place in the distributed surface. Let the local evidence decide, the same way this override let the operator's evidence decide.

Flagging it here so the thread isn't lost — not opening the lane.

---

## Open thread (preserved, not designed here): comment-*claim* verification

One residual gap sits outside both the inert prose bullet **and** the mechanical hook, and would be silently lost if this eval didn't name it:

**OPEN — un-tested, needs its own evaluation.** Doc-Class source-verification (the architect-doc lane / Doc-Class Triage) fires only on `.prism/architect/**` files. A **JSDoc or inline code comment that asserts an architectural claim** — "runs before hydration because X", "safe to mutate here because Y" — is never checked against source the way an architect doc is. Nothing verifies that the claim the comment makes is still true of the code beneath it.

Why it belongs to neither remedy above:

- **Not the prose bullet.** The prose item was an activation technique for checks that already exist as loaded rules; comment-claim verification is a *judgment* check with no loaded rule behind it — deciding whether a comment even makes a verifiable architectural claim is itself the hard part.
- **Not the current hook.** The hook is a mechanical *inventory* of new declarations and rule-joins. "Does this comment's assertion match the code?" is not mechanically computable — it needs a model to read the claim, read the code, and judge agreement. On the compute hierarchy this is an **injected-context / judgment** check, not a deterministic-inventory one.

Do not design it here. This eval only preserves it as a named, still-open thread so a future evaluation can pick it up deliberately rather than rediscover it by accident. It is explicitly **not resolved** by the prose bullet (inert) or the hook (wrong class).

---

## What still stands from the first-pass diagnosis (vindicated)

The empirical override reverses the *remedy*, not the *diagnosis*. These findings held up and are worth keeping as durable analysis:

- **The gap is real.** A working artifact placed in the wrong home passes hunk-by-hunk correctness reading — the reviewer sees a correct function and never asks whether it belongs where it sits. That failure mode is genuine; the experiment did not dispute it.
- **Activation, not loading, is the correct frame.** Having `code-standards.md`, `code-comments.md`, and the manifest in context is not the same as running them against a given artifact. The experiment sharpened this: activation is real, but *prose* is not a reliable way to manufacture it — mechanical injection is.
- **Sibling, not twin, of the removals/renames item.** The existing "removals verified by search, not by diff" item earns its place because the evidence lives *outside* the diff (the file still referencing the old name never appears). New artifacts are the opposite — they are *in* the diff; the failure is a loaded check that never fired, not blindness. Different mechanism. That distinction stands and is why "additions verified by search" would have been a false parallel.
- **Every proposed check already exists as a loaded rule.** Naming (`code-standards.md § Naming`), comments (`code-comments.md`), complexity-justification (`review-justification.md`), placement (Eric's Spec axis + architect-context), AC-fit (Spec axis). The gap was never missing rules — it was activation. That inventory is still accurate; it just doesn't lead anywhere shippable as prose.

---

## Devil's Advocate — challenge the override itself

1. **Risk — over-rotating on one experiment.** A single A/B, 23 runs, could under-sample the case where prose helps. **Why the override holds anyway:** the null result isn't ambiguous for *PRISM*. Even if prose helped some mid-tier model somewhere, PRISM runs Opus and Sonnet for review — the tiers measured at ceiling. The decision for this repo doesn't depend on the experiment's power at the margins; it depends on the two tiers we actually run, and those were clean.
2. **Risk — losing the recall win entirely.** Rejecting the prose item could read as "do nothing," discarding a real gap. **Why it holds anyway:** the win is preserved — it moved to the hook and to the dogfood-gated port question. "Do not ship prose" is not "do nothing"; it's "ship the remedy at the layer that works, on its own evaluation."
3. **Tradeoff.** Keeping the hook portable-only leaves consumers on cheap reviewer tiers temporarily unserved. That's the right trade until a dogfood run proves the port earns its distribution cost — shipping distribution machinery on one external experiment's evidence would repeat the exact mistake this override corrects (shipping a remedy before local evidence).
4. **Watch for.** If a future PRISM configuration starts running a floor-tier model for review, revisit the hook-port question immediately — that's the condition under which its payoff stops being hypothetical. And if the comment-claim thread keeps surfacing in real reviews, promote it from "preserved open thread" to its own eval rather than letting it accrete ad-hoc.

---

## Designed, then superseded — DO NOT EXECUTE

The section below is the prose remedy this eval originally designed. It is preserved for the audit trail — so a reader can see exactly what was tested and found inert — **not as an implementation task.** Do not execute these steps. Do not edit `review-frameworks.md`. Do not run `pnpm prism:build`. The design is inert by measurement, not by oversight.

<details>
<summary>Original prose-item design (tested, zero recall lift, do not ship)</summary>

Intended home: `.prism/references/review-frameworks.md` → § Structural Scan Items, appended as a fourth item after "Removals and renames verified by search, not by diff." Intended shape: a `New artifacts activated by type, not left to ambient reading` bullet plus a type→bars routing table (function, utility/shared-type, file, comment, story) delegating to the cited rules, capped by a "quick glance, not an audit; keep naming/comments at Minor; rides the first pass on large diffs" guardrail.

The full first-pass design — bullet text, routing table, guardrail paragraph, and three implementation tasks for Clove — is preserved in this file's git history at the pre-override revision. It is intentionally not reproduced as a live task list here, so no reader mistakes it for work to do. The measured outcome (23 blind runs, zero recall lift across Opus/Sonnet/Haiku) is the reason it stays closed.

</details>

---

## Decision-log bullets (durable record)

- **Verdict overridden by direct evidence:** the prose Structural Scan Item was built and A/B-tested (23 blind runs, three tiers) and produced **zero recall lift**. Do not ship it. The diagnosis (gap real; activation-not-loading) stands; only the remedy's layer was wrong.
- **Validated compute hierarchy — deterministic code > injected context > prose.** Each check belongs at the lowest layer that can express it. A mechanical inventory sweep is deterministically computable, so prose is the wrong channel: it fires only where the model would have fired anyway.
- **PRISM-decisive fact:** reviewers run Eric = Opus, Briar = Sonnet — the tiers measured at ceiling — so the prose item adds nothing for PRISM's real reviewer configuration.
- **Validated remedy = mechanical pre-review hook,** portable-only at `~/.claude-work/hooks/pre-review.sh` (Haiku recall 33%→80%, zero clean-artifact false flags in 11 runs). Porting it into PRISM's distribution is a **separate, dogfood-gated question** — not this eval, not a 0.8.0 lane.
- **Open thread preserved, un-tested:** comment-*claim* verification (JSDoc/inline comments that assert an architectural claim). Doc-Class Triage fires only on `.prism/architect/**`; a comment's architectural claim is never checked against source. This is a judgment/injected-context check, resolved by neither the prose bullet nor the hook. Named here so it isn't lost; not designed here.
