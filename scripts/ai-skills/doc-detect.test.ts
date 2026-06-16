/**
 * Tests for Atlas's doc-layout detector.
 *
 * Covers the four detection paths:
 * - Known doc-tool config files produce the correct `tool` label.
 * - A `docs/` directory with no config file produces `location` but no `tool`.
 * - An empty repo produces an empty-evidence result — Atlas asks cold.
 * - `inferDocFormat` maps detected tools to the expected hint strings.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import { detectDocLayout, inferDocFormat } from "./lib/doc-detect";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-doc-detect-"));
	try {
		return await fn(dir);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

test("detectDocLayout finds nextra from nextra.config.js", async () => {
	await withTempDir(async (dir) => {
		await fs.writeFile(path.join(dir, "nextra.config.js"), "module.exports = {}");

		const result = await detectDocLayout(dir);

		assert.equal(result.tool, "nextra");
		assert.ok(result.evidence.length > 0);
	});
});

test("detectDocLayout finds docusaurus from docusaurus.config.ts", async () => {
	await withTempDir(async (dir) => {
		await fs.writeFile(path.join(dir, "docusaurus.config.ts"), "export default {}");

		const result = await detectDocLayout(dir);

		assert.equal(result.tool, "docusaurus");
	});
});

test("detectDocLayout finds mkdocs from mkdocs.yml", async () => {
	await withTempDir(async (dir) => {
		await fs.writeFile(path.join(dir, "mkdocs.yml"), "site_name: My Docs");

		const result = await detectDocLayout(dir);

		assert.equal(result.tool, "mkdocs");
	});
});

test("detectDocLayout finds vitepress from .vitepress/config.ts", async () => {
	await withTempDir(async (dir) => {
		await fs.mkdir(path.join(dir, ".vitepress"));
		await fs.writeFile(path.join(dir, ".vitepress", "config.ts"), "export default {}");

		const result = await detectDocLayout(dir);

		assert.equal(result.tool, "vitepress");
	});
});

test("detectDocLayout finds docs/ directory when no tool config exists", async () => {
	await withTempDir(async (dir) => {
		await fs.mkdir(path.join(dir, "docs"));

		const result = await detectDocLayout(dir);

		assert.equal(result.tool, undefined);
		assert.equal(result.location, "docs/");
		assert.ok(result.evidence.length > 0);
	});
});

test("detectDocLayout returns empty evidence for an empty repo", async () => {
	await withTempDir(async (dir) => {
		const result = await detectDocLayout(dir);

		assert.equal(result.tool, undefined);
		assert.equal(result.location, undefined);
		assert.deepEqual(result.evidence, []);
	});
});

test("detectDocLayout returns both tool and location when both are present", async () => {
	await withTempDir(async (dir) => {
		await fs.writeFile(path.join(dir, "nextra.config.js"), "module.exports = {}");
		await fs.mkdir(path.join(dir, "docs"));

		const result = await detectDocLayout(dir);

		assert.equal(result.tool, "nextra");
		assert.equal(result.location, "docs/");
		assert.ok(result.evidence.length >= 2);
	});
});

test("inferDocFormat maps each known tool to a hint string", () => {
	assert.equal(inferDocFormat("nextra"), "nextra-blocks");
	assert.equal(inferDocFormat("docusaurus"), "docusaurus-mdx");
	assert.equal(inferDocFormat("mkdocs"), "mkdocs-markdown");
	assert.equal(inferDocFormat("vitepress"), "vitepress-markdown");
	assert.equal(inferDocFormat("plain-markdown"), "flat-markdown-guides");
	assert.equal(inferDocFormat(undefined), undefined);
});
