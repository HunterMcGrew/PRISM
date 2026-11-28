/**
 * Contract for the four plan-chain templates: the frontmatter keys and `##`
 * headings the scripts read by name, a consumer-neutral vocabulary, and the
 * example task and glob block that must stay inert until a person fills them.
 *
 * `plan-small.md` is the plan a small intent's approval writes, so it gets the
 * same checks under its own cases and is also run through every script that
 * later writes or reads that plan.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readFrontmatter, sectionBody } from "./hooks/plan/frontmatter.mjs";
import { parseTasks } from "./hooks/plan/tasks.mjs";
import { collectPlanFolderViolations } from "./plan-folder-citations";
import { findEmptyRetroLines } from "./plan-retro-line";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HOOKS = path.join(repoRoot, "scripts", "ai-skills", "hooks");

const TEMPLATES: Record<string, { keys: string[]; headings: string[] }> = {
	"intent.md": {
		keys: ["title", "ticket", "stage", "status", "size"],
		headings: [
			"Problem",
			"Proposed outcome",
			"Approach",
			"Regression surface",
			"Security surface",
			"Design",
			"Acceptance criteria",
			"Open questions",
		],
	},
	"design.md": {
		keys: ["title", "ticket", "stage", "status", "approval"],
		headings: [
			"User & Goal",
			"Feeling",
			"States",
			"Interaction notes",
			"Reused components",
			"New patterns",
			"Accessibility notes",
			"Copy direction",
			"Mobile behavior",
			"Open questions",
			"Architectural inputs for the spec",
		],
	},
	"spec.md": {
		keys: ["title", "ticket", "stage", "status", "epic", "child"],
		headings: [
			"Requirements",
			"Design",
			"Affected systems",
			"Children",
			"Merge order",
			"Decisions",
		],
	},
	"plan.md": {
		keys: ["title", "ticket", "stage", "status"],
		headings: [
			"Tasks",
			"Challenge",
			"Decisions",
			"Verification",
			"Review",
			"PR Readiness",
		],
	},
};

const FORBIDDEN = [".ai-spec", "thrive", "Linear", "THR"];

async function readTemplate(name: string): Promise<string> {
	return fs.readFile(path.join(repoRoot, ".prism", "templates", name), "utf8");
}

for (const [name, expected] of Object.entries(TEMPLATES)) {
	test(`${name} keeps the frontmatter keys and headings the scripts read, in order`, async () => {
		const text = await readTemplate(name);
		const stage = name.replace(/\.md$/, "");

		assert.deepEqual(Object.keys(readFrontmatter(text)?.fields ?? {}), expected.keys);
		assert.equal(readFrontmatter(text)?.fields["stage"], stage);
		assert.equal(readFrontmatter(text)?.fields["status"], "draft");
		assert.deepEqual(
			[...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]),
			expected.headings
		);
	});

	test(`${name} copies into a plan folder with no citation`, async () => {
		const text = await readTemplate(name);

		assert.deepEqual(collectPlanFolderViolations(text, name), []);
	});

	test(`${name} names no tracker, ticket number, or framework of its own`, async () => {
		const text = await readTemplate(name);

		for (const word of FORBIDDEN) {
			assert.equal(text.includes(word), false, `${name} mentions ${word}`);
		}
	});

	test(`${name} tells the reader to copy it into a plan folder`, async () => {
		const text = await readTemplate(name);

		assert.ok(text.includes(`Copy this file to .prism/plans/<ticket>/${name}`));
	});
}

test("the plan template's example task sits inside a comment, so it parses to no tasks", async () => {
	assert.deepEqual(parseTasks(await readTemplate("plan.md")), []);
});

test("the spec template's Affected systems block is an empty text fence", async () => {
	const body = sectionBody(await readTemplate("spec.md"), "Affected systems");

	assert.match(body ?? "", /^```text\n\n```$/m);
});

test("the intent template's Approach section holds the three labels, empty, for the person to fill", async () => {
	const body = sectionBody(await readTemplate("intent.md"), "Approach");

	assert.deepEqual(
		(body ?? "").split("\n").filter((line) => line.trim() !== ""),
		["Chosen:", "Rejected:", "Unknown:"]
	);
});

/** Returns a section's raw text, comments kept, from its heading to the next `## ` heading. */
function rawSection(text: string, heading: string): string {
	const start = text.indexOf(`\n## ${heading}\n`);
	const end = text.indexOf("\n## ", start + 1);

	return text.slice(start, end === -1 ? undefined : end).trim();
}

test("the small plan's sections read exactly as the plan template's, comments included", async () => {
	const plan = await readTemplate("plan.md");
	const small = await readTemplate("plan-small.md");

	for (const heading of ["Verification", "Review", "PR Readiness"]) {
		assert.equal(rawSection(small, heading), rawSection(plan, heading), heading);
	}
});

test("the small plan keeps the plan template's keys and only its three record headings, in order", async () => {
	const text = await readTemplate("plan-small.md");

	assert.deepEqual(Object.keys(readFrontmatter(text)?.fields ?? {}), [
		"title",
		"ticket",
		"stage",
		"status",
	]);
	assert.equal(readFrontmatter(text)?.fields["stage"], "plan");
	assert.equal(readFrontmatter(text)?.fields["status"], "draft");
	assert.deepEqual(
		[...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]),
		["Verification", "Review", "PR Readiness"]
	);
});

test("the small plan names the plan.md the approval script copies it to", async () => {
	const text = await readTemplate("plan-small.md");

	assert.ok(text.includes("copies this file to .prism/plans/<ticket>/plan.md"));
});

test("the small plan copies into a plan folder with no citation and no tracker word", async () => {
	const text = await readTemplate("plan-small.md");

	assert.deepEqual(collectPlanFolderViolations(text, "plan-small.md"), []);

	for (const word of FORBIDDEN) {
		assert.equal(text.includes(word), false, `plan-small.md mentions ${word}`);
	}
});

test("the small plan's template parses to no tasks", async () => {
	assert.deepEqual(parseTasks(await readTemplate("plan-small.md")), []);
});

test("every script that writes or reads a small plan runs on the copied template", async () => {
	const root = mkdtempSync(path.join(os.tmpdir(), "plan-small-"));
	const planPath = path.join(root, ".prism", "plans", "x", "plan.md");

	const run = (script: string, ...args: string[]) =>
		spawnSync(process.execPath, [path.join(HOOKS, script), ...args], {
			cwd: root,
			encoding: "utf8",
		});

	const git = (...args: string[]) =>
		execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], {
			cwd: root,
			encoding: "utf8",
		}).trim();

	try {
		git("init", "-q", "-b", "main");
		await fs.mkdir(path.dirname(planPath), { recursive: true });
		await fs.writeFile(planPath, await readTemplate("plan-small.md"));
		git("add", "--all");
		git("commit", "-q", "-m", "plan: add the small plan");
		const head = git("rev-parse", "HEAD");

		const verifyReport = path.join(root, "verify.json");
		await fs.writeFile(
			verifyReport,
			JSON.stringify({
				verdict: "done",
				base: head,
				head,
				blocked: [],
				rows: [{ check: "test", result: "pass", evidence: "test.log" }],
				failures: [],
			})
		);
		const verified = run("verify/record.mjs", planPath, verifyReport);
		assert.equal(verified.status, 0, verified.stderr);

		const reviewReport = path.join(root, "review.json");
		await fs.writeFile(
			reviewReport,
			JSON.stringify({ round: 1, sha: head, passes: [{ token: "swept — all" }], findings: [] })
		);
		const reviewed = run("review/record.mjs", planPath, reviewReport);
		assert.equal(reviewed.status, 0, reviewed.stderr);

		const recorded = await fs.readFile(planPath, "utf8");
		assert.match(recorded, /^verdict: done$/m);
		assert.match(recorded, /^- review round 1 at [0-9a-f]{8}: clean$/m);
		assert.deepEqual(parseTasks(recorded), []);

		const trigger = run("plan/retro-trigger.mjs", path.dirname(planPath));
		assert.equal(trigger.status, 1, trigger.stderr);
		assert.equal(trigger.stdout, "");

		const bar = run("review/merge-bar.mjs", planPath, "--head", head);
		assert.equal(bar.status, 0, bar.stdout + bar.stderr);

		const closed = recorded.replace(/^---\n\n/m, "---\n\n> Closed: 2026-11-28\n\n");
		await fs.writeFile(planPath, closed);
		assert.deepEqual(await findEmptyRetroLines(root), [".prism/plans/x/plan.md"]);

		await fs.writeFile(planPath, closed.replace(/^Retro:$/m, "Retro: none — no trigger"));
		assert.deepEqual(await findEmptyRetroLines(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
