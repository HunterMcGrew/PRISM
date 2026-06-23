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
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import {
	copyContentToPlatformDir,
	removeDeletedManagedContent,
	syncPlatformContentCopy,
} from "./build";
import { deriveTokenMap, loadConfig } from "./lib/tokens";
import { cursorRuleDialect } from "./rule-dialect";
import { MANAGED_MARKER } from "./utils";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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
			await copyContentToPlatformDir(contentRoot, platformDir, false, changedPaths, new Map());

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
			await copyContentToPlatformDir(contentRoot, platformDir, false, firstPass, new Map());
		},
		async (contentRoot, platformDir) => {
			const secondPass: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, secondPass, new Map());
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
			await copyContentToPlatformDir(contentRoot, platformDir, true, changedPaths, new Map());

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
			await copyContentToPlatformDir(contentRoot, platformDir, false, initial, new Map());

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

test("copyContentToPlatformDir copies the loose SPEC.md file", async () => {
	await withTempRoots(
		async (contentRoot) => {
			await fs.writeFile(
				path.join(contentRoot, "SPEC.md"),
				"# PRISM Spec\n\nTier 0 meta-doc.\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, changedPaths, new Map());

			const copiedPath = path.join(platformDir, "SPEC.md");
			const copied = await fs.readFile(copiedPath, "utf8");
			assert.match(copied, /PRISM Spec/);
			assert.ok(changedPaths.includes(copiedPath));

			const idempotent: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, idempotent, new Map());
			assert.equal(idempotent.length, 0, "no changes on second pass");
		}
	);
});

test("syncPlatformContentCopy skips a platform with no managed content in check mode", async () => {
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
			await syncPlatformContentCopy(
				contentRoot,
				platformDir,
				true,
				changedPaths,
				new Map()
			);

			assert.equal(
				changedPaths.length,
				0,
				"no drift reported for platform without markers"
			);
		}
	);
});

test("syncPlatformContentCopy still skips when only an unrelated dir exists in the platform", async () => {
	await withTempRoots(
		async (contentRoot, platformDir) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			await fs.mkdir(path.join(platformDir, "agents"), { recursive: true });
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await syncPlatformContentCopy(
				contentRoot,
				platformDir,
				true,
				changedPaths,
				new Map()
			);

			assert.equal(
				changedPaths.length,
				0,
				"unrelated subdir is not the opt-in signal"
			);
		}
	);
});

test("syncPlatformContentCopy creates an absent platform dir in build mode", async () => {
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
			await fs.rm(platformDir, { force: true, recursive: true });

			const changedPaths: string[] = [];
			await syncPlatformContentCopy(
				contentRoot,
				platformDir,
				false,
				changedPaths,
				new Map()
			);

			const copiedPath = path.join(platformDir, "rules", "alpha.md");
			const copied = await fs.readFile(copiedPath, "utf8");
			assert.equal(copied, "# Alpha\n");
			assert.ok(changedPaths.includes(copiedPath));
		}
	);
});

test("syncPlatformContentCopy drift-checks an existing platform dir in check mode", async () => {
	await withTempRoots(
		async (contentRoot, platformDir) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			const initial: string[] = [];
			await syncPlatformContentCopy(contentRoot, platformDir, false, initial, new Map());

			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha edited\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await syncPlatformContentCopy(
				contentRoot,
				platformDir,
				true,
				changedPaths,
				new Map()
			);
			assert.ok(changedPaths.length > 0, "drift reported for existing platform dir");
		}
	);
});

test("cursor dialect emits .mdc rule copies with globs:/alwaysApply: frontmatter", async () => {
	await withTempRoots(
		async (contentRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "scoped.md"),
				'---\npaths:\n  - "**/*.tsx"\n---\n\n# Scoped rule\n',
				"utf8"
			);
			await fs.writeFile(
				path.join(contentRoot, "rules", "universal.md"),
				"# Universal rule\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await copyContentToPlatformDir(
				contentRoot,
				platformDir,
				false,
				changedPaths,
				new Map(),
				cursorRuleDialect
			);

			const scoped = await fs.readFile(
				path.join(platformDir, "rules", "scoped.mdc"),
				"utf8"
			);
			const universal = await fs.readFile(
				path.join(platformDir, "rules", "universal.mdc"),
				"utf8"
			);

			assert.match(scoped, /globs:/);
			assert.doesNotMatch(scoped, /paths:/);
			assert.match(universal, /alwaysApply: true/);

			let mdExists = true;
			try {
				await fs.access(path.join(platformDir, "rules", "scoped.md"));
			} catch {
				mdExists = false;
			}
			assert.equal(mdExists, false, "no verbatim .md copy alongside the .mdc");
		}
	);
});

test("cursor dialect cleanup removes a stale .md copy once .mdc is emitted", async () => {
	await withTempRoots(
		async (contentRoot, platformDir) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			// Simulate a pre-dialect build: a verbatim .md copy plus the area
			// marker, the exact state #73 inherited.
			await fs.mkdir(path.join(platformDir, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(platformDir, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(platformDir, "rules", MANAGED_MARKER),
				"Managed by scripts/ai-skills/build.ts\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await removeDeletedManagedContent(
				contentRoot,
				platformDir,
				false,
				changedPaths,
				cursorRuleDialect
			);

			let staleExists = true;
			try {
				await fs.access(path.join(platformDir, "rules", "alpha.md"));
			} catch {
				staleExists = false;
			}
			assert.equal(staleExists, false, "stale .md copy removed");
			assert.ok(
				changedPaths.includes(path.join(platformDir, "rules", "alpha.md"))
			);
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

test("copyContentToPlatformDir resolves every token across the real install seed without throwing", async () => {
	// The adopt-path content-copy step runs substituteTokens over each seeded
	// file. A seed file carrying a non-resolvable example literal (a bare
	// `${UPPER_SNAKE}` that isn't a real token) makes substituteTokens fail-fast
	// with Unknown token, breaking prism:adopt. This exercises the real seed tree
	// with a real consumer tokenMap so any such literal surfaces as a test
	// failure here rather than at adopt time. Regression for the stale ADR-0030
	// seed copy whose `${TOKEN}` example literal broke prism:adopt.
	const seedRoot = path.join(repoRoot, "templates", "install", ".prism");
	const tokenMap = deriveTokenMap(loadConfig(repoRoot));
	const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-adopt-seed-"));

	try {
		await assert.doesNotReject(
			copyContentToPlatformDir(seedRoot, outputDir, false, [], tokenMap),
			"adopt content-copy over the real install seed must not throw on any token"
		);

		const adrText = await fs.readFile(
			path.join(
				outputDir,
				"spec",
				"adrs",
				"_toolkit",
				"0030-token-substitution-at-build-time.md"
			),
			"utf8"
		);
		assert.doesNotMatch(
			adrText,
			/\$\{[A-Z][A-Z0-9_]*\}/,
			"the seed ADR-0030 copy must carry no unresolved bare token literal after substitution"
		);
	} finally {
		await fs.rm(outputDir, { force: true, recursive: true });
	}
});
