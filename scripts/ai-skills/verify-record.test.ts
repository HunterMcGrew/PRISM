/**
 * Suite for `verify/record.mjs`: the `## Verification` section it writes from
 * a verify run's report, the bytes it leaves alone, and the exits that write
 * nothing.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HOOK_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"hooks",
	"verify"
);

const SCRIPT = path.join(HOOK_DIR, "record.mjs");

const CHECK_REPORT = path.join(HOOK_DIR, "check-report.mjs");

const BEFORE_SECTION = "---\nstatus: approved\n---\n\n## Tasks\n\n";

const AFTER_SECTION = "## Review\n\n- review round 1 at abc12345: clean\n";

const PLAN_WITH_SECTION = `${BEFORE_SECTION}## Verification\n\nold line\n\n${AFTER_SECTION}`;

const PLAN_WITHOUT_SECTION = `${BEFORE_SECTION}${AFTER_SECTION}`;

const DONE_REPORT = {
	verdict: "done",
	base: "8c53b07a",
	head: "1a2b3c4d",
	blocked: [],
	rows: [
		{ check: "typecheck", result: "fail", evidence: "/tmp/verify/typecheck.log" },
		{ check: "lint", result: "pass", evidence: "/tmp/verify/lint.log" },
	],
	failures: [{ check: "typecheck", file: "scripts/lib/parse.ts", line: 42 }],
};

const DONE_SECTION = [
	"",
	"verdict: done",
	"base: 8c53b07a",
	"head: 1a2b3c4d",
	"",
	"| check | result | evidence |",
	"| --- | --- | --- |",
	"| typecheck | fail | /tmp/verify/typecheck.log |",
	"| lint | pass | /tmp/verify/lint.log |",
	"",
	"### Failures",
	"",
	"- typecheck: scripts/lib/parse.ts:42",
].join("\n");

function makeScratch(plan: string, report: unknown) {
	const dir = mkdtempSync(path.join(os.tmpdir(), "verify-record-"));
	const planPath = path.join(dir, "plan.md");
	const reportPath = path.join(dir, "report.json");

	writeFileSync(planPath, plan);
	writeFileSync(
		reportPath,
		typeof report === "string" ? report : JSON.stringify(report)
	);

	return { dir, planPath, reportPath };
}

function run(script: string, args: string[]) {
	return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

test("writes a done report that check-report passes", () => {
	const { planPath, reportPath } = makeScratch(PLAN_WITH_SECTION, DONE_REPORT);

	const result = run(SCRIPT, [planPath, reportPath]);

	assert.equal(result.status, 0, result.stderr);
	assert.equal(
		readFileSync(planPath, "utf8"),
		`${BEFORE_SECTION}## Verification\n${DONE_SECTION}\n\n${AFTER_SECTION}`
	);
	assert.equal(run(CHECK_REPORT, [planPath]).status, 0);
});

test("writes a blocked report that check-report fails only on its blocked lines", () => {
	const { planPath, reportPath } = makeScratch(PLAN_WITH_SECTION, {
		verdict: "blocked",
		base: "8c53b07a",
		head: "1a2b3c4d",
		blocked: [{ check: "lint", why: "the linter needs network access" }],
		rows: [
			{ check: "typecheck", result: "pass", evidence: "/tmp/verify/typecheck.log" },
			{ check: "lint", result: "n/a: blocked", evidence: "/tmp/verify/lint.log" },
		],
		failures: [],
	});

	const result = run(SCRIPT, [planPath, reportPath]);

	assert.equal(result.status, 0, result.stderr);
	assert.match(
		readFileSync(planPath, "utf8"),
		/\nblocked: lint: the linter needs network access\n/
	);

	const check = run(CHECK_REPORT, [planPath]);
	const lines = check.stdout.split("\n").filter((line) => line !== "");

	assert.equal(check.status, 1);
	assert.ok(lines.length > 0);
	for (const line of lines) {
		assert.ok(line.startsWith("verdict is blocked: "), line);
	}
});

test("adds the heading at the end of a plan with none", () => {
	const { planPath, reportPath } = makeScratch(PLAN_WITHOUT_SECTION, DONE_REPORT);

	const result = run(SCRIPT, [planPath, reportPath]);

	assert.equal(result.status, 0, result.stderr);
	assert.equal(
		readFileSync(planPath, "utf8"),
		`${PLAN_WITHOUT_SECTION.trimEnd()}\n\n## Verification\n${DONE_SECTION}\n`
	);
});

test("writes - none when there are no failures, and trims base and head", () => {
	const { planPath, reportPath } = makeScratch(PLAN_WITH_SECTION, {
		...DONE_REPORT,
		base: " 8c53b07a ",
		head: "1a2b3c4d\n",
		rows: [{ check: "lint", result: "pass", evidence: "/tmp/verify/lint.log" }],
		failures: [],
	});

	const result = run(SCRIPT, [planPath, reportPath]);
	const text = readFileSync(planPath, "utf8");

	assert.equal(result.status, 0, result.stderr);
	assert.match(text, /\nbase: 8c53b07a\nhead: 1a2b3c4d\n/);
	assert.match(text, /### Failures\n\n- none\n\n## Review/);
	assert.equal(run(CHECK_REPORT, [planPath]).status, 0);
});

test("rejects a malformed report with exit 2 and writes nothing", () => {
	const row = (overrides: object) => ({
		...DONE_REPORT,
		rows: [{ check: "lint", result: "pass", evidence: "/tmp/l.log", ...overrides }],
		failures: [],
	});
	const failure = (overrides: object) => ({
		...DONE_REPORT,
		failures: [{ check: "typecheck", file: "a.ts", ...overrides }],
	});
	const { base: _base, ...withoutBase } = DONE_REPORT;

	const cases: [string, unknown][] = [
		["invalid JSON", "{ not json"],
		["base missing", withoutBase],
		["base not hex", { ...DONE_REPORT, base: "xyz" }],
		["rows empty", { ...DONE_REPORT, rows: [], failures: [] }],
		["rows not an array", { ...DONE_REPORT, rows: "typecheck" }],
		["result passed", row({ result: "passed" })],
		["cell holding a pipe", row({ evidence: "a | b" })],
		["cell holding a newline", row({ evidence: "a\nb" })],
		["whitespace-only check", row({ check: "   " })],
		["check named like the header", row({ check: "Check" })],
		["check named like a separator", row({ check: "---" })],
		["check named like an aligned separator", row({ check: ":-:" })],
		["failure file holding a space", failure({ file: "a b.ts" })],
		["line 0", failure({ line: 0 })],
		["line 1.5", failure({ line: 1.5 })],
		["failure with no fail row", failure({ check: "lint" })],
		["blocked verdict with no blocked entries", { ...DONE_REPORT, verdict: "blocked" }],
		[
			"done verdict with a blocked entry",
			{ ...DONE_REPORT, blocked: [{ check: "lint", why: "offline" }] },
		],
		["unknown verdict", { ...DONE_REPORT, verdict: "maybe" }],
	];

	for (const [name, report] of cases) {
		const { planPath, reportPath } = makeScratch(PLAN_WITH_SECTION, report);

		const result = run(SCRIPT, [planPath, reportPath]);

		assert.equal(result.status, 2, `${name}: ${result.stderr}`);
		assert.match(result.stderr, /record:/, name);
		assert.equal(readFileSync(planPath, "utf8"), PLAN_WITH_SECTION, name);
	}
});

test("a missing argument, an unreadable plan, and an unreadable report exit 2", () => {
	const { dir, planPath, reportPath } = makeScratch(PLAN_WITH_SECTION, DONE_REPORT);
	const missing = path.join(dir, "missing");

	assert.equal(run(SCRIPT, []).status, 2);
	assert.equal(run(SCRIPT, [planPath]).status, 2);
	assert.equal(run(SCRIPT, [missing, reportPath]).status, 2);
	assert.equal(run(SCRIPT, [planPath, missing]).status, 2);
	assert.equal(readFileSync(planPath, "utf8"), PLAN_WITH_SECTION);
});

test("an unwritable plan exits 2 naming the plan", { skip: process.getuid?.() === 0 }, () => {
	const { planPath, reportPath } = makeScratch(PLAN_WITH_SECTION, DONE_REPORT);

	chmodSync(planPath, 0o444);

	const result = run(SCRIPT, [planPath, reportPath]);

	chmodSync(planPath, 0o644);
	assert.equal(result.status, 2, result.stderr);
	assert.ok(result.stderr.includes(planPath), result.stderr);
	assert.equal(readFileSync(planPath, "utf8"), PLAN_WITH_SECTION);
});

test("a second run on a plan ending in its Verification section writes the same bytes", () => {
	const { planPath, reportPath } = makeScratch(
		`${BEFORE_SECTION}## Verification\n\nold line\n`,
		DONE_REPORT
	);

	assert.equal(run(SCRIPT, [planPath, reportPath]).status, 0);
	const first = readFileSync(planPath, "utf8");

	assert.equal(run(SCRIPT, [planPath, reportPath]).status, 0);
	const second = readFileSync(planPath, "utf8");

	assert.equal(second, first);
	assert.equal(second, `${BEFORE_SECTION}## Verification\n${DONE_SECTION}\n`);
	assert.equal(second.match(/^## Verification$/gm)?.length, 1);
	assert.equal(run(CHECK_REPORT, [planPath]).status, 0);
});

test("writes a failure with no line as check and file alone", () => {
	const { planPath, reportPath } = makeScratch(PLAN_WITH_SECTION, {
		...DONE_REPORT,
		failures: [{ check: "typecheck", file: "a.ts" }],
	});

	assert.equal(run(SCRIPT, [planPath, reportPath]).status, 0);
	assert.ok(readFileSync(planPath, "utf8").includes("\n- typecheck: a.ts\n"));
	assert.equal(run(CHECK_REPORT, [planPath]).status, 0);
});
