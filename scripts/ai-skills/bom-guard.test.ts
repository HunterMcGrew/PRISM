/**
 * Regression suite for the build-time UTF-8 BOM guard.
 *
 * `runBomGuard` scans the `.ai-skills` tree (`.md`, `.mjs`, `.json`) for files that begin
 * with a UTF-8 BOM (0xEF 0xBB 0xBF). BOM-bearing canonical sources break the
 * `<!-- atlas:specializes-in -->` anchor substitution and corrupt `.mjs` shebangs
 * on Unix. The guard converts this recurring manual Eric catch into a build-time failure.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { runBomGuard } from "./bom-guard";

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

async function withTempRepo(
	body: (repoRoot: string, aiSkillsRoot: string) => Promise<void>
): Promise<void> {
	const repoRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-bom-guard-")
	);
	const aiSkillsRoot = path.join(repoRoot, ".ai-skills");
	await fs.mkdir(aiSkillsRoot, { recursive: true });

	try {
		await body(repoRoot, aiSkillsRoot);
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
}

async function writeSource(
	aiSkillsRoot: string,
	relativePath: string,
	content: Buffer | string
): Promise<void> {
	const absolutePath = path.join(aiSkillsRoot, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content);
}

test("bom guard flags a markdown file with a leading UTF-8 BOM", async () => {
	await withTempRepo(async (repoRoot, aiSkillsRoot) => {
		const bomContent = Buffer.concat([
			UTF8_BOM,
			Buffer.from("<!-- AUTO-GENERATED -->\nHello.\n", "utf8"),
		]);
		await writeSource(aiSkillsRoot, "skills/prism-x/shared.md", bomContent);

		const violations = await runBomGuard(repoRoot);

		assert.equal(violations.length, 1);
		assert.match(violations[0].relativePath, /shared\.md$/);
	});
});

test("bom guard flags a mjs file with a leading UTF-8 BOM", async () => {
	await withTempRepo(async (repoRoot, aiSkillsRoot) => {
		const bomContent = Buffer.concat([
			UTF8_BOM,
			Buffer.from("#!/usr/bin/env node\nconsole.log('hi');\n", "utf8"),
		]);
		await writeSource(aiSkillsRoot, "definitions/example.mjs", bomContent);

		const violations = await runBomGuard(repoRoot);

		assert.equal(violations.length, 1);
		assert.match(violations[0].relativePath, /example\.mjs$/);
	});
});

test("bom guard flags a json file with a leading UTF-8 BOM", async () => {
	await withTempRepo(async (repoRoot, aiSkillsRoot) => {
		const bomContent = Buffer.concat([
			UTF8_BOM,
			Buffer.from('{"key":"value"}\n', "utf8"),
		]);
		await writeSource(aiSkillsRoot, "definitions/example.json", bomContent);

		const violations = await runBomGuard(repoRoot);

		assert.equal(violations.length, 1);
		assert.match(violations[0].relativePath, /example\.json$/);
	});
});

test("bom guard passes on BOM-free canonical source files", async () => {
	await withTempRepo(async (repoRoot, aiSkillsRoot) => {
		await writeSource(
			aiSkillsRoot,
			"skills/prism-x/shared.md",
			"<!-- AUTO-GENERATED -->\nHello.\n"
		);
		await writeSource(
			aiSkillsRoot,
			"definitions/example.mjs",
			"#!/usr/bin/env node\nconsole.log('hi');\n"
		);
		await writeSource(aiSkillsRoot, "definitions/example.json", '{"key":"value"}\n');

		const violations = await runBomGuard(repoRoot);

		assert.equal(violations.length, 0);
	});
});

test("bom guard ignores non-target file extensions", async () => {
	await withTempRepo(async (repoRoot, aiSkillsRoot) => {
		const bomContent = Buffer.concat([
			UTF8_BOM,
			Buffer.from("hello\n", "utf8"),
		]);

		await writeSource(aiSkillsRoot, "skills/prism-x/readme.txt", bomContent);
		await writeSource(aiSkillsRoot, "skills/prism-x/icon.png", bomContent);

		const violations = await runBomGuard(repoRoot);

		assert.equal(violations.length, 0);
	});
});

test("bom guard returns empty array when .ai-skills directory is absent", async () => {
	const repoRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-bom-guard-empty-")
	);

	try {
		const violations = await runBomGuard(repoRoot);
		assert.equal(violations.length, 0);
	} finally {
		await fs.rm(repoRoot, { force: true, recursive: true });
	}
});

test("bom guard reports all BOM-bearing files, not just the first", async () => {
	await withTempRepo(async (repoRoot, aiSkillsRoot) => {
		const bomContent = Buffer.concat([
			UTF8_BOM,
			Buffer.from("content\n", "utf8"),
		]);

		await writeSource(aiSkillsRoot, "skills/prism-a/shared.md", bomContent);
		await writeSource(aiSkillsRoot, "skills/prism-b/shared.md", bomContent);
		await writeSource(
			aiSkillsRoot,
			"skills/prism-c/shared.md",
			"clean content\n"
		);

		const violations = await runBomGuard(repoRoot);

		assert.equal(violations.length, 2);
	});
});
