/**
 * Regression suite for the bifurcation's content-copy step. Catches:
 *   - happy-path copy (canonical → platform copy is byte-identical)
 *   - drift detection (changedPaths populated when copies differ)
 *   - check-mode read-only behavior (no writes)
 *   - cleanup of build copies whose canonical source was removed
 *   - protection against deleting unmanaged directories (no marker)
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import {
	copyContentToPlatformDir,
	removeDeletedManagedContent,
} from "./build";
import { MANAGED_MARKER } from "./utils";

async function withTempRoots(
	build: (contentRoot: string, platformDir: string) => Promise<void>,
	check: (contentRoot: string, platformDir: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-content-copy-")
	);
	const contentRoot = path.join(tempRoot, "canonical");
	const platformDir = path.join(tempRoot, "platform");
	await fs.mkdir(contentRoot, { recursive: true });
	await fs.mkdir(platformDir, { recursive: true });
	try {
		await build(contentRoot, platformDir);
		await check(contentRoot, platformDir);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

test("copyContentToPlatformDir mirrors canonical files into platform dir", async () => {
	await withTempRoots(
		async (contentRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha rule\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, changedPaths);

			const copiedPath = path.join(platformDir, "rules", "alpha.md");
			const markerPath = path.join(platformDir, "rules", MANAGED_MARKER);
			const copied = await fs.readFile(copiedPath, "utf8");
			const marker = await fs.readFile(markerPath, "utf8");

			assert.equal(copied, "# Alpha rule\n");
			assert.match(marker, /Managed by/);
			assert.ok(changedPaths.includes(copiedPath));
			assert.ok(changedPaths.includes(markerPath));
		}
	);
});

test("copyContentToPlatformDir is a no-op when copies match canonical", async () => {
	await withTempRoots(
		async (contentRoot, platformDir) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			const firstPass: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, firstPass);
		},
		async (contentRoot, platformDir) => {
			const secondPass: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, secondPass);
			assert.equal(secondPass.length, 0, "no changes on second pass");
		}
	);
});

test("copyContentToPlatformDir reports drift but writes nothing in check mode", async () => {
	await withTempRoots(
		async (contentRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, true, changedPaths);

			assert.ok(changedPaths.length > 0, "drift reported");
			const copiedPath = path.join(platformDir, "rules", "alpha.md");
			let exists = true;
			try {
				await fs.access(copiedPath);
			} catch {
				exists = false;
			}
			assert.equal(exists, false, "no file written in check mode");
		}
	);
});

test("removeDeletedManagedContent cleans up orphaned platform copies", async () => {
	await withTempRoots(
		async (contentRoot, platformDir) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			const initial: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, initial);

			await fs.rm(path.join(contentRoot, "rules", "alpha.md"));
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await removeDeletedManagedContent(contentRoot, platformDir, false, changedPaths);

			const orphan = path.join(platformDir, "rules", "alpha.md");
			let stillExists = true;
			try {
				await fs.access(orphan);
			} catch {
				stillExists = false;
			}
			assert.equal(stillExists, false, "orphan removed");
			assert.ok(changedPaths.includes(orphan));
		}
	);
});

test("removeDeletedManagedContent refuses to delete from a directory missing the marker", async () => {
	await withTempRoots(
		async (contentRoot, platformDir) => {
			await fs.mkdir(path.join(platformDir, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(platformDir, "rules", "hand-authored.md"),
				"# Hand-authored — never managed\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await removeDeletedManagedContent(contentRoot, platformDir, false, changedPaths);

			const handAuthored = path.join(platformDir, "rules", "hand-authored.md");
			const stillThere = await fs.readFile(handAuthored, "utf8");
			assert.match(stillThere, /Hand-authored/);
			assert.equal(changedPaths.length, 0);
		}
	);
});
