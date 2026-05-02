# Apps Folder

Quick reference for what belongs in `backend/plugins/*/src/apps/`. The directory hosts standalone WordPress-admin applications that aren't traditional Gutenberg blocks.

For per-app directory structure, runtime context, and the cross-registry `useSelect` rule, see `.claude/architect/backend-apps.md`.

The human-readable narrative companion is at `docs/content/dev/architecture/apps-folder.md`.

---

## What belongs in `/apps/`

A feature lives in `/apps/` when at least two of these apply:

- It has its own React component tree, not a single `edit.tsx`.
- Its state involves multiple hooks, entity records, and a save / dirty / load lifecycle.
- It lives on its own wp-admin page, not inside the Gutenberg post-editor canvas.

If you can imagine the feature shipping as a standalone WordPress plugin, it earns the apps shape.

---

## What does NOT belong in `/apps/`

- Block editor components — those go in `src/blocks/`.
- Shared controls used across blocks — those go in `src/components/`.
- Small behavioral scripts that augment existing wp-admin pages — those go in `src/admin/`.

---

## Existing apps

Mega menu is the first and currently only app. Its specific shell decisions, storage choices, and preview-token pattern are documented in `.claude/architect/mega-menu.md` — those choices are mega-menu's, not generic apps-folder rules. Future apps decide their own shell, storage, and preview shape based on their own requirements.
