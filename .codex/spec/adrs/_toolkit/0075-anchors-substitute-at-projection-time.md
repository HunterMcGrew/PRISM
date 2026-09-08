---
Number: 0075
Title: Anchors Substitute at Projection Time, Not by Mutating Canonical Sources
Status: accepted
Date: 2026-09-02
---

## Context

Anchors were designed so canonical persona sources stay generic and each team's
onboarding fills in the specifics without forking the source (ADR-0032). The
only mechanism that populated them, `runAnchorSubstitution`, worked by
rewriting the canonical `.ai-skills/skills/**` files in place — the team's
product domain landed by editing the same files every consumer's rendered
roster is generated from.

That mechanism assumed those files sit on a writable checkout, which is true
for PRISM's own repo and a vendored toolkit install, and false for an npm
install. There, `.ai-skills/skills/` lives inside `node_modules`, so the call
either no-ops silently (`readdir` returns `ENOENT`, which resolves to an empty
map) or, if pointed at the package root instead, writes into a directory
`npm install` destroys on every reinstall and that every project on the
machine shares. Either way, no npm consumer ever received populated anchor
content. Every anchor reached every npm consumer holding its shipped
placeholder prose — including the literal sentence "Populated during
onboarding from the team's actual product domain" — while
`docs/getting-started.md` § Step 3 told the reader the opposite had happened.

## Decision

Anchor substitution moves into the render pass, beside the token-substitution
step that already reads the consumer's `config.json` on every output
regeneration. `generatePlatformSkills` now applies
`substituteAnchorsInContent` to each skill body before `substituteTokens`,
deriving the replacement content from the consumer's own config in memory. No
file under `.ai-skills/skills/` is written by this pass. In-place mutation is
retired: `runAnchorSubstitution` and `substituteAnchorsAcrossSkills` are
deleted outright, along with the tests that exercised them.

Three alternatives were on the table:

- **Mutate the canonical sources inside `node_modules`.** Rejected — the
  target directory is destroyed on every reinstall and shared across every
  project on the machine that depends on the same package.
- **Have Atlas write a separate anchor-content file for the render pass to
  read.** Rejected — `config.json` already carries every value an anchor
  needs, so a second file would be a second source of truth for content the
  first file already holds, with no new information to justify it.
- **Drop the consumer promise from the docs and leave anchors toolkit-only.**
  The cheapest and most honest of the three, and the alternative this
  decision is measured against. Rejected because it makes the npm install a
  second-class product — every consumer who installs from npm, which is most
  of them, permanently loses a feature toolkit users keep — to save one
  function call in a pass that already reads the same config for tokens.

Anchors substitute before tokens, not after. An anchor's replacement content
is drawn from the same config that feeds the token map, so an anchor body may
legitimately contain a `${...}`-form placeholder of its own. Running tokens
first would leave that placeholder unresolved and trip the leftover-token
guard; anchors first composes correctly and the reverse does not. This
ordering is a constraint the render pass has to keep, not an implementation
detail free to drift.

## Consequences

PRISM's own repo loses the ability to inspect populated anchor content on
disk — there is no longer a step that writes team-specific content into a
file a maintainer can `cat`. Populated content now exists only in the
rendered output (`.claude/skills/**` and its sibling platform trees), which
is where the render pass writes it. Recovering a specific consumer's
populated value means re-running the render, not reading a stored file.

The gain is that anchor substitution now works identically in every install
context — PRISM's own build, a vendored toolkit checkout, and an npm
install — because it depends only on the consumer's config and the render
seam every context already runs, not on a writable canonical-source
directory that only two of the three contexts have.
