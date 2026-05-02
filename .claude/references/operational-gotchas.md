# Operational Gotchas

Working notes about specific tools, environments, or commands that broke in non-obvious ways. Each entry is a one-time lesson with a permanent home — they live here instead of `lessons.md` because the working-notes file decays after 30 days. If you hit a weird thing and the symptom matches one of these, the rule is the path forward.

---

## GitHub Actions ternary returns wrong value when truthy branch is `0`, `''`, or `false`

**What broke:** `fetch-depth: ${{ inputs.release_tag != '' && 0 || 1 }}` evaluated to `1` for both branches because GHA expressions use JS-style truthiness — `(true && 0)` → `0`, then `(0 || 1)` → `1`. The release path silently lost full-history fetch.

**Rule:** Never put a falsy literal (`0`, `''`, `false`, `null`) in the truthy slot of a GHA ternary. Either flip the condition so the falsy value lives on the false side, or quote both values as strings (`'0'` / `'1'`) so both branches are truthy. Add a one-line comment explaining the inversion when you flip it — the obvious form looks correct and a future reader will "fix" it back.

**Where it shows up:** any GHA workflow expression with a ternary.

Source: lessons.md 2026-04-25.

---

## ESLint plugin resolution fails from the repo root under pnpm hoisting

**What broke:** Running `npx eslint --fix` from `frontend/` failed with "couldn't find the plugin eslint-plugin-react-hooks". The plugin lives in `node_modules/.pnpm/node_modules/eslint-plugin-react-hooks` (pnpm flat store) but isn't hoisted to `node_modules/eslint-plugin-react-hooks` where `eslint-config-next` looks.

**Rule:** ESLint plugin resolution in this monorepo is broken by pnpm's strict hoisting. Known environment issue, not a code issue. When ESLint fails with plugin-not-found errors, skip ESLint and rely on Prettier + TypeScript type checks. Don't waste time on PATH or directory experiments — the fix needs `.npmrc` hoisting changes.

**Where it shows up:** any agent or developer running `eslint` against this repo.

Source: lessons.md 2026-04-06.

---

## PHP tests need `composer install` before first run

**What broke:** Multiple sessions across THR-1448 marked "PHP tests skipped — PHP not installed locally" in plan PR Readiness. PHP was installed; missing Composer dependencies (Symfony Console, etc.) caused class-not-found errors. `composer install` from the plugin directory fixed it; all 317 tests passed.

**Rule:** When PHP tests fail with class-not-found errors or are assumed unavailable, run `composer install` from the plugin directory first (`backend/plugins/gravity-platform-core/`). Don't mark PHP tests as "skipped" without attempting the install.

**Where it shows up:** any first-run PHP test invocation. See `.claude/rules/verification-commands.md` for the test commands themselves.

Source: lessons.md 2026-04-08.

---

## `/tmp/pr-body.md` is shared across sessions — write fresh before `gh pr create`

**What broke:** `gh pr create --body-file /tmp/pr-body.md` for THR-1638 ran in the same parallel batch as a `Write` that was supposed to populate the body. The `Write` failed (file already existed from a previous session); `gh pr create` succeeded but used the stale content. The new PR opened with a description from a completely different ticket.

**Rule:** Before every `gh pr create --body-file /tmp/pr-body.md` — (a) `Read` the file first if it exists, then `Write` fresh content, and (b) never put the `Write` and the `gh pr create` in the same parallel batch. Sequence them. `/tmp/pr-body.md` is session-scoped and stale across invocations.

**Where it shows up:** any agent flow that uses `/tmp/pr-body.md` for `gh pr create`.

Source: lessons.md 2026-04-20.

---

## Linear sanitizer drops content after unescaped angle brackets

**What broke:** A Linear `save_issue` description contained a bullet with `useRef<HTMLInputElement>(null)`. Linear's sanitizer parsed `<HTMLInputElement>` as an HTML opening tag, never found a close, and silently deleted the rest of the bullet plus the next four bullets. The save returned success.

**Rule:** Avoid `<Word>` or `<Word ...>` patterns anywhere in a Linear description, even inside backticks — the sanitizer hits raw angle brackets before code-span parsing. For TS generic syntax, rephrase ("`ComponentProps<Foo>`" → "the component's Props type for Foo") or drop the generic. After any Linear save, re-fetch the description and spot-check section lengths against the input.

**Where it shows up:** any Linear MCP `save_issue` / `save_comment` call carrying TS generics.

Source: lessons.md 2026-04-20.

---

## Linear sanitizer drops body after `**N. Label.**` paragraphs

**What broke:** A Linear update with `**1. Title (Severity).** body paragraph` patterns saved the section heading and intro but dropped the bodies of every numbered subsection. No error.

**Rule:** When formatting numbered subsections in Linear, use `### Title — Severity` (H3) instead of `**N. Label.**` paragraphs. The Linear parser mishandles bold-prefix paragraphs and silently drops the body.

**Where it shows up:** any Linear MCP description or comment with structured subsections.

Source: lessons.md 2026-04-27.

---

## Turbopack dev caches arbitrary-value Tailwind utilities with `!` and `var()` across HMR

**What broke:** THR-1659 iterated CSS three times. Each version applied on desktop via dev HMR but never reached an iPhone via ngrok. Symptoms looked identical to iOS Safari cache. Wiping `.next` and `.turbo` and restarting the dev server fixed it within seconds.

**Rule:** For any CSS iteration combining `!` (important modifier) + `[var(--custom-prop)]` (arbitrary value) Tailwind utilities, tested through a tunnel — `rm -rf .next .turbo && pnpm run dev` is step 1 of the verification loop, not optional. Skip it and you'll chase phantom iOS Safari cache bugs while the dev server reports the latest CSS as deployed.

**Diagnostic:** when a fix works on desktop but not through a tunnel, suspect Turbopack cache before iOS cache. Add a visible-on-all-states utility (`border-t-4 border-red-500`) to the same class string. If neither the real fix nor the marker reaches the phone, it's bundle-level (server), not browser-level.

**Where it shows up:** any Tailwind iteration involving `!` + `[var(...)]` arbitrary-value utilities tested via tunnel.

Source: lessons.md 2026-04-22.

---

## Worktree absolute paths don't auto-rewrite to the active worktree

**What broke:** Working inside `/workspace/.claude/worktrees/<ticket>/`, tool calls used absolute paths like `/workspace/frontend/...` or `/workspace/.claude/...`. Those paths resolved to the **main workspace**, not the worktree. Edits landed on the wrong branch; recovery required copying files worktree-ward and `git restore` on the main workspace.

**Rule:** Inside Edit / Write / Read / Grep tool calls while in a worktree, always use the full worktree-qualified absolute path (`/workspace/.claude/worktrees/<ticket>/...`) or worktree-relative paths. Shell `cd` and `EnterWorktree` do not influence tool-argument path resolution. Sanity-check before the first edit: make a test change, then `git status --porcelain` in both the worktree and the main workspace. If the worktree shows clean and the main shows dirty, you targeted the wrong path.

**Where it shows up:** any worktree session using absolute paths under `/workspace/`.

Source: lessons.md 2026-04-20 + 2026-04-21 (same root cause, merged).

---

## `usermod -m` migrates the current home tree — don't combine with system-managed home

**What broke:** THR-1654 planned to rename `www-data` → `app-user` in `Dockerfile.admin` with `usermod -l app-user -d /home/app-user -m -s /bin/bash www-data`. The `-m` flag means "move the current home contents to the new home." `www-data`'s home in the `wordpress:php8.2-apache` base image is `/var/www` — Apache's docroot — so `-m` would have moved the entire Apache document tree into `/home/app-user` and broken the container. Caught before shipping.

**Rule:** Before passing `-m` to `usermod`, check the user's current home: `getent passwd <user> | cut -d: -f6`. If it's a system-managed path (`/var/www`, `/srv/*`, `/opt/*`, `/nonexistent`), don't combine `-d NEW` with `-m`. Either repoint the home without migrating (`usermod -l NEW_NAME -d NEW_HOME -s SHELL`, then `mkdir -p NEW_HOME && chown`), or keep the current home and skip the rename. `-m` assumes a regular user-owned home; system daemon users violate that assumption.

**Where it shows up:** any Docker / devops work renaming a daemon user.

Source: lessons.md 2026-04-21.
