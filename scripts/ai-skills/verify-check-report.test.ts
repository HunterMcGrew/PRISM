/**
 * Contract for `hooks/verify/check-report.mjs`: it rejects a `## Verification`
 * section whose rows, Failures lines, verdict, or head line disagree, and with
 * an expected list it also reports missed and false failures. Reports are
 * template strings built from the `typecheck`, `lint`, `test`, `build`, and
 * `format` checks.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkReport } from "./hooks/verify/check-report.mjs";
import type { Failure } from "./hooks/verify/check-report.mjs";

const SCRIPT = fileURLToPath(new URL("./hooks/verify/check-report.mjs", import.meta.url));

const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "check-report-"));

after(() => {
	fs.rmSync(scratchDir, { recursive: true, force: true });
});

type Row = [check: string, result: string, evidence?: string];

const PASSING: Row[] = [
	["typecheck", "pass", "exit 0"],
	["build", "pass", "exit 0"],
	["format", "pass", "exit 0"],
];
const LINT_FAIL: Row = ["lint", "fail", "1 error"];
const TEST_FAIL: Row = ["test", "fail", "1 failed"];
const LINT_LINE = "- lint: src/b.ts:7";
const TEST_LINE = "- test: src/a.test.ts:12";
const EXPECTED: Failure[] = [
	{ check: "lint", file: "src/b.ts" },
	{ check: "test", file: "src/a.test.ts" },
];

function plan(
	options: {
		verdict?: string;
		head?: string | null;
		blocked?: string[];
		rows?: Row[];
		failures?: string[];
	} = {}
): string {
	const { verdict = "done", head = "abc1234", blocked = [], rows = [], failures = [] } = options;
	const table = rows.map(([check, result, evidence = ""]) => `| ${check} | ${result} | ${evidence} |`);

	return [
		"# Plan",
		"",
		"## Verification",
		"",
		`verdict: ${verdict}`,
		...blocked,
		"base: 1234abc",
		...(head === null ? [] : [`head: ${head}`]),
		"",
		"| check | result | evidence |",
		"| --- | --- | --- |",
		...table,
		"",
		"### Failures",
		"",
		...(failures.length > 0 ? failures : ["- none"]),
		"",
		"## Review",
		"",
	].join("\n");
}

const EXACT = plan({
	rows: [...PASSING, LINT_FAIL, TEST_FAIL],
	failures: [LINT_LINE, TEST_LINE],
});

function runChecker(...args: string[]) {
	return spawnSync(process.execPath, [SCRIPT, ...args], {
		encoding: "utf8",
		env: cleanEnv(),
	});
}

/** Host markers that would change what a spawned process believes it runs in. */
function cleanEnv(): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env };
	for (const key of [
		"CLAUDECODE",
		"CLAUDE_CODE_SESSION_ID",
		"CODEX_THREAD_ID",
		"CODEX_SESSION_ID",
		"CODEX_CI",
		"PRISM_HOOK_DISABLE",
		"PRISM_HOOK_DENY_DISABLE",
	]) {
		delete env[key];
	}

	return env;
}

function writeScratch(name: string, text: string): string {
	const file = path.join(scratchDir, name);
	fs.writeFileSync(file, text);

	return file;
}

function runOn(planText: string, expected: Failure[] = EXPECTED) {
	const planFile = writeScratch("plan.md", planText);
	const expectedFile = writeScratch("expected.json", JSON.stringify({ failures: expected }));

	return runChecker(planFile, expectedFile);
}

function outputLines(child: { stdout: string }): string[] {
	return child.stdout.trim().split("\n");
}

describe("check-report.mjs against report sections", () => {
	test("an exact section matches and exits 0", () => {
		const child = runOn(EXACT);

		assert.equal(child.status, 0, child.stdout + child.stderr);
		assert.match(child.stdout, /all 2 expected failures reported/);
	});

	test("a section that leaves out an expected failure reports it missed", () => {
		const child = runOn(
			plan({ rows: [...PASSING, ["lint", "pass"], TEST_FAIL], failures: [TEST_LINE] })
		);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), ["missed: lint src/b.ts"]);
	});

	test("a section that adds a failure nobody expected reports it false", () => {
		const child = runOn(
			plan({
				rows: [["typecheck", "pass"], ["build", "fail"], LINT_FAIL, TEST_FAIL],
				failures: [LINT_LINE, TEST_LINE, "- build: src/c.ts:3"],
			})
		);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), ["false failure: build src/c.ts"]);
	});

	test("a blocked verdict reports its blocked line and the failure it hid", () => {
		const child = runOn(
			plan({
				verdict: "blocked",
				blocked: ["blocked: build: timed out after 600 seconds"],
				rows: [...PASSING, TEST_FAIL],
				failures: [TEST_LINE],
			})
		);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), [
			"verdict is blocked: blocked: build: timed out after 600 seconds",
			"missed: lint src/b.ts",
		]);
	});

	test("a plan with no Verification section reports it", () => {
		const child = runOn("# Plan\n\n## Review\n");

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), ["no Verification section"]);
	});

	test("a fail row with no Failures line is reported", () => {
		const child = runOn(
			plan({ rows: [...PASSING, LINT_FAIL, TEST_FAIL], failures: [LINT_LINE] }),
			[{ check: "lint", file: "src/b.ts" }]
		);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), ["fail row with no Failures line: test"]);
	});

	test("a Failures line whose row says pass is reported", () => {
		const child = runOn(
			plan({ rows: [...PASSING, LINT_FAIL, ["test", "pass"]], failures: [LINT_LINE, TEST_LINE] })
		);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), [
			"Failures line with no fail row: test src/a.test.ts",
		]);
	});

	test("a verdict other than done or blocked is reported", () => {
		const child = runOn(
			plan({ verdict: "passed", rows: [...PASSING, LINT_FAIL, TEST_FAIL], failures: [LINT_LINE, TEST_LINE] })
		);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), ["unknown verdict: passed"]);
	});

	test("a Failures line that doesn't parse is reported", () => {
		const child = runOn(
			plan({
				rows: [...PASSING, LINT_FAIL, TEST_FAIL],
				failures: [LINT_LINE, TEST_LINE, "- the lint run printed a warning"],
			})
		);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), [
			"unparseable Failures line: - the lint run printed a warning",
		]);
	});
});

describe("checkReport shape rules", () => {
	test("reads an unpadded table the same as a padded one", () => {
		const unpadded = EXACT.replace(/ *\| */g, "|");

		assert.notEqual(unpadded, EXACT);
		assert.deepEqual(checkReport(unpadded, EXPECTED), []);
	});

	test("reads the result cell of an unpadded fail row", () => {
		const text = plan({ rows: [...PASSING, TEST_FAIL] });
		const unpadded = text.replace(/ *\| */g, "|");

		assert.notEqual(unpadded, text);
		assert.deepEqual(checkReport(unpadded), ["fail row with no Failures line: test"]);
	});

	test("drops a row with no evidence cell, so its fail row has no match", () => {
		const text = plan({ rows: [...PASSING, TEST_FAIL], failures: [TEST_LINE] });
		const twoCells = text.replace("| test | fail | 1 failed |", "| test | fail |");

		assert.notEqual(twoCells, text);
		assert.deepEqual(checkReport(twoCells), ["Failures line with no fail row: test src/a.test.ts"]);
	});

	test("a section whose rows all lack an evidence cell reads as having no rows", () => {
		const text = plan({ rows: [["typecheck", "maybe"], ["build", "pass"]] });
		const twoCells = text.replace(/^\| (typecheck|build) \| (\w+) \| {2}\|$/gm, "| $1 | $2 |");

		assert.notEqual(twoCells, text);
		assert.deepEqual(checkReport(twoCells), []);
	});

	test("reports a section with no verdict line", () => {
		const text = "## Verification\n\nhead: abc1234\n\n### Failures\n\n- none\n";

		assert.deepEqual(checkReport(text, []), ["no verdict line"]);
	});

	test("stops the section at the next level-two heading", () => {
		const text = [
			"## Verification",
			"verdict: done",
			"head: abc1234",
			"## Review",
			"### Failures",
			"- test: src/a.test.ts",
		].join("\n");

		assert.deepEqual(checkReport(text, []), []);
	});

	test("a missing head line is a problem", () => {
		assert.deepEqual(checkReport(plan({ head: null, rows: PASSING })), ["no head line"]);
	});

	test("a capitalized table header is not read as a row", () => {
		const lowercase = plan({ rows: PASSING });
		const text = lowercase.replace("| check | result | evidence |", "| Check | Result | Evidence |");

		assert.notEqual(text, lowercase);
		assert.deepEqual(checkReport(text), []);
	});

	test("an n/a row with a reason passes", () => {
		const text = plan({ rows: [...PASSING, ["lint", "n/a: no source changed"]] });

		assert.deepEqual(checkReport(text), []);
	});

	test("an n/a row with no reason fails", () => {
		const text = plan({ rows: [...PASSING, ["lint", "n/a"]] });

		assert.deepEqual(checkReport(text), ["unknown result for lint: n/a"]);
	});

	test("a row whose result is skipped fails", () => {
		const text = plan({ rows: [...PASSING, ["lint", "skipped"]] });

		assert.deepEqual(checkReport(text), ["unknown result for lint: skipped"]);
	});

	test("with no expected list it checks shape only", () => {
		const text = plan({ rows: [...PASSING, LINT_FAIL], failures: [LINT_LINE] });

		assert.deepEqual(checkReport(text), []);
		assert.deepEqual(checkReport(text, []), ["false failure: lint src/b.ts"]);
	});
});

describe("check-report.mjs command line", () => {
	test("one argument checks shape only and exits 0 on a clean section", () => {
		const planFile = writeScratch("clean-plan.md", plan({ rows: PASSING }));
		const child = runChecker(planFile);

		assert.equal(child.status, 0, child.stdout + child.stderr);
		assert.match(child.stdout, /shape is sound/);
	});

	test("one argument exits 1 on a section whose rows and lines disagree", () => {
		const planFile = writeScratch("bad-plan.md", plan({ rows: [...PASSING, TEST_FAIL] }));
		const child = runChecker(planFile);

		assert.equal(child.status, 1);
		assert.deepEqual(outputLines(child), ["fail row with no Failures line: test"]);
	});

	test("exits 2 with no arguments or too many", () => {
		const none = runChecker();
		const many = runChecker("a.md", "b.json", "c");

		assert.equal(none.status, 2);
		assert.match(none.stderr, /^usage:/);
		assert.equal(many.status, 2);
	});

	test("exits 2 when expected.json is not JSON", () => {
		const planFile = writeScratch("plan-for-bad-json.md", EXACT);
		const badJson = writeScratch("bad.json", "{ not json");

		assert.equal(runChecker(planFile, badJson).status, 2);
	});

	test("exits 2 when expected.json has no failures array", () => {
		const planFile = writeScratch("plan-for-no-failures.md", EXACT);
		const noFailures = writeScratch("no-failures.json", JSON.stringify({ failure: [] }));

		assert.equal(runChecker(planFile, noFailures).status, 2);
	});

	test("exits 2 when the plan cannot be read", () => {
		assert.equal(runChecker(path.join(scratchDir, "missing.md")).status, 2);
	});

	test("runs when invoked through a symlink", (t) => {
		const link = path.join(scratchDir, "check-report-link.mjs");
		try {
			fs.symlinkSync(SCRIPT, link);
		} catch (error) {
			if (process.platform === "win32" && (error as NodeJS.ErrnoException).code === "EPERM") {
				t.skip("creating a symlink needs a privilege this Windows runner lacks");

				return;
			}

			throw error;
		}

		const child = spawnSync(process.execPath, [link], { encoding: "utf8", env: cleanEnv() });

		assert.equal(child.status, 2);
		assert.match(child.stderr, /^usage:/);
	});
});
