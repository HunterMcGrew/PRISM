# Review Angles

Read by Briar (`prism-code-review-self`) and Eric (`prism-code-review-pr`) only — an opt-in fragment, never core content that every skill loads.

A review pass with no coverage obligation ends when the reviewer runs out of ideas, not out of check space. That is how a diff gets four passes on one defect class and zero on the other eight. This fragment is the check space: nine named angles, six always-on and three triggered, swept every pass and reported with a status.

---

## Always-on angles

- **Runtime behavior** — does the changed code actually do, at runtime, what the diff and the plan claim? Read the logic as executed, not as described.
- **Test efficacy** — do the tests covering this diff actually fail if the behavior regresses, or do they pass regardless? A test that cannot fail is not coverage.
- **Spec and doc consistency** — does the diff match the plan's stated intent and AC, and does it leave any doc, comment, or config now contradicting the code?
- **Citation integrity** — does every cited line number, sha, file path, or quoted rule actually say what the citation claims, checked against the current file rather than trusted from memory?
- **External-system claims** — does the diff assert, or does the review rely on, behavior of a framework, library, API, or platform this repo cannot itself confirm? Treat every such claim as a question to verify at source — docs, source, or a runnable check — not as model-resident knowledge. This is the highest-value angle here: a reviewer who cannot answer "how do I know this is actually how it behaves?" without checking is the reviewer who lets a plausible-sounding wrong claim through, silently, every time.
- **Repo writing rules** — does the diff follow the repo's own comment, naming, and structure conventions (`.prism/rules/code-comments.md`, `.prism/rules/code-standards.md`, `.prism/rules/writing-voice.md`), not a generic style preference?

## Triggered angles

- **Security** — triggered when the diff touches auth, input handling, secrets, permissions, or any trust boundary.
- **Docs impact** — triggered when the diff changes a feature, component, or module with a matching docs file.
- **Accessibility** — triggered when the diff touches UI: semantic HTML, keyboard access, focus management, ARIA, contrast, `prefers-reduced-motion`.

---

## Axis split

**Eric only.** This section is the single owner of which angle runs on which axis; Eric cites it rather than restating the assignment in his own body.

- **Standards axis** runs: Runtime behavior, Test efficacy, External-system claims, Repo writing rules, Security, Accessibility.
- **Spec axis** runs: Spec and doc consistency, Citation integrity, Docs impact.

**Why the assignment lives here and not in Eric's body:** the two axes run as context-isolated subagents. A split restated in the persona body is a split each subagent re-derives from its own copy, which is how an angle gets swept twice or not at all.

**Briar has no axis split.** She sweeps all nine angles in one pass and attributes no angle to an axis. Porting Eric's symmetry onto her would invent a division she does not run — the parallel file-slice fan-out that would justify one is deferred to its own change.

On Eric's lightweight (docs-only, single-pass) path the Spec axis is skipped as a whole. Its three angles then report `not reached — <reason>` naming the skip, which is a structural reason under § Status vocabulary below.

---

## Status vocabulary

Each angle reports exactly one status per pass — no free text:

- **`swept`** — actively checked against this pass's diff.
- **`n/a — <reason>`** — does not apply to this diff at all (no UI in the diff, so Accessibility is `n/a`); the reason names why there is no surface here.
- **`not reached — <reason>`** — applies, but the pass did not get to it (time-boxed, axis skipped, diff too large). An incomplete sweep, never a substitute for `n/a`.

**Why three tokens and not two:** conflating "does not apply" with "did not get to it" is what lets an incomplete pass read as a clean one. The third token is the whole reason the vocabulary is worth having.

The reason on a `not reached` says whether another pass can change the status. Two classes:

- **Pass-bounded** — the reason names this pass: time ran out, the diff was too large to finish, the budget was spent. A later pass can reach it, so the angle is pending.
- **Structural** — the reason names the *diff*: an axis that cannot run on this PR at all, such as a Spec axis skipped because the PR carries no plan and no AC. Nothing a later pass does changes the diff, so the status is terminal — it reads the same on pass 1 and pass 9. Write the structural cause into the reason so a consumer can tell the two apart without guessing. A consumer gating on coverage treats a structural `not reached` as terminal rather than pending, or it waits forever for a status that cannot move.

A bounded angle — any angle whose status is not `swept` or `n/a` — caps the reviewer's own verdict: the reviewer does not report an unqualified ready state while one stands, and the best available verdict names the angle and the specific check still owed. This is a label on output already produced, not a gate on whether the review continues.

A `n/a` on one of the six always-on angles is a legal status and a discrepancy at the same time — always-on is this file's claim that the angle applies to every diff, so a pass declaring it inapplicable is reporting that the claim did not hold here. Give the reason and expect a consumer to record it. It does not make the pass incomplete; `not reached` is the status for that.

---

## Enumeration

`swept` is not a verdict on its own; it carries an enumeration — the items of that angle's unit found in the reviewed range, each with its own verdict. An item absent from the list is a visible gap; a bare `swept` is not. An empty enumeration (`— no items`) is a legitimate and falsifiable result; a *missing* enumeration is not.

**The unit, per angle:**

| Angle | Unit |
| --- | --- |
| Runtime behavior | Each changed entry point whose runtime behavior differs from before |
| Test efficacy | Each new or changed behavior, paired with the test that fails if it regresses |
| Spec and doc consistency | Each acceptance criterion, and each doc, comment, or config the diff touches |
| Citation integrity | Each cited line number, sha, path, or quoted rule |
| External-system claims | Each external identifier the diff introduces or relies on — hook names, route URLs, capabilities, CSS custom properties, API signatures, config keys |
| Repo writing rules | `verdict-only` — no natural enumerable unit |
| Security | Each trust boundary the diff touches |
| Docs impact | Each changed feature, component, or module with a matching docs file |
| Accessibility | Each interactive or focusable element the diff adds or changes |

Repo writing rules having no unit is decided, not forgotten. `verdict-only` is a shape on both surfaces, not a chat-side abbreviation: the word stands where the enumeration would go in the off-chat block exactly as it stands in the chat line's counts slot. That is what makes `Repo writing rules — swept` a complete report rather than a permanently incomplete one.

**Where it goes.** To the reviewer's off-chat surface — Briar's plan `### Angle Coverage` block, Eric's summary-comment `## Angle Coverage` section. A `swept` angle carries its enumeration there.

The chat-side line carries the angle, its status token verbatim, and the counts — nothing further. Verbatim includes the `— <reason>` that § Status vocabulary makes part of `n/a` and `not reached`: the reason is part of the token, not a defense of it. The counts slot carries `<n> items enumerated, <n> verdicts` on `swept`, the word `verdict-only` on Repo writing rules, and nothing at all on `n/a` and `not reached`, which carry no enumeration. All three shapes in full:

```
Runtime behavior — swept — 12 items enumerated, 12 verdicts
Repo writing rules — swept — verdict-only
Accessibility — n/a — no UI in the reviewed range
```

Everything after that is banned — no caveat, no second sentence, no explanation of why an angle came back clean. **Why banning only the list is not enough:** prose defending a status restores the same wall of text the counts exist to replace, and a reader who skims nine paragraphs of "checked, fine" stops reading the block that carries the coverage signal. An angle whose status needs explaining does not get a slot to explain it in — neither destination admits free text, and the status already has to stand on its own.

**Status interaction.** The three tokens are unchanged by this section. The enumeration is what makes `swept` mean swept: an angle whose enumeration reaches only part of the reviewed range reports `not reached — <reason>` instead, as does an angle carrying no enumeration at all. Reaching the whole range is not the same as finding items in it — an angle swept end to end that turned nothing up reports `swept` with `— no items`, and a short enumeration over a full range is a complete report. A `swept` that arrives partial or bare anyway is not a fourth status: a consumer gating on coverage reads it as bounded, the same treatment `not reached` gets. That reading is scoped to the angles this section gives a unit. Repo writing rules carries `verdict-only` in the enumeration's place and reads as `swept`, complete, never bounded — without that carve-out `Repo writing rules — swept` is unsatisfiable by construction, and a review phase carrying it runs to budget exhaustion every time instead of converging.

---

## Reporting

The coverage block is exempt from conditional emit: report all nine angles' statuses every pass, including a clean pass with zero findings. A gap typed into the output is harder to skip than a gap only implied by silence.

A pass reports once, after every angle has been swept across the whole reviewed range — not angle by angle as each finishes, and not on the first defect found. The contract is coverage before reporting, not finding everything: a pass that swept all nine over the full range and still missed a defect has met it, and a pass that reported after three has not. The enumeration is what makes that checkable against the block rather than a claim about how the pass went — § Enumeration turns an angle that reached only part of the range into a `not reached`, so a block whose angles all read `swept` is asserting full-range coverage in a slot a reader can audit item by item. An angle the pass genuinely could not reach is not a reason to withhold the report — it reports `not reached` with its reason, and the verdict cap in § Status vocabulary qualifies the verdict instead. This section governs when a pass may report; § Re-sweep obligation below governs what a later pass re-runs.

**Why:** a partial sweep reported as a verdict costs a full repair-and-re-review cycle, and the lane pays that cost rather than the reviewer. PRISM PR #471's first review pass reported four Majors, its re-review found a fifth of the same class — a spec clause with no consumer — and the PR review after that found the same class a third time; PRISM PR #470 ran ten rounds, several of which found the prior round's defect shape in a new place.

---

## Re-sweep obligation

On any pass after the first, the angles that were bounded are re-run in full against the reviewed surface, not merely checked for whether the prior pass's findings were fixed. The bounded set is the whole trigger: § Enumeration already reports an under-swept angle as `not reached`, so there is no separate thinness heuristic left to apply — a short enumeration over a full range is a finished sweep, and re-running it buys nothing.

**Why:** verifying a fix is a different act from sweeping an angle. A pass that only does the former inherits the prior pass's gaps while reporting a fresh status.
