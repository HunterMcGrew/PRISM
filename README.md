# PRISM

A multi-platform AI toolkit for Claude Code, Codex, and Cursor. Named-persona skills, opinionated workflows, and engineering rules that pull down into your codebase and stay in sync.

## Overview

PRISM gives AI tools a set of named personas — specialists with defined roles, defined inputs, and defined outputs. When Winston plans architecture, Clove implements it, Briar reviews it, and Eli documents it, each picks up where the last left off. The branch plan carries context across sessions; a tiered rule system carries conventions across the codebase.

**What you get:**

- **Named personas across the dev lifecycle** — architect (Winston), implementer (Clove), self-reviewer (Briar), PR reviewer (Eric), debugger (Sasha), doc writer (Eli), ticket writer (Nora), QA planner (Reese), and more. Each has a defined scope, defined inputs, and a definition of done.
- **Multi-platform skill sync** — one canonical skill source (`.ai-skills/`) builds to Claude Code, Codex, and Cursor. `pnpm prism:build` regenerates all platform outputs; `pnpm prism:check` catches drift on CI.
- **Drop-in adoption for existing repos** — `npx @huntermcgrew/prism adopt` seeds `.prism/` and projects the persona roster into any codebase. A local-checkout path is also available for air-gapped environments and contributors.
- **Sol — the multi-agent conductor** — orchestrates the full dev lifecycle for a stated goal: dispatches personas in sequence, pauses at human gates, and runs parallel lanes when blast radius doesn't overlap.

See [docs/overview.md](./docs/overview.md) for the full overview. See [CHANGELOG.md](./CHANGELOG.md) for history. See [SECURITY.md](./SECURITY.md) for PRISM's trust model and how to report a security issue.

## Quick start

The fastest path runs PRISM directly from npm — no clone required.

**Step 1 — Initialize config in your target repo:**

```bash
cd your-repo
npx @huntermcgrew/prism init
```

`prism init` asks for your project name, ticket prefix, ticket system, and GitHub owner/repo, then writes `.ai-skills/config.json`. It detects your tech stack automatically.

**Step 2 — Adopt PRISM:**

```bash
npx @huntermcgrew/prism adopt
```

This seeds `.prism/` from the PRISM install surface and projects the persona roster into `.claude/`, `.codex/`, and `.cursor/`. It's a first-contact command — after the first run, use `npx @huntermcgrew/prism update` to pull in future PRISM changes.

**Step 3 — Run Atlas for AI-assisted onboarding:**

Open Claude Code inside your repo and invoke Atlas:

> "Atlas, onboard this repo."

Atlas generates per-team engineering rules from your actual code, populates stack-specific guidance, and fills in the stub anchors `adopt` put in place.

For the full setup walkthrough — stack detection, config writing, resumable state, and alternative install methods (vendor clone, global link, `--consumer` flag) — see **[docs/getting-started.md](./docs/getting-started.md)** and **[docs/adopt-prism.md](./docs/adopt-prism.md)**. Adopting into a repo that already has its own AI tooling? See **[docs/adopting-into-existing-repos.md](./docs/adopting-into-existing-repos.md)** for what adopt touches, what it skips, and how to resolve `.bak` conflicts.

Want to know exactly what PRISM will write before you run it? See **[docs/what-prism-writes.md](./docs/what-prism-writes.md)** for the full inventory, and **[SECURITY.md](./SECURITY.md)** for the trust model behind it. Hit a snag? See **[docs/troubleshooting.md](./docs/troubleshooting.md)**.

## Repo shape

Platform-agnostic content lives at `.prism/`; platform dirs hold build-time copies. See [ADR-0031](./.prism/spec/adrs/_toolkit/0031-bifurcated-install-layout.md) for the decision.

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
├── .prism/                       # platform-agnostic canonical content
│   ├── rules/                    # cross-cutting rules (always loaded)
│   ├── architect/                # path-scoped context + manifest.json
│   ├── spec/adrs/                # architectural decision records
│   ├── templates/                # PR description, AC, bug report, etc.
│   ├── references/               # operational flows reused across skills
│   ├── plans/                    # agent-written; canonical-only, not mirrored
│   ├── lessons.md                # agent-written; canonical-only, not mirrored
│   └── SPEC.md                   # tier hierarchy and spec ownership model
│
├── .claude/                      # Claude Code build copy
│   ├── skills/                   # generated SKILL.md per persona
│   ├── agents/                   # generated agent markdown per persona
│   └── ...                       # rules, architect, references (mirrored)
│
├── .agents/                      # Codex (OpenAI agents SDK) build copy
│   └── skills/                   # generated SKILL.md per persona
│
├── .codex/                       # Codex adapter build copy
│   ├── agents/                   # generated .toml per persona
│   ├── codex-config.toml         # generated top-level Codex config
│   └── ...                       # rules, architect, references (mirrored)
│
├── .cursor/                      # Cursor build copy
│   ├── skills/                   # generated SKILL.md per persona
│   └── ...                       # rules, architect, references (mirrored)
│
│   (all platform dirs regenerated by `pnpm prism:build`; do not hand-edit)
│
├── templates/install/            # consumer distribution surface
│   ├── .prism/                   # seeded into consumer's .prism/ by adopt
│   │   ├── rules/                # cross-cutting rules
│   │   ├── architect/            # manifest + context stubs
│   │   ├── references/           # operational flow templates
│   │   ├── spec/                 # ADR stubs
│   │   ├── templates/            # PR description, AC, bug report templates
│   │   └── SPEC.md.tmpl          # tier hierarchy template
│   ├── .claude/                  # seeded into consumer's .claude/ by adopt
│   │   ├── CLAUDE.md.tmpl        # Claude-specific instructions template
│   │   └── settings.json         # empty stub; consumer-populated
│   ├── .codex/                   # empty stub in the seed; persona roster is projected here at adopt/update time
│   ├── .cursor/                  # empty stub in the seed; persona roster is projected here at adopt/update time
│   └── AGENTS.md.tmpl            # cross-platform constitution template
│
├── scripts/ai-skills/            # generator + tooling (TypeScript via tsx)
│   ├── build.ts                  # canonical → platform outputs + content copy
│   ├── adopt.ts                  # first-contact consumer install (prism:adopt)
│   ├── update.ts                 # steady-state consumer sync (prism:update)
│   ├── init.ts                   # writes .ai-skills/config.json (prism init)
│   ├── bundle.ts                 # compiles dist/cli.js for npm publish
│   ├── path-guard.ts             # build-time path-reference guard
│   ├── literal-guard.ts          # fails the build if origin-specific literals leak into generated outputs
│   ├── lib/                      # Atlas helpers (stack detection, rule generators, anchors)
│   └── *.test.ts                 # regression suite
│
├── docs/
│   ├── overview.md               # what PRISM is and why teams adopt it
│   ├── getting-started.md        # setup walkthrough
│   ├── adopt-prism.md            # adopt + update reference (npx, vendor, global link)
│   ├── adopting-into-existing-repos.md  # coexisting with existing AI tooling + .bak conflicts
│   ├── what-prism-writes.md      # full inventory of every path adopt/update/eject can touch
│   ├── troubleshooting.md        # common adopt/update/build failures and how to resolve them
│   ├── workflow.md               # ticket → plan → implement → review → ship
│   ├── personas.md               # what each persona does and when to call them
│   └── parameterization.md       # config keys + token reference
│
├── package.json                  # pnpm prism:* scripts
├── tsconfig.json
├── SECURITY.md                   # trust model + how to report a security issue
└── README.md                     # this file
```

## Commands

### In the PRISM repo

These run from inside your PRISM checkout and operate on PRISM's own canonical sources.

| Command | What it does |
|---------|-------------|
| `pnpm prism:build` | Regenerate platform outputs from `.ai-skills/`. Writes `.claude/skills/`, `.agents/skills/`, `.codex/agents/`, `.cursor/skills/`, and `.codex/codex-config.toml`. Runs `prism:test` on completion. |
| `pnpm prism:check` | Full drift detection — fails if any generated output is out of sync with canonical, types fail, tests fail, manifest coverage fails, or any cross-reference is broken. CI-ready. |
| `pnpm prism:test` | Regression suite (anchor substitution, Atlas dogfood, content copy, discovery metadata, literal guard, onboarding state/config, path guard, rule generators, stack detection, token substitution). |
| `pnpm prism:check-types` | TypeScript check on the generator scripts. |
| `pnpm prism:verify-manifest` | Verifies `.prism/architect/manifest.json` covers the expected personas and files. |
| `pnpm prism:crossref-lint` | Prose cross-reference lint — fails when a repo-root-absolute path reference (`.prism/`, `scripts/`, `.ai-skills/`, `templates/`) in canonical prose does not resolve on disk. Exit 0 means all references resolve. |
| `pnpm prism:bundle` | Compiles `scripts/ai-skills/cli.ts` to `dist/cli.js` for npm publish. Run automatically by `prepublishOnly`. |
| `pnpm prism:bootstrap` | One-time importer. Reads `.claude/skills/<id>/SKILL.md` and splits each into the canonical `.ai-skills/skills/<id>/` shape. |
| `pnpm prism:migrate-skill` | Decomposes any generated skill shape (`.claude`, `.cursor`, `.agents`, `.codex`) back into canonical source. Generalizes `prism:bootstrap`. |

### In a consumer repo (via npm)

These are the commands a consumer repo uses after adopting PRISM. Run from your target codebase.

| Command | What it does |
|---------|-------------|
| `npx @huntermcgrew/prism init` | Writes `.ai-skills/config.json` for a cold consumer — run this before `adopt`. Prompts for project name, ticket prefix, ticket system, and GitHub repo; detects your stack automatically. |
| `npx @huntermcgrew/prism adopt` | Seeds `.prism/` and projects the persona roster into `.claude/`, `.codex/`, and `.cursor/`. First-contact command; refuses to run if `.prism/` already has a sync record. |
| `npx @huntermcgrew/prism update` | Pulls PRISM's latest canonical content into an already-adopted repo. Overwrites PRISM-owned files when unchanged; backs up diverged files with `.bak`. |
| `npx @huntermcgrew/prism doctor` | Reports install health in one pass: validates `.ai-skills/config.json` against its schema, confirms the target is a git repo, reports sync-manifest drift (diverged/missing files vs. their `.bak` siblings), and compares the installed version against the latest on npm. Read-only — never writes. Exits 0 when healthy, non-zero with a findings list otherwise. |
| `npx @huntermcgrew/prism eject` | Removes PRISM-owned `.prism/` files and projected `prism-*` skills/agents, then the sync manifest. Requires `--yes`; dry-run by default. Preserves consumer-owned content and backs up any diverged PRISM-owned file to `.bak` before removing it — never destroys unrecoverable edits. |
| `pnpm prism:adopt` | Same as `npx ... adopt` but run from inside a local PRISM checkout. Use when you've cloned PRISM as a sibling or vendored it inside your repo. |
| `pnpm prism:update` | Same as `npx ... update` but run from inside a local PRISM checkout. |
| `pnpm prism:doctor` | Same as `npx ... doctor` but run from inside a local PRISM checkout. |
| `pnpm prism:eject` | Same as `npx ... eject` but run from inside a local PRISM checkout. |
| `--dry-run` | Add to `adopt` or `update` (either invocation style) to preview the run — prints the would-be written / skipped / overwritten / `.bak` summary without writing anything. Both commands also validate `.ai-skills/config.json` against the schema and confirm the target is inside a git repository before any write, dry-run or not. |

## Per-team config

Teams configure PRISM via `.ai-skills/config.json` in their own repo. `prism init` writes a baseline during first install; Atlas fills in per-team rules and stack-specific guidance during AI-assisted onboarding. You can edit the file manually at any time. See [docs/parameterization.md](./docs/parameterization.md) for the full schema and all available tokens.

## Background

PRISM was extracted from a personal multi-platform `.claude/` toolkit install. The multi-platform skill-sync pattern was proved out in that codebase before PRISM was spun off as a standalone tool.

## Development

PRISM uses itself for its own evolution — Winston for architectural decisions, Clove for implementation, Eric and Briar for review. The `.claude/` install at the root is the dogfood. When you improve PRISM, you do it through PRISM.

## License

MIT — see [LICENSE](./LICENSE). Use it, fork it, build on it. The license keeps the
copyright notice attached to the source; beyond that, a shout-out is appreciated but
not required.
