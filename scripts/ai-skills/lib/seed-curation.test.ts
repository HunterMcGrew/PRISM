/**
 * Coverage for `loadSeedCurationRenames` and `invertRenames` — the shared
 * table `adopt.ts`, `update.ts`, and `doctor.ts` all read instead of
 * hardcoding their own copy of the seed-curation rename list.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert/strict";

import { invertRenames, loadSeedCurationRenames } from "./seed-curation";

async function withPrismSourceRoot(
	body: (prismSourceRoot: string) => Promise<void>
): Promise<void> {
	const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "prism-seed-curation-"));
	try {
		await body(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function writeSeedCuration(
	prismSourceRoot: string,
	renames: Record<string, string>
): Promise<void> {
	const curationPath = path.join(
		prismSourceRoot,
		".ai-skills",
		"definitions",
		"seed-curation.json"
	);
	await fs.mkdir(path.dirname(curationPath), { recursive: true });
	await fs.writeFile(
		curationPath,
		`${JSON.stringify({ excluded: [], curated: [], seedOnly: [], renames }, null, "\t")}\n`,
		"utf8"
	);
}

test("loadSeedCurationRenames returns the renames table from seed-curation.json", async () => {
	await withPrismSourceRoot(async (prismSourceRoot) => {
		await writeSeedCuration(prismSourceRoot, {
			"architect/manifest.json": "architect/manifest.stub.json",
			"SPEC.md": "SPEC.md.tmpl",
		});

		const renames = await loadSeedCurationRenames(prismSourceRoot);

		assert.deepEqual(renames, {
			"architect/manifest.json": "architect/manifest.stub.json",
			"SPEC.md": "SPEC.md.tmpl",
		});
	});
});

test("loadSeedCurationRenames throws when seed-curation.json is absent", async () => {
	await withPrismSourceRoot(async (prismSourceRoot) => {
		await assert.rejects(
			() => loadSeedCurationRenames(prismSourceRoot),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(err.message.includes("Missing seed-curation.json"));
				return true;
			}
		);
	});
});

test("loadSeedCurationRenames throws on malformed JSON", async () => {
	await withPrismSourceRoot(async (prismSourceRoot) => {
		const curationPath = path.join(
			prismSourceRoot,
			".ai-skills",
			"definitions",
			"seed-curation.json"
		);
		await fs.mkdir(path.dirname(curationPath), { recursive: true });
		await fs.writeFile(curationPath, "{ not json", "utf8");

		await assert.rejects(
			() => loadSeedCurationRenames(prismSourceRoot),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(err.message.includes("Invalid seed-curation.json"));
				return true;
			}
		);
	});
});

test("invertRenames maps seed path back to canonical path", () => {
	const inverted = invertRenames({
		"architect/manifest.json": "architect/manifest.stub.json",
		"SPEC.md": "SPEC.md.tmpl",
	});

	assert.deepEqual(inverted, {
		"architect/manifest.stub.json": "architect/manifest.json",
		"SPEC.md.tmpl": "SPEC.md",
	});
});

test("invertRenames returns an empty map for an empty input", () => {
	assert.deepEqual(invertRenames({}), {});
});

test("invertRenames throws when two canonical paths share a seed name", () => {
	assert.throws(
		() =>
			invertRenames({
				"architect/manifest.json": "shared.json",
				"other/file.json": "shared.json",
			}),
		(err: unknown) => {
			assert.ok(err instanceof Error);
			assert.ok(err.message.includes("is not one-to-one"));
			return true;
		}
	);
});

test("loadSeedCurationRenames throws when renames maps a key to a non-string value", async () => {
	await withPrismSourceRoot(async (prismSourceRoot) => {
		const curationPath = path.join(
			prismSourceRoot,
			".ai-skills",
			"definitions",
			"seed-curation.json"
		);
		await fs.mkdir(path.dirname(curationPath), { recursive: true });
		await fs.writeFile(
			curationPath,
			`${JSON.stringify({ excluded: [], curated: [], seedOnly: [], renames: { "SPEC.md": 5 } }, null, "\t")}\n`,
			"utf8"
		);

		await assert.rejects(
			() => loadSeedCurationRenames(prismSourceRoot),
			(err: unknown) => {
				assert.ok(err instanceof Error);
				assert.ok(err.message.includes('renames["SPEC.md"] must be a string'));
				return true;
			}
		);
	});
});

test("loadSeedCurationRenames returns an empty map when the renames key is absent", async () => {
	await withPrismSourceRoot(async (prismSourceRoot) => {
		const curationPath = path.join(
			prismSourceRoot,
			".ai-skills",
			"definitions",
			"seed-curation.json"
		);
		await fs.mkdir(path.dirname(curationPath), { recursive: true });
		await fs.writeFile(
			curationPath,
			`${JSON.stringify({ excluded: [], curated: [], seedOnly: [] }, null, "\t")}\n`,
			"utf8"
		);

		const renames = await loadSeedCurationRenames(prismSourceRoot);

		assert.deepEqual(renames, {});
	});
});
