/**
 * Regression suite for the AGENTS.md Tier-1 rule-body generator. Pins:
 *   - which rules are collected (no-frontmatter only; paths:-bearing excluded)
 *   - alphabetical ordering of the collected set
 *   - begin/end markers and source comments in the rendered block
 *   - idempotent replace (second call produces the same output as the first)
 *   - insertion point when no markers exist yet (after Behavioral norms table)
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	AGENTS_MD_BLOCK_BEGIN,
	AGENTS_MD_BLOCK_END,
	collectTier1RuleBodies,
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

test("collectTier1RuleBodies includes no-paths rules and excludes paths-bearing rules", async () => {
	await withTempRulesDir(
		async (dir) => {
			await fs.writeFile(
				path.join(dir, "tier1.md"),
				"# Tier 1 Rule\n\nAlways loaded.\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(dir, "tier2.md"),
				'---\npaths:\n  - "**/*.tsx"\n---\n\n# Tier 2 Rule\n\nPath-gated.\n',
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
			await fs.writeFile(path.join(dir, "b.md"), "# B Rule\n", "utf8");
			await fs.writeFile(path.join(dir, "a.md"), "# A Rule\n", "utf8");
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
	const separatorPos = result.indexOf("---");
	const tableRowPos = result.indexOf("| 12 | Pre-compaction checkpoint");

	assert.ok(blockPos > tableRowPos, "block should appear after the table row");
	assert.ok(blockPos > separatorPos || result.indexOf("---", blockPos) > blockPos,
		"block should appear before the --- separator that follows the table");
	assert.match(result, /# A Rule/);
});
