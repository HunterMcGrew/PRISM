/**
 * Regression suite for the read-triggered architect-context router. Covers
 * the announce-once contract: a matched-but-unread doc is named by path at
 * most once per session and never by body, a doc is credited as read only
 * once its own path is actually read, and a path with no manifest route is
 * a clean no-op.
 *
 * Reading and announcing are tracked in separate arrays because they mean
 * different things. Naming a doc is not delivering it, so only a real read
 * of the doc's own path credits `read` — the array a write-time deny gate
 * clears against. Announcement fills `announced`, and only with the docs an
 * emission actually named: a doc dropped behind the truncation tail is
 * still owed a mention.
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
} from "./hooks/architect-route.mjs";

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
 * Writes `.prism/architect/manifest.json` only. A test that expects an
 * announcement for a given doc must also write that doc to disk with
 * `seedDoc` below — `resolveArchitectNag` skips a matched doc that does not
 * exist on disk rather than announcing a path the model could never `Read`.
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
 * the resolver never reads a doc's body when producing an announcement.
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

test("resolveArchitectNag: announces the unread matched doc by path on first read", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = await resolveArchitectNag(repoRoot, filePath, "session-1");

		assert.ok(result, "expected an announcement on first read of a matched path");
		assert.match(result as string, /_toolkit\/spec-editing\.md/);
	});
});

test("resolveArchitectNag: the announcement never carries a doc's body, only its path", async () => {
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
		const result = await resolveArchitectNag(repoRoot, filePath, "session-1");

		assert.ok(result);
		assert.match(result as string, /_toolkit\/spec-editing\.md/);
		assert.doesNotMatch(result as string, /Spec editing constraints go here\./);
	});
});

test("resolveArchitectNag: a doc is named at most once per session — repeat reads of the matched path stay silent", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const first = await resolveArchitectNag(repoRoot, filePath, "session-1");
		const second = await resolveArchitectNag(repoRoot, filePath, "session-1");

		assert.ok(first, "first read announces");
		assert.equal(
			second,
			null,
			"the doc was already announced this session — a repeat read of the matched path stays silent even though the doc itself was never read"
		);
	});
});

test("resolveArchitectNag: a doc that is actually read is credited, independent of announcement", async () => {
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

		const beforeRead = await resolveArchitectNag(repoRoot, sourcePath, "session-1");
		assert.ok(beforeRead, "unread doc is named before its own path is read");

		const readOfDocItself = await resolveArchitectNag(repoRoot, docPath, "session-1", {
			credit: true,
		});
		assert.equal(
			readOfDocItself,
			null,
			"reading the doc's own path matches no manifest route, so it announces nothing"
		);

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(
			state.read,
			["_toolkit/spec-editing.md"],
			"the doc's own path was read, so it is credited in `read` — the only array a write-time deny gate clears against"
		);
	});
});

test("resolveArchitectNag: without credit, reading a doc's own path credits nothing", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/spec-editing.md",
		});
		await seedDoc(repoRoot, "_toolkit/spec-editing.md");

		const docPath = path.join(
			repoRoot,
			".prism",
			"architect",
			"_toolkit",
			"spec-editing.md"
		);

		await resolveArchitectNag(repoRoot, docPath, "session-1");

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(
			state.read,
			[],
			"credit defaults off — a caller that saw a partial read must not have to opt out of crediting"
		);
	});
});

test("resolveArchitectNag: a different session has its own announcement and read tracking", async () => {
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

		await resolveArchitectNag(repoRoot, sourcePath, "session-1");
		await resolveArchitectNag(repoRoot, docPath, "session-1");

		const otherSession = await resolveArchitectNag(repoRoot, sourcePath, "session-2");
		assert.ok(otherSession, "a new session id has its own announcement tracking");
	});
});

test("resolveArchitectNag: crediting the just-read doc and announcing other unannounced matched docs both happen in the same call", async () => {
	await withTempRepo(async (repoRoot) => {
		// A route that matches `.prism/architect/` itself, not just the source
		// tree — the real manifest has routes like this, so reading a doc's own
		// path can also match a route and pull in another unannounced doc. Step 1
		// (credit the just-read doc) must run before step 2 (announce the
		// unannounced matched set) computes its filter, or the just-read doc
		// would announce itself.
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
		const result = await resolveArchitectNag(repoRoot, docPath, "session-1", {
			credit: true,
		});

		assert.ok(result, "the read also matches .prism/architect/**, so the still-unannounced sibling doc is announced");
		assert.match(result as string, /_toolkit\/other-doc\.md/);
		assert.doesNotMatch(
			result as string,
			/_toolkit\/spec-editing\.md/,
			"the doc just read is credited before the announce filter runs, so it never announces itself"
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
		const result = await resolveArchitectNag(repoRoot, manifestPath, "session-1");
		assert.equal(result, null, "manifest.json matches no route, so reading it announces nothing");

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(
			state.read,
			[],
			"manifest.json is the routing table, not a doc — it must never appear in the read array"
		);
	});
});

test("resolveArchitectNag: a manifest doc absent from disk is skipped, not announced forever", async () => {
	await withTempRepo(async (repoRoot) => {
		await seedManifest(repoRoot, {
			"scripts/ai-skills/**": "_toolkit/renamed-away.md",
		});
		// Deliberately no seedDoc call — the manifest route points at a doc
		// that was renamed or deleted without the route being updated.

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const first = await resolveArchitectNag(repoRoot, filePath, "session-1");
		const second = await resolveArchitectNag(repoRoot, filePath, "session-1");

		assert.equal(
			first,
			null,
			"a doc that cannot be read is never named — crediting a read requires a Read that can never succeed"
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
		const result = await resolveArchitectNag(repoRoot, filePath, "session-1");

		assert.equal(result, null);
	});
});

test("resolveArchitectNag: a large matched-doc fan-out stays under the emission ceiling with a remaining-count tail", async () => {
	await withTempRepo(async (repoRoot) => {
		const docs = Array.from({ length: 500 }, (_, i) => `_toolkit/doc-${i}.md`);
		await seedManifest(repoRoot, { "scripts/ai-skills/**": docs });
		await Promise.all(docs.map((doc) => seedDoc(repoRoot, doc)));

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const result = (await resolveArchitectNag(repoRoot, filePath, "session-1")) as string;

		assert.ok(result, "expected an announcement for the fan-out route");
		assert.ok(
			Buffer.byteLength(result, "utf8") <= MAX_EMISSION_BYTES,
			`announcement payload must stay within the ${MAX_EMISSION_BYTES}-byte emission ceiling, got ${Buffer.byteLength(result, "utf8")} bytes`
		);

		const tailMatch = result.match(/\(\+(\d+) more matched\)/);
		assert.ok(tailMatch, "a truncated announcement names how many further docs were dropped");
		const remaining = Number(tailMatch[1]);
		const namedCount = (result.match(/_toolkit\/doc-\d+\.md/g) ?? []).length;
		assert.equal(
			namedCount + remaining,
			500,
			"named docs plus the remaining count must account for every matched doc — any digits pass a bare regex match, so this cross-checks the actual number instead of just its shape"
		);
	});
});

test("resolveArchitectNag: a doc dropped behind the truncation tail is named on the next read, not silently marked announced", async () => {
	await withTempRepo(async (repoRoot) => {
		const docs = Array.from({ length: 500 }, (_, i) => `_toolkit/doc-${i}.md`);
		await seedManifest(repoRoot, { "scripts/ai-skills/**": docs });
		await Promise.all(docs.map((doc) => seedDoc(repoRoot, doc)));

		const filePath = path.join(repoRoot, "scripts", "ai-skills", "build.ts");
		const first = (await resolveArchitectNag(repoRoot, filePath, "session-1")) as string;
		const firstNamed: string[] = first.match(/_toolkit\/doc-\d+\.md/g) ?? [];
		assert.ok(
			firstNamed.length < docs.length,
			"this fan-out must truncate for the test to exercise anything"
		);

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(
			[...state.announced].sort(),
			[...firstNamed].sort(),
			"only the docs the emitted text actually named are marked announced"
		);

		const second = await resolveArchitectNag(repoRoot, filePath, "session-1");
		assert.ok(
			second,
			"the docs behind the truncation tail are still unannounced, so a later read names them"
		);
		const secondNamed: string[] = (second as string).match(/_toolkit\/doc-\d+\.md/g) ?? [];
		assert.equal(
			secondNamed.filter((doc) => firstNamed.includes(doc)).length,
			0,
			"the second announcement names only docs the first one dropped"
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
	const { text, includedDocs } = formatNag([overLongDoc]);

	assert.match(text, new RegExp(overLongDoc.replace(/[.+*]/g, "\\$&")));
	assert.deepEqual(includedDocs, [overLongDoc]);
	assert.ok(
		Buffer.byteLength(text, "utf8") > MAX_EMISSION_BYTES,
		`a single doc entry longer than the ceiling must still be emitted whole, exceeding the ${MAX_EMISSION_BYTES}-byte bound — got ${Buffer.byteLength(text, "utf8")} bytes`
	);
});

test("formatNag: reports exactly the docs its text names when the list is truncated", () => {
	const docs = Array.from({ length: 500 }, (_, i) => `_toolkit/doc-${i}.md`);
	const { text, includedDocs } = formatNag(docs);

	assert.ok(
		includedDocs.length < docs.length,
		"this list must truncate for the test to exercise anything"
	);
	assert.deepEqual(
		includedDocs,
		text.match(/_toolkit\/doc-\d+\.md/g),
		"includedDocs is what the text names, in the order it names them"
	);
	assert.match(text, new RegExp(`\\(\\+${docs.length - includedDocs.length} more matched\\)`));
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
		assert.deepEqual(state, { read: [], announced: [] });
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

		const state = await loadRouteState(repoRoot, "session-1");
		assert.deepEqual(state, { read: [], announced: [] });
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
		await fs.writeFile(staleFile, JSON.stringify({ read: [], announced: [] }), "utf8");

		const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);
		await fs.utimes(staleFile, staleTimestamp, staleTimestamp);

		await saveRouteState(repoRoot, "current-session", { read: [], announced: [] });

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
		await fs.writeFile(orphanedTmpFile, JSON.stringify({ read: [], announced: [] }), "utf8");

		const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);
		await fs.utimes(orphanedTmpFile, staleTimestamp, staleTimestamp);

		await saveRouteState(repoRoot, "current-session", { read: [], announced: [] });

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
