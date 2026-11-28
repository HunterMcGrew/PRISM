/**
 * Suite for `plan/retro-trigger.mjs`: the reasons that call for a retro
 * report, the plan that calls for none, and the inputs it refuses.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { retroTrigger } from "./hooks/plan/retro-trigger.mjs";

const SCRIPT = fileURLToPath(
	new URL("./hooks/plan/retro-trigger.mjs", import.meta.url)
);
const tempRoots: string[] = [];

after(() => {
	for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
});

const TASK_ONE = "### T1: First\n\n- files: a.ts\n- proof: true\n";
const AMENDED_TASK =
	"### T2: Second\n\n- files: b.ts\n- proof: true\n- amended: b.ts: the spec moved the export\n";

function buildPlan({
	tasks = TASK_ONE,
	challenge = "round 1: clean\nround 2: clean\n",
	review = "- review round 1 at 1a2b3c4d: clean\n",
}: { tasks?: string; challenge?: string; review?: string } = {}): string {
	return [
		"---",
		"stage: plan",
		"status: approved",
		"---",
		"",
		"## Tasks",
		"",
		tasks,
		"## Challenge",
		"",
		challenge,
		"## Review",
		"",
		review,
		"## PR Readiness",
		"",
		"Retro:",
		"",
	].join("\n");
}

function makeFolder(plan: string | null): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "retro-trigger-"));
	tempRoots.push(root);
	const folder = path.join(root, "prism-1");
	mkdirSync(folder);
	if (plan !== null) writeFileSync(path.join(folder, "plan.md"), plan);

	return folder;
}

function run(...args: string[]) {
	return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

describe("reasons", () => {
	test("a plan with no reason prints nothing and exits 1", () => {
		const result = run(makeFolder(buildPlan()));

		assert.equal(result.status, 1);
		assert.equal(result.stdout, "");
	});

	test("a review line whose verdict is not clean prints the line", () => {
		const folder = makeFolder(
			buildPlan({
				review:
					"- review round 1 at 1a2b3c4d: 0 critical, 2 major, 0 minor, 0 nit\n- review round 2 at 5e6f7a8b: clean\n",
			})
		);

		const result = run(folder);

		assert.equal(result.status, 0);
		assert.equal(
			result.stdout,
			"review: review round 1 at 1a2b3c4d: 0 critical, 2 major, 0 minor, 0 nit\n"
		);
	});

	test("a clean verdict that holds a decision is not clean", () => {
		const folder = makeFolder(
			buildPlan({ review: "- review round 1 at 1a2b3c4d: clean, 1 decision\n" })
		);

		const result = run(folder);

		assert.equal(result.status, 0);
		assert.equal(
			result.stdout,
			"review: review round 1 at 1a2b3c4d: clean, 1 decision\n"
		);
	});

	test("older pr-review and part-marked lines are read too", () => {
		const folder = makeFolder(
			buildPlan({
				review:
					"- pr-review round 1 at 1a2b3c4d (part 1 of 2): 1 critical, 0 major, 0 minor, 0 nit\n- self-review confirm at 5e6f7a8b: clean\n",
			})
		);

		const result = run(folder);

		assert.equal(result.status, 0);
		assert.equal(
			result.stdout,
			"review: pr-review round 1 at 1a2b3c4d (part 1 of 2): 1 critical, 0 major, 0 minor, 0 nit\n"
		);
	});

	test("a challenge round numbered 3 or higher triggers, bare or dashed", () => {
		const bare = makeFolder(
			buildPlan({
				challenge:
					"round 1: blocking 1\nround 2: blocking 1\nround 3: resolved 1\nround 4: carried 1\n",
			})
		);
		const dashed = makeFolder(
			buildPlan({
				challenge: "- round 1: clean\n- round 2: blocking 1\n- round 3: clean\n",
			})
		);

		const bareResult = run(bare);
		const dashedResult = run(dashed);

		assert.equal(bareResult.status, 0);
		assert.equal(bareResult.stdout, "challenge: round 3\nchallenge: round 4\n");
		assert.equal(dashedResult.status, 0);
		assert.equal(dashedResult.stdout, "challenge: round 3\n");
	});

	test("rounds 1 and 2 alone do not trigger", () => {
		const folder = makeFolder(
			buildPlan({ challenge: "round 1: blocking 2\nround 2: resolved 2\n" })
		);

		assert.equal(run(folder).status, 1);
	});

	test("a task carrying an amended field triggers", () => {
		const folder = makeFolder(
			buildPlan({ tasks: `${TASK_ONE}\n${AMENDED_TASK}` })
		);

		const result = run(folder);

		assert.equal(result.status, 0);
		assert.equal(result.stdout, "amended: T2\n");
	});

	test("every reason prints, challenge then review then amended", () => {
		const folder = makeFolder(
			buildPlan({
				tasks: `${TASK_ONE}\n${AMENDED_TASK}`,
				challenge: "round 1: clean\nround 2: clean\nround 3: clean\n",
				review: "- review round 1 at 1a2b3c4d: 0 critical, 0 major, 1 minor, 0 nit\n",
			})
		);

		assert.deepEqual(retroTrigger(folder), {
			code: 0,
			reasons: [
				"challenge: round 3",
				"review: review round 1 at 1a2b3c4d: 0 critical, 0 major, 1 minor, 0 nit",
				"amended: T2",
			],
		});
	});
});

describe("refusals", () => {
	test("a folder with no plan.md exits 2", () => {
		const result = run(makeFolder(null));

		assert.equal(result.status, 2);
		assert.equal(result.stdout, "");
		assert.match(result.stderr, /holds no plan\.md/);
	});

	test("a plan.md that cannot be read exits 2", () => {
		const folder = makeFolder(null);
		mkdirSync(path.join(folder, "plan.md"));

		const result = run(folder);

		assert.equal(result.status, 2);
		assert.equal(result.stdout, "");
	});

	test("a malformed task list exits 2", () => {
		const folder = makeFolder(
			buildPlan({ tasks: `${TASK_ONE}\n${TASK_ONE}` })
		);

		const result = run(folder);

		assert.equal(result.status, 2);
		assert.equal(result.stdout, "");
		assert.match(result.stderr, /retro-trigger:/);
	});

	test("a missing or extra argument exits 2 with the usage line", () => {
		assert.equal(run().status, 2);
		assert.match(run("a", "b").stderr, /Usage: retro-trigger\.mjs/);
	});

	test("a symlinked invocation still runs as a command", (t) => {
		const root = mkdtempSync(path.join(os.tmpdir(), "retro-trigger-link-"));
		tempRoots.push(root);
		const link = path.join(root, "retro-trigger.mjs");
		try {
			symlinkSync(SCRIPT, link);
		} catch (error) {
			if (process.platform === "win32" && (error as NodeJS.ErrnoException).code === "EPERM") {
				t.skip("creating a symlink needs a privilege this Windows runner lacks");

				return;
			}

			throw error;
		}

		const result = spawnSync(process.execPath, [link, makeFolder(buildPlan())], {
			encoding: "utf8",
		});

		assert.equal(result.status, 1);
	});
});
