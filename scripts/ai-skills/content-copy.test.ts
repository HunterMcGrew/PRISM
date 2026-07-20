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
import { deriveTokenMap, loadConfig, substituteTokens } from "./lib/tokens";
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
				'---\nload: paths\npaths:\n  - "**/*.tsx"\n---\n\n# Scoped rule\n',
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

test("copyContentToPlatformDir excludes a load: skill rule from the platform copy entirely", async () => {
	await withTempRoots(
		async (contentRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "skill-only.md"),
				"---\nload: skill\n---\n\n# Skill-only rule\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(contentRoot, "rules", "always.md"),
				"---\nload: always\n---\n\n# Always rule\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, changedPaths, new Map());

			let skillOnlyExists = true;
			try {
				await fs.access(path.join(platformDir, "rules", "skill-only.md"));
			} catch {
				skillOnlyExists = false;
			}
			assert.equal(skillOnlyExists, false, "load: skill rule never reaches the platform copy");

			const alwaysCopied = await fs.readFile(
				path.join(platformDir, "rules", "always.md"),
				"utf8"
			);
			assert.match(alwaysCopied, /# Always rule/);
		}
	);
});

test("copyContentToPlatformDir copies a rule missing load: (legacy consumer rule) — never silently drops it", async () => {
	await withTempRoots(
		async (contentRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "legacy.md"),
				"# Legacy rule\n\nNo load: key.\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, changedPaths, new Map());

			const copied = await fs.readFile(path.join(platformDir, "rules", "legacy.md"), "utf8");
			assert.match(copied, /# Legacy rule/);
		}
	);
});

test("removeDeletedManagedContent sweeps a stale platform copy once its source is reclassified to load: skill", async () => {
	await withTempRoots(
		async (contentRoot, platformDir) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "reclassified.md"),
				"---\nload: always\n---\n\n# Reclassified rule\n",
				"utf8"
			);
			const initial: string[] = [];
			await copyContentToPlatformDir(contentRoot, platformDir, false, initial, new Map());

			// The rule is reclassified to load: skill after the platform copy already
			// exists — its source file survives, only its declared load: changes.
			await fs.writeFile(
				path.join(contentRoot, "rules", "reclassified.md"),
				"---\nload: skill\n---\n\n# Reclassified rule\n",
				"utf8"
			);
		},
		async (contentRoot, platformDir) => {
			const changedPaths: string[] = [];
			await removeDeletedManagedContent(contentRoot, platformDir, false, changedPaths);

			let staleExists = true;
			try {
				await fs.access(path.join(platformDir, "rules", "reclassified.md"));
			} catch {
				staleExists = false;
			}
			assert.equal(
				staleExists,
				false,
				"stale copy removed even though the canonical source still exists"
			);
			assert.ok(
				changedPaths.includes(path.join(platformDir, "rules", "reclassified.md"))
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
	// failure here rather than at adopt time.
	const seedRoot = path.join(repoRoot, "templates", "install", ".prism");
	const tokenMap = deriveTokenMap(loadConfig(repoRoot));
	const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-adopt-seed-"));

	try {
		await assert.doesNotReject(
			copyContentToPlatformDir(seedRoot, outputDir, false, [], tokenMap),
			"adopt content-copy over the real install seed must not throw on any token"
		);
	} finally {
		await fs.rm(outputDir, { force: true, recursive: true });
	}
});

/**
 * Recursively lists every file under `dir` as a path relative to `dir`.
 */
async function listFilesRecursive(
	dir: string,
	base = ""
): Promise<string[]> {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const out: string[] = [];

	for (const entry of entries) {
		const relPath = base ? `${base}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			out.push(...(await listFilesRecursive(path.join(dir, entry.name), relPath)));
		} else {
			out.push(relPath);
		}
	}

	return out;
}

test("no seed spec/ file silently substitutes a real-token literal that its canonical counterpart preserves", async () => {
	// The throw-class regression above (Unknown token) only catches seed files
	// carrying a *non-resolvable* literal. A seed file carrying a *real* token
	// literal in prose meant to show the literal — e.g. ADR-0032 illustrating
	// `Thrive` -> `${PROJECT}` — substitutes silently on the adopt content-copy
	// path, corrupting the very illustration the ADR exists to explain. No throw
	// fires, so the throw-only test misses it. Canonical dodges the corruption by
	// writing such illustrations in the `${...}` form, which the substitution
	// pattern does not match. This drives the whole seed spec/ tree through the
	// real substitution engine and asserts every substitution that fires in a
	// seed file also fires in its canonical counterpart — a substitution present
	// in the seed output but absent from canonical is exactly the corruption.
	// Sentinel token values make a fired substitution detectable in the output.
	const seedRoot = path.join(repoRoot, "templates", "install", ".prism", "spec");
	const canonicalRoot = path.join(repoRoot, ".prism", "spec");

	const sentinelMap = new Map(deriveTokenMap(loadConfig(repoRoot)));
	const sentinels: Record<string, string> = {
		PROJECT: "ZZSENTINELPROJECT",
		PROJECT_LOWERCASE: "zzsentinelproject",
		ORG: "ZZSENTINELORG",
		TICKET_PREFIX: "ZZSENTINELPREFIX",
		TICKET_PREFIX_LOWERCASE: "zzsentinelprefix",
		GITHUB_OWNER: "zz-sentinel-owner",
		GITHUB_OWNER_LOWERCASE: "zz-sentinel-owner",
		GITHUB_REPO: "zz-sentinel-repo",
	};
	for (const [token, value] of Object.entries(sentinels)) {
		if (sentinelMap.has(token)) {
			sentinelMap.set(token, value);
		}
	}
	const sentinelValues = [...new Set(Object.values(sentinels))];

	const corruptions: string[] = [];

	for (const relPath of await listFilesRecursive(seedRoot)) {
		const canonicalPath = path.join(canonicalRoot, relPath);

		let canonicalRaw: string;
		try {
			canonicalRaw = await fs.readFile(canonicalPath, "utf8");
		} catch {
			// Seed files with no canonical counterpart can't be compared; the seed
			// tree is a subset of canonical today, so this branch is a guard, not an
			// expected path.
			continue;
		}

		const seedSubstituted = substituteTokens(
			await fs.readFile(path.join(seedRoot, relPath), "utf8"),
			sentinelMap
		);
		const canonicalSubstituted = substituteTokens(canonicalRaw, sentinelMap);

		for (const value of sentinelValues) {
			if (seedSubstituted.includes(value) && !canonicalSubstituted.includes(value)) {
				corruptions.push(`${relPath} (introduces ${value})`);
			}
		}
	}

	assert.deepEqual(
		corruptions,
		[],
		`seed spec/ files corrupt an intended-literal illustration via token substitution: ${corruptions.join(", ")}`
	);
});
