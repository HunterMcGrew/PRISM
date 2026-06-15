/**
 * Regression suite for the sync-manifest generator and loader. Catches:
 *   - hash stability across identical byte inputs
 *   - generateSyncManifest covering exactly the PRISM-owned globs (consumer
 *     paths excluded, `_toolkit/` subdirs and loose SPEC.md included)
 *   - load/parse round-trip of a written manifest
 *   - loadSyncManifest returning null when the manifest is absent
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { hashContent } from "./utils";
import {
	generateSyncManifest,
	loadSyncManifest,
	writeSyncManifest,
	type GenerateSyncManifestOptions,
} from "./sync-manifest";

const FIXED_OPTIONS: GenerateSyncManifestOptions = {
	prismVersion: "1.2.3",
	sourceCommit: "abc1234",
	generatedAt: "2026-06-15T00:00:00.000Z",
};

async function withContentRoot(
	run: (contentRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-sync-manifest-"));
	const contentRoot = path.join(tempRoot, "prism");
	await fs.mkdir(contentRoot, { recursive: true });
	try {
		await run(contentRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeContentFile(
	contentRoot: string,
	relativePath: string,
	body: string
): Promise<void> {
	const absolutePath = path.join(contentRoot, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, body, "utf8");
}

test("hashContent is stable across identical byte inputs", () => {
	const first = hashContent("# Same bytes\n");
	const second = hashContent(Buffer.from("# Same bytes\n", "utf8"));

	assert.equal(first, second);
	assert.match(first, /^sha256:[0-9a-f]{64}$/);
});

test("hashContent differs when the bytes differ", () => {
	assert.notEqual(hashContent("a"), hashContent("b"));
});

test("generateSyncManifest covers exactly the PRISM-owned globs", async () => {
	await withContentRoot(async (contentRoot) => {
		// PRISM-owned
		await writeContentFile(contentRoot, "architect/_toolkit/install-layout.md", "# layout\n");
		await writeContentFile(contentRoot, "spec/adrs/_toolkit/0001-x.md", "# adr\n");
		await writeContentFile(contentRoot, "rules/branch-plan.md", "# rule\n");
		await writeContentFile(contentRoot, "templates/pr.md", "# template\n");
		await writeContentFile(contentRoot, "references/plan-mode.md", "# ref\n");
		await writeContentFile(contentRoot, "spec/SPEC-NOTES.md", "# spec notes\n");
		await writeContentFile(contentRoot, "SPEC.md", "# spec\n");

		// Consumer-owned — must be excluded
		await writeContentFile(contentRoot, "architect/product-overview.md", "# flat product doc\n");
		await writeContentFile(contentRoot, "spec/adrs/0900-consumer.md", "# flat consumer adr\n");
		await writeContentFile(contentRoot, "architect/manifest.json", "{}\n");
		await writeContentFile(contentRoot, "custom/rules/team.md", "# overlay\n");
		await writeContentFile(contentRoot, "plans/prism-1.md", "# plan\n");
		await writeContentFile(contentRoot, "lessons.md", "# lessons\n");

		const manifest = await generateSyncManifest(contentRoot, FIXED_OPTIONS);
		const keys = Object.keys(manifest.files).sort();

		assert.deepEqual(keys, [
			"SPEC.md",
			"architect/_toolkit/install-layout.md",
			"references/plan-mode.md",
			"rules/branch-plan.md",
			"spec/SPEC-NOTES.md",
			"spec/adrs/_toolkit/0001-x.md",
			"templates/pr.md",
		]);
	});
});

test("generateSyncManifest records the version, commit, and per-file hash", async () => {
	await withContentRoot(async (contentRoot) => {
		await writeContentFile(contentRoot, "rules/alpha.md", "# Alpha\n");

		const manifest = await generateSyncManifest(contentRoot, FIXED_OPTIONS);

		assert.equal(manifest.prismVersion, "1.2.3");
		assert.equal(manifest.sourceCommit, "abc1234");
		assert.equal(manifest.generatedAt, "2026-06-15T00:00:00.000Z");
		assert.equal(manifest.files["rules/alpha.md"].contentHash, hashContent("# Alpha\n"));
	});
});

test("writeSyncManifest then loadSyncManifest round-trips the manifest", async () => {
	await withContentRoot(async (contentRoot) => {
		await writeContentFile(contentRoot, "rules/alpha.md", "# Alpha\n");

		const generated = await generateSyncManifest(contentRoot, FIXED_OPTIONS);
		const changedPaths: string[] = [];
		await writeSyncManifest(contentRoot, generated, false, changedPaths);

		assert.equal(changedPaths.length, 1, "manifest write reported as a change");

		const loaded = await loadSyncManifest(contentRoot);
		assert.deepEqual(loaded, generated);
	});
});

test("loadSyncManifest returns null when the manifest is absent", async () => {
	await withContentRoot(async (contentRoot) => {
		assert.equal(await loadSyncManifest(contentRoot), null);
	});
});

test("writeSyncManifest does not push to changedPaths when content is unchanged", async () => {
	await withContentRoot(async (contentRoot) => {
		await writeContentFile(contentRoot, "rules/alpha.md", "# Alpha\n");

		const generated = await generateSyncManifest(contentRoot, FIXED_OPTIONS);

		// First write — establishes the on-disk content.
		await writeSyncManifest(contentRoot, generated, false, []);

		// Second write with identical manifest — must be a no-op.
		const changedPaths: string[] = [];
		await writeSyncManifest(contentRoot, generated, false, changedPaths);

		assert.equal(changedPaths.length, 0, "no-op write must not register as a change");
	});
});

test("writeSyncManifest in check mode reports drift without writing", async () => {
	await withContentRoot(async (contentRoot) => {
		await writeContentFile(contentRoot, "rules/alpha.md", "# Alpha\n");
		const generated = await generateSyncManifest(contentRoot, FIXED_OPTIONS);

		const changedPaths: string[] = [];
		await writeSyncManifest(contentRoot, generated, true, changedPaths);

		assert.equal(changedPaths.length, 1, "drift reported in check mode");
		assert.equal(await loadSyncManifest(contentRoot), null, "nothing written in check mode");
	});
});
