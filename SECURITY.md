# Security

PRISM adds AI-agent skills, rules, and reference docs to your repository. This page explains what that means for your codebase's trust boundary — what PRISM can touch, when it acts, and how a security issue gets reported.

## The trust model, in short

- **PRISM only runs when you run it.** There's no background process, no watcher, no telemetry call. Every write happens inside `prism adopt`, `prism update`, or `prism eject` — commands you invoke explicitly.
- **Nothing executes automatically on install.** `npm install` (or `npx @huntermcgrew/prism ...`) never triggers a hook. There's no `postinstall` script in PRISM's `package.json`.
- **PRISM ships no hooks of its own.** The `.claude/settings.json` PRISM seeds into your repo is a literal empty object (`{}`) — no enforcement, no automated gating, nothing wired to fire on any event. PRISM's skills are guidance the AI agent reads and applies at its own discretion, not code that runs in your process.
- **Skills are plain Markdown.** Every persona PRISM installs — Winston, Clove, Briar, and the rest — is a Markdown file with frontmatter. It has no execution model of its own; it only "does" anything when an AI agent (Claude Code, Codex, Cursor) reads it after you invoke that persona. There's no script bundled inside a skill that runs independently of the agent session.
- **adopt never overwrites your files.** The first time you run `prism adopt`, it writes into your repo — but only at paths that don't already exist. If a file is already there, adopt skips it and moves on. This holds for every path in the seed, not a subset.
- **update never silently replaces your edits.** If you've hand-modified a file PRISM owns, `prism update` backs up your version to `<file>.bak` before writing PRISM's incoming version. Your edit is never lost — it's sitting right next to the new file, waiting for you to decide what to do with it.
- **The published package is audited before every release.** PRISM's release process includes a leak-audit gate that scans the npm tarball for anything that shouldn't ship — PRISM's own operational files (plans, lessons, audit reports, conductor state) never leave the PRISM repo. See [Publishing PRISM to npm § Step 3 — Run the leak audit](./docs/publishing-prism.md#step-3--run-the-leak-audit) for the exact mechanism.

## What PRISM can write to your repo

The full inventory — every path `adopt` and `update` can create or modify, and which ones are safe to hand-edit — lives in [docs/what-prism-writes.md](./docs/what-prism-writes.md). Read that page before adopting into a repo you care about.

The short version: PRISM only ever writes inside `.prism/`, into the persona-skill directories under `.claude/`, `.codex/`, and `.cursor/` (all prefixed `prism-`, so they never collide with your own tooling), and — only if you opt in with `--seed-agents-md` — a root `AGENTS.md` file, and only when one doesn't already exist. It never touches `.env` files, source code, CI config, dependency manifests, or anything outside those paths.

## Token substitution happens at build time, not on your machine

PRISM's skill content uses `${TOKEN}`-style placeholders (project name, ticket prefix, and so on) that get substituted with values from your `.ai-skills/config.json`. That substitution runs locally, inside `prism adopt` / `prism update`, using only the config file already in your repo — it does not fetch values from a remote service. If a token is ever left unsubstituted, PRISM's build-time guard catches it before publish (see [docs/publishing-prism.md](./docs/publishing-prism.md)), and `prism doctor` can catch a bad config in your own repo before you hit a leftover-token failure — see [docs/troubleshooting.md](./docs/troubleshooting.md).

## Diverged files are backed up, never silently replaced

`prism update` compares three things for every PRISM-owned file: the incoming PRISM content, what's currently in your repo, and the hash PRISM recorded the last time it wrote that file. If your copy matches what PRISM last wrote, it's overwritten cleanly — you never touched it, so there's nothing to lose. If your copy has diverged — you edited it — the original is copied to `<file>.bak` (or `.bak.1`, `.bak.2`, and so on, if earlier backups already exist) before the new version lands. PRISM never destroys an edit you made on purpose. The same backup-before-write rule applies inside `prism eject` for any PRISM-owned file that's diverged at removal time.

For the full walkthrough — how `.bak` files show up, what they mean, and how to resolve them — see [docs/adopting-into-existing-repos.md](./docs/adopting-into-existing-repos.md).

## Reporting a security issue

If you find a security issue in PRISM — a leak audit gap, a file PRISM writes outside its documented scope, an ownership-classification bug that could cause a `prism update` or `prism eject` to remove or overwrite something it shouldn't — please report it privately rather than opening a public issue.

Use [GitHub's private security advisory form](https://github.com/HunterMcGrew/PRISM/security/advisories/new) for the repository. This routes the report to the maintainer without disclosing it publicly until a fix is available.

> [!NOTE]
> This repository doesn't yet have a dedicated security contact email or a published disclosure SLA — the GitHub advisory flow above is the current best path and is pending confirmation from the maintainer. If you'd rather not use GitHub's flow, open a regular issue asking for an alternate contact method without describing the vulnerability itself.

## Related pages

- [docs/what-prism-writes.md](./docs/what-prism-writes.md) — the complete inventory of every path PRISM can create or modify
- [docs/adopting-into-existing-repos.md](./docs/adopting-into-existing-repos.md) — coexistence rules and the `.bak` conflict-resolution workflow
- [docs/publishing-prism.md](./docs/publishing-prism.md) — the release ritual, including the pre-publish leak audit
- [docs/troubleshooting.md](./docs/troubleshooting.md) — common install and update failures and how to resolve them
