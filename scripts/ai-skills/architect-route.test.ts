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
	formatNag,
	loadRouteState,
	matchDocsForPath,
	MAX_EMISSION_BYTES,
	resolveArchitectNag,
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
 * Writes `.prism/architect/manifest.json` only. A test that expects a nag
 * for a given doc must also write that doc to disk with `seedDoc` below —
 * `resolveArchitectNag` skips a matched doc that does not exist on disk
 * rather than nagging a path the model could never `Read`.
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

/**
 * Writes a stub doc file under `.prism/architect/<doc>` so a route matching
 * it passes the resolver's on-disk existence check. Content is irrelevant —
 * the resolver never reads a doc's body when producing a nag.
 */
async function seedDoc(repoRoot: string, doc: string): Promise<void> {
	const docPath = path.join(repoRoot, ".prism", "architect", doc);
	await fs.mkdir(path.dirname(docPath), { recursive: true });
	await fs.writeFile(docPath, "stub content\n", "utf8");
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

test("resolveArchitectNag: nags the unread matched doc by path on first read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectNag(repoRoot, filePath, "claude", "session-1");

		assert.ok(result, "expected a nag on first read of a matched path");
		assert.match(result as string, /_toolkit\/spec-editing\.md/);
	});
});

test("resolveArchitectNag: the nag never carries a doc's body, only its path", async () => {
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
		const result = await resolveArchitectNag(repoRoot, filePath, "claude", "session-1");

		assert.ok(result);
		assert.match(result as string, /_toolkit\/spec-editing\.md/);
		assert.doesNotMatch(result as string, /Spec editing constraints go here\./);
	});
});

test("resolveArchitectNag: keeps nagging on repeat reads of the matched path until the doc itself is read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const first = await resolveArchitectNag(repoRoot, filePath, "claude", "session-1");
		const second = await resolveArchitectNag(repoRoot, filePath, "claude", "session-1");

		assert.ok(first, "first read nags");
		assert.ok(second, "second read still nags — naming is not delivering");
		assert.match(second as string, /_toolkit\/spec-editing\.md/);
	});
});

test("resolveArchitectNag: a doc drops out of the nag only after its own path is read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const sourcePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const docPath = path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"spec-editing.md"
		);

		const beforeRead = await resolveArchitectNag(repoRoot, sourcePath, "claude", "session-1");
		assert.ok(beforeRead, "unread doc is named before its own path is read");

		const readOfDocItself = await resolveArchitectNag(repoRoot, docPath, "claude", "session-1");
		assert.equal(
			readOfDocItself,
			null,
			"reading the doc's own path matches no manifest route, so it nags nothing"
		);

		const afterRead = await resolveArchitectNag(repoRoot, sourcePath, "claude", "session-1");
		assert.equal(
			afterRead,
			null,
			"the doc no longer appears once its own path has been read"
		);
	});
});

test("resolveArchitectNag: a different session has its own read-tracking and re-nags", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const sourcePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const docPath = path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"spec-editing.md"
		);

		await resolveArchitectNag(repoRoot, sourcePath, "claude", "session-1");
		await resolveArchitectNag(repoRoot, docPath, "claude", "session-1");

		const otherSession = await resolveArchitectNag(repoRoot, sourcePath, "claude", "session-2");
		assert.ok(otherSession, "a new session id has its own read tracking");
	});
});

test("resolveArchitectNag: crediting the just-read doc and nagging other unread matched docs both happen in the same call", async () => {
	await withTempRepo(async (repoRoot) => {
		// A route that matches `.prism/architect/` itself, not just the source
		// tree — the real manifest has routes like this, so reading a doc's own
		// path can also match a route and pull in another unread doc. Step 1
		// (credit the just-read doc) must run before step 2 (nag the unread
		// matched set) computes its filter, or the just-read doc would nag itself.
		await seedManifest(repoRoot, {
			".prism/architect/**": ["_toolkit/spec-editing.md", "_toolkit/other-doc.md"],
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");
		await seedDoc(repoRoot, "_toolkit/other-doc.md");

		const docPath = path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"spec-editing.md"
		);
		const result = await resolveArchitectNag(repoRoot, docPath, "claude", "session-1");

		assert.ok(result, "the read also matches .prism/architect/**, so the still-unread sibling doc is nagged");
		assert.match(result as string, /_toolkit\/other-doc\.md/);
		assert.doesNotMatch(
			result as string,
			/_toolkit\/spec-editing\.md/,
			"the doc just read is credited before the nag filter runs, so it never nags itself"
		);
	});
});

test("resolveArchitectNag: reading manifest.json itself does not credit \"manifest.json\" as a read doc", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const manifestPath = path.join(repoRoot, ".prism", "architect", "manifest.json");
		const result = await resolveArchitectNag(repoRoot, manifestPath, "claude", "session-1");
		assert.equal(result, null, "manifest.json matches no route, so reading it nags nothing");

		const state = await loadRouteState(repoRoot, "claude", "session-1");
		assert.deepEqual(
			state.read,
			[],
			"manifest.json is the routing table, not a doc — it must never appear in the read array"
		);
	});
});

test("resolveArchitectNag: a manifest doc absent from disk is skipped, not nagged forever", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/renamed-away.md",
		});
		// Deliberately no seedDoc call — the manifest route points at a doc
		// that was renamed or deleted without the route being updated.

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const first = await resolveArchitectNag(repoRoot, filePath, "claude", "session-1");
		const second = await resolveArchitectNag(repoRoot, filePath, "claude", "session-1");

		assert.equal(
			first,
			null,
			"a doc that cannot be read is never named — nagging it would repeat forever, since crediting a read requires a Read that can never succeed"
		);
		assert.equal(second, null, "the miss is not a one-time fluke — every subsequent read stays silent too");
	});
});

test("resolveArchitectNag: returns null when no manifest route matches the path", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});

		const filePath = path.join(repoRoot, "README.md");
		const result = await resolveArchitectNag(repoRoot, filePath, "claude", "session-1");

		assert.equal(result, null);
	});
});

test("resolveArchitectNag: a large matched-doc fan-out stays under the emission ceiling with a remaining-count tail", async () => {
	await withTempRepo(async (repoRoot) => {
		const docs = Array.from({ length: 500 }, (_, i) => `_toolkit/doc-${i}.md`);
		await seedManifest(repoRoot, { "scripts/ai-skills/**": docs });
		await Promise.all(docs.map((doc) => seedDoc(repoRoot, doc)));

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = (await resolveArchitectNag(repoRoot, filePath, "claude", "session-1")) as string;

		assert.ok(result, "expected a nag for the fan-out route");
		assert.ok(
			Buffer.byteLength(result, "utf8") <= MAX_EMISSION_BYTES,
			`nag payload must stay within the ${MAX_EMISSION_BYTES}-byte emission ceiling, got ${Buffer.byteLength(result, "utf8")} bytes`
		);

		const tailMatch = result.match(/\(\+(\d+) more matched\)/);
		assert.ok(tailMatch, "a truncated nag names how many further docs were dropped");
		const remaining = Number(tailMatch[1]);
		const namedCount = (result.match(/_toolkit\/doc-\d+\.md/g) ?? []).length;
		assert.equal(
			namedCount + remaining,
			500,
			"named docs plus the remaining count must account for every matched doc — any digits pass a bare regex match, so this cross-checks the actual number instead of just its shape"
		);
	});
});

test("formatNag: a single doc entry longer than the ceiling is still emitted alone, past the bound", () => {
	// Tested against `formatNag` directly rather than through
	// `resolveArchitectNag`'s on-disk path: a doc entry this long could never
	// exist as a real file (a single path segment this long exceeds every
	// common filesystem's NAME_MAX), so `filterDocsOnDisk` would strip it
	// before it ever reached `formatNag` in the full pipeline. This is the
	// unit that actually implements the documented exception
	// (`included = Math.max(included, 1)`), so it's tested at that level —
	// a future edit that made the ceiling strictly hard would fail this test.
	const overLongDoc = `_toolkit/${"x".repeat(MAX_EMISSION_BYTES)}.md`;
	const result = formatNag([overLongDoc]);

	assert.match(result, new RegExp(overLongDoc.replace(/[.+*]/g, "\\$&")));
	assert.ok(
		Buffer.byteLength(result, "utf8") > MAX_EMISSION_BYTES,
		`a single doc entry longer than the ceiling must still be emitted whole, exceeding the ${MAX_EMISSION_BYTES}-byte bound — got ${Buffer.byteLength(result, "utf8")} bytes`
	);
});

test("loadRouteState: a corrupt state file is treated as absent, not thrown", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.mkdir(path.join(repoRoot, ".prism"), { recursive: true });
		await fs.writeFile(
			path.join(repoRoot, ".prism", "architect-route-state.session-1.json"),
			"{not valid json",
			"utf8"
		);

		const state = await loadRouteState(repoRoot, "claude", "session-1");
		assert.deepEqual(state, { read: [] });
	});
});

test("loadRouteState: an unrecognized state-file schema is treated as absent", async () => {
	await withTempRepo(async (repoRoot) => {
		await fs.mkdir(path.join(repoRoot, ".prism"), { recursive: true });
		await fs.writeFile(
			path.join(repoRoot, ".prism", "architect-route-state.session-1.json"),
			JSON.stringify({ injected: ["_toolkit/spec-editing.md"] }),
			"utf8"
		);

		const state = await loadRouteState(repoRoot, "claude", "session-1");
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

		await saveRouteState(repoRoot, "claude", "current-session", { read: [] });

		await assert.rejects(fs.access(staleFile));
		await assert.doesNotReject(
			fs.access(
				path.join(
					repoRoot,
					".prism",
					"architect-route-state.claude.current-session.json"
				)
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

		await saveRouteState(repoRoot, "claude", "current-session", { read: [] });

		await assert.rejects(fs.access(orphanedTmpFile));
	});
});

test("saveRouteState: a state file written under --tool=cursor is reaped by the same prune pass as one written under --tool=claude", async () => {
	await withTempRepo(async (repoRoot) => {
		const staleClaudeFile = path.join(
			repoRoot,
			".prism",
			"architect-route-state.claude.old-session.json"
		);
		const staleCursorFile = path.join(
			repoRoot,
			".prism",
			"architect-route-state.cursor.old-session.json"
		);
		await fs.mkdir(path.dirname(staleClaudeFile), { recursive: true });
		await fs.writeFile(staleClaudeFile, JSON.stringify({ read: [] }), "utf8");
		await fs.writeFile(staleCursorFile, JSON.stringify({ read: [] }), "utf8");

		const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);
		await fs.utimes(staleClaudeFile, staleTimestamp, staleTimestamp);
		await fs.utimes(staleCursorFile, staleTimestamp, staleTimestamp);

		await saveRouteState(repoRoot, "claude", "current-session", { read: [] });

		await assert.rejects(
			fs.access(staleClaudeFile),
			"a stale claude-harness state file is pruned"
		);
		await assert.rejects(
			fs.access(staleCursorFile),
			"a stale cursor-harness state file is pruned by the same pass — pruneStaleRouteState's prefix match does not key on the tool segment"
		);
	});
});

test("resolveArchitectNag: the same session id under two different harnesses writes two separate state files", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		// Reading the doc's own path (not just the matched source path) is what
		// triggers a credited write — see `resolveArchitectNag`'s "credit a
		// read" step. A read of a non-doc path alone never calls
		// `saveRouteState`, so it would never produce a state file to compare.
		const docPath = path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"spec-editing.md"
		);
		await resolveArchitectNag(repoRoot, docPath, "claude", "shared-session");
		await resolveArchitectNag(repoRoot, docPath, "cursor", "shared-session");

		const claudeState = await loadRouteState(repoRoot, "claude", "shared-session");
		const cursorState = await loadRouteState(repoRoot, "cursor", "shared-session");
		assert.deepEqual(
			claudeState.read,
			["_toolkit/spec-editing.md"],
			"the claude-harness state file credited its own read"
		);
		assert.deepEqual(
			cursorState.read,
			["_toolkit/spec-editing.md"],
			"the cursor-harness state file credited its own read independently"
		);

		await assert.doesNotReject(
			fs.access(
				path.join(
					repoRoot,
					".prism",
					"architect-route-state.claude.shared-session.json"
				)
			)
		);
		await assert.doesNotReject(
			fs.access(
				path.join(
					repoRoot,
					".prism",
					"architect-route-state.cursor.shared-session.json"
				)
			)
		);
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
