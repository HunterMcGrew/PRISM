/**
 * Tests for Atlas's per-team rule generators (PR-2.3, plan task 5).
 *
 * Each generator (code-standards, security, framework-guidelines) is
 * exercised against four contract guarantees:
 *
 * - Happy path — the generator writes the expected file at the expected
 *   path; the applicability declaration appears as the first non-heading
 *   line so an agent reading the file knows the scope immediately.
 * - Skip-if-exists — the second invocation with the file already on disk
 *   returns `{ written: false, reason: REASONS.exists }` without touching
 *   the file's contents (verified by comparing before/after bytes).
 * - Multi-language / multi-framework composition — the security generator
 *   emits both the JS and PHP sections when the detected stack contains
 *   both; the code-standards generator emits one file per language; the
 *   framework-guidelines generator emits one file per framework.
 * - Force flag — calling with `{ force: true }` overwrites the existing
 *   file and reports `reason: REASONS.forced`.
 *
 * Tests use temp directories built per-test and torn down in `t.after`.
 * No mocking — the generators touch real disk and the tests assert against
 * real files, matching the rest of the `scripts/ai-skills/*.test.ts` suite.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { generate as generateCodeStandards } from "./lib/rule-generators/code-standards";
import { generate as generateSecurity } from "./lib/rule-generators/security";
import { generate as generateFrameworkGuidelines } from "./lib/rule-generators/framework-guidelines";
import { REASONS } from "./lib/rule-generators/types";
import { RULE_GENERATORS, runRuleGenerators } from "./lib/onboarding-run";
import type { OnboardingConfig } from "./lib/onboarding-types";
import type { DetectedStack } from "./lib/stack-detect";

async function makeTempRepo(): Promise<string> {
	return fs.mkdtemp(path.join(os.tmpdir(), "prism-rule-generators-"));
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

function rulePath(repoRoot: string, fileName: string): string {
	return path.join(repoRoot, ".prism", "rules", fileName);
}

async function readIfExists(filePath: string): Promise<string | null> {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// code-standards generator
// ---------------------------------------------------------------------------

test("code-standards: generates per-language file with applicability declaration", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
		],
		frameworks: [],
	});

	const results = await generateCodeStandards(config, repoRoot);

	assert.equal(results.length, 1);
	assert.equal(results[0].written, true);
	assert.equal(results[0].reason, REASONS.created);
	assert.equal(
		results[0].path,
		rulePath(repoRoot, "code-standards-typescript.md")
	);

	const contents = await fs.readFile(results[0].path, "utf8");
	assert.ok(
		contents.startsWith("# TypeScript Code Standards\n"),
		"file should open with a TypeScript heading"
	);

	const lines = contents.split("\n");
	const firstNonHeadingLine = lines.slice(1).find((line) => line.trim().length > 0);
	assert.equal(
		firstNonHeadingLine,
		"These rules apply when writing or reviewing TypeScript code in this repository."
	);
});

test("code-standards: skip-if-exists preserves existing file", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "php", confidence: "high", evidence: ["composer.json"] },
		],
		frameworks: [],
	});

	const target = rulePath(repoRoot, "code-standards-php.md");
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, "# Hand-edited PHP standards\n\nDo not overwrite.\n");

	const before = await fs.readFile(target, "utf8");
	const results = await generateCodeStandards(config, repoRoot);

	assert.equal(results.length, 1);
	assert.equal(results[0].written, false);
	assert.equal(results[0].reason, REASONS.exists);

	const after = await fs.readFile(target, "utf8");
	assert.equal(after, before, "hand-edited content must be preserved");
});

test("code-standards: emits one file per detected language", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
			{ name: "php", confidence: "high", evidence: ["composer.json"] },
			{ name: "python", confidence: "high", evidence: ["pyproject.toml"] },
		],
		frameworks: [],
	});

	const results = await generateCodeStandards(config, repoRoot);

	const slugs = results
		.map((r) => path.basename(r.path))
		.sort();

	assert.deepEqual(slugs, [
		"code-standards-php.md",
		"code-standards-python.md",
		"code-standards-typescript.md",
	]);

	for (const result of results) {
		assert.equal(result.written, true);
	}
});

test("code-standards: skips the unknown sentinel language", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [{ name: "unknown", confidence: "high", evidence: [] }],
		frameworks: [],
	});

	const results = await generateCodeStandards(config, repoRoot);
	assert.equal(results.length, 0);
});

test("code-standards: force flag overwrites existing file", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "go", confidence: "high", evidence: ["go.mod"] },
		],
		frameworks: [],
	});

	const target = rulePath(repoRoot, "code-standards-go.md");
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, "# Old hand-edited Go standards\n");

	const results = await generateCodeStandards(config, repoRoot, { force: true });

	assert.equal(results.length, 1);
	assert.equal(results[0].written, true);
	assert.equal(results[0].reason, REASONS.forced);

	const after = await fs.readFile(target, "utf8");
	assert.ok(
		after.startsWith("# Go Code Standards\n"),
		"force should overwrite with the generated heading"
	);
	assert.ok(
		!after.includes("Old hand-edited"),
		"old contents must be gone after force"
	);
});

// ---------------------------------------------------------------------------
// security generator
// ---------------------------------------------------------------------------

test("security: writes the file with universal section by default", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [{ name: "unknown", confidence: "high", evidence: [] }],
		frameworks: [],
	});

	const results = await generateSecurity(config, repoRoot);

	assert.equal(results.length, 1);
	assert.equal(results[0].written, true);
	assert.equal(results[0].path, rulePath(repoRoot, "security.md"));

	const contents = await fs.readFile(results[0].path, "utf8");
	assert.ok(contents.startsWith("# Security\n"));
	assert.ok(contents.includes("## Universal"), "universal section always emits");
	assert.ok(
		!contents.includes("## TypeScript and JavaScript"),
		"JS section omitted when stack has no JS"
	);
});

test("security: composes JS and PHP sections for a multi-language repo", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
			{ name: "php", confidence: "high", evidence: ["composer.json"] },
		],
		frameworks: [
			{ name: "wordpress", confidence: "high", evidence: ["composer.json"] },
		],
	});

	const results = await generateSecurity(config, repoRoot);
	const contents = await fs.readFile(results[0].path, "utf8");

	assert.ok(contents.includes("## Universal"), "universal always present");
	assert.ok(
		contents.includes("## TypeScript and JavaScript"),
		"JS section present when TS is detected"
	);
	assert.ok(contents.includes("## PHP"), "PHP section present when PHP is detected");
	assert.ok(
		contents.includes("### WordPress-specific"),
		"WordPress subsection present when wordpress framework is detected"
	);
});

test("security: skip-if-exists preserves existing file", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
		],
		frameworks: [],
	});

	const target = rulePath(repoRoot, "security.md");
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, "# Custom security policy\n");

	const results = await generateSecurity(config, repoRoot);

	assert.equal(results[0].written, false);
	assert.equal(results[0].reason, REASONS.exists);

	const after = await fs.readFile(target, "utf8");
	assert.equal(after, "# Custom security policy\n");
});

test("security: force flag overwrites existing file", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
		],
		frameworks: [],
	});

	const target = rulePath(repoRoot, "security.md");
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, "# Old security policy\n");

	const results = await generateSecurity(config, repoRoot, { force: true });

	assert.equal(results[0].written, true);
	assert.equal(results[0].reason, REASONS.forced);

	const after = await fs.readFile(target, "utf8");
	assert.ok(after.startsWith("# Security\n"));
	assert.ok(after.includes("## TypeScript and JavaScript"));
});

test("security: applicability declaration follows the heading", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [{ name: "unknown", confidence: "high", evidence: [] }],
		frameworks: [],
	});

	const results = await generateSecurity(config, repoRoot);
	const contents = await fs.readFile(results[0].path, "utf8");

	const lines = contents.split("\n");
	const firstNonHeadingLine = lines.slice(1).find((line) => line.trim().length > 0);
	assert.ok(
		firstNonHeadingLine?.startsWith("These rules apply when"),
		"applicability declaration appears immediately after the heading"
	);
});

// ---------------------------------------------------------------------------
// framework-guidelines generator
// ---------------------------------------------------------------------------

test("framework-guidelines: generates one file per known framework", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
		],
		frameworks: [
			{ name: "react", confidence: "high", evidence: ["package.json"] },
			{ name: "next", confidence: "high", evidence: ["package.json"] },
		],
	});

	const results = await generateFrameworkGuidelines(config, repoRoot);

	const basenames = results.map((r) => path.basename(r.path)).sort();
	assert.deepEqual(basenames, ["next-guidelines.md", "react-guidelines.md"]);

	for (const result of results) {
		assert.equal(result.written, true);
		assert.equal(result.reason, REASONS.created);

		const contents = await fs.readFile(result.path, "utf8");
		const lines = contents.split("\n");
		const firstNonHeadingLine = lines.slice(1).find((line) => line.trim().length > 0);
		assert.ok(
			firstNonHeadingLine?.startsWith("These rules apply when"),
			`applicability declaration appears in ${result.path}`
		);
	}
});

test("framework-guidelines: silently skips frameworks without templates", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "elixir", confidence: "high", evidence: ["mix.exs"] },
		],
		frameworks: [
			{ name: "phoenix", confidence: "high", evidence: ["mix.exs"] },
		],
	});

	const results = await generateFrameworkGuidelines(config, repoRoot);
	assert.equal(results.length, 0, "no template for phoenix at v1 — silent skip");

	const phoenixPath = rulePath(repoRoot, "phoenix-guidelines.md");
	assert.equal(
		await readIfExists(phoenixPath),
		null,
		"no file should be created when no template matches"
	);
});

test("framework-guidelines: skip-if-exists preserves existing file", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
		],
		frameworks: [
			{ name: "react", confidence: "high", evidence: ["package.json"] },
		],
	});

	const target = rulePath(repoRoot, "react-guidelines.md");
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, "# Custom React rules\n");

	const results = await generateFrameworkGuidelines(config, repoRoot);

	assert.equal(results[0].written, false);
	assert.equal(results[0].reason, REASONS.exists);

	const after = await fs.readFile(target, "utf8");
	assert.equal(after, "# Custom React rules\n");
});

test("framework-guidelines: force flag overwrites existing file", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "ruby", confidence: "high", evidence: ["Gemfile"] },
		],
		frameworks: [
			{ name: "rails", confidence: "high", evidence: ["Gemfile"] },
		],
	});

	const target = rulePath(repoRoot, "rails-guidelines.md");
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, "# Old Rails rules\n");

	const results = await generateFrameworkGuidelines(config, repoRoot, { force: true });

	assert.equal(results[0].written, true);
	assert.equal(results[0].reason, REASONS.forced);

	const after = await fs.readFile(target, "utf8");
	assert.ok(after.startsWith("# Rails Guidelines\n"));
});

// ---------------------------------------------------------------------------
// reason-string stability
// ---------------------------------------------------------------------------

test("REASONS exports are stable string literals", () => {
	assert.equal(REASONS.created, "created");
	assert.equal(
		REASONS.exists,
		"exists — preserve team hand-edits; pass --force to regenerate"
	);
	assert.equal(REASONS.forced, "force-overwrote existing file");
	assert.equal(REASONS.noStackMatch, "no detected stack matched this generator");
});

// ---------------------------------------------------------------------------
// runRuleGenerators orchestrator
// ---------------------------------------------------------------------------

test("RULE_GENERATORS declares code-standards → security → framework-guidelines order", () => {
	const names = RULE_GENERATORS.map((g) => g.name);
	assert.deepEqual(names, [
		"code-standards",
		"security",
		"framework-guidelines",
	]);
});

test("runRuleGenerators emits every generator's output and groups by written/skipped", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
			{ name: "php", confidence: "high", evidence: ["composer.json"] },
		],
		frameworks: [
			{ name: "react", confidence: "high", evidence: ["package.json"] },
			{ name: "wordpress", confidence: "high", evidence: ["composer.json"] },
		],
	});

	const summary = await runRuleGenerators(config, repoRoot);

	const expectedFiles = [
		"code-standards-typescript.md",
		"code-standards-php.md",
		"security.md",
		"react-guidelines.md",
		"wordpress-guidelines.md",
	];
	const writtenNames = summary.written.map((e) => path.basename(e.result.path)).sort();
	assert.deepEqual(writtenNames, [...expectedFiles].sort());
	assert.equal(summary.skipped.length, 0);
	assert.equal(summary.entries.length, expectedFiles.length);
});

test("runRuleGenerators reports skip-if-exists entries in the skipped bucket", async (t) => {
	const repoRoot = await makeTempRepo();
	t.after(() => fs.rm(repoRoot, { force: true, recursive: true }));

	const config = buildConfig({
		languages: [
			{ name: "typescript", confidence: "high", evidence: ["package.json"] },
		],
		frameworks: [],
	});

	await runRuleGenerators(config, repoRoot);
	const secondRun = await runRuleGenerators(config, repoRoot);

	assert.equal(secondRun.written.length, 0);
	assert.ok(secondRun.skipped.length >= 2, "code-standards and security should both skip");
	for (const entry of secondRun.skipped) {
		assert.equal(entry.result.reason, REASONS.exists);
	}
});
