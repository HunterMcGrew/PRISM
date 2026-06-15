/**
 * Unit tests for checkSeedDrift — verifies the read-only drift check between
 * the canonical content root (.prism/) and the install seed (templates/install/.prism/).
 *
 * Tests operate on temp dirs to avoid touching the real seed.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { checkSeedDrift, type SeedCuration } from "./build";

async function withTempRoots(
	build: (contentRoot: string, seedRoot: string) => Promise<void>,
	check: (contentRoot: string, seedRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-seed-drift-")
	);
	const contentRoot = path.join(tempRoot, "canonical");
	const seedRoot = path.join(tempRoot, "seed");
	await fs.mkdir(contentRoot, { recursive: true });
	await fs.mkdir(seedRoot, { recursive: true });
	try {
		await build(contentRoot, seedRoot);
		await check(contentRoot, seedRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

const emptyCuration: SeedCuration = {
	excluded: [],
	curated: [],
	seedOnly: [],
	renames: {},
};

test("identical — canonical and seed are byte-identical; changedPaths stays empty", async () => {
	await withTempRoots(
		async (contentRoot, seedRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.mkdir(path.join(seedRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha rule\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "rules", "alpha.md"),
				"# Alpha rule\n",
				"utf8"
			);
		},
		async (contentRoot, seedRoot) => {
			const changedPaths: string[] = [];
			await checkSeedDrift(contentRoot, seedRoot, emptyCuration, changedPaths);
			assert.equal(changedPaths.length, 0, "no drift on identical files");
		}
	);
});

test("drifted — seed has a non-curated file that differs; changedPaths contains seed drift entry", async () => {
	await withTempRoots(
		async (contentRoot, seedRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.mkdir(path.join(seedRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "beta.md"),
				"# Beta rule\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "rules", "beta.md"),
				"# Beta rule — modified\n",
				"utf8"
			);
		},
		async (contentRoot, seedRoot) => {
			const changedPaths: string[] = [];
			await checkSeedDrift(contentRoot, seedRoot, emptyCuration, changedPaths);
			assert.ok(
				changedPaths.some((p) => p.includes("seed drift: rules/beta.md")),
				`expected seed drift for rules/beta.md, got: ${JSON.stringify(changedPaths)}`
			);
		}
	);
});

test("curated — seed has a curated file that differs; changedPaths stays empty", async () => {
	await withTempRoots(
		async (contentRoot, seedRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.mkdir(path.join(seedRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "verification-commands.md"),
				"# Canonical verification commands\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "rules", "verification-commands.md"),
				"# Consumer stub — intentionally different\n",
				"utf8"
			);
		},
		async (contentRoot, seedRoot) => {
			const curation: SeedCuration = {
				...emptyCuration,
				curated: ["rules/verification-commands.md"],
			};
			const changedPaths: string[] = [];
			await checkSeedDrift(contentRoot, seedRoot, curation, changedPaths);
			assert.equal(
				changedPaths.length,
				0,
				"curated file content compare is skipped"
			);
		}
	);
});

test("excluded — an excluded canonical file appears in seed; changedPaths contains seed-contains-excluded entry", async () => {
	await withTempRoots(
		async (contentRoot, seedRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.mkdir(path.join(seedRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "core-principles.md"),
				"# Core principles\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "rules", "core-principles.md"),
				"# Core principles\n",
				"utf8"
			);
		},
		async (contentRoot, seedRoot) => {
			const curation: SeedCuration = {
				...emptyCuration,
				excluded: ["rules/core-principles.md"],
			};
			const changedPaths: string[] = [];
			await checkSeedDrift(contentRoot, seedRoot, curation, changedPaths);
			assert.ok(
				changedPaths.some((p) =>
					p.includes("seed contains excluded file: rules/core-principles.md")
				),
				`expected excluded violation, got: ${JSON.stringify(changedPaths)}`
			);
		}
	);
});

test("orphan — seed has a file not in canonical and not in seedOnly; changedPaths contains seed orphan entry", async () => {
	await withTempRoots(
		async (contentRoot, seedRoot) => {
			await fs.mkdir(path.join(contentRoot, "rules"), { recursive: true });
			await fs.mkdir(path.join(seedRoot, "rules"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "rules", "alpha.md"),
				"# Alpha\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "rules", "orphan.md"),
				"# Orphan — no canonical counterpart\n",
				"utf8"
			);
		},
		async (contentRoot, seedRoot) => {
			const changedPaths: string[] = [];
			await checkSeedDrift(contentRoot, seedRoot, emptyCuration, changedPaths);
			assert.ok(
				changedPaths.some((p) => p.includes("seed orphan: rules/orphan.md")),
				`expected orphan entry, got: ${JSON.stringify(changedPaths)}`
			);
		}
	);
});

test("rename (loose file) — canonical has SPEC.md; seed has SPEC.md.tmpl via renames; changedPaths stays empty", async () => {
	await withTempRoots(
		async (contentRoot, seedRoot) => {
			await fs.writeFile(
				path.join(contentRoot, "SPEC.md"),
				"# SPEC content\n",
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "SPEC.md.tmpl"),
				"# SPEC template content — intentionally different\n",
				"utf8"
			);
		},
		async (contentRoot, seedRoot) => {
			const curation: SeedCuration = {
				...emptyCuration,
				renames: { "SPEC.md": "SPEC.md.tmpl" },
			};
			const changedPaths: string[] = [];
			await checkSeedDrift(contentRoot, seedRoot, curation, changedPaths);
			assert.equal(
				changedPaths.length,
				0,
				"loose-file rename in seed is recognized as present — no drift"
			);
		}
	);
});

test("rename — canonical has manifest.json; seed has manifest.stub.json; changedPaths stays empty", async () => {
	await withTempRoots(
		async (contentRoot, seedRoot) => {
			await fs.mkdir(path.join(contentRoot, "architect"), { recursive: true });
			await fs.mkdir(path.join(seedRoot, "architect"), { recursive: true });
			await fs.writeFile(
				path.join(contentRoot, "architect", "manifest.json"),
				'{"version": 1}\n',
				"utf8"
			);
			await fs.writeFile(
				path.join(seedRoot, "architect", "manifest.stub.json"),
				'{"version": 1}\n',
				"utf8"
			);
		},
		async (contentRoot, seedRoot) => {
			const curation: SeedCuration = {
				...emptyCuration,
				renames: { "architect/manifest.json": "architect/manifest.stub.json" },
			};
			const changedPaths: string[] = [];
			await checkSeedDrift(contentRoot, seedRoot, curation, changedPaths);
			assert.equal(
				changedPaths.length,
				0,
				"renamed file in seed is recognized as present"
			);
		}
	);
});
