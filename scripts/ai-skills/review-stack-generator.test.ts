/**
 * Contract for the review stack-check generator: it points the review passes
 * at the per-team rules onboarding produced, writes only the files whose gate
 * holds, and never overwrites a file the team already owns.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { RULE_GENERATORS } from "./lib/onboarding-run";
import type { OnboardingConfig } from "./lib/onboarding-types";
import { generate } from "./lib/rule-generators/review-stack";
import { REASONS } from "./lib/rule-generators/types";
import type { DetectedStack } from "./lib/stack-detect";

const TYPESCRIPT_STACK: DetectedStack = {
	languages: [{ name: "typescript", confidence: "high", evidence: ["package.json"] }],
	frameworks: [],
};

async function makeTempRepo(): Promise<string> {
	return fs.mkdtemp(path.join(os.tmpdir(), "prism-review-stack-"));
}

function buildConfig(techStack: DetectedStack): OnboardingConfig {
	return {
		project: "Test",
		ticketPrefix: "TEST",
		githubOwner: "test-org",
		githubRepo: "test-repo",
		linearTeam: "TEST",
		productDomain: "test domain",
		techStack,
		existingStandards: [],
	};
}

async function writeRepoFile(repoRoot: string, relPath: string, content: string): Promise<void> {
	const target = path.join(repoRoot, relPath);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, content, "utf8");
}

function stackPath(repoRoot: string, fileName: string): string {
	return path.join(repoRoot, ".prism", "review", "stack", fileName);
}

test("a generated language rule gets an architecture stack check naming it", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(repoRoot, ".prism/rules/code-standards-typescript.md", "# TypeScript\n");

	const results = await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);
	const architecture = results.find((r) => r.path === stackPath(repoRoot, "architecture.md"));

	assert.ok(architecture);
	assert.equal(architecture.written, true);
	assert.equal(architecture.reason, REASONS.created);

	const content = await fs.readFile(stackPath(repoRoot, "architecture.md"), "utf8");
	assert.ok(content.startsWith("# Stack checks: Architecture and standards\n"));
	assert.ok(content.includes("`.prism/rules/code-standards-typescript.md`"));
	assert.ok(content.includes("standards violation"));
});

test("a framework rule is named beside the language rule", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(repoRoot, ".prism/rules/code-standards-typescript.md", "# TypeScript\n");
	await writeRepoFile(repoRoot, ".prism/rules/react-guidelines.md", "# React\n");

	await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);
	const content = await fs.readFile(stackPath(repoRoot, "architecture.md"), "utf8");

	assert.ok(content.includes("`.prism/rules/code-standards-typescript.md`"));
	assert.ok(content.includes("`.prism/rules/react-guidelines.md`"));
});

test("a universal rule is not named as a per-team rule", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(repoRoot, ".prism/rules/code-standards.md", "# Universal\n");

	const results = await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);

	assert.equal(
		results.find((r) => r.path === stackPath(repoRoot, "architecture.md")),
		undefined
	);
});

test("a repo with no security rule gets no security stack check", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(repoRoot, ".prism/rules/code-standards-typescript.md", "# TypeScript\n");

	const results = await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);

	assert.equal(
		results.find((r) => r.path === stackPath(repoRoot, "security.md")),
		undefined
	);
	await assert.rejects(fs.access(stackPath(repoRoot, "security.md")));
});

test("a repo with a security rule gets a security stack check pointing at it", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(repoRoot, ".prism/rules/security.md", "# Security\n");

	await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);
	const content = await fs.readFile(stackPath(repoRoot, "security.md"), "utf8");

	assert.ok(content.startsWith("# Stack checks: Security\n"));
	assert.ok(content.includes("`.prism/rules/security.md`"));
});

test("the correctness check names each detected language and the configured commands", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(
		repoRoot,
		".ai-skills/config.json",
		JSON.stringify({ commands: { typecheck: "pnpm run check-types", test: "pnpm run test" } })
	);

	await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);
	const content = await fs.readFile(stackPath(repoRoot, "correctness.md"), "utf8");

	assert.ok(content.includes("typescript"));
	assert.ok(content.includes("`pnpm run check-types`"));
	assert.ok(content.includes("`pnpm run test`"));
});

test("no correctness check is written when the config sets neither command", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(
		repoRoot,
		".ai-skills/config.json",
		JSON.stringify({ commands: { lint: "pnpm run lint", test: "" } })
	);

	await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);

	await assert.rejects(fs.access(stackPath(repoRoot, "correctness.md")));
});

test("a repo with no detected stack and no rules gets no stack checks", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	const unknownStack: DetectedStack = {
		languages: [{ name: "unknown", confidence: "high", evidence: [] }],
		frameworks: [],
	};

	const results = await generate(buildConfig(unknownStack), repoRoot);

	assert.deepEqual(results, []);
});

test("a second run leaves an existing file's bytes alone and says why", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(repoRoot, ".prism/rules/code-standards-typescript.md", "# TypeScript\n");
	await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);
	const edited = "# Stack checks: Architecture and standards\n\nThe team rewrote this.\n";
	await fs.writeFile(stackPath(repoRoot, "architecture.md"), edited, "utf8");

	const results = await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);
	const architecture = results.find((r) => r.path === stackPath(repoRoot, "architecture.md"));

	assert.ok(architecture);
	assert.equal(architecture.written, false);
	assert.equal(architecture.reason, REASONS.exists);
	assert.equal(await fs.readFile(stackPath(repoRoot, "architecture.md"), "utf8"), edited);
});

test("force overwrites an existing file", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));
	await writeRepoFile(repoRoot, ".prism/rules/code-standards-typescript.md", "# TypeScript\n");
	await generate(buildConfig(TYPESCRIPT_STACK), repoRoot);
	await fs.writeFile(stackPath(repoRoot, "architecture.md"), "edited\n", "utf8");

	const results = await generate(buildConfig(TYPESCRIPT_STACK), repoRoot, { force: true });
	const architecture = results.find((r) => r.path === stackPath(repoRoot, "architecture.md"));

	assert.ok(architecture);
	assert.equal(architecture.reason, REASONS.forced);
	assert.ok(
		(await fs.readFile(stackPath(repoRoot, "architecture.md"), "utf8")).includes(
			"code-standards-typescript.md"
		)
	);
});

test("the generator runs after the generators whose output it reads", () => {
	const names = RULE_GENERATORS.map((entry) => entry.name);

	assert.equal(names.at(-1), "review-stack");
	assert.ok(names.indexOf("review-stack") > names.indexOf("framework-guidelines"));
});
