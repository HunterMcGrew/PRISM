---
Number: 0058
Title: Single Audience Retires the Paired Dev-Doc Convention
Status: accepted
Date: 2026-06-16
Supersedes: 0038
---

## Context

PRISM grew up inside Thrive. Thrive's docs live in a Nextra site with a hard split between agent-facing reasoning and human-facing narrative, and its codebase is full of editor blocks whose behavior a human engineer reads about in one place and an agent reads about in another. In that context, pairing every architect doc at `.prism/architect/<topic>.md` with a human-facing companion at `docs/content/dev/architecture/<topic>.md` was the right call — two genuinely distinct audiences read the same decision through different lenses, and [ADR-0038](./0038-paired-dev-doc-gates.md) made the pairing an enforced invariant so the human surface couldn't drift stale. [ADR-0023](./0023-architect-docs-source-verified-review.md) and [ADR-0044](./0044-direct-write-tool-outputs.md) each picked up a paired-doc obligation as a sibling of that invariant.

The context changed when PRISM became its own product. PRISM has one audience: the developer-user who installs PRISM into their own repo. There is no second human surface sitting behind a Nextra split — the architect doc *is* the thing the developer-user reads, and the doc format that lands in their tree is a per-team onboarding output (Atlas decides where docs go and in what shape during onboarding), not a fixed `docs/content/dev/architecture/**` path PRISM mandates. Maintaining a paired companion for every architect doc now means authoring and syncing a second copy of a decision for a reader who doesn't exist as a separate audience. The cost ADR-0038 paid for — doubled authoring, perpetual re-sync — buys nothing once the two audiences collapse into one.

This ADR retires the paired-dev-doc gating. It supersedes three clauses precisely, and deliberately leaves the rest of those ADRs standing:

- **[ADR-0038](./0038-paired-dev-doc-gates.md) — superseded wholesale.** Its entire subject is the paired-dev-doc gate (the one-to-one pairing, the build-time check, the cross-citation, Theo and Winston as the gate's operators). With single-audience docs, none of it survives.
- **[ADR-0023](./0023-architect-docs-source-verified-review.md) — only its paired-dev-doc clause is superseded.** ADR-0023 extended source-verified review to `docs/content/dev/architecture/**`; that extension goes away with the paired surface. Its core — that architect docs at `.prism/architect/**` require source-verified review, manifest-routed and load-bearing — **survives untouched**. That gate is live and does real work every time the manifest routes a doc into agent context.
- **[ADR-0044](./0044-direct-write-tool-outputs.md) — only its paired-doc obligation is superseded.** ADR-0044 mandated a paired companion at `docs/content/dev/ai-skills/compatibility.md` for its architect spec; that mandate goes away. Its spine — direct-write build outputs to tool namespaces, the `.generated/` staging collapse, the committed-`.cursor/skills/`-vs-ignored-Codex-config split — **survives untouched**.

## Decision

Retire the paired-dev-doc convention. Architect docs at `.prism/architect/<topic>.md` no longer require a paired companion at `docs/content/dev/architecture/<topic>.md`, the build-time pairing gate is removed, and no persona owns paired-doc authoring or sync.

Doc format and placement for the developer-user become a per-team onboarding output: Atlas determines, during onboarding, where and in what shape a consumer team's docs live. PRISM no longer mandates a fixed human-facing doc path.

The supersession is scoped, not blanket:

- ADR-0038 is superseded wholesale — its `Status` becomes `superseded` with `Superseded-by: 0058`.
- ADR-0023's paired-dev-doc clause is superseded; its architect-doc (`.prism/architect/**`) source-verification gate stands. ADR-0023 stays `accepted` and carries a `Superseded-in-part-by: 0058` field naming the retired clause.
- ADR-0044's paired-doc obligation is superseded; its direct-write / `.generated`-collapse spine stands. ADR-0044 stays `accepted` and carries a `Superseded-in-part-by: 0058` field naming the retired obligation.

## Consequences

- **Positive:** No second copy of any decision to author or keep in sync. The architect doc is the single source the developer-user reads, and the source-verification bar that already guards it (ADR-0023's surviving half) keeps it grounded.
- **Positive:** Doc format stops being a PRISM mandate and becomes a per-team fit decision Atlas makes at onboarding — the right place for it, since consumer repos differ in where developer docs belong.
- **Negative:** Prose across the surface still references the paired convention — the architect-doc-verification rule, the dev-doc-template reference, Theo's doc-walker steps, plan-mode, and several architect docs all name paired dev docs or `docs/content/dev/architecture/**`. This ADR is the decision record; the prose sweep that propagates the retirement is sequenced as separate Epic A work (Clove and Winston tasks in `epic-prism-docs-overhaul.md`). Until that sweep lands, a reader of those files sees the old convention and has to reconcile it against this ADR.
- **Neutral:** The two surviving halves (ADR-0023 architect-doc source verification, ADR-0044 direct-write spine) are unaffected. Anyone auditing the supersession should confirm those gates still read as live — they are.
- **Neutral:** This decision is correct *because the context changed*. The paired-doc clauses in ADR-0038/0023/0044 were correct for Thrive's Nextra, two-audience setting; nothing about them was a mistake. The retirement is a context shift (PRISM is now its own single-audience product), not a correction.

## References

- [ADR-0038](./0038-paired-dev-doc-gates.md) — superseded wholesale by this ADR.
- [ADR-0023](./0023-architect-docs-source-verified-review.md) — only its paired-dev-doc clause is superseded; its architect-doc source-verification gate survives.
- [ADR-0044](./0044-direct-write-tool-outputs.md) — only its paired-doc obligation is superseded; its direct-write spine survives.
- [ADR-0040](./0040-atlas-as-onboarding-persona.md) — Atlas is the onboarding persona that now owns per-team doc-format decisions.
- `.prism/plans/epic-prism-docs-overhaul.md` — the Epic A plan this PR is sequenced under.
