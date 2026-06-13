/**
 * Atlas dogfood smoke test.
 *
 * Creates a temp directory with a minimal `package.json` (react + next),
 * invokes Atlas's orchestration (rule generators + anchor substitution)
 * against it, asserts the expected files appear with expected content.
 *
 * Deterministic, fast (<10s), no network. The conversational prompts that
 * Atlas would ask a real user are replaced with a fixed answer map.
 *
 * Per PR-2.5 plan task 5.
 */
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { detectStack } from "./lib/stack-detect";
import { runRuleGenerators } from "./lib/onboarding-run";
import type { OnboardingConfig } from "./lib/onboarding-types";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "atlas-dogfood-"));
	try {
		return await fn(dir);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

async function seedFixture(dir: string): Promise<void> {
	const pkgJson = {
		name: "fixture-app",
		version: "0.1.0",
		dependencies: { react: "^18.0.0", next: "^14.0.0" },
		devDependencies: { typescript: "^5.0.0" },
	};
	await fs.writeFile(
		path.join(dir, "package.json"),
		JSON.stringify(pkgJson, null, 2)
	);
	await fs.writeFile(
		path.join(dir, "tsconfig.json"),
		JSON.stringify({ compilerOptions: { strict: true } }, null, 2)
	);
	await fs.mkdir(path.join(dir, ".prism", "rules"), { recursive: true });
}

function buildFixtureConfig(detected: Awaited<ReturnType<typeof detectStack>>): OnboardingConfig {
	return {
		project: "FixtureApp",
		ticketPrefix: "FIX",
		githubOwner: "fixture-org",
		githubRepo: "fixture-app",
		linearTeam: "fixture",
		productDomain: "fixture product domain",
		techStack: detected,
		existingStandards: [],
	};
}

test("atlas-dogfood: detects react+next typescript stack from fixture", async () => {
	await withTempDir(async (dir) => {
		await seedFixture(dir);
		const detected = await detectStack(dir);
		assert.ok(Array.isArray(detected.languages));
		const langNames = detected.languages.map((l) => l.name);
		assert.ok(
			langNames.includes("typescript"),
			`expected typescript, got ${langNames.join(",")}`
		);
		const fwNames = detected.frameworks.map((f) => f.name);
		assert.ok(fwNames.includes("react"), `expected react, got ${fwNames.join(",")}`);
		assert.ok(fwNames.includes("next"), `expected next, got ${fwNames.join(",")}`);
	});
});

test("atlas-dogfood: rule generators write expected files for react+next stack", async () => {
	await withTempDir(async (dir) => {
		await seedFixture(dir);
		const detected = await detectStack(dir);
		const config = buildFixtureConfig(detected);

		const summary = await runRuleGenerators(config, dir);

		const expected = [
			".prism/rules/code-standards-typescript.md",
			".prism/rules/security.md",
			".prism/rules/react-guidelines.md",
			".prism/rules/next-guidelines.md",
		];

		for (const rel of expected) {
			const abs = path.join(dir, rel);
			const stat = await fs.stat(abs).catch(() => null);
			assert.ok(stat, `expected ${rel} to be written`);
		}

		// Normalize to forward slashes so the comparison is OS-independent — path.relative
		// returns backslashes on Windows but the expected strings use forward slashes.
		const writtenPaths = summary.written.map((r) =>
			path.relative(dir, r.result.path).split(path.sep).join("/")
		);
		for (const rel of expected) {
			assert.ok(
				writtenPaths.includes(rel),
				`expected summary.written to include ${rel}, got ${writtenPaths.join(", ")}`
			);
		}
	});
});

test("atlas-dogfood: security.md contains universal section and JS/TS framework section", async () => {
	await withTempDir(async (dir) => {
		await seedFixture(dir);
		const detected = await detectStack(dir);
		const config = buildFixtureConfig(detected);

		await runRuleGenerators(config, dir);

		const securityPath = path.join(dir, ".prism/rules/security.md");
		const content = await fs.readFile(securityPath, "utf8");

		assert.ok(
			/appl(y|ies) when writing or reviewing/.test(content),
			"security.md should open with an applicability declaration"
		);
		assert.ok(
			/[Uu]niversal/.test(content),
			"security.md should include the universal section"
		);
		assert.ok(
			/JavaScript|TypeScript|XSS/.test(content),
			"security.md should include the JS/TS section for the detected stack"
		);
	});
});

test("atlas-dogfood: re-running orchestrator skips existing files (idempotent)", async () => {
	await withTempDir(async (dir) => {
		await seedFixture(dir);
		const detected = await detectStack(dir);
		const config = buildFixtureConfig(detected);

		const first = await runRuleGenerators(config, dir);
		assert.ok(first.written.length > 0, "first run should write files");

		const second = await runRuleGenerators(config, dir);
		assert.equal(
			second.written.length,
			0,
			"second run should write nothing (skip-if-exists)"
		);
		assert.ok(
			second.skipped.length >= first.written.length,
			"second run should skip the files the first run wrote"
		);
	});
});
