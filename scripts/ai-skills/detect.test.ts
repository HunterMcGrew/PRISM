/**
 * Coverage for `prism detect`'s testable core (`runDetect`).
 *
 * Three contracts:
 * - A react+next `package.json` reports those in `report.stack`.
 * - An `mkdocs.yml` reports `tool: "mkdocs"` in `report.docLayout`.
 * - An empty repo reports the `unknown` language sentinel rather than throwing.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { runDetect } from "./detect";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-detect-"));
	try {
		return await fn(dir);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

test("runDetect reports react and next from package.json", async () => {
	await withTempDir(async (dir) => {
		await fs.writeFile(
			path.join(dir, "package.json"),
			JSON.stringify({
				name: "test-app",
				dependencies: { react: "^18.0.0", next: "^14.0.0" },
			}),
			"utf8"
		);

		const report = await runDetect({ consumerRepoRoot: dir });

		const frameworkNames = report.stack.frameworks.map((f) => f.name);
		assert.ok(frameworkNames.includes("react"));
		assert.ok(frameworkNames.includes("next"));
	});
});

test("runDetect reports mkdocs from mkdocs.yml", async () => {
	await withTempDir(async (dir) => {
		await fs.writeFile(path.join(dir, "mkdocs.yml"), "site_name: Docs\n", "utf8");

		const report = await runDetect({ consumerRepoRoot: dir });

		assert.equal(report.docLayout.tool, "mkdocs");
	});
});

test("runDetect returns the unknown language sentinel for an empty repo rather than throwing", async () => {
	await withTempDir(async (dir) => {
		const report = await runDetect({ consumerRepoRoot: dir });

		assert.deepEqual(report.stack.languages, [
			{ name: "unknown", confidence: "high", evidence: [] },
		]);
		assert.deepEqual(report.stack.frameworks, []);
	});
});
