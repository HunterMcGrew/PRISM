# Local Dev Seeders

Local development seeders live in `backend/seeds/`. One file per entity, named `seed-<entity>.php`, each supporting an optional `cleanup` positional argument. They run inside the `admin` Docker container via `wp eval-file` and are local-only — they never run against staging or production.

For the human-facing rulebook (purpose, naming, idempotency, run commands, gotchas, future runner), see [`backend/seeds/README.md`](../../backend/seeds/README.md). For the narrative dev doc with the originating-incident story, see [`docs/content/dev/architecture/dev-seeders.md`](../../docs/content/dev/architecture/dev-seeders.md).

## The commit-it rule

If you seed something that doesn't already have a seeder here, write one and commit it. Future agents will rediscover the same gotchas otherwise.

**Why:** the events seeder built during THR-1418 surfaced four undocumented gotchas (cleanup-via-`$wpdb`, timezone fallback, TEC date split, plugin-conflict workaround). The seeder cost multiple iterations to land; the agent that wrote it nearly shipped a broken fixture before the database-direct cleanup query proved the only reliable cleanup path. None of that lived in code or docs — only in chat history. A committed seeder + this doc + the README is what stops the next agent from paying the same cost.

**How to apply:** when adding a new seeder, follow these conventions:

- **Naming.** `backend/seeds/seed-<entity>.php`. The directory is the convention — no other naming pattern to remember.
- **Idempotency tag.** Tag every seeded post with the meta key `_thrive_seeded = 1`. Cleanup mode finds rows by this tag and only this tag.
- **Cleanup via `$wpdb->postmeta`.** Query the meta table directly with raw SQL. Entity-aware plugins (TEC, others) apply filters to `WP_Query` / `get_posts` that hide seeded rows from plain meta lookups even when the rows exist. Cleanup must bypass those filters.
- **Timezone fallback.** Read `get_option( 'timezone_string' )` and fall back to `'UTC'` when empty. WordPress returns offset format (e.g. `-05:00`) on fresh installs, and entity plugins (TEC again) silently miscompute UTC fields from offset inputs.
- **TEC date/time split.** `tribe_create_event` parses `EventStartDate` as `Y-m-d` only and pulls the time from a separate `EventStartTime` field. Same split for end date/time. Passing a combined `Y-m-d H:i:s` into `EventStartDate` produces a midnight event.
- **Plugin-conflict workaround.** Every `wp eval-file` example must include `--skip-plugins=wpae-acf-add-on`. The local stack has a `pmae_admin_notices` redeclaration between `wpae-acf-add-on` and `wp-all-export-csv-excel-xml-for-acf` that fatals WP-CLI before WordPress loads. The flag goes in the docblock, the README, and every command anyone copies.
- **Local-only intent.** State it in the docblock at the top of the file, repeat it in the README's run section, and never include a command that targets a non-local environment. Repetition is the safety budget.

## Where seeders go

- ✅ `backend/seeds/seed-<entity>.php` — the place.
- ❌ `backend/scripts/seed-*.php` — wrong directory. If you find one here, move it to `backend/seeds/`.

This doc is routed via `manifest.json` on `backend/seeds/**` and `backend/scripts/seed-*.php` so the misplacement case loads the doc and surfaces the correction.

## Future runner

A `seed-all.php` runner is planned for the second-seeder PR. With one seeder, `wp eval-file` against the file is the runner. Building a generic runner now would front-load complexity for hypothetical future seeders. When seeder #2 lands: discover all `seed-*.php`, run each, aggregate output.
