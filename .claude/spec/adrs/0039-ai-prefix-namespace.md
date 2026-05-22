---
Number: 0039
Title: `.ai-*` Prefix Namespace Validates PRISM's `.prism/` Choice
Status: accepted
Date: 2026-05-22
---

## Context

The directories that AI tooling drops into a consumer team's repo are starting to converge on a shared shape. Cursor uses `.cursor/`. Claude Code uses `.claude/`. Cline uses `.clinerules/`. Aider uses `.aider/`. Each tool stakes out a top-level dotfile directory named after itself, isolating its config and state from the rest of the project. The pattern is well-established enough that consumer teams now recognize "I see a `.<toolname>/` directory in the repo" as a reliable signal that an AI tool is installed.

The pattern extends beyond top-level config directories. Companion conventions like `.ai-skills/` (PRISM's canonical skill-source directory) and `.ai-rules/` (used by several emerging tools) suggest a broader `.ai-*` namespace — directories prefixed with `.ai-` that hold AI-toolkit content, distinct from any single vendor.

PRISM made its naming choice during the extraction from Thrive: canonical content lives at `.prism/`, generated platform copies live at `.claude/`, `.codex/`, `.cursor/`, etc. The `.prism/` name was chosen for consistency with the convergence pattern — it identifies the AI-toolkit directory at a glance and doesn't pollute the project's top-level namespace. The `.ai-skills/` source directory follows the same convention from the broader `.ai-*` namespace.

The question this ADR closes: is `.prism/` the right name, and is `.ai-skills/` the right name for the source directory? Two approaches were considered:

- **(a) Rename to a generic name like `.agents/` or `.ai/`.** Rejected — the value of the `.<toolname>/` convention is that consumer teams can identify which AI toolkit is installed at a glance. A generic name loses that signal. Multiple AI toolkits in the same repo would collide on `.agents/`.
- **(b) Keep `.prism/` and `.ai-skills/` as chosen.** Adopted — matches the convergence pattern, identifies the toolkit clearly, no top-level pollution. The `.ai-skills/` name aligns with the broader `.ai-*` namespace for tooling content that isn't vendor-specific.

## Decision

PRISM's directory naming choices are validated and locked:

- **`.prism/`** is the canonical content directory. Matches the `.<toolname>/` convention adopted by Cursor, Claude Code, Cline, Aider, and the broader AI-tooling space. Identifies PRISM at a glance in a consumer repo.
- **`.ai-skills/`** is the canonical skill-source directory at the repo root, distinct from `.prism/` because skill sources are PRISM-development content (the source the build script reads), not consumer-team content (the output the build script writes to `.prism/skills/` and platform copies). The `.ai-*` prefix puts it in the same shared namespace as `.ai-rules/`, `.ai-context/`, and other emerging conventions.
- **Generated platform copies** (`.claude/`, `.codex/`, `.cursor/`) continue to match each platform's own convention — consumer teams expect Cursor content at `.cursor/`, Claude content at `.claude/`, and they get it.

The namespace choice means consumer teams onboarding PRISM into a repo with existing AI tooling don't see top-level collisions. `.prism/` lives next to `.cursor/` without conflict; `.ai-skills/` lives next to `.ai-rules/` without conflict.

## Consequences

- **Positive:** Consumer teams identify PRISM at a glance via `.prism/`. The naming reads as "this is the PRISM AI toolkit's directory" with no ambiguity.
- **Positive:** No top-level pollution. The two PRISM-related directories (`.prism/` and `.ai-skills/`) both live in conventionally-recognized AI-tooling namespaces.
- **Positive:** Platform copies follow each platform's expected convention. Consumer teams using Claude Code, Cursor, or Codex don't need to teach those tools where to look — the directories are where the tools expect them.
- **Negative:** Two directories instead of one. A consumer team new to PRISM may briefly wonder why `.prism/` and `.ai-skills/` both exist; the bifurcated install layout (ADR-0031) documents the split.
- **Neutral:** The choice is reversible if the broader namespace convergence shifts. The directory names are not encoded into PRISM's source-of-truth files — renaming would be a mechanical sweep.

## References

- Thrive PR #2017 — origin of the namespace-validation analysis in the dogfood.
- [ADR-0031](./0031-bifurcated-install-layout.md) — sibling decision: bifurcated install layout. `.prism/` is the canonical output surface; platform copies under `.claude/`, `.codex/`, `.cursor/` are generated mirrors.
- [ADR-0032](./0032-canonical-skill-content-is-generic.md) — sibling decision: canonical skill content is generic. `.ai-skills/` holds that canonical content as input to the build.
