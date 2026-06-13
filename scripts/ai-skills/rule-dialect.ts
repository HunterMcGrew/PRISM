/**
 * Per-platform rule-dialect translation for the content-copy step.
 *
 * Canonical rules live at `.prism/rules/*.md` and carry the Claude dialect: a
 * `paths:` YAML list governs Tier 2 load, and Tier 1 rules carry no frontmatter
 * at all (per ADR-0035). Claude and Codex read that dialect directly, so their
 * platform copies stay byte-identical to canonical. Cursor does not — its rules
 * loader keys on `.mdc` files whose frontmatter uses `globs:` (path-scoped) or
 * `alwaysApply: true` (always-on). A verbatim `.md` copy carrying `paths:` is
 * untiered at best and inert at worst (lessons.md 2026-06-04, routed to #73).
 *
 * This module rewrites the `rules` area for Cursor: `paths:` becomes `globs:`
 * with the same glob list, a frontmatter-less Tier 1 rule gains
 * `alwaysApply: true`, and the target filename gains the `.mdc` extension Cursor
 * requires. Every other area, and every other platform, passes through
 * unchanged.
 */
import path from "node:path";

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
 * Splits a rule file into its frontmatter block (if present) and the remaining
 * body. Mirrors the `---\n...\n---` shape `normalizeFrontmatter` already parses
 * elsewhere, but operates on a full rule file rather than a bare frontmatter
 * source.
 */
function splitFrontmatter(content: string): {
	frontmatter: string | null;
	body: string;
} {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) {
		return { frontmatter: null, body: content };
	}

	return { frontmatter: match[1], body: match[2] };
}

/**
 * Rewrites a `paths:` YAML key to `globs:`, preserving the list items verbatim.
 * Only the leading `paths:` key line is renamed — the indented glob entries are
 * the same value the Cursor loader expects under `globs:`.
 */
function rewritePathsToGlobs(frontmatter: string): string {
	return frontmatter.replace(/^paths:/m, "globs:");
}

function buildCursorFrontmatter(frontmatter: string | null): string {
	if (frontmatter === null) {
		return "---\nalwaysApply: true\n---";
	}

	if (/^paths:/m.test(frontmatter)) {
		return `---\n${rewritePathsToGlobs(frontmatter)}\n---`;
	}

	return `---\n${frontmatter}\n---`;
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
		const cursorFrontmatter = buildCursorFrontmatter(frontmatter);
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
