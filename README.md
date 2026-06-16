# PRISM

A multi-team AI toolkit for Claude Code, Codex, and Cursor. Named-persona skills, opinionated workflows, and engineering rules that pull down into your codebase and stay in sync.

> **Status:** Phases 1, 1.5, and 2 shipped. Atlas onboarding (Phase 2) is end-to-end — stack detection, per-team rule generators, stub-anchor population, and config writing all work against the dogfood install. Theo (Phase 2.5, architect-doc walker) and Ren (Phase 2.6, refactor scout) followed. Parker (Phase 3, the PRD persona) is the current build — greenfield and brownfield modes are in. The skill generator runs end-to-end and platform-agnostic content lives at `.prism/` with build-time copies into platform dirs. See [.prism/spec/adrs/](./.prism/spec/adrs/) for the architectural record.

## What you get

- **Named personas** — 17 personas, each owning a domain:
  - **Build & ship:** Winston (architecture), Clove (implementation), Eric (PR review), Briar (self-review), Sasha (debugging)
  - **Plan & spec:** Parker (PRDs), Mira (user stories), Nora (ticket setup), Pixel (UI/UX), Reese (QA test plans)
  - **Document & decide:** Eli (documentation), Theo (architect-doc walker), Sage (changelog), Lilac (standups)
  - **Maintain & onboard:** Atlas (onboarding), Ren (refactor scout), Zoe (cadence audit)
- **Multi-platform skill generation** — author a skill once in `.ai-skills/`, generate platform-specific outputs for Claude Code (`.claude/skills/`), Codex (`.agents/skills/` + `.codex/agents/`), and Cursor (`.cursor/skills/`).
- **A tiered context system** — `.prism/rules/` for engineering standards, loaded in three tiers per [ADR-0035](./.prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md): Tier 1 universal rules always-on (e.g. `code-comments.md`, `git-conventions.md`); Tier 2 path-scoped via `paths:` YAML frontmatter (e.g. `accessibility.md` only loads when the diff touches UI files); Tier 3 skill-internal rules that only load when the citing skill loads. `.prism/architect/` holds path-scoped context loaded only when relevant files are touched. `.prism/spec/adrs/` holds durable decisions.
- **Templates** — PR descriptions, acceptance criteria, bug reports, standup summaries, ticket types — shaped for cross-team consistency.
- **Per-team parameterization** — your org name, ticket prefix, Linear project, GitHub repo, and tech stack flow into the install via `.ai-skills/config.json`.

## Quick start

PRISM lives as a sibling repo next to your codebase, not inside it. Pull it down once, then invoke Atlas from your AI tool to write a customized `.claude/`, `.codex/`, or `.cursor/` setup into your repo.

```bash
# One-time bootstrap (in a directory next to your codebase)
git clone https://github.com/HunterMcGrew/PRISM.git prism
cd prism
pnpm install
pnpm prism:build
```

Then, from inside your target codebase, open Claude Code (or Codex / Cursor) and invoke Atlas:

> "Atlas, onboard this repo."

Atlas detects your stack, asks the questions it needs, generates per-team rules from your actual code, populates stub anchors in persona sources, writes `.ai-skills/config.json`, and tracks progress in `.ai-skills/registry/onboarding-state.json` so an interrupted session can resume. The `pnpm prism:sync` distribution-pull flow lands in a follow-up — until then, re-running `pnpm prism:build` in the PRISM repo regenerates the platform outputs.

## Repo shape

The install layout is bifurcated: platform-agnostic content lives at `.prism/`, platform dirs hold build-time copies plus their own platform-specific outputs. See [ADR-0031](./.prism/spec/adrs/_toolkit/0031-bifurcated-install-layout.md) for the decision and reasoning.

```
PRISM/
├── .ai-skills/                   # canonical multi-platform skill source
│   ├── config.schema.json        # JSON Schema for per-team config.json
│   ├── definitions/
│   │   ├── paths.json            # canonical roots + platform output locations
│   │   └── roles.json            # skill-id → persona mapping
│   └── skills/
│       └── prism-<role>/
│           ├── frontmatter.yml
│           ├── shared.md         # ~95% of skill body
│           ├── claude.md         # Claude-specific additions (optional)
│           ├── codex.md          # Codex-specific additions (optional)
│           └── cursor.md         # Cursor-specific additions (optional)
│
├── .prism/                       # platform-agnostic canonical content (this repo's dogfood)
│   ├── rules/                    # cross-cutting rules (always loaded)
│   ├── architect/                # path-scoped context + manifest.json
│   ├── spec/adrs/                # architectural decision records
│   ├── templates/                # PR description, AC, bug report, etc.
│   ├── references/               # operational flows reused across skills
│   ├── plans/                    # agent-written; canonical-only, not mirrored
│   ├── lessons.md                # agent-written; canonical-only, not mirrored
│   └── SPEC.md                   # Tier 0 meta-doc
│
├── .claude/, .codex/, .cursor/   # build copies of read-only canonical areas
│   skills/, agents/, etc.        # plus platform-specific outputs alongside
│                                 # (regenerated by `pnpm prism:build`; do not hand-edit)
│
├── templates/install/            # consumer distribution surface
│   ├── AGENTS.md.tmpl            # cross-platform constitution
│   ├── .claude/CLAUDE.md.tmpl    # Claude-specific behavioral guidance
│   ├── .prism/                   # canonical content shipped to consumers
│   ├── .codex/, .cursor/         # platform-specific anchors
│
├── scripts/ai-skills/            # generator + tooling (TypeScript via tsx)
│   ├── build.ts                  # canonical → platform outputs + content copy
│   ├── bootstrap-from-claude.ts  # one-time importer
│   ├── path-guard.ts             # build-time path-reference guard
│   ├── literal-guard.ts          # detects unsubstituted literals leaking into canonical
│   ├── lib/                      # Atlas helpers (stack detection, rule generators, anchors)
│   ├── utils.ts
│   └── *.test.ts                 # tsx --test suite (anchor substitution, atlas dogfood,
│                                 #   content copy, discovery, literal guard, onboarding,
│                                 #   path guard, rule generators, stack detect, tokens)
│
├── docs/
│   ├── parameterization.md       # config keys + token reference
│   └── content/dev/
│       ├── architecture/         # paired dev docs (e.g. install-layout.md)
│       └── operations/           # operational guides (e.g. distribution.md)
│
├── package.json                  # pnpm prism:* scripts
├── tsconfig.json
└── README.md                     # this file
```

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm prism:bootstrap` | One-time importer. Reads `.claude/skills/<id>/SKILL.md` and splits into the canonical `.ai-skills/skills/<id>/` shape. Renames `thrive-` prefixes to `prism-`. |
| `pnpm prism:build` | Regenerate platform outputs from `.ai-skills/`. Writes `.claude/skills/`, `.agents/skills/`, `.codex/agents/`, `.cursor/skills/`, `.codex/codex-config.toml`. Runs `prism:test` on completion. |
| `pnpm prism:check` | Drift detection. Fails if any generated output is out of sync with canonical. CI-ready. |
| `pnpm prism:test` | Regression suite (anchor substitution, Atlas dogfood, content copy, discovery metadata, literal guard, onboarding state/config, path guard, rule generators, stack detection, token substitution). |
| `pnpm prism:check-types` | TypeScript check on the generator scripts. |

Onboarding and ongoing distribution-pull flows are now persona-driven, not CLI:

- **Onboarding** — invoke Atlas from your AI tool inside the target repo. See _Quick start_ above.
- **Distribution pull** — re-running `pnpm prism:build` regenerates platform outputs from the latest canonical sources. A dedicated `prism:sync` flow (three-way merge into a consumer repo) is planned follow-up work.

## Per-team config

Teams configure PRISM via `.ai-skills/config.json` in their own repo:

```json
{
  "org": "TracTru",
  "project": "KTC",
  "ticketPrefix": "KTC",
  "ticketSystem": {
    "kind": "linear",
    "workspace": "tractru",
    "teamKey": "KTC"
  },
  "github": { "owner": "tractru", "repo": "ktc-frontend" },
  "techStack": ["nextjs", "react", "typescript", "tailwind"],
  "rules": { "universal": "all" }
}
```

See [docs/parameterization.md](./docs/parameterization.md) for the full schema, all available tokens, and what each field controls.

## Phased roadmap

- **Phase 1 — Foundation** (shipped). Project tooling, multi-platform skill generator, canonical sources for every named persona, parameterization layer, distribution surface populated.
- **Phase 1.5 — Bridge work** (shipped, 1.5a through 1.5e). Bifurcated install layout (`.prism/` canonical with build-time copies into platform dirs), Thrive `.claude/` backports, three-tier rule loading model, Zoe cadence persona, build-time token substitution + literal-Thrive guard.
- **Phase 2 — Atlas onboarding skill** (shipped). Stack detection, per-team rule generators, stub-anchor population mechanism, conversational install with resumable state in `.ai-skills/registry/onboarding-state.json`. Dogfooded against this repo.
- **Phase 2.5 — Theo** (shipped). Architect-doc walker. Walks a target directory, applies the Deletion Test to find load-bearing decisions, prompts write/skip/defer per candidate, drafts ADRs + paired dev docs on request. State persists in `.prism/theo-state.json`.
- **Phase 2.6 — Ren** (shipped). Refactor scout. Walks the codebase, ranks refactor candidates by deletion-test strength, grills the chosen candidate through five passes, produces a refactor plan at `.prism/plans/refactor-<slug>.md`.
- **Phase 3 — Parker** (in progress). The PRD persona. Greenfield mode (brain dump → stakes calibration → fast/coaching path → reviewer rubric → finalize) and brownfield mode (walks existing code and synthesizes a PRD) — both landed. Produces `.prism/prds/<slug>.md` plus an optional `decision-log.md`. Sits above Mira on grain.
- **Phase 4 — Winston codebase-scan integration** (planned). Winston scans the consumer's codebase, proposes 10–20 architect docs and a populated `manifest.json`, drafts a `verification-commands.md` from the team's actual tooling, and anchors a `0001-adopting-prism.md` ADR for the team's adoption.

## Background

PRISM was extracted from a personal install of Thrive's `.claude/` toolkit. The multi-platform skill-sync pattern was proved out in [TracTru/thrive#1758](https://github.com/TracTru/thrive/pull/1758) — that PR is read-only context for this repo's evolution.

## Development

PRISM uses itself for its own evolution — Winston for architectural decisions, Clove for implementation, Eric and Briar for review. The `.claude/` install at the root is the dogfood. When you improve PRISM, you do it through PRISM.

## License

Private. Internal-org use only.
