# PRISM

A multi-team AI toolkit for Claude Code, Codex, and Cursor. Named-persona skills, opinionated workflows, and engineering rules that pull down into your codebase and stay in sync.

> **Status:** Phase 1 (foundation) is in progress. The skill generator works end-to-end on the dogfood install. The Atlas onboarding skill (Phase 2) and Winston's codebase-scan integration (Phase 3) land in follow-up work. See [.prism/spec/adrs/](./.prism/spec/adrs/) for the architectural record.

## What you get

- **Named personas** (Winston, Clove, Eric, Briar, Sasha, Eli, Sage, Pixel, Reese, Lilac, Nora, Mira) — each owns a domain (architecture, implementation, review, debugging, docs, design, QA, standups, ticket setup, user stories, changelog).
- **Multi-platform skill generation** — author a skill once in `.ai-skills/`, generate platform-specific outputs for Claude Code (`.claude/skills/`), Codex (`.agents/skills/` + `.codex/agents/`), and Cursor (`.generated/cursor-skills/`).
- **A tiered context system** — `.prism/rules/` for cross-cutting standards loaded into every conversation, `.prism/architect/` for path-scoped context loaded only when relevant files are touched, `.prism/spec/adrs/` for durable decisions.
- **Templates** — PR descriptions, acceptance criteria, bug reports, standup summaries, ticket types — shaped for cross-team consistency.
- **Per-team parameterization** — your org name, ticket prefix, Linear project, GitHub repo, and tech stack flow into the install via `.ai-skills/config.json`.

## Quick start

PRISM lives as a sibling repo next to your codebase, not inside it. Pull it down once, run the onboarding flow, and PRISM writes a customized `.claude/`, `.codex/`, or `.cursor/` setup into your repo.

```bash
# One-time bootstrap (in a directory next to your codebase)
git clone https://github.com/HunterMcGrew/agent-crew.git prism
cd prism
pnpm install

# Phase 2 (coming): walk Atlas through onboarding for your codebase
pnpm prism:onboard --target ../your-codebase

# Pull updates later
cd prism && git pull
pnpm prism:sync --target ../your-codebase
```

Until Phase 2 lands, PRISM is usable as a dogfood install in this repo itself — `pnpm prism:bootstrap`, `pnpm prism:build`, and the personas work on PRISM's own evolution.

## Repo shape

```
prism/                            (currently named agent-crew/ on disk)
├── .ai-skills/                   # canonical multi-platform skill source
│   ├── config.schema.json        # JSON Schema for per-team config.json
│   ├── definitions/
│   │   ├── paths.json            # output locations
│   │   └── roles.json            # skill-id → persona mapping
│   └── skills/
│       └── prism-<role>/
│           ├── frontmatter.yml
│           ├── shared.md         # ~95% of skill body
│           ├── claude.md         # Claude-specific additions (optional)
│           ├── codex.md          # Codex-specific additions (optional)
│           └── cursor.md         # Cursor-specific additions (optional)
│
├── templates/                    # verbatim distribution surface
│   └── claude/                   # rules, ADRs, architect docs, templates,
│                                 # references — copied to consumer's repo
│                                 # at sync time with ${TOKEN} substitution
│
├── scripts/ai-skills/            # generator + tooling (TypeScript via tsx)
│   ├── build.ts                  # canonical → platform outputs
│   ├── bootstrap-from-claude.ts  # one-time importer
│   ├── utils.ts
│   └── discovery-metadata.test.ts
│
├── .claude/                      # PRISM's own dogfood install
│
├── docs/
│   ├── distribution.md           # how teams pull updates
│   └── parameterization.md       # config keys + token reference
│
├── package.json                  # pnpm prism:* scripts
├── tsconfig.json
└── README.md                     # this file
```

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm prism:bootstrap` | One-time importer. Reads `.claude/skills/<id>/SKILL.md` and splits into the canonical `.ai-skills/skills/<id>/` shape. Renames `thrive-` prefixes to `prism-`. |
| `pnpm prism:build` | Regenerate platform outputs from `.ai-skills/`. Writes `.claude/skills/`, `.agents/skills/`, `.codex/agents/`, `.generated/cursor-skills/`. |
| `pnpm prism:check` | Drift detection. Fails if any generated output is out of sync with canonical. CI-ready. |
| `pnpm prism:test` | Regression suite for canonical-source invariants (description length, role mapping, managed marker presence). |
| `pnpm prism:check-types` | TypeScript check on the generator scripts. |
| `pnpm prism:onboard --target <path>` | **Phase 2** — Atlas walks your codebase through onboarding. Not yet implemented. |
| `pnpm prism:sync --target <path>` | **Phase 2** — copies the latest distribution into a target repo, with token substitution and three-way merge. Not yet implemented. |

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

- **Phase 1 — Foundation** (in progress on `phase-1-foundation` branch). Project tooling, multi-platform skill generator, canonical sources for every named persona, parameterization layer, prune of source-codebase content, distribution surface populated.
- **Phase 1.5 — Bridge work** (between Phase 1 and Phase 2). Two follow-up PRs that prepare the install for Atlas: (1) `prism-install-layout` bifurcates content to `.prism/` canonical with build-time copies into platform dirs (so Codex/Cursor consumers aren't second-class); (2) `prism-tokenization` implements ADR-0030's build-time substitution layer at the post-reorg paths. Both land before Atlas so Phase 2 writes the new layout from day one.
- **Phase 2 — Atlas onboarding skill** (after Phase 1.5). Six-phase conversational install: identity → codebase context → rules selection → templates verification → architect handoff → final wiring. Resumable via `.prism/onboarding-state.json`.
- **Phase 3 — Winston codebase-scan integration**. Winston scans the consumer's codebase, proposes 10–20 architect docs and a populated `manifest.json`, drafts a `verification-commands.md` from the team's actual tooling, and anchors a `0001-adopting-prism.md` ADR for the team's adoption.

## Background

PRISM was extracted from a personal install of Thrive's `.claude/` toolkit. The multi-platform skill-sync pattern was proved out in [TracTru/thrive#1758](https://github.com/TracTru/thrive/pull/1758) — that PR is read-only context for this repo's evolution.

## Development

PRISM uses itself for its own evolution — Winston for architectural decisions, Clove for implementation, Eric and Briar for review. The `.claude/` install at the root is the dogfood. When you improve PRISM, you do it through PRISM.

## License

Private. Internal-org use only.
