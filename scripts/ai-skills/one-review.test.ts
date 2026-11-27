/**
 * Pins the one-review roster: `prism-review` replaces the self-review and PR
 * review skills, the PR reviewer's files sit in `.ai-skills/deprecated`, the
 * reconcile stop gate and the review labels are gone, and no live source
 * still names a retired skill ID.
 */
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const RETIRED_ID = /prism-pr-review|prism-self-review/;

const SCANNED_ROOTS = [
	".prism/rules",
	".prism/architect",
	".prism/references",
	".prism/templates",
	".ai-skills/skills",
	".ai-skills/definitions",
	".ai-skills/config.schema.json",
	"scripts/ai-skills",
	"templates/install",
	"AGENTS.md",
	"CLAUDE.md",
	"REVIEW.md",
	".prism/review",
];

const SKIPPED_DIRS = new Set(["node_modules", ".git", "plans", "retros", "audits", "archived"]);

const SCANNED_EXTENSIONS = new Set([".md", ".mdc", ".mjs", ".ts", ".json", ".tmpl", ".yml", ".toml"]);

const ALLOWLIST = [
	// This file names the retired IDs to search for them.
	"scripts/ai-skills/one-review.test.ts",
	// Fixtures of the 1.0.0 tree that an update must clean up.
	"scripts/ai-skills/update-retire-review.test.ts",
	// Fixture of an old registration that doctor must still recognize.
	"scripts/ai-skills/doctor.test.ts",
];

function readRepoFile(relativePath: string): string {
	return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function readJson(relativePath: string): any {
	return JSON.parse(readRepoFile(relativePath));
}

/**
 * Returns the text of a module-level `const <name> = [ ... ];` array literal.
 *
 * The hook runtime lists in update.ts are not exported, so the test reads
 * them from the source instead of importing them.
 */
function readArrayLiteral(source: string, constName: string): string {
	const start = source.indexOf(`const ${constName} = [`);

	assert.ok(start >= 0, `update.ts has no ${constName} array`);

	return source.slice(start, source.indexOf("];", start));
}

function collectFiles(absolutePath: string, files: string[]): void {
	if (!existsSync(absolutePath)) {
		return;
	}

	if (statSync(absolutePath).isFile()) {
		files.push(absolutePath);

		return;
	}

	for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!SKIPPED_DIRS.has(entry.name)) {
				collectFiles(path.join(absolutePath, entry.name), files);
			}

			continue;
		}

		if (SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
			files.push(path.join(absolutePath, entry.name));
		}
	}
}

function findRetiredIdLines(files: string[], baseDir: string): string[] {
	const hits: string[] = [];

	for (const file of files) {
		const relativePath = path.relative(baseDir, file).split(path.sep).join("/");

		if (ALLOWLIST.some((allowed) => relativePath === allowed || (allowed.endsWith("/") && relativePath.startsWith(allowed)))) {
			continue;
		}

		readFileSync(file, "utf8")
			.split("\n")
			.forEach((line, index) => {
				if (RETIRED_ID.test(line)) {
					hits.push(`${relativePath}:${index + 1}: ${line.trim()}`);
				}
			});
	}

	return hits;
}

test("renames self-review to prism-review", () => {
	const roles: Array<Record<string, unknown>> = readJson(".ai-skills/definitions/roles.json").skills;
	const reviewRoles = roles.filter((role) => role.id === "prism-review");

	assert.equal(reviewRoles.length, 1);
	assert.equal(reviewRoles[0].persona, "Briar");
	assert.equal(reviewRoles[0].routing, "auto");
	assert.equal(reviewRoles[0].gated, true);
	assert.ok(!roles.some((role) => role.id === "prism-self-review" || role.id === "prism-pr-review"));

	const frontmatter = readRepoFile(".ai-skills/skills/prism-review/frontmatter.yml");

	for (const expected of ["name: prism-review", "model: opus", '"Briar"', '"Eric"', "review pr", "review #123", "any GitHub PR URL"]) {
		assert.ok(frontmatter.includes(expected), `frontmatter.yml lacks ${expected}`);
	}

	assert.ok(!existsSync(path.join(REPO_ROOT, ".ai-skills/skills/prism-self-review")));
	assert.ok(!existsSync(path.join(REPO_ROOT, ".ai-skills/skills/prism-pr-review")));
});

test("retires prism-pr-review to .ai-skills/deprecated", () => {
	for (const file of ["shared.md", "frontmatter.yml", "claude.md", "codex.md", "cursor.md", "github-writes.md", "eric-review-modes.md"]) {
		assert.ok(existsSync(path.join(REPO_ROOT, ".ai-skills/deprecated/prism-pr-review", file)), `missing deprecated ${file}`);
	}

	assert.ok(!existsSync(path.join(REPO_ROOT, ".prism/references/pr-review/github-writes.md")));
	assert.ok(!existsSync(path.join(REPO_ROOT, ".prism/architect/_toolkit/eric-review-modes.md")));
});

test("removes the reconcile stop gate", () => {
	const updateSource = readRepoFile("scripts/ai-skills/update.ts");

	for (const listName of ["HOOK_RUNTIME_FILES", "HOOK_RUNTIME_ENTRY_POINTS"]) {
		const listBody = readArrayLiteral(updateSource, listName);

		assert.ok(!listBody.includes("reconcile-gate"), `${listName} still lists reconcile-gate`);
	}

	assert.ok(!existsSync(path.join(REPO_ROOT, "scripts/ai-skills/hooks/reconcile-gate.mjs")));

	for (const settingsPath of ["templates/install/.claude/settings.json", "templates/install/.codex/hooks.json", ".claude/settings.json"]) {
		assert.ok(!("SubagentStop" in (readJson(settingsPath).hooks ?? {})), `${settingsPath} still registers SubagentStop`);
	}
});

test("routes review phrases to prism-review", () => {
	const lines = readRepoFile(".prism/rules/skill-routing.md").split("\n");
	const ericRow = lines.find((line) => line.startsWith("| **Eric** |"));
	const briarRow = lines.find((line) => line.startsWith("| **Briar** |"));
	const reviewOverride = lines.find((line) => line.includes("/review`"));

	assert.ok(ericRow?.includes("`prism-review`"), `Eric row: ${ericRow}`);
	assert.ok(briarRow?.includes("`prism-review`"), `Briar row: ${briarRow}`);
	assert.ok(reviewOverride?.includes("prism-review") && !reviewOverride.includes("prism-pr-review"), `override: ${reviewOverride}`);
});

test("drops the PR-review stage", () => {
	const workflow = readRepoFile(".prism/rules/workflow.md");
	const lines = workflow.split("\n");
	const noPrRowIndex = lines.findIndex((line) => line.startsWith("| standard, no PR |"));

	assert.ok(workflow.includes("verify → review → PR → retro"));
	assert.ok(!lines.some((line) => /PR review: dispatch/.test(line)));
	assert.ok(noPrRowIndex > 0, "workflow.md has no `| standard, no PR |` row");
	assert.ok(lines[noPrRowIndex - 1].includes("prism-review"), `review row: ${lines[noPrRowIndex - 1]}`);

	const shippingFlow = readRepoFile(".prism/references/shipping-flow.md");

	assert.ok(shippingFlow.includes("review/reconcile.mjs"));
	assert.ok(shippingFlow.includes("review-misses.jsonl"));
	assert.ok(!shippingFlow.includes("prism-pr-review"));
});

test("leaves no live mention of the retired skill IDs", () => {
	const controlDir = mkdtempSync(path.join(os.tmpdir(), "one-review-"));

	try {
		const controlFile = path.join(controlDir, "control.md");

		writeFileSync(controlFile, "Dispatch prism-pr-review here.\n");
		assert.equal(findRetiredIdLines([controlFile], controlDir).length, 1);
	} finally {
		rmSync(controlDir, { recursive: true, force: true });
	}

	const files: string[] = [];

	for (const root of SCANNED_ROOTS) {
		collectFiles(path.join(REPO_ROOT, root), files);
	}

	const hits = findRetiredIdLines(files, REPO_ROOT);

	assert.deepEqual(hits, [], `retired skill IDs still named:\n${hits.join("\n")}`);
});

test("removes the review labels", () => {
	const labelPattern = /review:has-minors|prism-verdict|effort:(glance|quick|deep)|confidence:(high|needs-judgment|standards-only)|planLabels/;

	const passFiles = readdirSync(path.join(REPO_ROOT, ".prism/review"), { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => `.prism/review/${entry.name}`);

	assert.ok(passFiles.length > 0, ".prism/review has no pass files");

	for (const file of [
		"scripts/ai-skills/hooks/review/reconcile.mjs",
		"scripts/ai-skills/hooks/review/reconcile.d.mts",
		".prism/architect/_toolkit/review-runtime.md",
		"REVIEW.md",
		...passFiles,
		".prism/rules/git-conventions.md",
		".prism/rules/followup-scope.md",
		".ai-skills/config.schema.json",
	]) {
		assert.ok(!labelPattern.test(readRepoFile(file)), `${file} still names a review label`);
	}
});
