/**
 * Per-platform rule-dialect translation for the content-copy step.
 *
 * Canonical rules live at `.prism/rules/*.md` and carry the Claude dialect:
 * every rule declares `load: always | paths | skill` in frontmatter (ADR-0070,
 * amending ADR-0035), with a `paths:` YAML list alongside `load: paths`.
 * Claude reads that dialect directly, so its platform copies stay
 * byte-identical to canonical. Cursor does not — its rules loader keys on
 * `.mdc` files whose frontmatter uses `globs:` (path-scoped) or `alwaysApply:
 * true` (always-on). A verbatim `.md` copy carrying `paths:` is untiered at
 * best and inert at worst (lessons.md 2026-06-04, routed to #73). Codex
 * cannot path-tier rules at all, so it receives clean copies with all
 * frontmatter stripped.
 *
 * `load: skill` rules never reach this module — the platform-copy path in
 * `build.ts` excludes them before any dialect transform runs (they exist only
 * canonically), so every rule these functions see is `load: always` or
 * `load: paths`. Both dialects fall back to always-on when a rule carries no
 * recognizable `load:` at all (a legacy consumer rule predating this
 * mechanism) — matching the ratified default consumer-facing callers apply.
 *
 * This module rewrites the `rules` area per platform:
 * - Cursor: `load: paths` + its `paths:` list → `globs:`; everything else
 *   (`load: always`, or no declaration) → `alwaysApply: true`. `.md` → `.mdc`.
 * - Codex: all frontmatter is stripped, regardless of its `load:` value —
 *   Codex has no frontmatter primitive at all, so every rule reaches it as a
 *   clean body. Path mapping is identity (`.md` stays).
 * Every other area, and Claude, pass through unchanged.
 */
import path from "node:path";

import { parseRuleLoad, splitFrontmatter } from "./rule-load";

export interface RuleDialect {
	/**
	 * Rewrites the canonical rule body into the platform's dialect. Receives the
	 * post-token-substitution content; returns it unchanged for non-rule areas.
	 */
	transformContent(area: string, content: string): string;
	/**
	 * Maps a canonical relative path to its platform target path. Renames
	 * `*.md` → `*.mdc` inside the rules area for Cursor; identity elsewhere.
	 */
	mapTargetRelativePath(area: string, relativePath: string): string;
	/**
	 * Inverse of `mapTargetRelativePath`: maps a platform target path back to
	 * the canonical source path the orphan-cleanup pass checks for existence.
	 * Renames `*.mdc` → `*.md` inside the rules area for Cursor; identity
	 * elsewhere.
	 */
	mapSourceRelativePath(area: string, relativePath: string): string;
}

const RULES_AREA = "rules";

/** The identity dialect — Claude and Codex copy canonical rules verbatim. */
export const verbatimRuleDialect: RuleDialect = {
	transformContent: (_area, content) => content,
	mapTargetRelativePath: (_area, relativePath) => relativePath,
	mapSourceRelativePath: (_area, relativePath) => relativePath,
};

/**
 * Rewrites a `paths:` YAML key to `globs:`, preserving the list items verbatim,
 * and drops the `load:` key entirely — Cursor's loader has no `load:`
 * primitive, only `globs:`/`alwaysApply:`, so the key would be dead
 * frontmatter in the Cursor context (the same reasoning the Codex dialect
 * applies by stripping all frontmatter).
 */
function rewritePathsToGlobs(frontmatter: string): string {
	return frontmatter.replace(/^load:.*\n/m, "").replace(/^paths:/m, "globs:");
}

/**
 * Derives the Cursor frontmatter from the rule's `load:` declaration: `load:
 * paths` rewrites its `paths:` list to `globs:`; every other case (`load:
 * always`, or no recognizable declaration at all) becomes `alwaysApply:
 * true`. Reads `load:` in `"warn"` mode so a legacy consumer rule with no
 * declaration degrades to always-on instead of throwing mid-copy — the same
 * ratified default `prism update`/`prism doctor` apply elsewhere.
 */
function buildCursorFrontmatter(content: string, frontmatter: string | null): string {
	const { load } = parseRuleLoad(content, "<rule>", "warn");

	if (load === "paths" && frontmatter !== null) {
		return `---\n${rewritePathsToGlobs(frontmatter)}\n---`;
	}

	return "---\nalwaysApply: true\n---";
}

/**
 * The Cursor dialect — rewrites rule frontmatter to `globs:`/`alwaysApply:` and
 * renames `.md` → `.mdc`. Non-rule areas pass through unchanged.
 */
export const cursorRuleDialect: RuleDialect = {
	transformContent: (area, content) => {
		if (area !== RULES_AREA) {
			return content;
		}

		const { frontmatter, body } = splitFrontmatter(content);
		const cursorFrontmatter = buildCursorFrontmatter(content, frontmatter);
		const trimmedBody = body.replace(/^\r?\n/, "");

		return `${cursorFrontmatter}\n\n${trimmedBody}`;
	},
	mapTargetRelativePath: (area, relativePath) => {
		if (area !== RULES_AREA || !relativePath.endsWith(".md")) {
			return relativePath;
		}

		return `${relativePath.slice(0, -path.extname(relativePath).length)}.mdc`;
	},
	mapSourceRelativePath: (area, relativePath) => {
		if (area !== RULES_AREA || !relativePath.endsWith(".mdc")) {
			return relativePath;
		}

		return `${relativePath.slice(0, -path.extname(relativePath).length)}.md`;
	},
};

/**
 * The Codex dialect — strips all frontmatter from rule copies so Codex
 * receives clean `.md` files without keys it cannot interpret. Path mapping
 * is identity: Codex reads `.md` directly, no rename needed.
 *
 * Every rule now carries at least a `load:` key (ADR-0070), so "strip the
 * frontmatter" replaces the earlier "strip `paths:` only" rule — Codex has no
 * frontmatter primitive at all, so any frontmatter present misrepresents the
 * file's loading behaviour in the Codex context. Stripping it here mirrors
 * the Cursor lane's precedent: a wrong-dialect key is translated, not
 * tolerated (Decision 3, issue-73 plan).
 */
export const codexRuleDialect: RuleDialect = {
	transformContent: (area, content) => {
		if (area !== RULES_AREA) {
			return content;
		}

		const { frontmatter, body } = splitFrontmatter(content);

		if (frontmatter === null) {
			return content;
		}

		return body.replace(/^\r?\n/, "");
	},
	mapTargetRelativePath: (_area, relativePath) => relativePath,
	mapSourceRelativePath: (_area, relativePath) => relativePath,
};
