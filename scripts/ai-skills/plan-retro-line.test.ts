import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { findEmptyRetroLines } from "./plan-retro-line";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

const CLEAN_ROUND = "- pr-review round 1 at abc1234: clean";
const OPEN_ROUND = "- pr-review round 1 at abc1234: 0 critical, 2 major, 0 minor, 0 nit";
const OPEN_CONFIRM = "- pr-review confirm at abc1234: 0 critical, 1 major, 0 minor, 0 nit";

function plan(reviewLines: string[], retro: string): string {
	return [
		"---",
		"title: A plan",
		"status: approved",
		"---",
		"",
		"## Tasks",
		"",
		"## Review",
		"",
		...reviewLines,
		"",
		"## PR Readiness",
		"",
		retro,
		"",
	].join("\n");
}

async function withTree(
	files: Record<string, string>,
	run: (root: string) => Promise<void>
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "plan-retro-line-"));

	try {
		for (const [relative, content] of Object.entries(files)) {
			const target = path.join(root, relative);

			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.writeFile(target, content);
		}

		await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

async function failuresFor(content: string, planPath = ".prism/plans/prism-1/plan.md") {
	let failing: string[] = [];

	await withTree({ [planPath]: content }, async (root) => {
		failing = await findEmptyRetroLines(root);
	});

	return failing;
}

test("a folder plan with a clean PR-review round and an empty Retro line fails", async () => {
	assert.deepEqual(await failuresFor(plan([CLEAN_ROUND], "Retro:")), [
		".prism/plans/prism-1/plan.md",
	]);
});

test("a Retro line holding only whitespace counts as empty", async () => {
	assert.deepEqual(await failuresFor(plan([CLEAN_ROUND], "Retro:   ")), [
		".prism/plans/prism-1/plan.md",
	]);
});

test("a plan with no Retro line at all fails once its PR review is final", async () => {
	assert.deepEqual(await failuresFor(plan([CLEAN_ROUND], "")), [
		".prism/plans/prism-1/plan.md",
	]);
});

test("the same plan with a filled Retro line passes", async () => {
	assert.deepEqual(await failuresFor(plan([CLEAN_ROUND], "Retro: .prism/retros/x.md")), []);
});

test("a declined retro with a reason counts as filled", async () => {
	assert.deepEqual(
		await failuresFor(plan([CLEAN_ROUND], "> Retro: declined — one-line fix")),
		[]
	);
});

test("a non-clean last PR-review round passes, because another round is coming", async () => {
	assert.deepEqual(await failuresFor(plan([OPEN_ROUND], "Retro:")), []);
});

test("a confirm line is final even with open counts, so an empty Retro fails", async () => {
	assert.deepEqual(await failuresFor(plan([OPEN_ROUND, OPEN_CONFIRM], "Retro:")), [
		".prism/plans/prism-1/plan.md",
	]);
});

test("only the last PR-review line decides", async () => {
	assert.deepEqual(
		await failuresFor(plan([CLEAN_ROUND, "- pr-review round 2 at def5678: 1 critical, 0 major, 0 minor, 0 nit"], "Retro:")),
		[]
	);
});

test("a plan with no PR-review line passes, because the retro has not come due", async () => {
	assert.deepEqual(await failuresFor(plan([], "Retro:")), []);
});

test("a part 1 of 2 clean line with an empty Retro passes, because a later PR is still to be reviewed", async () => {
	assert.deepEqual(
		await failuresFor(plan(["- pr-review round 2 at abc1234 (part 1 of 2): clean"], "Retro:")),
		[]
	);
});

test("a part 2 of 2 clean line with an empty Retro fails", async () => {
	assert.deepEqual(
		await failuresFor(plan(["- pr-review round 1 at abc1234 (part 2 of 2): clean"], "Retro:")),
		[".prism/plans/prism-1/plan.md"]
	);
});

test("a part 1 of 2 confirm line with an empty Retro passes", async () => {
	assert.deepEqual(
		await failuresFor(
			plan(
				["- pr-review confirm at abc1234 (part 1 of 2): 0 critical, 1 major, 0 minor, 0 nit"],
				"Retro:"
			)
		),
		[]
	);
});

test("a self-review line alone does not count", async () => {
	assert.deepEqual(
		await failuresFor(plan(["- self-review round 1 at abc1234: clean"], "Retro:")),
		[]
	);
});

test("a flat plan with the same content is ignored", async () => {
	assert.deepEqual(
		await failuresFor(plan([CLEAN_ROUND], "Retro:"), ".prism/plans/prism-1.md"),
		[]
	);
});

test("an epic folder is ignored", async () => {
	assert.deepEqual(
		await failuresFor(plan([CLEAN_ROUND], "Retro:"), ".prism/plans/epic-prism-2/plan.md"),
		[]
	);
});

test("a plan under .prism/archived/plans/ is ignored", async () => {
	assert.deepEqual(
		await failuresFor(plan([CLEAN_ROUND], "Retro:"), ".prism/archived/plans/prism-1/plan.md"),
		[]
	);
});

test("PRISM's own plans all pass, the positive control for today's tree", async () => {
	assert.deepEqual(await findEmptyRetroLines(repoRoot), []);
});
