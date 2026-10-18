/**
 * Holds every skill to the 120-line cap on what a run reads: the body plus
 * the reference, step, template, and `load: skill` rule files it cites,
 * followed transitively.
 *
 * Skills over the cap today are listed in `OVER_CAP_ALLOWLIST` with the change
 * that thins them and their exact current size. The list ratchets: a listed
 * skill that comes in under the cap fails until its entry is removed, and one
 * whose size moves either way fails until its `max` is updated, so a cut is
 * recorded in the same diff and cannot quietly grow back.
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

const OVER_CAP_ALLOWLIST: Record<string, { thinnedBy: string; max: number }> = {
	"prism-code-review-self": { thinnedBy: "PRISM-499 PR 6, review lane", max: 973 },
	"prism-code-review-pr": { thinnedBy: "PRISM-499 PR 6, review lane", max: 1072 },
	"prism-code-dev": { thinnedBy: "PRISM-499 PR 7, build lane", max: 902 },
	"prism-documentation": { thinnedBy: "PRISM-499 PR 7, build lane", max: 1512 },
	"prism-design": { thinnedBy: "PRISM-499 PR 7, build lane", max: 830 },
	"prism-ticket-start": { thinnedBy: "PRISM-499 PR 8, flow entry", max: 998 },
	"prism-onboarding": { thinnedBy: "PRISM-499 PR 8, flow entry", max: 452 },
	"devils-advocate": { thinnedBy: "PRISM-499 PR 9, utilities", max: 123 },
	"prism-skill-forge": { thinnedBy: "PRISM-499 PR 9, utilities", max: 364 },
	"prism-handoff": { thinnedBy: "PRISM-499 PR 9, utilities", max: 174 },
	"prism-retro": { thinnedBy: "PRISM-499 PR 10, cadence and release", max: 789 },
	"prism-surface-audit": { thinnedBy: "PRISM-499 PR 10, cadence and release", max: 758 },
	"prism-changelog": { thinnedBy: "PRISM-499 PR 10, cadence and release", max: 709 },
	"prism-standup-summary": { thinnedBy: "PRISM-499 PR 10, cadence and release", max: 882 },
	"prism-qa-test-plan": { thinnedBy: "PRISM-499 PR 10, cadence and release", max: 1183 },
	"prism-prd": { thinnedBy: "PRISM-499 PR 10, cadence and release", max: 974 },
	"prism-customer-success": { thinnedBy: "PRISM-499 PR 11, business", max: 324 },
	"prism-data": { thinnedBy: "PRISM-499 PR 11, business", max: 335 },
	"prism-finance": { thinnedBy: "PRISM-499 PR 11, business", max: 334 },
	"prism-founder": { thinnedBy: "PRISM-499 PR 11, business", max: 338 },
	"prism-legal": { thinnedBy: "PRISM-499 PR 11, business", max: 339 },
	"prism-market-research": { thinnedBy: "PRISM-499 PR 11, business", max: 328 },
	"prism-marketing": { thinnedBy: "PRISM-499 PR 11, business", max: 306 },
	"prism-recruiting": { thinnedBy: "PRISM-499 PR 11, business", max: 337 },
	"prism-sales": { thinnedBy: "PRISM-499 PR 11, business", max: 334 },
	"prism-architect": {
		thinnedBy: "replaced by the phase-2 plan skill; its plan logic stays until then",
		max: 1112,
	},
	"prism-user-stories": { thinnedBy: "folds into the phase-2 intent skill", max: 824 },
	"prism-review-loop": {
		thinnedBy: "replaced by REVIEW.md and the phase-3 review runners",
		max: 380,
	},
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

test("every allowlisted skill exists, is still over the cap, and matches its recorded size", async () => {
	const ids = new Set(await listSkillIds());
	const stale = Object.entries(OVER_CAP_ALLOWLIST).flatMap(([id, { max }]) => {
		if (!ids.has(id)) {
			return [`${id}: no such skill`];
		}

		const total = measureSkillLoad(repoRoot, id).totalLines;
		if (total <= LOADED_LINE_CAP) {
			return [`${id}: now ${total} lines, so remove its entry`];
		}

		return total === max ? [] : [`${id}: now ${total} lines, so set its max from ${max} to ${total}`];
	});

	assert.deepEqual(stale, []);
});

// --- The measurement ---

test("countLines counts a final unterminated line and nothing for an empty file", () => {
	assert.equal(countLines(""), 0);
	assert.equal(countLines("a\nb\n"), 2);
	assert.equal(countLines("a\nb"), 2);
});

test("listCitedFiles resolves a platform-tree link, a section-suffixed span, a repo-root token, and a bare step name", async () => {
	await withTempRepo(async (root) => {
		await writeRepoFile(root, ".prism/references/shipping.md", "# Shipping\n");
		await writeRepoFile(root, ".prism/references/frameworks.md", "# Frameworks\n");
		await writeRepoFile(root, ".prism/references/lookup.md", "# Lookup\n");
		await writeRepoFile(root, ".prism/skills/prism-x/step-01-start.md", "# Step\n");
		await writeRepoFile(
			root,
			".ai-skills/skills/prism-x/shared.md",
			"Ship per [`shipping.md`](../../references/shipping.md). " +
				"See `.prism/references/frameworks.md § Severity`. Then `step-01-start.md`. " +
				"Resolve per `<repo-root>/.prism/references/lookup.md`.\n"
		);

		assert.deepEqual(
			listCitedFiles(root, ".ai-skills/skills/prism-x/shared.md", ".prism/skills/prism-x").sort(),
			[
				".prism/references/frameworks.md",
				".prism/references/lookup.md",
				".prism/references/shipping.md",
				".prism/skills/prism-x/step-01-start.md",
			]
		);
	});
});

test("measureSkillLoad counts a skill's own lib file and a cited architect doc without following the doc's links", async () => {
	await withTempRepo(async (root) => {
		await writeRepoFile(root, ".prism/architect/_toolkit/other.md", "Other.\n");
		await writeRepoFile(
			root,
			".prism/architect/_toolkit/handoffs.md",
			"Handoffs.\nSee [`other.md`](./other.md).\n"
		);
		await writeRepoFile(root, ".ai-skills/skills/prism-x/lib/modes.md", "Mode A.\nMode B.\n");
		await writeRepoFile(
			root,
			".ai-skills/skills/prism-x/shared.md",
			"Pick a mode from [`lib/modes.md`](./lib/modes.md). Route per `.prism/architect/_toolkit/handoffs.md`.\n"
		);

		const load = measureSkillLoad(root, "prism-x");
		assert.deepEqual(load.files, [
			".ai-skills/skills/prism-x/lib/modes.md",
			".prism/architect/_toolkit/handoffs.md",
		]);
		assert.equal(load.totalLines, 1 + 2 + 2);
	});
});

test("measureSkillLoad follows citations transitively and counts templates and only load: skill rules", async () => {
	await withTempRepo(async (root) => {
		await writeRepoFile(root, ".prism/rules/always.md", "---\nload: always\n---\n\nAlways.\n");
		await writeRepoFile(root, ".prism/rules/on-skill.md", "---\nload: skill\n---\n\nOn skill.\n");
		await writeRepoFile(root, ".prism/templates/report.md", "# Report\n");
		await writeRepoFile(root, ".prism/skills/prism-x/step-02-next.md", "One.\nTwo.\n");
		await writeRepoFile(
			root,
			".prism/skills/prism-x/step-01-start.md",
			"Then `step-02-next.md`, using `.prism/templates/report.md`.\n"
		);
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
			".prism/templates/report.md",
		]);
		assert.equal(load.totalLines, 2 + 5 + 1 + 2 + 1);
	});
});
