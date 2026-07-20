/**
 * Generates and injects the Tier-1 rule-body block into AGENTS.md.
 *
 * Codex auto-loads only AGENTS.md; it has no rules-directory auto-load
 * mechanism. Tier-1 rules (`.prism/rules/*.md` declaring `load: always`)
 * must therefore be inlined into AGENTS.md so Codex always-on rules actually
 * reach Codex sessions. This module produces the generated block, renders it,
 * and replaces (or inserts) it inside AGENTS.md without touching the surrounding
 * content — in particular, the `## Behavioral norms` pointer table is preserved
 * as the human-scannable index; the block here supplements it with full bodies
 * for Codex (Decision 2, issue-73 plan).
 *
 * Tier identification: the explicit `load: always|paths|skill` frontmatter key,
 * per ADR-0070 (amending ADR-0035's absence-of-`paths:` discriminator). A
 * canonical rule missing a valid `load:` fails the build — see
 * `collectTier1RuleBodies`'s `"fail"` mode in `./rule-load`. Tier-3 rules
 * (`load: skill`) are excluded from this block the same way they are excluded
 * from every platform copy (`build.ts`'s platform-copy path) — they exist only
 * canonically, so no per-file exclude list is needed here.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { substituteTokens } from "./lib/tokens";
import { parseRuleLoad } from "./rule-load";

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
 * Reads every `*.md` in `rulesDir`, filters to rules declaring `load: always`,
 * and returns them sorted by filename ascending (deterministic block output,
 * matches `listRelativeDirectoryEntries` sort order).
 *
 * `onUndeclaredLoad` controls how a missing or invalid `load:` declaration is
 * handled, per `parseRuleLoad`'s two modes: `"fail"` (the default, used by
 * PRISM's own `pnpm prism:build`) throws, naming the offending file — every
 * canonical rule is expected to declare `load:` explicitly. `"warn"` (used by
 * `prism update`'s consumer-side AGENTS.md refresh) degrades the rule to the
 * pre-`load:` discriminator (`paths:` present → path-scoped, absent →
 * always-on) and pushes a warning naming the file, the remedy, and the
 * preserved classification into `warningsArg` instead of throwing, per the
 * ratified legacy-rule default — nothing silently drops out of a consumer's
 * context mid-upgrade.
 *
 * When `tokenMap` is provided, token substitution (`${TOKEN}` → value) is
 * applied to each rule body before it is returned — matching how the
 * platform-copy path in `build.ts` substitutes via `copyContentFileWithSubstitution`.
 * Without substitution, literal `${TICKET_PREFIX}` placeholders appear in the
 * generated AGENTS.md block instead of the configured value (e.g. `PRISM-`).
 *
 * `fileLabelPrefix` prepends onto the file name passed to `parseRuleLoad`'s
 * `fileLabel`, so a caller scanning more than one rules directory (e.g.
 * `prism update`'s base + `.prism/custom` overlay scan) can distinguish a
 * warning about `custom/team.md` from a same-named base rule `team.md`
 * without `collectTier1RuleBodies` itself knowing about the overlay concept.
 */
export async function collectTier1RuleBodies(
	rulesDir: string,
	tokenMap?: Map<string, string>,
	onUndeclaredLoad: "fail" | "warn" = "fail",
	warningsArg: string[] = [],
	fileLabelPrefix = ""
): Promise<{ name: string; body: string }[]> {
	const entries = await fs.readdir(rulesDir);
	const mdFiles = entries.filter((e) => e.endsWith(".md")).sort();

	const results: { name: string; body: string }[] = [];

	for (const name of mdFiles) {
		const content = await fs.readFile(path.join(rulesDir, name), "utf8");
		const { load, warning } = parseRuleLoad(
			content,
			`${fileLabelPrefix}${name}`,
			onUndeclaredLoad
		);

		if (warning !== null) {
			warningsArg.push(warning);
		}

		if (load !== "always") {
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
 * Builds the escaped begin/end marker-pair regex `replaceTier1Block` and
 * `hasTier1BlockMarkers` both match against, so the escaping logic is
 * single-sourced between the two.
 */
function tier1BlockMarkerRegex(): RegExp {
	const beginEscaped = AGENTS_MD_BLOCK_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const endEscaped = AGENTS_MD_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	return new RegExp(`${beginEscaped}[\\s\\S]*?${endEscaped}`);
}

/**
 * True when `agentsMd` already carries the begin/end marker pair. Used by
 * `prism update`'s consumer-side AGENTS.md refresh to decide whether to touch
 * the file at all — the consumer seam only ever replaces an existing marker
 * pair, never creates or restructures a consumer AGENTS.md.
 */
export function hasTier1BlockMarkers(agentsMd: string): boolean {
	return tier1BlockMarkerRegex().test(agentsMd);
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
	const existingBlock = tier1BlockMarkerRegex();

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
