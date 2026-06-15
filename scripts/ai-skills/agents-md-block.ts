/**
 * Generates and injects the Tier-1 rule-body block into AGENTS.md.
 *
 * Codex auto-loads only AGENTS.md; it has no rules-directory auto-load
 * mechanism. Tier-1 rules (`.prism/rules/*.md` with no `paths:` frontmatter)
 * must therefore be inlined into AGENTS.md so Codex always-on rules actually
 * reach Codex sessions. This module produces the generated block, renders it,
 * and replaces (or inserts) it inside AGENTS.md without touching the surrounding
 * content — in particular, the `## Behavioral norms` pointer table is preserved
 * as the human-scannable index; the block here supplements it with full bodies
 * for Codex (Decision 2, issue-73 plan).
 *
 * Tier-1 identification: absence of a `paths:` key in frontmatter, per
 * ADR-0035's stated discriminator and the resolved Decision 1 in issue-73 plan.
 * Tier-3 opt-out: add a basename to CODEX_INLINE_EXCLUDE to prevent a rule with
 * no `paths:` frontmatter from being inlined (empty today).
 */
import fs from "node:fs/promises";
import path from "node:path";

export const AGENTS_MD_BLOCK_BEGIN =
	"<!-- BEGIN GENERATED TIER-1 RULE BODIES — managed by scripts/ai-skills/build.ts; do not edit -->";
export const AGENTS_MD_BLOCK_END = "<!-- END GENERATED TIER-1 RULE BODIES -->";

/**
 * Basenames of `.prism/rules/*.md` files that must not be inlined into the
 * generated block even though they carry no `paths:` frontmatter. Empty today —
 * the set exists to handle any future Tier-3 rule that lands without `paths:`
 * but should not load on every Codex session.
 */
export const CODEX_INLINE_EXCLUDE: ReadonlySet<string> = new Set([]);

/**
 * Splits a rule file into its frontmatter block (when present) and remaining
 * body. Replicates the `splitFrontmatter` shape used in `rule-dialect.ts`
 * without importing it, so this module stays independently testable.
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
 * Reads every `*.md` in `rulesDir`, filters to Tier-1 rules (no `paths:`
 * frontmatter and not in CODEX_INLINE_EXCLUDE), and returns them sorted by
 * filename ascending (deterministic block output, matches
 * `listRelativeDirectoryEntries` sort order).
 */
export async function collectTier1RuleBodies(
	rulesDir: string
): Promise<{ name: string; body: string }[]> {
	const entries = await fs.readdir(rulesDir);
	const mdFiles = entries.filter((e) => e.endsWith(".md")).sort();

	const results: { name: string; body: string }[] = [];

	for (const name of mdFiles) {
		if (CODEX_INLINE_EXCLUDE.has(name)) {
			continue;
		}

		const content = await fs.readFile(path.join(rulesDir, name), "utf8");
		const { frontmatter } = splitFrontmatter(content);

		if (frontmatter !== null && /^paths:/m.test(frontmatter)) {
			continue;
		}

		results.push({ name, body: content.trim() });
	}

	return results;
}

/**
 * Wraps the Tier-1 rule bodies in begin/end markers with per-rule source
 * comments so contributors know the block is build-managed and can locate each
 * rule's canonical source.
 */
export function renderTier1Block(rules: { name: string; body: string }[]): string {
	const rendered = rules
		.map((r) => `<!-- source: .prism/rules/${r.name} -->\n\n${r.body}`)
		.join("\n\n---\n\n");

	return `${AGENTS_MD_BLOCK_BEGIN}\n\n${rendered}\n\n${AGENTS_MD_BLOCK_END}`;
}

/**
 * Replaces the existing begin/end marker pair in `agentsMd` with `block`, or
 * inserts `block` immediately after the `## Behavioral norms` table when no
 * markers exist yet. Returns the updated file content.
 *
 * The replace path uses a non-greedy match on the marker pair to handle the
 * common case of a single block. The insert path anchors on the last row of the
 * Behavioral norms table (the `| 12 | Pre-compaction checkpoint` row) followed
 * by a blank line, inserting the block before the `---` separator that follows.
 */
export function replaceTier1Block(agentsMd: string, block: string): string {
	const beginEscaped = AGENTS_MD_BLOCK_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const endEscaped = AGENTS_MD_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const existingBlock = new RegExp(`${beginEscaped}[\\s\\S]*?${endEscaped}`);

	if (existingBlock.test(agentsMd)) {
		return agentsMd.replace(existingBlock, block);
	}

	// Insert after the Behavioral norms table. The table ends with the
	// Pre-compaction checkpoint row; a blank line follows, then a --- separator.
	// The block lands between the blank line and the separator.
	const tableAnchor =
		/([ \t]*\| 12 \| Pre-compaction checkpoint[\s\S]*?\n)([ \t]*\n)([ \t]*---)/;

	if (tableAnchor.test(agentsMd)) {
		return agentsMd.replace(tableAnchor, `$1$2${block}\n\n$3`);
	}

	// Fallback: append at end of file if neither anchor matched.
	return `${agentsMd}\n\n${block}\n`;
}
