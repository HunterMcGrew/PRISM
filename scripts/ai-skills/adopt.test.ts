/**
 * Coverage for `pnpm prism:adopt`'s seed and orchestration logic.
 *
 * Each test seeds a throwaway PRISM source layout (`.prism/` + `templates/install/.prism/`)
 * and a consumer root, runs the relevant function, and asserts the consumer file
 * state plus the returned summary. Branches covered: seed writes-absent /
 * seed skips-present / runAdopt produces .sync-manifest.json / byte-identical
 * consumer file is a no-op not a .bak / diverged consumer file preserved as .bak /
 * manifest-exists refusal.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	assertConsumerIsEstablished,
	runAdopt,
	seedConsumerContentRoot,
} from "./adopt";
import { hashContent } from "./utils";
import { SYNC_MANIFEST_FILENAME, type SyncManifest } from "./sync-manifest";

/**
 * Sets up a temporary directory tree with isolated prism and consumer roots.
 * Provides `prismSourceRoot` (the PRISM repo root, containing both `.prism/`
 * and `templates/install/.prism/`) and `consumerRepoRoot`.
 */
async function withTempRoots(
	body: (roots: {
		prismSourceRoot: string;
		prismContentRoot: string;
		installSeedRoot: string;
		consumerRepoRoot: string;
		consumerContentRoot: string;
	}) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-adopt-"));
	const prismSourceRoot = path.join(tempRoot, "prism");
	const prismContentRoot = path.join(prismSourceRoot, ".prism");
	const installSeedRoot = path.join(prismSourceRoot, "templates", "install", ".prism");
	const consumerRepoRoot = path.join(tempRoot, "consumer");
	const consumerContentRoot = path.join(consumerRepoRoot, ".prism");

	await fs.mkdir(prismContentRoot, { recursive: true });
	await fs.mkdir(installSeedRoot, { recursive: true });
	await fs.mkdir(consumerContentRoot, { recursive: true });

	try {
		await body({
			prismSourceRoot,
			prismContentRoot,
			installSeedRoot,
			consumerRepoRoot,
			consumerContentRoot,
		});
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeFile(
	root: string,
	relativePath: string,
	content: string
): Promise<void> {
	const absolutePath = path.join(root, relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(absolutePath, content, "utf8");
}

async function readFile(root: string, relativePath: string): Promise<string> {
	return fs.readFile(path.join(root, relativePath), "utf8");
}

async function fileExists(root: string, relativePath: string): Promise<boolean> {
	try {
		await fs.access(path.join(root, relativePath));
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

// --- seed tests ---

test("seed writes an absent file into the consumer content root", async () => {
	await withTempRoots(
		async ({ installSeedRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/new-rule.md", "# New rule\n");

			const summary = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);

			assert.equal(
				await readFile(consumerContentRoot, "rules/new-rule.md"),
				"# New rule\n"
			);
			assert.deepEqual(summary.written, ["rules/new-rule.md"]);
			assert.deepEqual(summary.skipped, []);
		}
	);
});

test("seed skips a path already present in the consumer", async () => {
	await withTempRoots(
		async ({ installSeedRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/existing.md", "# Seed version\n");
			await writeFile(consumerContentRoot, "rules/existing.md", "# Consumer version\n");

			const summary = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);

			assert.equal(
				await readFile(consumerContentRoot, "rules/existing.md"),
				"# Consumer version\n",
				"consumer file must not be overwritten"
			);
			assert.deepEqual(summary.written, []);
			assert.deepEqual(summary.skipped, ["rules/existing.md"]);
		}
	);
});

test("seed writes absent files and skips present ones in the same pass", async () => {
	await withTempRoots(
		async ({ installSeedRoot, consumerContentRoot }) => {
			await writeFile(installSeedRoot, "rules/new.md", "# New\n");
			await writeFile(installSeedRoot, "rules/existing.md", "# Seed\n");
			await writeFile(consumerContentRoot, "rules/existing.md", "# Consumer\n");

			const summary = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);

			assert.equal(await readFile(consumerContentRoot, "rules/new.md"), "# New\n");
			assert.equal(
				await readFile(consumerContentRoot, "rules/existing.md"),
				"# Consumer\n"
			);
			assert.ok(summary.written.includes("rules/new.md"));
			assert.ok(summary.skipped.includes("rules/existing.md"));
		}
	);
});

// --- runAdopt orchestration tests ---

test("runAdopt produces a .sync-manifest.json after the first pass", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			prismContentRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// Seed the PRISM source .prism/ with a PRISM-owned file so runUpdate has
			// something to apply and rewriteConsumerManifest can record it.
			await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.ok(
				await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
				"baseline manifest must exist after runAdopt"
			);

			const raw = await readFile(consumerContentRoot, SYNC_MANIFEST_FILENAME);
			const manifest = JSON.parse(raw) as SyncManifest;
			assert.ok(
				manifest.files["rules/some-rule.md"],
				"manifest records the PRISM-owned file written during adopt"
			);

			assert.ok(Array.isArray(summary.seed.written));
			assert.ok(Array.isArray(summary.update.outcomes));
		}
	);
});

test("no-manifest byte-identical consumer file is a no-op, not a .bak", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			prismContentRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// Consumer already has the file at the exact same bytes as PRISM ships.
			await writeFile(prismContentRoot, "rules/current.md", "# identical\n");
			await writeFile(consumerContentRoot, "rules/current.md", "# identical\n");

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			const outcome = summary.update.outcomes.find(
				(o) => o.relativePath === "rules/current.md"
			);
			assert.ok(outcome, "expected an outcome for rules/current.md");
			assert.equal(outcome.action, "no-op");
			assert.equal(summary.update.backups.length, 0);
			assert.equal(
				await fileExists(consumerContentRoot, "rules/current.md.bak"),
				false,
				"no .bak for a byte-identical file"
			);
		}
	);
});

test("diverged consumer file is preserved as .bak during runAdopt", async () => {
	await withTempRoots(
		async ({
			prismSourceRoot,
			prismContentRoot,
			consumerRepoRoot,
			consumerContentRoot,
		}) => {
			// PRISM ships an updated version; consumer has a hand-edited copy.
			// No manifest exists (first-contact scenario).
			await writeFile(prismContentRoot, "rules/rule.md", "# PRISM version\n");
			await writeFile(consumerContentRoot, "rules/rule.md", "# Hand-edited\n");

			const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

			assert.equal(
				await readFile(consumerContentRoot, "rules/rule.md"),
				"# PRISM version\n",
				"consumer file updated to PRISM version"
			);
			assert.equal(
				await readFile(consumerContentRoot, "rules/rule.md.bak"),
				"# Hand-edited\n",
				"diverged consumer edit preserved as .bak"
			);

			const outcome = summary.update.outcomes.find(
				(o) => o.relativePath === "rules/rule.md"
			);
			assert.ok(outcome, "expected an outcome for rules/rule.md");
			assert.equal(outcome.action, "backed-up");
			assert.equal(summary.update.backups.length, 1);
		}
	);
});

// --- manifest-exists refusal test ---

test("assertConsumerIsEstablished throws when a .sync-manifest.json already exists", async () => {
	await withTempRoots(async ({ consumerContentRoot }) => {
		await writeConsumerManifest(consumerContentRoot, {});

		await assert.rejects(
			() => assertConsumerIsEstablished(consumerContentRoot),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(
					err.message.includes("already has a PRISM baseline"),
					`expected refusal message, got: ${err.message}`
				);
				assert.ok(
					err.message.includes("pnpm prism:update"),
					`expected update guidance in message, got: ${err.message}`
				);
				return true;
			}
		);
	});
});

test("assertConsumerIsEstablished passes when no .sync-manifest.json exists", async () => {
	await withTempRoots(async ({ consumerContentRoot }) => {
		await assert.doesNotReject(() =>
			assertConsumerIsEstablished(consumerContentRoot)
		);
	});
});

test("runAdopt throws when a .sync-manifest.json already exists", async () => {
	await withTempRoots(
		async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot, consumerContentRoot }) => {
			// Seed a PRISM source file so runUpdate has something to operate on,
			// then pre-seed a manifest to simulate a repo already in steady-state.
			await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
			await writeConsumerManifest(consumerContentRoot, {});

			await assert.rejects(
				() => runAdopt({ prismSourceRoot, consumerRepoRoot }),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.ok(
						err.message.includes("already has a PRISM baseline"),
						`expected refusal message, got: ${err.message}`
					);
					assert.ok(
						err.message.includes("pnpm prism:update"),
						`expected update guidance in message, got: ${err.message}`
					);
					return true;
				}
			);
		}
	);
});
