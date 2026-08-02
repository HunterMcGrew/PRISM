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
	findRepoRoot,
	loadRouteState,
	matchDocsForPath,
	MAX_DOC_INJECTION_BYTES,
	resolveArchitectDoc,
	saveRouteState,
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

test("resolveArchitectDoc: caps a real-size doc at MAX_DOC_INJECTION_BYTES and points at the full path", async () => {
	await withTempRepo(async (repoRoot) => {
		const oversizedDoc = "A".repeat(MAX_DOC_INJECTION_BYTES * 2);
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/oversized.md" },
			"_toolkit/oversized.md",
			oversizedDoc
		);

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.ok(result, "expected an injection for the oversized doc");
		assert.ok(
			Buffer.byteLength(result as string, "utf8") < Buffer.byteLength(oversizedDoc, "utf8"),
			"the injected body must be smaller than the full doc"
		);
		assert.match(result as string, /truncated/);
		assert.match(result as string, /_toolkit\/oversized\.md/);
	});
});

test("resolveArchitectDoc: a doc within the byte cap is injected verbatim, untruncated", async () => {
	await withTempRepo(async (repoRoot) => {
		const smallDoc = "Small enough to ship whole.";
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/small.md" },
			"_toolkit/small.md",
			smallDoc
		);

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.match(result as string, /Small enough to ship whole\./);
		assert.doesNotMatch(result as string, /truncated/);
	});
});

test("loadRouteState: a corrupt state file is treated as absent, not thrown", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.mkdir(path.join(repoRoot, ".prism"), { recursive: true });
		await fs.writeFile(
			path.join(repoRoot, ".prism", "architect-route-state.session-1.json"),
			"{not valid json",
			"utf8"
		);

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(state, { injected: [] });
	});
});

test("saveRouteState: prunes sibling state files older than the staleness window", async () => {
	await withTempRepo(async (repoRoot) => {
		const staleFile = path.join(
			repoRoot,
			".prism",
			"architect-route-state.old-session.json"
		);
		await fs.mkdir(path.dirname(staleFile), { recursive: true });
		await fs.writeFile(staleFile, JSON.stringify({ injected: [] }), "utf8");

		const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);
		await fs.utimes(staleFile, staleTimestamp, staleTimestamp);

		await saveRouteState(repoRoot, "current-session", { injected: [] });

		await assert.rejects(fs.access(staleFile));
		await assert.doesNotReject(
			fs.access(
				path.join(repoRoot, ".prism", "architect-route-state.current-session.json")
			)
		);
	});
});

test("findRepoRoot: walks upward from a subdirectory to find the directory holding the manifest", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifestAndDoc(
			repoRoot,
			{ "scripts/ai-skills/**": "_toolkit/spec-editing.md" },
			"_toolkit/spec-editing.md",
			"Spec editing constraints go here."
		);

		const subdir = path.join(repoRoot, "scripts", "ai-skills");
		await fs.mkdir(subdir, { recursive: true });

		const found = await findRepoRoot(subdir);
		assert.equal(found, repoRoot);
	});
});

test("findRepoRoot: returns null when no ancestor holds the manifest", async () => {
	await withTempRepo(async (repoRoot) => {
		const found = await findRepoRoot(repoRoot);
		assert.equal(found, null);
	});
});
