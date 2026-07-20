/**
 * Regression suite for the AGENTS.md Tier-1 rule-body generator. Pins:
 *   - which rules are collected (`load: always` only; `load: paths`/`load: skill` excluded)
 *   - the build hard-fail on a missing or invalid `load:` declaration ("fail" mode)
 *   - the warn-and-include-as-always fallback for undeclared consumer rules ("warn" mode)
 *   - alphabetical ordering of the collected set
 *   - token substitution (${TICKET_PREFIX} → configured value; no literal placeholders survive)
 *   - begin/end markers and source comments in the rendered block
 *   - idempotent replace (second call produces the same output as the first)
 *   - insertion point when no markers exist yet (after Behavioral norms table)
 *   - marker-pair detection (`hasTier1BlockMarkers`)
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	AGENTS_MD_BLOCK_BEGIN,
	AGENTS_MD_BLOCK_END,
	AGENTS_MD_SEEDED_MARKER,
	collectTier1RuleBodies,
	hasTier1BlockMarkers,
	renderSeededAgentsMd,
	renderTier1Block,
	replaceTier1Block,
} from "./agents-md-block";

async function withTempRulesDir(
	setup: (rulesDir: string) => Promise<void>,
	check: (rulesDir: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-agents-md-block-"));
	try {
		await setup(tempRoot);
		await check(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("collectTier1RuleBodies includes load: always rules and excludes load: paths and load: skill", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(
				path.join(dir, "tier1.md"),
				"---\nload: always\n---\n\n# Tier 1 Rule\n\nAlways loaded.\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(dir, "tier2.md"),
				'---\nload: paths\npaths:\n  - "**/*.tsx"\n---\n\n# Tier 2 Rule\n\nPath-gated.\n',
				"utf8"
			);
			await fs.writeFile(
				path.join(dir, "tier3.md"),
				"---\nload: skill\n---\n\n# Tier 3 Rule\n\nSkill-triggered.\n",
				"utf8"
			);
		},
		async (dir) => {
			const rules = await collectTier1RuleBodies(dir);
			assert.equal(rules.length, 1);
			assert.equal(rules[0].name, "tier1.md");
			assert.match(rules[0].body, /# Tier 1 Rule/);
		}
	);
});

test("collectTier1RuleBodies returns rules in alphabetical order", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(path.join(dir, "b.md"), "---\nload: always\n---\n\n# B Rule\n", "utf8");
			await fs.writeFile(path.join(dir, "a.md"), "---\nload: always\n---\n\n# A Rule\n", "utf8");
		},
		async (dir) => {
			const rules = await collectTier1RuleBodies(dir);
			assert.deepEqual(
				rules.map((r) => r.name),
				["a.md", "b.md"]
			);
		}
	);
});

test("collectTier1RuleBodies throws in fail mode (the default) naming a rule with no load: declaration", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(path.join(dir, "undeclared.md"), "# No frontmatter at all\n", "utf8");
		},
		async (dir) => {
			await assert.rejects(collectTier1RuleBodies(dir), /undeclared\.md/);
		}
	);
});

test("collectTier1RuleBodies throws in fail mode on an invalid load: value", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(
				path.join(dir, "bogus.md"),
				"---\nload: sometimes\n---\n\n# Bogus\n",
				"utf8"
			);
		},
		async (dir) => {
			await assert.rejects(collectTier1RuleBodies(dir), /bogus\.md/);
		}
	);
});

test("collectTier1RuleBodies in warn mode treats a missing load: as always and reports a warning instead of throwing", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(path.join(dir, "legacy.md"), "# Legacy Rule\n\nNo load: key.\n", "utf8");
		},
		async (dir) => {
			const warnings: string[] = [];
			const rules = await collectTier1RuleBodies(dir, undefined, "warn", warnings);

			assert.equal(rules.length, 1, "undeclared rule is included, treated as always");
			assert.equal(rules[0].name, "legacy.md");
			assert.equal(warnings.length, 1);
			assert.match(warnings[0], /legacy\.md/);
			assert.match(warnings[0], /load:/);
		}
	);
});

test("collectTier1RuleBodies in warn mode does not warn for a validly declared rule", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(
				path.join(dir, "declared.md"),
				"---\nload: always\n---\n\n# Declared\n",
				"utf8"
			);
		},
		async (dir) => {
			const warnings: string[] = [];
			await collectTier1RuleBodies(dir, undefined, "warn", warnings);

			assert.deepEqual(warnings, []);
		}
	);
});

test("renderTier1Block wraps bodies in begin/end markers with source comments", () => {
	const rules = [
		{ name: "a.md", body: "# A Rule\n\nBody." },
		{ name: "b.md", body: "# B Rule\n\nBody." },
	];
	const block = renderTier1Block(rules);

	assert.ok(block.startsWith(AGENTS_MD_BLOCK_BEGIN));
	assert.ok(block.endsWith(AGENTS_MD_BLOCK_END));
	assert.match(block, /<!-- source: \.prism\/rules\/a\.md -->/);
	assert.match(block, /<!-- source: \.prism\/rules\/b\.md -->/);
	assert.match(block, /# A Rule/);
	assert.match(block, /# B Rule/);
});

test("replaceTier1Block replaces an existing block idempotently", () => {
	const rules = [{ name: "a.md", body: "# A Rule\n\nBody." }];
	const block = renderTier1Block(rules);

	const agentsMd = `# Agent Behavior Rules\n\n${block}\n\n## Task Management\n`;

	const first = replaceTier1Block(agentsMd, block);
	const second = replaceTier1Block(first, block);

	assert.equal(second, first);
	assert.equal((first.match(new RegExp(AGENTS_MD_BLOCK_BEGIN, "g")) ?? []).length, 1);
});

test("collectTier1RuleBodies substitutes tokens when tokenMap is provided", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(
				path.join(dir, "tier1.md"),
				"---\nload: always\n---\n\n# Rule\n\nSee ${TICKET_PREFIX}-1234 for context.\n",
				"utf8"
			);
		},
		async (dir) => {
			const tokenMap = new Map([["TICKET_PREFIX", "PRISM"]]);
			const rules = await collectTier1RuleBodies(dir, tokenMap);
			assert.equal(rules.length, 1);
			// Token was substituted — no literal ${...} placeholder survives
			assert.doesNotMatch(rules[0].body, /\$\{/);
			assert.match(rules[0].body, /PRISM-1234/);
		}
	);
});

test("replaceTier1Block inserts after Behavioral norms when no block exists", () => {
	const agentsMd = [
		"# Agent Behavior Rules",
		"",
		"## Behavioral norms",
		"",
		"| § | Norm | Rule |",
		"| --- | --- | --- |",
		"| 12 | Pre-compaction checkpoint | `.prism/rules/pre-compaction-checkpoint.md` |",
		"",
		"---",
		"",
		"## Task Management",
		"",
	].join("\n");

	const rules = [{ name: "a.md", body: "# A Rule\n\nBody." }];
	const block = renderTier1Block(rules);
	const result = replaceTier1Block(agentsMd, block);

	const blockPos = result.indexOf(AGENTS_MD_BLOCK_BEGIN);
	const tableRowPos = result.indexOf("| 12 | Pre-compaction checkpoint");
	// Search for the standalone \n---\n separator starting after the table row so
	// the | --- | --- | --- | header-divider row cannot match.
	const standaloneSepPos = result.indexOf("\n---\n", tableRowPos);

	assert.ok(blockPos > tableRowPos, "block should appear after the table row");
	assert.ok(blockPos < standaloneSepPos, "block should appear before the standalone --- separator after the table");
	assert.match(result, /# A Rule/);
});

test("renderSeededAgentsMd carries the provenance marker and an empty Tier-1 marker pair", () => {
	const seeded = renderSeededAgentsMd();

	assert.ok(seeded.includes(AGENTS_MD_SEEDED_MARKER));
	assert.ok(
		seeded.includes(`${AGENTS_MD_BLOCK_BEGIN}\n\n${AGENTS_MD_BLOCK_END}`),
		"the marker pair must be empty so replaceTier1Block's marker-match path fills it"
	);
});

test("hasTier1BlockMarkers is true only when the begin/end marker pair is present", () => {
	const withMarkers = `# Agent Behavior Rules\n\n${AGENTS_MD_BLOCK_BEGIN}\n\nbody\n\n${AGENTS_MD_BLOCK_END}\n`;
	const withoutMarkers = "# Agent Behavior Rules\n\nNo markers here.\n";

	assert.equal(hasTier1BlockMarkers(withMarkers), true);
	assert.equal(hasTier1BlockMarkers(withoutMarkers), false);
});

test("replaceTier1Block fills the seeded stub's empty marker pair via the marker-match path, not the insert-fallback path", () => {
	const seeded = renderSeededAgentsMd();
	const rules = [{ name: "a.md", body: "# A Rule\n\nBody." }];
	const block = renderTier1Block(rules);

	const filled = replaceTier1Block(seeded, block);

	assert.match(filled, /# A Rule/);
	assert.ok(
		filled.includes(AGENTS_MD_SEEDED_MARKER),
		"provenance marker survives the fill untouched"
	);
	assert.equal(
		(filled.match(new RegExp(AGENTS_MD_BLOCK_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? [])
			.length,
		1,
		"exactly one marker pair after filling — the empty pair was replaced in place, not appended alongside a second pair"
	);
});
