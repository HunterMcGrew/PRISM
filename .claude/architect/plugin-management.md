# Plugin Management

Architect context for `backend/plugins-from-storage.txt`. Loaded when this file appears in a diff.

For the full human-readable guide (plugin sources, Azure workflow, CI integration), see `docs/content/dev/architecture/plugin-management.md`.

---

## Rules for `plugins-from-storage.txt`

- Entries must be **alphabetically sorted** — insert in the correct position, do not append
- Each line is an exact filename matching the zip in Azure Blob Storage
- No blank lines between entries
- File must end with a trailing newline

## Adding or updating a plugin

1. The zip must already exist in Azure Blob Storage before adding it here
2. Add or update the filename in alphabetical order
3. One filename per line — no comments, no metadata, just the zip filename
