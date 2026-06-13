# Parameterization

How team-specific values flow through PRISM into the consumer's installed skills, rules, and templates.

## Two layers: tokens and runtime config

PRISM uses both:

- **Generation-time tokens** — `${TICKET_PREFIX}`, `${ORG}`, `${PROJECT}`, etc. appear in canonical sources (`.ai-skills/skills/<id>/shared.md`, `templates/install/AGENTS.md.tmpl`, etc.) and are substituted to literal values at sync time. The consumer's installed files have substituted values, no tokens.
- **Runtime config (`.ai-skills/config.json`)** — the consumer's repo carries this file with their team's values. Skills branch on `techStack` flags at chat time when behavior depends on the stack. The config is also the source of truth that drives token substitution.

Single source of truth: `.ai-skills/config.json`. Tokens are derived from it.

## Config schema

Lives at [`.ai-skills/config.schema.json`](../.ai-skills/config.schema.json) as JSON Schema. Atlas writes this during onboarding (Phase 2). Manual edits work too.

```json
{
  "org": "TracTru",
  "project": "KTC",
  "ticketPrefix": "KTC",
  "ticketSystem": {
    "kind": "linear",
    "workspace": "tractru",
    "projectId": "abc-def-123",
    "teamKey": "KTC"
  },
  "github": { "owner": "tractru", "repo": "ktc-frontend" },
  "defaultBranch": "main",
  "techStack": ["nextjs", "react", "typescript", "tailwind"],
  "rules": {
    "universal": "all"
  },
  "slackChannel": "#ktc-dev"
}
```

### Field reference

| Field | Type | Required | What it controls |
|---|---|---|---|
| `org` | string | yes | Display org name. Substituted as `${ORG}`. Used in PR descriptions, changelogs, references in personas' shared.md. |
| `project` | string | yes | Project display name. Substituted as `${PROJECT}`. Also derives `${PROJECT_LOWERCASE}` (lowercase form, used in git-config namespaces and similar). |
| `ticketPrefix` | string | yes | Ticket ID prefix (uppercase, no separator). Substituted as `${TICKET_PREFIX}`. Also derives `${TICKET_PREFIX_LOWERCASE}`. Pattern: `^[A-Z][A-Z0-9]+$`. |
| `ticketSystem.kind` | enum | yes | `"linear"` or `"github-issues"`. Drives `${TICKET_TRACKER}`; the Linear-specific fields below apply only when `kind` is `linear`. The object shape is the abstraction lever for future providers (e.g. Jira). |
| `ticketSystem.workspace` | string | linear | Linear workspace slug (the part before `.linear.app`). Substituted as `${LINEAR_WORKSPACE}`. |
| `ticketSystem.projectId` | string | optional | Linear project UUID, if scoped to a single project. |
| `ticketSystem.teamKey` | string | yes | Linear team key. Often matches `ticketPrefix`. Substituted as `${LINEAR_TEAM_KEY}`. |
| `github.owner` | string | yes | GitHub org/user. Substituted as `${GITHUB_OWNER}`. Used by Eric (PR review), Sage (changelog), Reese (QA), Lilac (standup). |
| `github.repo` | string | yes | GitHub repo name. Substituted as `${GITHUB_REPO}`. |
| `defaultBranch` | string | optional | Default branch name. Substituted as `${DEFAULT_BRANCH}`. Defaults to `main`. |
| `techStack` | string[] | optional | Validated against an enum (see schema). Drives onboarding's per-codebase rule generation — e.g. when `typescript` is present, Atlas generates a `code-standards-ts.md` for the team based on patterns in their actual code. |
| `rules.universal` | enum | optional | `"all"` is the only value today. Universal rules always ship. |
| `rules.optIn` | string[] | optional | Names of opt-in rule files (without `.md`). Atlas proposes these based on `techStack` during onboarding; teams can edit. |
| `slackChannel` | string | optional | Optional Slack channel for Lilac standup posting. Substituted as `${SLACK_CHANNEL}`. |

## All tokens

| Token | Source | Example |
|---|---|---|
| `${ORG}` | `org` | `TracTru` |
| `${PROJECT}` | `project` | `KTC` |
| `${PROJECT_LOWERCASE}` | derived from `project` | `ktc` |
| `${TICKET_PREFIX}` | `ticketPrefix` | `KTC` |
| `${TICKET_PREFIX_LOWERCASE}` | derived from `ticketPrefix` | `ktc` |
| `${LINEAR_WORKSPACE}` | `ticketSystem.workspace` | `tractru` |
| `${LINEAR_TEAM_KEY}` | `ticketSystem.teamKey` | `KTC` |
| `${TICKET_TRACKER}` | derived from `ticketSystem.kind` | `**Linear team:** KTC (prefix: KTC-####)` / `**Ticket tracker:** GitHub issues` |
| `${GITHUB_OWNER}` | `github.owner` | `tractru` |
| `${GITHUB_OWNER_LOWERCASE}` | derived from `github.owner` | `tractru` |
| `${GITHUB_REPO}` | `github.repo` | `ktc-frontend` |
| `${DEFAULT_BRANCH}` | `defaultBranch` | `main` |
| `${SLACK_CHANNEL}` | `slackChannel` | `#ktc-dev` |

Tokens use `${UPPER_SNAKE_CASE}`. The substitution layer (implemented in Phase 1.5d, lives in `scripts/ai-skills/lib/tokens.ts`) reads `config.json`, derives lowercase forms, and replaces token literals at build time — canonical files on disk stay tokenized, platform outputs receive substituted content.

Adding a new derived token: extend the substitution map in `scripts/ai-skills/lib/tokens.ts`. Update this doc and the schema description.

### How tokens propagate to consumer installs

Canonical sources at `.prism/` and `.ai-skills/skills/` stay tokenized — the `${TOKEN}` literals never get rewritten on disk. The build script reads `.ai-skills/config.json`, derives the token map, and substitutes during platform-output assembly. Consumer teams running `pnpm prism:build` against their own `config.json` get platform outputs that reflect their team's values; PRISM itself runs the same build against its dogfood `config.json` and produces platform outputs with `PROJECT=PRISM` substituted.

A literal-Thrive guard runs as the last build step against platform outputs (`.claude/`, `.codex/`, `.cursor/`, `.generated/cursor-skills/`). The guard scans for `Thrive`, `tractru`, `TracTru/thrive`, `THR-[0-9]+`, and `thrive.<key>` patterns and fails the build on any non-allowlisted hit. The allowlist at `.ai-skills/definitions/literal-allowlist.json` exempts files where literal references are intentional — frozen incident citations in `lessons.md`, originating-incident ADRs, and their platform-copy mirrors.

## Tech-stack flags

`techStack` is a string array, validated against an enum in the schema. Current values:

- Frontend frameworks: `react`, `vue`, `angular`, `svelte`, `nextjs`, `nuxt`, `node`
- Languages: `typescript`, `javascript`, `php`, `python`, `ruby`, `go`, `rust`, `java`, `kotlin`, `swift`
- CMS / platforms: `wordpress`, `gutenberg`
- Styling: `tailwind`
- Data: `graphql`, `apollo`, `rest`, `prisma`

Why a string array (not booleans):

- Adding a new value (e.g. `"deno"`) doesn't churn every consumer's config file.
- Manifest matching becomes `if (techStack.includes("nextjs"))` — clean.
- The enum lives in the schema so additions are versioned.

To add a new tech-stack value: edit the enum in `.ai-skills/config.schema.json`, document it here, and update any rules/skills that should opt-in based on it.

## What's NOT a token

Some things look tokenizable but aren't:

- **Persona names** (Winston, Clove, Eric, etc.) — durable brand. Same across all teams.
- **Skill IDs** (`prism-architect`, `prism-code-dev`, etc.) — hardcoded `prism-` prefix. The plumbing.
- **File paths** in personas' instructions (e.g. `.prism/rules/writing-voice.md`) — same across all teams.

If you're tempted to tokenize one of these, write an ADR first. The fewer tokens, the easier the substitution layer is to reason about.

## Future: ticket-system providers

`ticketSystem.kind` is `"linear"` only today. The substitution and runtime layers branch on this value, so adding a new provider means:

1. Extend the enum in the schema (`linear | jira | github`).
2. Add the new provider's required fields under `ticketSystem` (e.g. `jira.baseUrl`, `jira.projectKey`).
3. Update Nora's skill (`.ai-skills/skills/prism-ticket-start/`) to dispatch on `kind`.
4. Update ADR-0009 to reference the new provider.

Until a real second provider lands, the abstraction is structural-only — the schema and substitution layer accept the shape; the implementation is Linear-only.
