---
title: "Publishing PRISM to npm"
description: "The release ritual for PRISM maintainers — version bump, pre-publish gates, leak audit, and npm publish."
category: "operations"
audience: "dev"
last_updated: "2026-06-27"
---

# Publishing PRISM to npm

PRISM is published to npm as `@huntermcgrew/prism`. This guide is for maintainers with push access to the PRISM repository and publish rights to the `@huntermcgrew` npm scope.

> [!CAUTION]
> npm versions are immutable. A published version cannot be overwritten. Unpublish is restricted to 72 hours after publish and is strongly discouraged — once a consumer pins to a version, unpublishing breaks their install. Get the pre-publish gates right every time.

## Prerequisites

- npm account with access to the `@huntermcgrew` scope
- npm 2FA configured (required for publishing scoped packages)
- `pnpm` installed locally
- Authenticated: `npm whoami` returns your username

## The release ritual

Work through these steps in order. The `prepublishOnly` hook enforces some of them automatically, but the leak audit and tarball review are manual gates that run before `npm publish`.

### Step 1 — Bump the version

Edit `version` in `package.json`:

```bash
# Example: bumping to 1.1.0
# Edit package.json manually, or use:
npm version minor --no-git-tag-version   # bumps minor, skips auto-tag
```

Commit the version bump on its own:

```bash
git add package.json
git commit -m "chore: bump version to 1.1.0"
```

PRISM follows semver. Patch releases fix bugs without changing the consumer-facing interface; minor releases add backwards-compatible behavior (new personas, new rules); major releases include breaking changes to the adopt/update contract.

### Step 2 — Run `prism:check` and confirm it's green

```bash
pnpm run prism:check
```

`prism:check` validates the full persona roster and canonical content. A broken or stale roster must never publish — this is enforced automatically by `prepublishOnly`, which runs `prism:bundle` (the esbuild/dist step), `prism:build`, and `prism:check` before packing — and `prepack` runs `prism:bundle` independently, so even a bare `npm pack` cannot produce a tarball without a freshly built bundle, but confirm it passes now so you're not surprised at publish time.

### Step 3 — Run the leak audit

This step is the most important gate before any publish. The npm tarball is world-readable and permanent. PRISM's operational tree — plans, lessons, audit reports, retro notes, conductor state — lives in directories that must never ship to consumers.

The `files` field in `package.json` is an inclusion allowlist, so only named paths ship. But verify before trusting:

```bash
# Pack without publishing — produces the tarball
npm pack

# List all files in the tarball and save the listing
tar tzf huntermcgrew-prism-*.tgz | sort > /tmp/prism-tarball-contents.txt

# Assert zero operational-tree paths leaked
grep -E 'prism/(plans|audits|retros|prds|changelogs|archived)/|prism/lessons\.md|conductor-state|audit-state\.json' /tmp/prism-tarball-contents.txt && echo "LEAK DETECTED — STOP" || echo "CLEAN — no operational tree in tarball"
```

The grep must print `CLEAN — no operational tree in tarball`. If it prints `LEAK DETECTED`, stop. Do not publish. Check the `files` array in `package.json` and remove the offending path.

### Step 4 — Human review of tarball contents

Open `/tmp/prism-tarball-contents.txt` and read through it. Confirm:

- `dist/cli.js` is present (the compiled binary — untracked in git, built fresh by `prepack`/`prepublishOnly`, so a missing entry here means the build step failed, not that someone forgot to commit it)
- `.prism/rules/`, `.prism/architect/`, `.prism/spec/`, `.prism/references/`, `.prism/templates/`, `.prism/SPEC.md` are present
- `.prism/.sync-manifest.json` is present
- `templates/install/` is present — including `templates/install/.claude/settings.json`
- `.ai-skills/skills/`, `.ai-skills/definitions/roles.json`, `.ai-skills/definitions/paths.json`, `.ai-skills/config.json` are present
- `scripts/` is **not** present (build-time only)
- No files from `.prism/plans/`, `.prism/audits/`, `.prism/retros/`, `.prism/prds/`, `.prism/changelogs/`, `.prism/archived/`, `.prism/lessons.md`, or any `conductor-state*.json` or `audit-state.json`

This human review is the last gate before an immutable publish. Take the extra two minutes.

### Step 5 — Publish

```bash
npm publish --access public
```

npm will prompt for your 2FA code. After publish, confirm the package is live:

```bash
npm view @huntermcgrew/prism
```

This should return the version you just published. If it 404s, check your npm auth and scope access.

## Pre-publish checklist

Run through this before every publish:

- [ ] Version bumped in `package.json` and committed
- [ ] `pnpm run prism:check` passes (green)
- [ ] `npm pack` completes without error
- [ ] Leak audit grep prints `CLEAN — no operational tree in tarball`
- [ ] `/tmp/prism-tarball-contents.txt` reviewed by a human — expected paths present, `scripts/` absent
- [ ] `npm whoami` confirms you're authenticated to the `@huntermcgrew` scope

## Immutability and unpublish policy

Once a version is published, it's permanent. npm allows `npm unpublish` within 72 hours of publish, but doing so breaks any consumer who installed that version in the window. Treat unpublish as emergency-only.

If a version ships with a bug, publish a patch release instead. If a version ships with a security issue in the tarball contents (operational tree leak), publish a patch release and file a CVE advisory if warranted — do not attempt to unpublish.

The immutability constraint is the main reason the leak audit ritual exists. One clean publish costs you five minutes; one leaked publish is permanent.

## `pnpm-workspace.yaml` `allowBuilds` and build script approvals

`pnpm-workspace.yaml` carries an `allowBuilds` list that explicitly permits esbuild's build script to run on install. pnpm blocks `postinstall` and build scripts by default as a security measure.

When a future devDependency ships a build or postinstall script, pnpm will silently skip its build unless it's listed here. If a new dependency stops working after install and the package should have run a build step, add its package name to `allowBuilds` in `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  esbuild: true
  your-new-package: true
```

This is a pnpm-specific concern — npm install runs build scripts by default and doesn't need this configuration.

`pnpm-workspace.yaml` also carries a `packages: ["."]` field even though this repo isn't a real workspace — CI pins pnpm v9 (`.github/workflows/prism-check.yml`), and v9's `pnpm store path` call fails with "packages field missing or empty" if the file exists without that key. See `.prism/plans/prism-248.md` for the original CI break and `.prism/plans/issue-422.md` for the migration off `package.json`'s `pnpm` field, which pnpm v10.26+ stopped reading.

## Related pages

- [Adopt PRISM into your repo](./adopt-prism.md) — the consumer-facing adopt and update flow
- [Distribution](./distribution.md) — how the install layout works and what lands where in a consumer repo
