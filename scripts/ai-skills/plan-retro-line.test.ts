import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { findEmptyRetroLines } from "./plan-retro-line";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, "../..");

const PLAN_PATH = ".prism/plans/prism-1/plan.md";
const REPORT_PATH = ".prism/retros/2026-11-27-prism-1.md";
const CLOSED = "> Closed: 2026-11-27";
const CLEAN_REVIEW = "- pr-review round 1 at abc1234: clean";

function plan(retro: string, options: { closed?: string; review?: string[] } = {}): string {
	const { closed = CLOSED, review = [] } = options;

	return [
		"---",
		"title: A plan",
		"status: approved",
		"---",
		...(closed === "" ? [] : ["", closed]),
		"",
		"## Tasks",
		"",
		"## Review",
		"",
		...review,
		"",
		"## PR Readiness",
		"",
		retro,
		"",
	].join("\n");
}

async function failuresFor(
	content: string,
	options: { planPath?: string; extraFiles?: Record<string, string>; extraDirs?: string[] } = {}
): Promise<string[]> {
	const { planPath = PLAN_PATH, extraFiles = {}, extraDirs = [] } = options;
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "plan-retro-line-"));

	try {
		for (const [relative, text] of Object.entries({ [planPath]: content, ...extraFiles })) {
			const target = path.join(root, relative);

			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.writeFile(target, text);
		}

		for (const relative of extraDirs) {
			await fs.mkdir(path.join(root, relative), { recursive: true });
		}

		return await findEmptyRetroLines(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

test("a closed folder plan with an empty Retro line fails", async () => {
	assert.deepEqual(await failuresFor(plan("Retro:")), [PLAN_PATH]);
});

test("a Retro line holding only whitespace counts as empty", async () => {
	assert.deepEqual(await failuresFor(plan("Retro:   ")), [PLAN_PATH]);
});

test("a closed plan with no Retro line at all fails", async () => {
	assert.deepEqual(await failuresFor(plan("")), [PLAN_PATH]);
});

test("a single-token Retro value naming no file fails", async () => {
	assert.deepEqual(await failuresFor(plan(`Retro: ${REPORT_PATH}`)), [PLAN_PATH]);
});

test("a single-token Retro value naming a directory fails, because it is not a regular file", async () => {
	assert.deepEqual(
		await failuresFor(plan("Retro: .prism/retros"), { extraDirs: [".prism/retros"] }),
		[PLAN_PATH]
	);
});

test("a Retro value naming an existing file passes", async () => {
	assert.deepEqual(
		await failuresFor(plan(`Retro: ${REPORT_PATH}`), { extraFiles: { [REPORT_PATH]: "# Retro\n" } }),
		[]
	);
});

test("backticks around the path are stripped before the file is checked", async () => {
	assert.deepEqual(
		await failuresFor(plan(`Retro: \`${REPORT_PATH}\``), {
			extraFiles: { [REPORT_PATH]: "# Retro\n" },
		}),
		[]
	);
});

test("a backticked path naming no file still fails", async () => {
	assert.deepEqual(await failuresFor(plan(`Retro: \`${REPORT_PATH}\``)), [PLAN_PATH]);
});

test("none — no trigger passes without being read as a path", async () => {
	assert.deepEqual(await failuresFor(plan("Retro: none — no trigger")), []);
});

test("any value holding whitespace passes, so an older prose line still counts as filled", async () => {
	assert.deepEqual(await failuresFor(plan("> Retro: declined — one-line fix")), []);
});

test("a plan with no Closed line passes with an empty Retro line", async () => {
	assert.deepEqual(await failuresFor(plan("Retro:", { closed: "" })), []);
});

test("a plan with no Closed line passes with a Retro path naming no file", async () => {
	assert.deepEqual(await failuresFor(plan(`Retro: ${REPORT_PATH}`, { closed: "" })), []);
});

test("a Closed line with no date does not count", async () => {
	assert.deepEqual(await failuresFor(plan("Retro:", { closed: "> Closed:" })), []);
});

test("a Closed line after the first ## heading does not count", async () => {
	const content = plan("Retro:", { closed: "" }).replace("## Tasks\n", `## Tasks\n\n${CLOSED}\n`);

	assert.deepEqual(await failuresFor(content), []);
});

test("a final PR-review line does not make an open plan due", async () => {
	assert.deepEqual(await failuresFor(plan("Retro:", { closed: "", review: [CLEAN_REVIEW] })), []);
});

test("a closed plan with an empty Retro line fails whatever its review lines say", async () => {
	assert.deepEqual(
		await failuresFor(plan("Retro:", { review: ["- review round 1 at abc1234: 0 critical, 2 major, 0 minor, 0 nit"] })),
		[PLAN_PATH]
	);
});

test("a flat plan with the same content is ignored", async () => {
	assert.deepEqual(await failuresFor(plan("Retro:"), { planPath: ".prism/plans/prism-1.md" }), []);
});

test("an epic folder is ignored", async () => {
	assert.deepEqual(
		await failuresFor(plan("Retro:"), { planPath: ".prism/plans/epic-prism-2/plan.md" }),
		[]
	);
});

test("a plan under .prism/archived/plans/ is ignored", async () => {
	assert.deepEqual(
		await failuresFor(plan("Retro:"), { planPath: ".prism/archived/plans/prism-1/plan.md" }),
		[]
	);
});

test("PRISM's own plans all pass, the positive control for today's tree", async () => {
	assert.deepEqual(await findEmptyRetroLines(repoRoot), []);
});
