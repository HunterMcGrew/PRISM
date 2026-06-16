/**
 * Per-file branch coverage for `pnpm prism:update`'s `runUpdate` engine.
 *
 * Each test seeds a throwaway PRISM source `.prism/` and a consumer `.prism/`
 * (optionally with a recorded `.sync-manifest.json`), runs `runUpdate`, and
 * asserts the consumer file state plus the returned outcome. Branches covered:
 * new / no-op / clean-overwrite / diverged→.bak / no-manifest byte-compare
 * fallback (no .bak when already current) / consumer-owned untouched /
 * unknown-classified untouched / deleted-in-PRISM removed / deleted-in-PRISM
 * already-absent no-op / manifest rewritten.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { assertSourceIsPlausible, runUpdate } from "./update";
import { hashContent } from "./utils";
import {
	SYNC_MANIFEST_FILENAME,
	type SyncManifest,
} from "./sync-manifest";

async function withTempRoots(
	body: (roots: {
		prismContentRoot: string;
		consumerContentRoot: string;
	}) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-update-"));
	const prismContentRoot = path.join(tempRoot, "prism", ".prism");
	const consumerContentRoot = path.join(tempRoot, "consumer", ".prism");
	await fs.mkdir(prismContentRoot, { recursive: true });
	await fs.mkdir(consumerContentRoot, { recursive: true });
	try {
		await body({ prismContentRoot, consumerContentRoot });
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeFile(
	contentRoot: string,
	relativePath: string,
	content: string
): Promise<void> {
	const absolutePath = path.join(contentRoot, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

async function readFile(
	contentRoot: string,
	relativePath: string
): Promise<string> {
	return fs.readFile(path.join(contentRoot, relativePath), "utf8");
}

async function fileExists(
	contentRoot: string,
	relativePath: string
): Promise<boolean> {
	try {
		await fs.access(path.join(contentRoot, relativePath));

		return true;
	} catch {
		return false;
	}
}

async function writeConsumerManifest(
	consumerContentRoot: string,
	files: Record<string, string>
): Promise<void> {
	const manifest: SyncManifest = {
		prismVersion: "1.0.0",
		sourceCommit: "abc123",
		generatedAt: "2026-01-01T00:00:00.000Z",
		files: Object.fromEntries(
			Object.entries(files).map(([relativePath, content]) => [
				relativePath,
				{ contentHash: hashContent(content) },
			])
		),
	};
	await writeFile(
		consumerContentRoot,
		SYNC_MANIFEST_FILENAME,
		`${JSON.stringify(manifest, null, "\t")}\n`
	);
}

function outcomeFor(
	summary: Awaited<ReturnType<typeof runUpdate>>,
	relativePath: string
) {
	const outcome = summary.outcomes.find(
		(entry) => entry.relativePath === relativePath
	);
	assert.ok(outcome, `expected an outcome for ${relativePath}`);

	return outcome;
}

test("writes a PRISM-owned file the consumer does not have", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/new-rule.md", "# New rule\n");

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(
			await readFile(consumerContentRoot, "rules/new-rule.md"),
			"# New rule\n"
		);
		assert.equal(outcomeFor(summary, "rules/new-rule.md").action, "written");
		assert.equal(summary.backups.length, 0);
	});
});

test("no-ops when the consumer file already matches incoming", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/same.md", "# Same\n");
		await writeFile(consumerContentRoot, "rules/same.md", "# Same\n");

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(outcomeFor(summary, "rules/same.md").action, "no-op");
		assert.equal(summary.backups.length, 0);
	});
});

test("overwrites freely when the consumer matches its recorded base", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/clean.md", "# v2\n");
		await writeFile(consumerContentRoot, "rules/clean.md", "# v1\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/clean.md": "# v1\n",
		});

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(
			await readFile(consumerContentRoot, "rules/clean.md"),
			"# v2\n"
		);
		assert.equal(outcomeFor(summary, "rules/clean.md").action, "overwritten");
		assert.equal(summary.backups.length, 0);
		assert.equal(await fileExists(consumerContentRoot, "rules/clean.md.bak"), false);
	});
});

test("backs up a diverged file before overwriting it", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/diverged.md", "# incoming\n");
		await writeFile(consumerContentRoot, "rules/diverged.md", "# hand-edited\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/diverged.md": "# original base\n",
		});

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(
			await readFile(consumerContentRoot, "rules/diverged.md"),
			"# incoming\n"
		);
		assert.equal(
			await readFile(consumerContentRoot, "rules/diverged.md.bak"),
			"# hand-edited\n"
		);
		assert.equal(outcomeFor(summary, "rules/diverged.md").action, "backed-up");
		assert.equal(summary.backups.length, 1);
	});
});

test("no-manifest fallback: a diverged file is backed up", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/r.md", "# incoming\n");
		await writeFile(consumerContentRoot, "rules/r.md", "# hand-edited\n");

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(outcomeFor(summary, "rules/r.md").action, "backed-up");
		assert.equal(
			await readFile(consumerContentRoot, "rules/r.md.bak"),
			"# hand-edited\n"
		);
	});
});

test("no-manifest fallback: an already-current file is a no-op, not a .bak", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/current.md", "# identical\n");
		await writeFile(consumerContentRoot, "rules/current.md", "# identical\n");

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(outcomeFor(summary, "rules/current.md").action, "no-op");
		assert.equal(summary.backups.length, 0);
		assert.equal(
			await fileExists(consumerContentRoot, "rules/current.md.bak"),
			false
		);
	});
});

test("leaves a consumer-owned flat architect doc untouched", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "architect/foo.md", "# PRISM version\n");
		await writeFile(consumerContentRoot, "architect/foo.md", "# Consumer product doc\n");

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(
			await readFile(consumerContentRoot, "architect/foo.md"),
			"# Consumer product doc\n"
		);
		assert.equal(
			summary.outcomes.some((o) => o.relativePath === "architect/foo.md"),
			false,
			"consumer-owned path produces no outcome"
		);
	});
});

test("leaves the .prism/custom overlay source untouched", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "custom/rules/team.md", "# Team overlay\n");

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(
			await readFile(consumerContentRoot, "custom/rules/team.md"),
			"# Team overlay\n",
			"overlay source is never written by the canonical sync pass"
		);
		assert.equal(
			summary.outcomes.some((o) => o.relativePath.startsWith("custom/")),
			false,
			"no custom/ path produces an outcome"
		);
	});
});

test("leaves a deep-nested unknown-classified architect path untouched", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "architect/subdir/deep.md", "# incoming\n");
		await writeFile(consumerContentRoot, "architect/subdir/deep.md", "# consumer\n");

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(
			await readFile(consumerContentRoot, "architect/subdir/deep.md"),
			"# consumer\n",
			"unknown-classified path is left untouched"
		);
		assert.equal(
			summary.outcomes.some(
				(o) => o.relativePath === "architect/subdir/deep.md"
			),
			false,
			"unknown-classified path produces no outcome"
		);
	});
});

test("removes a file present in the consumer manifest but absent from PRISM", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/gone.md", "# recorded base\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/gone.md": "# recorded base\n",
		});

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(await fileExists(consumerContentRoot, "rules/gone.md"), false);
		assert.equal(outcomeFor(summary, "rules/gone.md").action, "removed");
		assert.equal(summary.backups.length, 0);
	});
});

test("backs up a diverged file before removing it", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(consumerContentRoot, "rules/gone.md", "# hand-edited\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/gone.md": "# recorded base\n",
		});

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(await fileExists(consumerContentRoot, "rules/gone.md"), false);
		assert.equal(
			await readFile(consumerContentRoot, "rules/gone.md.bak"),
			"# hand-edited\n"
		);
		assert.equal(
			outcomeFor(summary, "rules/gone.md").action,
			"removed-with-backup"
		);
		assert.equal(summary.backups.length, 1);
	});
});

test("no-ops a manifest-recorded deletion the consumer already removed", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {
			"rules/gone.md": "# recorded base\n",
		});

		const summary = await runUpdate({ prismContentRoot, consumerContentRoot });

		assert.equal(await fileExists(consumerContentRoot, "rules/gone.md"), false);
		assert.equal(outcomeFor(summary, "rules/gone.md").action, "no-op");
		assert.equal(
			await fileExists(consumerContentRoot, "rules/gone.md.bak"),
			false
		);
		assert.equal(summary.backups.length, 0);
	});
});

test("rewrites the consumer manifest to the new PRISM base hashes after the run", async () => {
	await withTempRoots(async ({ prismContentRoot, consumerContentRoot }) => {
		await writeFile(prismContentRoot, "rules/a.md", "# A v2\n");
		await writeFile(prismContentRoot, "SPEC.md", "# Spec\n");
		await writeFile(consumerContentRoot, "rules/a.md", "# A v1\n");
		await writeConsumerManifest(consumerContentRoot, {
			"rules/a.md": "# A v1\n",
		});

		await runUpdate({ prismContentRoot, consumerContentRoot });

		const raw = await readFile(consumerContentRoot, SYNC_MANIFEST_FILENAME);
		const manifest = JSON.parse(raw) as SyncManifest;

		assert.equal(
			manifest.files["rules/a.md"].contentHash,
			hashContent("# A v2\n"),
			"manifest records the new incoming hash, not the old base"
		);
		assert.ok(
			manifest.files["SPEC.md"],
			"newly written file is recorded in the manifest"
		);
	});
});

test("assertSourceIsPlausible refuses when the source has no PRISM-owned files", async () => {
	await withTempRoots(async ({ prismContentRoot }) => {
		await assert.rejects(
			() => assertSourceIsPlausible(prismContentRoot, 42),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("--prism-source looks empty"),
					`expected refusal message, got: ${err.message}`
				);
				assert.ok(
					err.message.includes("refusing 42"),
					`expected deletion count in message, got: ${err.message}`
				);

				return true;
			}
		);
	});
});

test("assertSourceIsPlausible passes when the source has at least one PRISM-owned file", async () => {
	await withTempRoots(async ({ prismContentRoot }) => {
		await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");

		await assert.doesNotReject(() =>
			assertSourceIsPlausible(prismContentRoot, 5)
		);
	});
});
