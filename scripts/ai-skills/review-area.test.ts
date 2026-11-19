/**
 * Contract for `.prism/review/` as a delivered content area: the pass files
 * are PRISM-owned and mirrored like `references`, while `review/stack/` holds
 * the consumer's own stack checks, which update never writes and the install
 * seed never carries.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	checkSeedDrift,
	COPIED_CONTENT_AREAS,
	copyContentToPlatformDir,
	writeSeedMirror,
	type SeedCuration,
} from "./build";
import { classifyPath } from "./ownership";
import { verbatimRuleDialect } from "./rule-dialect";

const prismRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function readCuration(): Promise<SeedCuration> {
	return JSON.parse(
		await fs.readFile(
			path.join(prismRoot, ".ai-skills", "definitions", "seed-curation.json"),
			"utf8"
		)
	) as SeedCuration;
}

async function withReviewTree(
	run: (roots: { contentRoot: string; seedRoot: string; platformDir: string }) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-review-area-"));
	const contentRoot = path.join(tempRoot, ".prism");

	try {
		await fs.mkdir(path.join(contentRoot, "review", "stack"), { recursive: true });
		await fs.writeFile(path.join(contentRoot, "review", "a.md"), "# Pass a\n");
		await fs.writeFile(path.join(contentRoot, "review", "stack", "b.md"), "# Stack b\n");
		await run({
			contentRoot,
			seedRoot: path.join(tempRoot, "seed"),
			platformDir: path.join(tempRoot, ".claude"),
		});
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("a pass file is PRISM-owned and a stack check is the consumer's", () => {
	assert.equal(classifyPath("review/correctness.md"), "prism");
	assert.equal(classifyPath("review/stack/correctness.md"), "consumer");
});

test("review is a copied content area", () => {
	assert.ok((COPIED_CONTENT_AREAS as readonly string[]).includes("review"));
});

test("the seed mirror carries a pass file and no stack check", async () => {
	await withReviewTree(async ({ contentRoot, seedRoot }) => {
		await writeSeedMirror(contentRoot, seedRoot, await readCuration(), false, [], []);

		assert.equal(await fs.readFile(path.join(seedRoot, "review", "a.md"), "utf8"), "# Pass a\n");
		await assert.rejects(fs.access(path.join(seedRoot, "review", "stack", "b.md")));
	});
});

test("a platform copy carries the pass file", async () => {
	await withReviewTree(async ({ contentRoot, platformDir }) => {
		await copyContentToPlatformDir(
			contentRoot,
			platformDir,
			false,
			[],
			new Map(),
			verbatimRuleDialect
		);

		assert.equal(
			await fs.readFile(path.join(platformDir, "review", "a.md"), "utf8"),
			"# Pass a\n"
		);
	});
});

test("the drift check flags a stack check found in the seed", async () => {
	await withReviewTree(async ({ contentRoot, seedRoot }) => {
		await writeSeedMirror(contentRoot, seedRoot, await readCuration(), false, [], []);
		await fs.mkdir(path.join(seedRoot, "review", "stack"), { recursive: true });
		await fs.writeFile(path.join(seedRoot, "review", "stack", "b.md"), "# Stack b\n");

		const changed: string[] = [];
		await checkSeedDrift(contentRoot, seedRoot, await readCuration(), changed);

		assert.ok(changed.includes("seed contains excluded file: review/stack/b.md"));
	});
});
