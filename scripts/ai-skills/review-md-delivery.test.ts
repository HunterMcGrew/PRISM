/**
 * Tests for the root `REVIEW.md` rulebook's delivery: `syncReviewMd` in
 * `update.ts` and the seed mirror `syncReviewMdSeed` in `build.ts`.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { syncReviewMdSeed } from "./build";
import { REVIEW_MD_MARKER_PREFIX, REVIEW_MD_UNMARKED_WARNING, syncReviewMd } from "./update";

const SEED_CONTENT = `<!-- prism:review — prism update refreshes this file while this line is here. Delete the line to keep your own version. -->\n# Review rulebook\n`;
const STALE_MARKED_CONTENT = `<!-- prism:review — prism update refreshes this file while this line is here. Delete the line to keep your own version. -->\n# An older rulebook\n`;

async function withRoots(
	body: (roots: { prismSourceRoot: string; consumerRepoRoot: string }) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-review-md-"));
	const prismSourceRoot = path.join(tempRoot, "prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	await fs.mkdir(path.join(prismSourceRoot, "templates", "install"), { recursive: true });
	await fs.mkdir(consumerRepoRoot, { recursive: true });
	await fs.writeFile(
		path.join(prismSourceRoot, "templates", "install", "REVIEW.md"),
		SEED_CONTENT,
		"utf8"
	);

	try {
		await body({ prismSourceRoot, consumerRepoRoot });
	} finally {
		await fs.rm(tempRoot, { recursive: true, force: true });
	}
}

async function readIfExists(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch {
		return null;
	}
}

test("syncReviewMd writes the seed copy when the consumer has no REVIEW.md", async () => {
	await withRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const result = await syncReviewMd(consumerRepoRoot, prismSourceRoot, false);

		assert.equal(result.outcome?.action, "written");
		assert.equal(result.warning, undefined);
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md")), SEED_CONTENT);
	});
});

test("syncReviewMd replaces a marked stale REVIEW.md in place and leaves no backup", async () => {
	await withRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await fs.writeFile(path.join(consumerRepoRoot, "REVIEW.md"), STALE_MARKED_CONTENT, "utf8");

		const result = await syncReviewMd(consumerRepoRoot, prismSourceRoot, false);

		assert.equal(result.outcome?.action, "overwritten");
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md")), SEED_CONTENT);
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md.bak")), null);
	});
});

test("syncReviewMd leaves a REVIEW.md without the marker line byte-identical and returns the warning", async () => {
	await withRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const own = "# Our own review rules\n\nNo marker here.\n";
		await fs.writeFile(path.join(consumerRepoRoot, "REVIEW.md"), own, "utf8");

		const result = await syncReviewMd(consumerRepoRoot, prismSourceRoot, false);

		assert.equal(result.outcome, null);
		assert.equal(result.warning, REVIEW_MD_UNMARKED_WARNING);
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md")), own);
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md.bak")), null);
	});
});

test("syncReviewMd is a no-op the second time and leaves no backup", async () => {
	await withRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await syncReviewMd(consumerRepoRoot, prismSourceRoot, false);

		const second = await syncReviewMd(consumerRepoRoot, prismSourceRoot, false);

		assert.equal(second.outcome?.action, "no-op");
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md")), SEED_CONTENT);
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md.bak")), null);
	});
});

test("syncReviewMd under dryRun reports the write and touches nothing", async () => {
	await withRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		const result = await syncReviewMd(consumerRepoRoot, prismSourceRoot, true);

		assert.equal(result.outcome?.action, "written");
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md")), null);
	});
});

test("syncReviewMd has nothing to deliver when the PRISM source ships no seed copy", async () => {
	await withRoots(async ({ prismSourceRoot, consumerRepoRoot }) => {
		await fs.rm(path.join(prismSourceRoot, "templates", "install", "REVIEW.md"));

		const result = await syncReviewMd(consumerRepoRoot, prismSourceRoot, false);

		assert.equal(result.outcome, null);
		assert.equal(await readIfExists(path.join(consumerRepoRoot, "REVIEW.md")), null);
	});
});

test("the shipped root REVIEW.md opens with the marker prefix", async () => {
	const root = await fs.readFile(path.join(process.cwd(), "REVIEW.md"), "utf8");

	assert.ok(root.startsWith(REVIEW_MD_MARKER_PREFIX));
});

test("syncReviewMdSeed in check mode names both paths when the seed copy differs", async () => {
	await withRoots(async ({ prismSourceRoot }) => {
		await fs.writeFile(path.join(prismSourceRoot, "REVIEW.md"), "# Root rulebook\n", "utf8");
		const changedPaths: string[] = [];

		await syncReviewMdSeed(prismSourceRoot, path.join(prismSourceRoot, "templates", "install"), true, changedPaths);

		assert.equal(changedPaths.length, 1);
		assert.match(changedPaths[0], /REVIEW\.md differs from templates\/install\/REVIEW\.md/);
		assert.equal(
			await readIfExists(path.join(prismSourceRoot, "templates", "install", "REVIEW.md")),
			SEED_CONTENT,
			"check mode writes nothing"
		);
	});
});

test("the seed copy of REVIEW.md equals the root REVIEW.md", async () => {
	const root = await fs.readFile(path.join(process.cwd(), "REVIEW.md"), "utf8");
	const seed = await fs.readFile(
		path.join(process.cwd(), "templates", "install", "REVIEW.md"),
		"utf8"
	);

	assert.equal(seed, root);
});
