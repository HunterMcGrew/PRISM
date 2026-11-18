/**
 * Suite for plan auto-approval: the conditions that approve a plan without a
 * person, the ones that hold it, and the stop paths the repo config sets.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { autoApprove } from "./hooks/plan/auto-approve.mjs";
import { approvalLines } from "./hooks/plan/frontmatter.mjs";

const SCRIPT = fileURLToPath(
	new URL("./hooks/plan/auto-approve.mjs", import.meta.url)
);
const FIXTURES = fileURLToPath(
	new URL("./__fixtures__/auto-approve", import.meta.url)
);
const TODAY = "2026-11-01";
const CONTRACT_STOP_PATHS = { dependency: [], contract: ["src/contracts/**"] };
const ALL_FILES_SPEC = "## Affected systems\n\n```text\n**\n```\n";
const tempRoots: string[] = [];

after(() => {
	for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
});

/** Copies a fixture into a temp repo with a fake `.git`, so nothing writes into this one. */
function copyFixture(name: string): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "auto-approve-"));
	tempRoots.push(root);
	const folder = path.join(root, name);
	mkdirSync(path.join(root, ".git"));
	cpSync(path.join(FIXTURES, name), folder, { recursive: true });

	return folder;
}

function repoRootOf(folder: string): string {
	return path.dirname(folder);
}

function readPlan(folder: string): string {
	return readFileSync(path.join(folder, "plan.md"), "utf8");
}

function editPlan(folder: string, edit: (text: string) => string): void {
	writeFileSync(path.join(folder, "plan.md"), edit(readPlan(folder)));
}

function editedPlan(folder: string, edit: (text: string) => string): string {
	editPlan(folder, edit);

	return readPlan(folder);
}

function run(...args: string[]) {
	return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
}

describe("passing plans", () => {
	test("a clean plan gets the three approval lines and nothing else changes", () => {
		const folder = copyFixture("clean");
		const before = readPlan(folder);

		const result = autoApprove({ folder, today: TODAY });

		assert.equal(result.code, 0);
		assert.equal(
			readPlan(folder),
			before.replace(
				"status: draft\n",
				`status: approved\napproved_by: auto\napproved_at: ${TODAY}\n`
			)
		);
	});

	test("the CLI approves a clean plan with today's date and exits 0", () => {
		const folder = copyFixture("clean");

		const child = run(folder);

		assert.equal(child.status, 0, child.stderr);
		const lines = approvalLines(readPlan(folder));
		assert.equal(lines.status, "approved");
		assert.equal(lines.approved_by, "auto");
		assert.match(lines.approved_at ?? "", /^\d{4}-\d{2}-\d{2}$/);
	});

	test("--check exits 0 and writes nothing", () => {
		const folder = copyFixture("clean");
		const before = readPlan(folder);

		const child = run(folder, "--check");

		assert.equal(child.status, 0, child.stderr);
		assert.equal(readPlan(folder), before);
	});

	test("a round-1 blocking line that round 2 resolves still approves", () => {
		const folder = copyFixture("blocking-then-resolved");

		assert.equal(autoApprove({ folder, today: TODAY }).code, 0);
		assert.equal(approvalLines(readPlan(folder)).approved_by, "auto");
	});

	test("a plan is approved whatever its task count", () => {
		const folder = copyFixture("thirteen-tasks");

		assert.equal(autoApprove({ folder, today: TODAY }).code, 0);
		assert.equal(approvalLines(readPlan(folder)).approved_by, "auto");
	});

	test("a confirm round that resolves a blocking round 3 approves", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) =>
			text.replace(
				"round 2: clean\n",
				"round 2: blocking 1\nround 3: blocking 2\nround 4: resolved 2\n"
			)
		);

		assert.equal(autoApprove({ folder, today: TODAY }).code, 0);
		assert.equal(approvalLines(readPlan(folder)).approved_by, "auto");
	});

	test("a confirm round that carries its leftover findings approves", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) =>
			text.replace(
				"round 2: clean\n",
				"round 2: blocking 1\nround 3: blocking 2\nround 4: carried 2\n"
			)
		);

		assert.equal(autoApprove({ folder, today: TODAY }).code, 0);
		assert.equal(approvalLines(readPlan(folder)).approved_by, "auto");
	});

	test("a round before the confirm round can't carry findings", () => {
		const folder = copyFixture("clean");
		const before = editedPlan(folder, (text) =>
			text.replace("round 2: clean\n", "round 2: carried 1\n")
		);

		const result = autoApprove({ folder, today: TODAY });

		assert.equal(result.code, 1);
		assert.equal(
			result.message,
			'auto-approve: challenge failed: "round 2: carried 1" carries findings before round 4, and only a confirm round may'
		);
		assert.equal(readPlan(folder), before);
	});

	test("an already approved plan passes without being rewritten", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) =>
			text.replace(
				"status: draft\n",
				"status: approved\napproved_by: Ada\napproved_at: 2026-10-01\n"
			)
		);
		const before = readPlan(folder);

		const result = autoApprove({ folder, today: TODAY });

		assert.equal(result.code, 0);
		assert.match(result.message, /already approved by Ada/);
		assert.equal(readPlan(folder), before);
	});

	test("--check on an approved plan exits 0 and writes nothing", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) =>
			text.replace(
				"status: draft\n",
				"status: approved\napproved_by: Ada\napproved_at: 2026-10-01\n"
			)
		);
		const before = readFileSync(path.join(folder, "plan.md"));

		const child = run(folder, "--check");

		assert.equal(child.status, 0, child.stderr);
		assert.deepEqual(readFileSync(path.join(folder, "plan.md")), before);
	});

	test("a worktree's .git file counts as the repo root", () => {
		const folder = copyFixture("clean");
		const dotGit = path.join(repoRootOf(folder), ".git");
		rmSync(dotGit, { recursive: true });
		writeFileSync(dotGit, "gitdir: /elsewhere/.git/worktrees/w\n");

		assert.equal(autoApprove({ folder, today: TODAY }).code, 0);
	});
});

describe("failing conditions print one line, exit 1, and write nothing", () => {
	const FAILING = [
		[
			"outside-affected-systems",
			"affected systems failed: T3 lists src/components/bar/Bar.tsx, which no Affected systems glob matches",
		],
		[
			"one-round",
			"challenge failed: ## Challenge holds rounds 1, and rounds 1 and 2 are needed",
		],
		[
			"round-2-blocking",
			'challenge failed: the last round line reads "round 2: blocking 1"',
		],
		[
			"dependency-file",
			"stop paths failed: T3 lists package.json, a dependency path (package.json)",
		],
	] as const;

	for (const [name, expected] of FAILING) {
		test(`${name} fails with one condition line and writes nothing`, () => {
			const folder = copyFixture(name);
			const before = readPlan(folder);

			const child = run(folder);

			assert.equal(child.status, 1);
			assert.equal(child.stderr, `auto-approve: ${expected}\n`);
			assert.equal(readPlan(folder), before);
		});
	}

	test("contract-path fails on a configured contract stop path and writes nothing", () => {
		const folder = copyFixture("contract-path");
		const before = readPlan(folder);

		const result = autoApprove({
			folder,
			today: TODAY,
			stopPaths: CONTRACT_STOP_PATHS,
		});

		assert.equal(result.code, 1);
		assert.equal(
			result.message,
			"auto-approve: stop paths failed: T3 lists src/contracts/shape.ts, a contract path (src/contracts/**)"
		);
		assert.equal(readPlan(folder), before);
	});

	test("contract-path approves when the repo config sets no contract paths", () => {
		const folder = copyFixture("contract-path");

		assert.equal(
			autoApprove({ folder, today: TODAY, check: true }).code,
			0
		);
	});

	test("the CLI reads the contract stop paths from the repo's config", () => {
		const folder = copyFixture("contract-path");
		const configDir = path.join(repoRootOf(folder), ".ai-skills");
		mkdirSync(configDir);
		writeFileSync(
			path.join(configDir, "config.json"),
			JSON.stringify({ stopPaths: { contract: ["src/contracts/**"] } })
		);
		const before = readPlan(folder);

		const child = run(folder);

		assert.equal(child.status, 1);
		assert.equal(
			child.stderr,
			"auto-approve: stop paths failed: T3 lists src/contracts/shape.ts, a contract path (src/contracts/**)\n"
		);
		assert.equal(readPlan(folder), before);
	});

	test("the CLI reports a misspelled stopPaths key as a config error, not a stack trace", () => {
		const folder = copyFixture("clean");
		const configDir = path.join(repoRootOf(folder), ".ai-skills");
		mkdirSync(configDir);
		writeFileSync(
			path.join(configDir, "config.json"),
			JSON.stringify({ stopPaths: { contracts: ["src/contracts/**"] } })
		);
		const before = readPlan(folder);

		const child = run(folder);

		assert.equal(child.status, 2);
		assert.equal(
			child.stderr,
			'auto-approve: stopPaths has an unknown key "contracts"; the keys are "dependency" and "contract".\n'
		);
		assert.equal(readPlan(folder), before);
	});

	test("the CLI exits 2 on a stop-path list that is a string instead of an array", () => {
		const folder = copyFixture("contract-path");
		const configDir = path.join(repoRootOf(folder), ".ai-skills");
		mkdirSync(configDir);
		writeFileSync(
			path.join(configDir, "config.json"),
			JSON.stringify({ stopPaths: { contract: "src/contracts/**" } })
		);
		const before = readPlan(folder);

		const child = run(folder, "--check");

		assert.equal(child.status, 2);
		assert.equal(
			child.stderr,
			'auto-approve: stopPaths.contract is "src/contracts/**", which is not an array of patterns.\n'
		);
		assert.equal(readPlan(folder), before);
	});

	test("the CLI exits 2 on a config that does not parse instead of using the default stop paths", () => {
		const folder = copyFixture("contract-path");
		const configDir = path.join(repoRootOf(folder), ".ai-skills");
		mkdirSync(configDir);
		writeFileSync(
			path.join(configDir, "config.json"),
			'{ "stopPaths": { "contract": ["src/contracts/**"] }, }'
		);
		const before = readPlan(folder);

		const child = run(folder, "--check");

		assert.equal(child.status, 2);
		assert.match(
			child.stderr,
			/^auto-approve: \.ai-skills\/config\.json exists but is not a readable JSON object/
		);
		assert.equal(readPlan(folder), before);
	});

	test("a config that sets dependency paths replaces the default list", () => {
		const folder = copyFixture("dependency-file");
		const configDir = path.join(repoRootOf(folder), ".ai-skills");
		mkdirSync(configDir);
		writeFileSync(
			path.join(configDir, "config.json"),
			JSON.stringify({ stopPaths: { dependency: ["Makefile"] } })
		);

		const child = run(folder, "--check");

		assert.equal(child.status, 0, child.stderr);
	});

	test("every failing condition is reported, not just the first", () => {
		const folder = copyFixture("contract-path");
		writeFileSync(
			path.join(folder, "spec.md"),
			"## Affected systems\n\n```text\nsrc/blocks/foo/**\n```\n"
		);

		const result = autoApprove({
			folder,
			today: TODAY,
			stopPaths: CONTRACT_STOP_PATHS,
		});

		assert.equal(result.code, 1);
		assert.deepEqual(
			result.message.split("\n").map((line) => line.split(" failed:")[0]),
			["auto-approve: affected systems", "auto-approve: stop paths"]
		);
	});

	test("a plan with no tasks fails the task count", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) =>
			text.replace(/## Tasks[\s\S]*?## Challenge/, "## Tasks\n\n## Challenge")
		);

		const result = autoApprove({ folder, today: TODAY });

		assert.equal(result.code, 1);
		assert.equal(
			result.message,
			"auto-approve: task count failed: plan.md has no tasks"
		);
	});

	test("a duplicate task ID fails instead of throwing", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) => text.replace("### T2:", "### T1:"));

		const result = autoApprove({ folder, today: TODAY });

		assert.equal(result.code, 1);
		assert.equal(
			result.message,
			"auto-approve: tasks failed: Duplicate task ID T1"
		);
	});

	test("a missing spec.md fails the Affected systems condition", () => {
		const folder = copyFixture("clean");
		rmSync(path.join(folder, "spec.md"));

		const result = autoApprove({ folder, today: TODAY });

		assert.equal(result.code, 1);
		assert.equal(
			result.message,
			"auto-approve: affected systems failed: spec.md has no fenced glob block under ## Affected systems"
		);
	});

	test("an Affected systems glob with brackets matches the catch-all route literally", () => {
		const folder = copyFixture("clean");
		writeFileSync(
			path.join(folder, "spec.md"),
			"## Affected systems\n\n```text\nsrc/app/[...slug]/**\n```\n"
		);
		editPlan(folder, (text) =>
			text
				.replace(
					"src/blocks/foo/view.tsx, src/blocks/foo/view.test.tsx",
					"src/app/[...slug]/page.tsx"
				)
				.replace("src/blocks/foo/schema.ts", "src/app/s/page.tsx")
		);

		const result = autoApprove({ folder, today: TODAY, check: true });

		assert.deepEqual(result.message.split("\n"), [
			"auto-approve: affected systems failed: T2 lists src/app/s/page.tsx, which no Affected systems glob matches",
		]);
	});

	test("a spec whose Affected systems fence is empty fails", () => {
		const folder = copyFixture("clean");
		writeFileSync(
			path.join(folder, "spec.md"),
			"## Affected systems\n\n```text\n\n```\n"
		);

		assert.equal(
			autoApprove({ folder, today: TODAY }).message,
			"auto-approve: affected systems failed: spec.md has no fenced glob block under ## Affected systems"
		);
	});

	test("round lines inside an HTML comment don't count", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) =>
			text.replace(
				"round 1: clean\nround 2: clean",
				"<!--\nround 1: clean\nround 2: clean\n-->"
			)
		);

		assert.match(
			autoApprove({ folder, today: TODAY }).message,
			/holds rounds none/
		);
	});

	test("a plan with no status line fails the frontmatter check", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) => text.replace("status: draft\n", ""));

		const result = autoApprove({ folder, check: true, today: TODAY });

		assert.equal(result.code, 1);
		assert.equal(
			result.message,
			"auto-approve: frontmatter failed: plan.md has no status line"
		);
	});

	test("a status other than draft or approved is not overwritten", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) => text.replace("status: draft", "status: review"));
		const before = readPlan(folder);

		const result = autoApprove({ folder, today: TODAY });

		assert.equal(result.code, 1);
		assert.match(result.message, /^auto-approve: frontmatter failed/);
		assert.equal(readPlan(folder), before);
	});

	test("a capitalized Status: draft line fails instead of reporting an approval it never wrote", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) => text.replace("status: draft", "Status: draft"));
		const before = readPlan(folder);

		const child = run(folder);

		assert.equal(child.status, 1);
		assert.match(child.stderr, /status line is not a plain "status: draft"/);
		assert.equal(readPlan(folder), before);
	});

	test("a plan folder with no git checkout above it fails the files check", () => {
		const folder = copyFixture("clean");
		rmSync(path.join(folder, "..", ".git"), { recursive: true });

		assert.match(
			autoApprove({ folder, check: true, today: TODAY }).message,
			/files failed: no git checkout above the plan folder/
		);
	});
});

describe("task files and challenge rounds that can't slip past the checks", () => {
	const FILES_FAILURES: [string, (text: string) => string, RegExp][] = [
		[
			"a task with no files line",
			(text) =>
				text.replace(
					"- files: src/blocks/foo/schema.ts\n",
					"- proof fails on main: yes\n"
				),
			/files failed: T2 lists no files/,
		],
		[
			"a miscased Files key",
			(text) =>
				text.replace(
					"- files: src/blocks/foo/schema.ts",
					"- Files: package.json"
				),
			/tasks failed: T2: unknown field "Files"/,
		],
		[
			"a glob in files",
			(text) => text.replace("src/blocks/foo/schema.ts", "src/blocks/foo/**"),
			/tasks failed: T2: files entry "src\/blocks\/foo\/\*\*"/,
		],
		[
			"a case variant of a dependency file",
			(text) =>
				text.replace("src/blocks/foo/schema.ts", "src/blocks/foo/Package.json"),
			/stop paths failed: T2 lists src\/blocks\/foo\/Package\.json, a dependency path/,
		],
		[
			"a path climbing out of the repo",
			(text) => text.replace("src/blocks/foo/schema.ts", "../outside.ts"),
			/files failed: T2 lists \.\.\/outside\.ts, which is outside the repo/,
		],
		[
			"a depends on ID that names no task",
			(text) => text.replace("- depends on: none", "- depends on: T99"),
			/tasks failed: T1: depends on T99, which names no task/,
		],
	];

	for (const [label, edit, pattern] of FILES_FAILURES) {
		test(`${label} fails auto-approval`, () => {
			const folder = copyFixture("clean");
			writeFileSync(path.join(folder, "spec.md"), ALL_FILES_SPEC);
			editPlan(folder, edit);

			const result = autoApprove({ folder, check: true, today: TODAY });

			assert.equal(result.code, 1, result.message);
			assert.match(result.message, pattern);
		});
	}

	test("a backticked contract file that climbs out of its folder fails the stop paths", () => {
		const folder = copyFixture("clean");
		writeFileSync(path.join(folder, "spec.md"), ALL_FILES_SPEC);
		editPlan(folder, (text) =>
			text.replace(
				"src/blocks/foo/schema.ts",
				"`src/blocks/foo/../../contracts/shape.ts`"
			)
		);

		const result = autoApprove({
			folder,
			check: true,
			today: TODAY,
			stopPaths: CONTRACT_STOP_PATHS,
		});

		assert.equal(result.code, 1, result.message);
		assert.match(
			result.message,
			/stop paths failed: T2 lists src\/blocks\/foo\/\.\.\/\.\.\/contracts\/shape\.ts, a contract path/
		);
	});

	test("a bare directory holding a contract tree fails the stop paths", () => {
		const folder = copyFixture("clean");
		writeFileSync(path.join(folder, "spec.md"), ALL_FILES_SPEC);
		editPlan(folder, (text) =>
			text.replace("src/blocks/foo/schema.ts", "src/contracts")
		);

		assert.match(
			autoApprove({
				folder,
				check: true,
				today: TODAY,
				stopPaths: CONTRACT_STOP_PATHS,
			}).message,
			/T2 lists src\/contracts, a contract path \(src\/contracts\/\*\*\)/
		);
	});

	const DIRECTORY_ENTRIES: [string, RegExp][] = [
		["admin", /files failed: T2 lists admin, which is a directory, not a file/],
		[
			"admin/",
			/tasks failed: T2: files entry "admin\/" names a directory; list the files, not the directory/,
		],
		[".", /tasks failed: T2: files entry "\." names the repo root, not a file/],
		["nowhere/..", /files failed: T2 lists nowhere\/\.\., which is a directory/],
	];

	for (const [entry, pattern] of DIRECTORY_ENTRIES) {
		test(`a files entry "${entry}" naming a directory fails auto-approval`, () => {
			const folder = copyFixture("clean");
			mkdirSync(path.join(folder, "..", "admin"));
			writeFileSync(path.join(folder, "spec.md"), ALL_FILES_SPEC);
			editPlan(folder, (text) =>
				text.replace("src/blocks/foo/schema.ts", entry)
			);

			const result = autoApprove({ folder, check: true, today: TODAY });

			assert.equal(result.code, 1, result.message);
			assert.match(result.message, pattern);
		});
	}

	const CHALLENGE_FAILURES: [string, RegExp][] = [
		[
			"round 2: blocking 1\nround 1: clean\nround 1: clean",
			/repeats a round number/,
		],
		["round 1: clean\nround 3: clean", /holds rounds 1, 3, and rounds 1 and 2/],
		[
			"round 2: blocking 1\nround 1: clean",
			/the last round line reads "round 2: blocking 1"/,
		],
		[
			"round 1: clean\nround 2: clean\nround 3: carried 1",
			/"round 3: carried 1" carries findings before round 4/,
		],
		[
			"round 1: clean\nround 2: clean\nround 4: blocking 1",
			/the last round line reads "round 4: blocking 1"/,
		],
	];

	for (const [rounds, pattern] of CHALLENGE_FAILURES) {
		test(`challenge rounds ${JSON.stringify(rounds)} fail`, () => {
			const folder = copyFixture("clean");
			editPlan(folder, (text) =>
				text.replace("round 1: clean\nround 2: clean", rounds)
			);

			assert.match(
				autoApprove({ folder, check: true, today: TODAY }).message,
				pattern
			);
		});
	}

	test("challenge rounds are judged by the highest number, not file order", () => {
		const folder = copyFixture("clean");
		editPlan(folder, (text) =>
			text.replace(
				"round 1: clean\nround 2: clean",
				"round 2: clean\nround 1: blocking 1"
			)
		);

		assert.equal(autoApprove({ folder, check: true, today: TODAY }).code, 0);
	});
});

describe("usage errors exit 2", () => {
	test("no arguments is a usage error", () => {
		const child = run();

		assert.equal(child.status, 2);
		assert.equal(
			child.stderr,
			"Usage: auto-approve.mjs <plan-folder> [--check]\n"
		);
	});

	test("an unknown flag is a usage error", () => {
		assert.equal(run(copyFixture("clean"), "--force").status, 2);
	});

	test("two folders is a usage error", () => {
		assert.equal(run(copyFixture("clean"), copyFixture("clean")).status, 2);
	});

	test("a folder with no plan.md is a usage error", () => {
		const folder = copyFixture("clean");
		rmSync(path.join(folder, "plan.md"));

		const child = run(folder);

		assert.equal(child.status, 2);
		assert.match(child.stderr, /holds no plan\.md/);
	});
});
