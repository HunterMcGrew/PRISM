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

import { substituteTokens } from "./lib/tokens";

export const AGENTS_MD_BLOCK_BEGIN =
	"<!-- BEGIN GENERATED TIER-1 RULE BODIES — managed by scripts/ai-skills/build.ts; do not edit -->";
export const AGENTS_MD_BLOCK_END = "<!-- END GENERATED TIER-1 RULE BODIES -->";

/**
 * Provenance marker recording that `prism adopt --seed-agents-md` created this
 * file. `prism eject` keys on this comment to decide whether a root `AGENTS.md`
 * is PRISM-seeded (safe to delete) or consumer-authored (must be preserved).
 * The manifest cannot carry this signal — its keys are `.prism/`-relative
 * (see `PRISM_OWNED_GLOBS`), and a root `AGENTS.md` is not a `.prism/` path.
 */
export const AGENTS_MD_SEEDED_MARKER =
	"<!-- prism:seeded-agents-md — this AGENTS.md was created by `prism adopt --seed-agents-md`; prism eject will remove it. Delete this line if you want to keep the file after ejecting. -->";

/**
 * The minimal root `AGENTS.md` body `prism adopt --seed-agents-md` writes when
 * none exists. Carries the provenance marker plus an empty Tier-1 begin/end
 * marker pair so the next `pnpm prism:build` run's `syncAgentsMdTier1Block`
 * finds the pair and fills it via `replaceTier1Block` — no build.ts change
 * needed, because the file is present after seeding (the early-return at
 * build.ts:476-478 only fires on an absent file).
 */
export function renderSeededAgentsMd(): string {
	return [
		"# Agent Behavior Rules",
		"",
		AGENTS_MD_SEEDED_MARKER,
		"",
		"PRISM manages the generated block below. Run `pnpm prism:build` to fill it",
		"with the always-on Tier-1 rule bodies your Codex-based agents load. See",
		"docs/adopting-into-existing-repos.md.",
		"",
		`${AGENTS_MD_BLOCK_BEGIN}`,
		"",
		`${AGENTS_MD_BLOCK_END}`,
		"",
	].join("\n");
}

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
 *
 * When `tokenMap` is provided, token substitution (`${TOKEN}` → value) is
 * applied to each rule body before it is returned — matching how the
 * platform-copy path in `build.ts` substitutes via `copyContentFileWithSubstitution`.
 * Without substitution, literal `${TICKET_PREFIX}` placeholders appear in the
 * generated AGENTS.md block instead of the configured value (e.g. `PRISM-`).
 */
export async function collectTier1RuleBodies(
	rulesDir: string,
	tokenMap?: Map<string, string>
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

		const body = tokenMap
			? substituteTokens(content.trim(), tokenMap)
			: content.trim();

		results.push({ name, body });
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
