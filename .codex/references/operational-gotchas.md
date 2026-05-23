# Operational Gotchas

Working notes about specific tools, environments, or commands that broke in non-obvious ways. Each entry is a one-time lesson with a permanent home — they live here instead of `lessons.md` because the working-notes file decays after a session. If you hit a weird thing and the symptom matches one of these, the rule is the path forward.

This file starts with universal cross-team gotchas. Team-specific entries are added by skills (and by hand) over time as new gotchas surface in the team's environment.

---

## GitHub Actions ternary returns wrong value when truthy branch is `0`, `''`, or `false`

**What broke:** `fetch-depth: ${{ inputs.release_tag != '' && 0 || 1 }}` evaluated to `1` for both branches because GHA expressions use JS-style truthiness — `(true && 0)` → `0`, then `(0 || 1)` → `1`. The release path silently lost full-history fetch.

**Rule:** Never put a falsy literal (`0`, `''`, `false`, `null`) in the truthy slot of a GHA ternary. Either flip the condition so the falsy value lives on the false side, or quote both values as strings (`'0'` / `'1'`) so both branches are truthy. Add a one-line comment explaining the inversion when you flip it — the obvious form looks correct and a future reader will "fix" it back.

**Where it shows up:** any GHA workflow expression with a ternary.

---

## ESLint plugin resolution fails under pnpm strict hoisting

**What broke:** `npx eslint --fix` failed with "couldn't find the plugin eslint-plugin-react-hooks". The plugin lived in `node_modules/.pnpm/node_modules/eslint-plugin-react-hooks` (pnpm flat store) but wasn't hoisted to `node_modules/eslint-plugin-react-hooks` where `eslint-config-next` (and similar shared configs) look.

**Rule:** ESLint plugin resolution can break under pnpm's strict hoisting in monorepos. Known environment issue, not a code issue. When ESLint fails with plugin-not-found errors, check `.npmrc` `public-hoist-pattern[]` — the fix is to add the plugin name to the hoist list, not to debug PATH or directory layout. As a fallback, skip ESLint and rely on Prettier + type checks.

**Where it shows up:** any pnpm monorepo running ESLint with a shared config that expects hoisted plugins.

---

## Temp files for `gh pr create --body-file` are session-scoped — write fresh, don't parallel-batch

**What broke:** `gh pr create --body-file /tmp/pr-body.md` ran in the same parallel batch as a `Write` that was supposed to populate the body. The `Write` failed (file already existed from a previous session); `gh pr create` succeeded but used the stale content. The new PR opened with a description from a completely different ticket.

**Rule:** Before every `gh pr create --body-file <path>` — (a) `Read` the file first if it exists, then `Write` fresh content, and (b) never put the `Write` and the `gh pr create` in the same parallel batch. Sequence them. `/tmp/*` and `.git/*` paths are session-scoped and stale across invocations.

**Where it shows up:** any agent flow that builds a PR body in a temp file before calling `gh pr create`.

---

## Linear sanitizer drops content after unescaped angle brackets

**What broke:** A Linear `save_issue` description contained a bullet with `useRef<HTMLInputElement>(null)`. Linear's sanitizer parsed `<HTMLInputElement>` as an HTML opening tag, never found a close, and silently deleted the rest of the bullet plus the next four bullets. The save returned success.

**Rule:** Avoid `<Word>` or `<Word ...>` patterns anywhere in a Linear description, even inside backticks — the sanitizer hits raw angle brackets before code-span parsing. For TS generic syntax, rephrase ("`ComponentProps<Foo>`" → "the component's Props type for Foo") or drop the generic. After any Linear save, re-fetch the description and spot-check section lengths against the input.

**Where it shows up:** any Linear MCP `save_issue` / `save_comment` call carrying TS generics or HTML-shaped text.

---

## Linear sanitizer drops body after `**N. Label.**` paragraphs

**What broke:** A Linear update with `**1. Title (Severity).** body paragraph` patterns saved the section heading and intro but dropped the bodies of every numbered subsection. No error.

**Rule:** When formatting numbered subsections in Linear, use `### Title — Severity` (H3) instead of `**N. Label.**` paragraphs. The Linear parser mishandles bold-prefix paragraphs and silently drops the body.

**Where it shows up:** any Linear MCP description or comment with structured subsections.

---

## Worktree absolute paths don't auto-rewrite to the active worktree

**What broke:** Working inside a git worktree, tool calls used absolute paths like `/workspace/frontend/...` from the main workspace. Those paths resolved to the **main workspace**, not the worktree. Edits landed on the wrong branch; recovery required copying files worktree-ward and `git restore` on the main workspace.

**Rule:** Inside Edit / Write / Read / Grep tool calls while in a worktree, always use the full worktree-qualified absolute path or worktree-relative paths. Shell `cd` and worktree-entry commands do not influence tool-argument path resolution. Sanity-check before the first edit: make a test change, then `git status --porcelain` in both the worktree and the main workspace. If the worktree shows clean and the main shows dirty, you targeted the wrong path.

**Where it shows up:** any worktree session using absolute paths under the main repo root.

---

## `usermod -m` migrates the current home tree — don't combine with system-managed home

**What broke:** A planned rename of a system user from `www-data` → `app-user` in a Dockerfile used `usermod -l app-user -d /home/app-user -m -s /bin/bash www-data`. The `-m` flag means "move the current home contents to the new home." The system user's home in the base image was a service-managed path (e.g. `/var/www` for Apache, holding the document tree) — so `-m` would have moved the entire service tree into `/home/app-user` and broken the container. Caught before shipping.

**Rule:** Before passing `-m` to `usermod`, check the user's current home: `getent passwd <user> | cut -d: -f6`. If it's a system-managed path (`/var/www`, `/srv/*`, `/opt/*`, `/nonexistent`), don't combine `-d NEW` with `-m`. Either repoint the home without migrating (`usermod -l NEW_NAME -d NEW_HOME -s SHELL`, then `mkdir -p NEW_HOME && chown`), or keep the current home and skip the rename. `-m` assumes a regular user-owned home; system daemon users violate that assumption.

**Where it shows up:** any Docker / devops work renaming a daemon user.
