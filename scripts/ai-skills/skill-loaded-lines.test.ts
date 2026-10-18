/**
 * Holds every skill to the 120-line cap on what a run reads: the body plus
 * the reference, step, and `load: skill` rule files it cites, followed
 * transitively.
 *
 * Skills over the cap today are listed in `OVER_CAP_ALLOWLIST` with the change
 * that thins them. The list only shrinks: a listed skill that comes in under
 * the cap fails until its entry is removed, so the list cannot sit stale and
 * hide a regression behind an entry nobody needs.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

import { countLines, listCitedFiles, measureSkillLoad } from "./lib/skill-loaded-lines";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "..", "..");

const LOADED_LINE_CAP = 120;

const OVER_CAP_ALLOWLIST: Record<string, string> = {
	"prism-code-dev": "PRISM-499 PR 7, build lane",
	"prism-documentation": "PRISM-499 PR 7, build lane",
	"prism-design": "PRISM-499 PR 7, build lane",
	"prism-ticket-start": "PRISM-499 PR 8, flow entry",
	"prism-onboarding": "PRISM-499 PR 8, flow entry",
	"devils-advocate": "PRISM-499 PR 9, utilities",
	"prism-skill-forge": "PRISM-499 PR 9, utilities",
	"prism-handoff": "PRISM-499 PR 9, utilities",
	"prism-retro": "PRISM-499 PR 10, cadence and release",
	"prism-surface-audit": "PRISM-499 PR 10, cadence and release",
	"prism-changelog": "PRISM-499 PR 10, cadence and release",
	"prism-standup-summary": "PRISM-499 PR 10, cadence and release",
	"prism-qa-test-plan": "PRISM-499 PR 10, cadence and release",
	"prism-prd": "PRISM-499 PR 10, cadence and release",
	"prism-customer-success": "PRISM-499 PR 11, business",
	"prism-data": "PRISM-499 PR 11, business",
	"prism-finance": "PRISM-499 PR 11, business",
	"prism-founder": "PRISM-499 PR 11, business",
	"prism-legal": "PRISM-499 PR 11, business",
	"prism-market-research": "PRISM-499 PR 11, business",
	"prism-recruiting": "PRISM-499 PR 11, business",
	"prism-sales": "PRISM-499 PR 11, business",
	"prism-architect": "replaced by the phase-2 plan skill; its plan logic stays until then",
	"prism-user-stories": "folds into the phase-2 intent skill",
	"prism-review-loop": "replaced by REVIEW.md and the phase-3 review runners",
};

async function listSkillIds(): Promise<string[]> {
	const entries = await fs.readdir(path.join(repoRoot, ".ai-skills", "skills"), {
		withFileTypes: true,
	});
	return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function withTempRepo(build: (root: string) => Promise<void>): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "prism-loaded-lines-"));
	try {
		await build(root);
	} finally {
		await fs.rm(root, { force: true, recursive: true });
	}
}

async function writeRepoFile(root: string, relativePath: string, body: string): Promise<void> {
	const absolute = path.join(root, ...relativePath.split("/"));
	await fs.mkdir(path.dirname(absolute), { recursive: true });
	await fs.writeFile(absolute, body, "utf8");
}

// --- The cap ---

test("every skill not on the allowlist loads 120 lines or fewer", async () => {
	const over = (await listSkillIds())
		.filter((id) => !(id in OVER_CAP_ALLOWLIST))
		.map((id) => measureSkillLoad(repoRoot, id))
		.filter((load) => load.totalLines > LOADED_LINE_CAP)
		.map((load) => `${load.id}: ${load.totalLines} lines (${load.files.join(", ") || "body only"})`);

	assert.deepEqual(over, [], `Over the ${LOADED_LINE_CAP}-line cap. Cut content rather than moving it into a cited file.`);
});

test("every allowlisted skill exists and is still over the cap", async () => {
	const ids = new Set(await listSkillIds());
	const stale = Object.keys(OVER_CAP_ALLOWLIST).filter(
		(id) => !ids.has(id) || measureSkillLoad(repoRoot, id).totalLines <= LOADED_LINE_CAP
	);

	assert.deepEqual(stale, [], "Remove these allowlist entries: the skill is gone or now fits the cap.");
});

// --- The measurement ---

test("countLines counts a final unterminated line and nothing for an empty file", () => {
	assert.equal(countLines(""), 0);
	assert.equal(countLines("a\nb\n"), 2);
	assert.equal(countLines("a\nb"), 2);
});

test("listCitedFiles re-anchors a climbing link at the repo root and finds a bare step name", async () => {
	await withTempRepo(async (root) => {
		await writeRepoFile(root, ".prism/references/shared.md", "# Shared\n");
		await writeRepoFile(root, ".prism/skills/prism-x/step-01-start.md", "# Step\n");
		await writeRepoFile(
			root,
			".ai-skills/skills/prism-x/shared.md",
			"Read [`shared.md`](../../../.prism/references/shared.md), then `step-01-start.md`.\n"
		);

		assert.deepEqual(
			listCitedFiles(root, ".ai-skills/skills/prism-x/shared.md", ".prism/skills/prism-x").sort(),
			[".prism/references/shared.md", ".prism/skills/prism-x/step-01-start.md"]
		);
	});
});

test("measureSkillLoad follows citations transitively and counts only load: skill rules", async () => {
	await withTempRepo(async (root) => {
		await writeRepoFile(root, ".prism/rules/always.md", "---\nload: always\n---\n\nAlways.\n");
		await writeRepoFile(root, ".prism/rules/on-skill.md", "---\nload: skill\n---\n\nOn skill.\n");
		await writeRepoFile(root, ".prism/skills/prism-x/step-02-next.md", "One.\nTwo.\n");
		await writeRepoFile(root, ".prism/skills/prism-x/step-01-start.md", "Then `step-02-next.md`.\n");
		await writeRepoFile(
			root,
			".ai-skills/skills/prism-x/shared.md",
			"Start at `step-01-start.md`. Follow `.prism/rules/always.md` and `.prism/rules/on-skill.md`.\n"
		);
		await writeRepoFile(root, ".ai-skills/skills/prism-x/claude.md", "Claude note.\n");

		const load = measureSkillLoad(root, "prism-x");
		assert.equal(load.bodyLines, 2);
		assert.deepEqual(load.files, [
			".prism/rules/on-skill.md",
			".prism/skills/prism-x/step-01-start.md",
			".prism/skills/prism-x/step-02-next.md",
		]);
		assert.equal(load.totalLines, 2 + 5 + 1 + 2);
	});
});
