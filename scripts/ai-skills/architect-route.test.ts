/**
 * Regression suite for the read-triggered architect-context router (plan
 * `context-delivery-mechanism.md` task 1). Covers the three contract
 * guarantees the AC list depends on: a matching doc injects once, a repeat
 * read of the same file injects nothing, and a path with no manifest route
 * is a clean no-op.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	matchDocsForPath,
	resolveArchitectDoc,
	toRepoRelativePath,
} from "./hooks/architect-route";

async function withTempRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-architect-route-")
	);
	try {
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function seedManifestAndDoc(
	repoRoot: string,
	manifest: Record<string, string | string[]>,
	docRelativePath: string,
	docBody: string
): Promise<void> {
	const architectDir = path.join(repoRoot, ".prism", "architect");
	await fs.mkdir(architectDir, { recursive: true });
	await fs.writeFile(
		path.join(architectDir, "manifest.json"),
		JSON.stringify(manifest, null, "\t"),
		"utf8"
	);
	const docPath = path.join(architectDir, docRelativePath);
	await fs.mkdir(path.dirname(docPath), { recursive: true });
	await fs.writeFile(docPath, docBody, "utf8");
}

test("toRepoRelativePath: converts an absolute in-repo path to a forward-slash relative path", () => {
	const repoRoot = path.sep === "\\" ? "C:\\repo" : "/repo";
	const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
	assert.equal(
		toRepoRelativePath(repoRoot, filePath),
		"scripts/ai-skills/build.ts"
	);
});

test("toRepoRelativePath: returns null for a path outside the repo root", () => {
	const repoRoot = path.sep === "\\" ? "C:\\repo" : "/repo";
	const outside = path.sep === "\\" ? "C:\\elsewhere\\file.md" : "/elsewhere/file.md";
	assert.equal(toRepoRelativePath(repoRoot, outside), null);
});

test("matchDocsForPath: collects docs from every matching manifest key, deduplicated", () => {
	const manifest = {
		"scripts/ai-skills/**": ["_toolkit/spec-editing.md", "_toolkit/skills-ecosystem.md"],
		".prism/**": ["_toolkit/install-layout.md", "_toolkit/skills-ecosystem.md"],
	};
	const docs = matchDocsForPath(manifest, "scripts/ai-skills/build.ts");
	assert.deepEqual(docs, ["_toolkit/spec-editing.md", "_toolkit/skills-ecosystem.md"]);
});

test("resolveArchitectDoc: injects the matching doc's current content on first read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.ok(result, "expected a non-null injection on first read");
		assert.match(result as string, /Spec editing constraints go here\./);
	});
});

test("resolveArchitectDoc: does not re-inject the same doc later in the same session", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const first = await resolveArchitectDoc(repoRoot, filePath, "session-1");
		const second = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.ok(first, "first read injects");
		assert.equal(second, null, "second read in the same session injects nothing");
	});
});

test("resolveArchitectDoc: a different session re-injects the same doc", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		await resolveArchitectDoc(repoRoot, filePath, "session-1");
		const otherSession = await resolveArchitectDoc(repoRoot, filePath, "session-2");

		assert.ok(otherSession, "a new session id has its own injection tracking");
	});
});

test("resolveArchitectDoc: returns null when no manifest route matches the path", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);

		const filePath = path.join(repoRoot, "README.md");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.equal(result, null);
	});
});

test("resolveArchitectDoc: reads the doc's current on-disk content, not a cached copy", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Original content."
		);

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		await fs.writeFile(
			path.join(repoRoot, ".prism", "architect", "_toolkit", "spec-editing.md"),
			"Edited content.",
			"utf8"
		);

		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");
		assert.match(result as string, /Edited content\./);
	});
});
