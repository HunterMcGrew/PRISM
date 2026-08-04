/**
 * Regression suite for the read-triggered architect-context router (plan
 * `context-delivery-mechanism.md` tasks 1 and 18). Covers the router's
 * nag-based contract: a matched-but-unread doc is named by path (never by
 * body), a doc keeps being named across repeat reads of the matched path
 * until its own path is read, and a path with no manifest route is a clean
 * no-op.
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
	MAX_EMISSION_BYTES,
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

/**
 * Writes `.prism/architect/manifest.json` only. `resolveArchitectDoc` never
 * reads a doc's body when producing a nag, so a test only needs a doc file
 * on disk when it's specifically asserting something about that content
 * (e.g. that it never leaks into the payload).
 */
async function seedManifest(
	repoRoot: string,
	manifest: Record<string, string | string[]>
): Promise<void> {
	const architectDir = path.join(repoRoot, ".prism", "architect");
	await fs.mkdir(architectDir, { recursive: true });
	await fs.writeFile(
		path.join(architectDir, "manifest.json"),
		JSON.stringify(manifest, null, "\t"),
		"utf8"
	);
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

test("resolveArchitectDoc: nags the unread matched doc by path on first read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.ok(result, "expected a nag on first read of a matched path");
		assert.match(result as string, /_toolkit\/spec-editing\.md/);
	});
});

test("resolveArchitectDoc: the nag never carries a doc's body, only its path", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await fs.mkdir(path.join(repoRoot, ".prism", "architect", "_toolkit"), {
			recursive: true,
		});
		await fs.writeFile(
			path.join(repoRoot, ".prism", "architect", "_toolkit", "spec-editing.md"),
			"Spec editing constraints go here.",
			"utf8"
		);

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.ok(result);
		assert.match(result as string, /_toolkit\/spec-editing\.md/);
		assert.doesNotMatch(result as string, /Spec editing constraints go here\./);
	});
});

test("resolveArchitectDoc: keeps nagging on repeat reads of the matched path until the doc itself is read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const first = await resolveArchitectDoc(repoRoot, filePath, "session-1");
		const second = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.ok(first, "first read nags");
		assert.ok(second, "second read still nags — naming is not delivering");
		assert.match(second as string, /_toolkit\/spec-editing\.md/);
	});
});

test("resolveArchitectDoc: a doc drops out of the nag only after its own path is read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});

		const sourcePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const docPath = path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"spec-editing.md"
		);

		const beforeRead = await resolveArchitectDoc(repoRoot, sourcePath, "session-1");
		assert.ok(beforeRead, "unread doc is named before its own path is read");

		const readOfDocItself = await resolveArchitectDoc(repoRoot, docPath, "session-1");
		assert.equal(
			readOfDocItself,
			null,
			"reading the doc's own path matches no manifest route, so it nags nothing"
		);

		const afterRead = await resolveArchitectDoc(repoRoot, sourcePath, "session-1");
		assert.equal(
			afterRead,
			null,
			"the doc no longer appears once its own path has been read"
		);
	});
});

test("resolveArchitectDoc: a different session has its own read-tracking and re-nags", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});

		const sourcePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const docPath = path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"spec-editing.md"
		);

		await resolveArchitectDoc(repoRoot, sourcePath, "session-1");
		await resolveArchitectDoc(repoRoot, docPath, "session-1");

		const otherSession = await resolveArchitectDoc(repoRoot, sourcePath, "session-2");
		assert.ok(otherSession, "a new session id has its own read tracking");
	});
});

test("resolveArchitectDoc: returns null when no manifest route matches the path", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});

		const filePath = path.join(repoRoot, "README.md");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.equal(result, null);
	});
});

test("resolveArchitectDoc: a large matched-doc fan-out stays under the emission ceiling with a remaining-count tail", async () => {
	await withTempRepo(async (repoRoot) => {
		const docs = Array.from({ length: 500 }, (_, i) => `_toolkit/doc-${i}.md`);
		await seedManifest(repoRoot, { "scripts/ai-skills/**": docs });

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectDoc(repoRoot, filePath, "session-1");

		assert.ok(result, "expected a nag for the fan-out route");
		assert.ok(
			Buffer.byteLength(result as string, "utf8") <= MAX_EMISSION_BYTES,
			`nag payload must stay within the ${MAX_EMISSION_BYTES}-byte emission ceiling, got ${Buffer.byteLength(result as string, "utf8")} bytes`
		);
		assert.match(
			result as string,
			/\(\+\d+ more matched\)/,
			"a truncated nag names how many further docs were dropped"
		);
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
		assert.deepEqual(state, { read: [] });
	});
});

test("loadRouteState: a pre-rename state file (schema key `injected`) is treated as absent", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.mkdir(path.join(repoRoot, ".prism"), { recursive: true });
		await fs.writeFile(
			path.join(repoRoot, ".prism", "architect-route-state.session-1.json"),
			JSON.stringify({ injected: ["_toolkit/spec-editing.md"] }),
			"utf8"
		);

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(state, { read: [] });
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
		await fs.writeFile(staleFile, JSON.stringify({ read: [] }), "utf8");

		const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);
		await fs.utimes(staleFile, staleTimestamp, staleTimestamp);

		await saveRouteState(repoRoot, "current-session", { read: [] });

		await assert.rejects(fs.access(staleFile));
		await assert.doesNotReject(
			fs.access(
				path.join(repoRoot, ".prism", "architect-route-state.current-session.json")
			)
		);
	});
});

test("saveRouteState: prunes a stale orphaned .json.tmp left by a killed mid-write", async () => {
	await withTempRepo(async (repoRoot) => {
		const orphanedTmpFile = path.join(
			repoRoot,
			".prism",
			"architect-route-state.crashed-session.json.tmp"
		);
		await fs.mkdir(path.dirname(orphanedTmpFile), { recursive: true });
		await fs.writeFile(orphanedTmpFile, JSON.stringify({ read: [] }), "utf8");

		const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);
		await fs.utimes(orphanedTmpFile, staleTimestamp, staleTimestamp);

		await saveRouteState(repoRoot, "current-session", { read: [] });

		await assert.rejects(fs.access(orphanedTmpFile));
	});
});

test("findRepoRoot: walks upward from a subdirectory to find the directory holding the manifest", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});

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
