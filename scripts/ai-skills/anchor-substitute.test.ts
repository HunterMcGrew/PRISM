/**
 * Tests for Atlas's anchor-substitute module (PR-2.4, plan task 5).
 *
 * Covers the contract surfaces `lib/anchor-substitute.ts` exposes:
 * - `findAnchors` — happy paths and structural rejections.
 * - `substituteAnchors` — idempotency, atomicity, unknown-key warning,
 *   orphan-preservation.
 * - `substituteAnchorsAcrossSkills` — glob coverage across the canonical
 *   persona-source surface (shared.md + claude.md + codex.md + cursor.md).
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
	AnchorParseError,
	findAnchors,
	substituteAnchors,
	substituteAnchorsAcrossSkills,
} from "./lib/anchor-substitute";

async function withTempRepo<T>(
	build: (repoRoot: string) => Promise<T>
): Promise<T> {
	const tempRoot = await fs.mkdtemp(
		path.join(os.tmpdir(), "prism-anchor-substitute-")
	);
	try {
		return await build(tempRoot);
	} finally {
		await fs.rm(tempRoot, { force: true, recursive: true });
	}
}

async function withCapturedWarnings<T>(
	body: () => Promise<T>
): Promise<{ result: T; warnings: string[] }> {
	const warnings: string[] = [];
	const originalWarn = console.warn;
	console.warn = (message?: unknown) => {
		warnings.push(String(message));
	};
	try {
		const result = await body();
		return { result, warnings };
	} finally {
		console.warn = originalWarn;
	}
}

test("findAnchors returns no anchors for content without markers", () => {
	const content = "# heading\n\nbody text only.\n";
	const anchors = findAnchors(content);
	assert.deepEqual(anchors, []);
});

test("findAnchors parses a single anchor pair", () => {
	const content =
		"intro\n<!-- atlas:specializes-in -->\ndefault content\n<!-- atlas:end -->\noutro\n";
	const anchors = findAnchors(content);
	assert.equal(anchors.length, 1);
	assert.equal(anchors[0].name, "specializes-in");
	assert.equal(
		content.slice(anchors[0].range.start, anchors[0].range.end),
		"\ndefault content\n"
	);
});

test("findAnchors parses multiple distinct anchors in document order", () => {
	const content = [
		"<!-- atlas:specializes-in -->",
		"a",
		"<!-- atlas:end -->",
		"between",
		"<!-- atlas:domain-context -->",
		"b",
		"<!-- atlas:end -->",
	].join("\n");
	const anchors = findAnchors(content);
	assert.equal(anchors.length, 2);
	assert.equal(anchors[0].name, "specializes-in");
	assert.equal(anchors[1].name, "domain-context");
	assert.ok(anchors[0].end < anchors[1].start);
});

test("findAnchors throws on a duplicate anchor name in one file", () => {
	const content = [
		"<!-- atlas:specializes-in -->",
		"a",
		"<!-- atlas:end -->",
		"<!-- atlas:specializes-in -->",
		"b",
		"<!-- atlas:end -->",
	].join("\n");
	assert.throws(
		() => findAnchors(content),
		(error: unknown) =>
			error instanceof AnchorParseError && error.code === "duplicate-name"
	);
});

test("findAnchors throws on an open marker with no matching close", () => {
	const content = "<!-- atlas:specializes-in -->\ndangling content\n";
	assert.throws(
		() => findAnchors(content),
		(error: unknown) =>
			error instanceof AnchorParseError && error.code === "missing-close"
	);
});

test("findAnchors throws on a nested open marker before close", () => {
	const content = [
		"<!-- atlas:outer -->",
		"<!-- atlas:inner -->",
		"<!-- atlas:end -->",
	].join("\n");
	assert.throws(
		() => findAnchors(content),
		(error: unknown) =>
			error instanceof AnchorParseError && error.code === "nested-open"
	);
});

test("substituteAnchors replaces a known anchor's inner content", async () => {
	await withTempRepo(async (root) => {
		const filePath = path.join(root, "shared.md");
		const original = [
			"intro line",
			"<!-- atlas:specializes-in -->",
			"<!-- atlas:end -->",
			"outro line",
			"",
		].join("\n");
		await fs.writeFile(filePath, original, "utf8");

		const result = await substituteAnchors(filePath, original, {
			"specializes-in": "the team uses React and Next.js",
		});

		assert.equal(result.written, true);
		assert.deepEqual(result.anchorsReplaced, ["specializes-in"]);

		const after = await fs.readFile(filePath, "utf8");
		assert.match(after, /<!-- atlas:specializes-in -->\nthe team uses React and Next\.js\n<!-- atlas:end -->/);
	});
});

test("substituteAnchors is idempotent — second run produces byte-identical bytes", async () => {
	await withTempRepo(async (root) => {
		const filePath = path.join(root, "shared.md");
		const original = [
			"<!-- atlas:specializes-in -->",
			"<!-- atlas:end -->",
			"",
		].join("\n");
		await fs.writeFile(filePath, original, "utf8");

		const replacements = { "specializes-in": "stack: typescript, react" };

		await substituteAnchors(filePath, original, replacements);
		const afterFirst = await fs.readFile(filePath, "utf8");

		const secondResult = await substituteAnchors(
			filePath,
			afterFirst,
			replacements
		);
		const afterSecond = await fs.readFile(filePath, "utf8");

		assert.equal(secondResult.written, false);
		assert.equal(afterSecond, afterFirst);
	});
});

test("substituteAnchors emits a warning on an unknown replacement key and does not throw", async () => {
	await withTempRepo(async (root) => {
		const filePath = path.join(root, "shared.md");
		const original = [
			"<!-- atlas:specializes-in -->",
			"<!-- atlas:end -->",
			"",
		].join("\n");
		await fs.writeFile(filePath, original, "utf8");

		const { result, warnings } = await withCapturedWarnings(async () =>
			substituteAnchors(filePath, original, {
				"specializes-in": "ok",
				"never-defined": "should warn",
			})
		);

		assert.equal(result.written, true);
		assert.equal(
			warnings.some((w) => w.includes("never-defined")),
			true,
			"unknown replacement key emits a warning"
		);
	});
});

test("substituteAnchors leaves orphan anchors untouched", async () => {
	await withTempRepo(async (root) => {
		const filePath = path.join(root, "shared.md");
		const original = [
			"<!-- atlas:specializes-in -->",
			"<!-- atlas:end -->",
			"<!-- atlas:examples -->",
			"existing default content",
			"<!-- atlas:end -->",
			"",
		].join("\n");
		await fs.writeFile(filePath, original, "utf8");

		const result = await substituteAnchors(filePath, original, {
			"specializes-in": "filled value",
		});

		assert.equal(result.written, true);
		assert.deepEqual(result.anchorsReplaced, ["specializes-in"]);

		const after = await fs.readFile(filePath, "utf8");
		assert.match(after, /<!-- atlas:examples -->\nexisting default content\n<!-- atlas:end -->/);
	});
});

test("substituteAnchors is atomic — a failed rename leaves the prior file untouched", async () => {
	await withTempRepo(async (root) => {
		const filePath = path.join(root, "shared.md");
		const original = [
			"<!-- atlas:specializes-in -->",
			"<!-- atlas:end -->",
			"",
		].join("\n");
		await fs.writeFile(filePath, original, "utf8");

		const originalRename = fs.rename;
		(fs as unknown as { rename: typeof fs.rename }).rename = async () => {
			throw new Error("simulated rename failure");
		};

		try {
			await assert.rejects(
				() =>
					substituteAnchors(filePath, original, {
						"specializes-in": "would corrupt if rename worked",
					}),
				/simulated rename failure/
			);
		} finally {
			(fs as unknown as { rename: typeof fs.rename }).rename = originalRename;
		}

		const after = await fs.readFile(filePath, "utf8");
		assert.equal(
			after,
			original,
			"rename failure must not corrupt the prior file"
		);
	});
});

test("substituteAnchorsAcrossSkills runs across shared.md and platform variants", async () => {
	await withTempRepo(async (root) => {
		const skillsRoot = path.join(root, ".ai-skills", "skills");
		const personaA = path.join(skillsRoot, "prism-alpha");
		const personaB = path.join(skillsRoot, "prism-beta");
		await fs.mkdir(personaA, { recursive: true });
		await fs.mkdir(personaB, { recursive: true });

		const anchored = [
			"<!-- atlas:specializes-in -->",
			"<!-- atlas:end -->",
			"",
		].join("\n");
		const unanchored = "no anchors here.\n";

		await fs.writeFile(path.join(personaA, "shared.md"), anchored, "utf8");
		await fs.writeFile(path.join(personaA, "claude.md"), anchored, "utf8");
		await fs.writeFile(path.join(personaA, "codex.md"), unanchored, "utf8");
		await fs.writeFile(path.join(personaB, "shared.md"), anchored, "utf8");

		const results = await substituteAnchorsAcrossSkills(root, {
			"specializes-in": "team specializes in X",
		});

		const writtenPaths = Array.from(results.values())
			.filter((r) => r.written)
			.map((r) => r.path)
			.sort();

		assert.deepEqual(writtenPaths, [
			path.join(personaA, "claude.md"),
			path.join(personaA, "shared.md"),
			path.join(personaB, "shared.md"),
		]);

		const sharedAfter = await fs.readFile(
			path.join(personaA, "shared.md"),
			"utf8"
		);
		assert.match(sharedAfter, /team specializes in X/);

		const codexAfter = await fs.readFile(
			path.join(personaA, "codex.md"),
			"utf8"
		);
		assert.equal(codexAfter, unanchored, "files without anchors stay byte-identical");
	});
});

test("substituteAnchorsAcrossSkills returns an empty map when the skills root does not exist", async () => {
	await withTempRepo(async (root) => {
		const results = await substituteAnchorsAcrossSkills(root, {
			"specializes-in": "anything",
		});
		assert.equal(results.size, 0);
	});
});
