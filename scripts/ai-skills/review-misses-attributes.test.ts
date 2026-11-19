/**
 * Contract for the `.gitattributes` line `prism update` appends so the
 * append-only review misses log merges by union: an absent file is created, a
 * file with no trailing newline gains the line on its own line, a second run
 * changes nothing, and a consumer's own lines are never touched.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { appendReviewMissesAttribute } from "./update";

const LINE = ".prism/metrics/review-misses.jsonl merge=union";

async function withRepo(body: (repoRoot: string) => Promise<void>): Promise<void> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-review-attrs-"));

	try {
		await body(repoRoot);
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
}

async function readAttributes(repoRoot: string): Promise<string> {
	return fs.readFile(path.join(repoRoot, ".gitattributes"), "utf8");
}

test("an absent .gitattributes is created holding the line", async () => {
	await withRepo(async (repoRoot) => {
		await appendReviewMissesAttribute(repoRoot, false);

		assert.equal(await readAttributes(repoRoot), `${LINE}\n`);
	});
});

test("a file with no trailing newline gains the line on its own line", async () => {
	await withRepo(async (repoRoot) => {
		await fs.writeFile(path.join(repoRoot, ".gitattributes"), "* text=auto", "utf8");

		await appendReviewMissesAttribute(repoRoot, false);

		assert.equal(await readAttributes(repoRoot), `* text=auto\n${LINE}\n`);
	});
});

test("a second run leaves the file byte-identical", async () => {
	await withRepo(async (repoRoot) => {
		await appendReviewMissesAttribute(repoRoot, false);
		const first = await readAttributes(repoRoot);

		await appendReviewMissesAttribute(repoRoot, false);

		assert.equal(await readAttributes(repoRoot), first);
	});
});

test("a consumer's own union-merge line survives", async () => {
	await withRepo(async (repoRoot) => {
		const own = "docs/** merge=union\n";
		await fs.writeFile(path.join(repoRoot, ".gitattributes"), own, "utf8");

		await appendReviewMissesAttribute(repoRoot, false);

		assert.equal(await readAttributes(repoRoot), `${own}${LINE}\n`);
	});
});

test("a line already present with trailing spaces is not added again", async () => {
	await withRepo(async (repoRoot) => {
		const existing = `${LINE}  \n`;
		await fs.writeFile(path.join(repoRoot, ".gitattributes"), existing, "utf8");

		await appendReviewMissesAttribute(repoRoot, false);

		assert.equal(await readAttributes(repoRoot), existing);
	});
});

test("a dry run writes nothing", async () => {
	await withRepo(async (repoRoot) => {
		await appendReviewMissesAttribute(repoRoot, true);

		await assert.rejects(fs.access(path.join(repoRoot, ".gitattributes")));
	});
});
