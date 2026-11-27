/**
 * Suite for `review/record.mjs`: the verdict a round's report earns, the one
 * line it appends under `## Review`, and the exits that write nothing.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { computeVerdict } from "./hooks/review/record.mjs";

const SCRIPT = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"hooks",
	"review",
	"record.mjs"
);

const SWEPT = { pass: "Correctness", token: "swept — 3 entry points" };

const PLAN_WITH_REVIEW = [
	"---",
	"status: approved",
	"---",
	"",
	"## Tasks",
	"",
	"## Review",
	"",
	"- pr-review round 1 at abc1234: clean",
	"",
	"## PR Readiness",
	"",
	"Retro:",
	"",
].join("\n");

function makeRepo(plan: string, config?: unknown) {
	const root = mkdtempSync(path.join(os.tmpdir(), "review-record-"));
	mkdirSync(path.join(root, ".git"));
	mkdirSync(path.join(root, ".prism", "plans", "x"), { recursive: true });

	if (config !== undefined) {
		mkdirSync(path.join(root, ".ai-skills"));
		writeFileSync(
			path.join(root, ".ai-skills", "config.json"),
			typeof config === "string" ? config : JSON.stringify(config)
		);
	}

	const planPath = path.join(root, ".prism", "plans", "x", "plan.md");
	writeFileSync(planPath, plan);

	return { root, planPath };
}

function runRecord(root: string, planPath: string, report: unknown) {
	const reportPath = path.join(root, "report.json");
	writeFileSync(
		reportPath,
		typeof report === "string" ? report : JSON.stringify(report)
	);

	return spawnSync(process.execPath, [SCRIPT, planPath, reportPath], {
		encoding: "utf8",
	});
}

function reportOf(overrides: Record<string, unknown> = {}) {
	return {
		round: 1,
		sha: "def5678",
		passes: [SWEPT],
		findings: [],
		...overrides,
	};
}

test("a round with no findings and every pass swept is clean", () => {
	assert.equal(computeVerdict(reportOf()), "clean");
});

test("a Major marked as a decision item leaves the round clean, and the same Major without the kind is counted", () => {
	const major = { severity: "major", file: "src/a.ts", line: 3, summary: "s" };

	assert.equal(
		computeVerdict(reportOf({ findings: [{ ...major, kind: "decision" }] })),
		"clean"
	);
	assert.equal(
		computeVerdict(reportOf({ findings: [major] })),
		"0 critical, 1 major, 0 minor, 0 nit"
	);
});

test("a bare swept token makes the round unclean", () => {
	assert.equal(
		computeVerdict(reportOf({ passes: [{ pass: "Correctness", token: "swept" }] })),
		"0 critical, 0 major, 0 minor, 0 nit"
	);
});

test("a swept or n/a token with nothing after its prefix makes the round unclean", () => {
	for (const token of ["swept — ", "swept —  ", "n/a: ", "n/a:  "]) {
		assert.equal(
			computeVerdict(reportOf({ passes: [{ pass: "Correctness", token }] })),
			"0 critical, 0 major, 0 minor, 0 nit",
			JSON.stringify(token)
		);
	}
});

test("an n/a pass with a reason keeps the round clean, and minors and nits alone do not block it", () => {
	assert.equal(
		computeVerdict(
			reportOf({
				passes: [SWEPT, { pass: "Security", token: "n/a: no input handling" }],
				findings: [
					{ severity: "minor", file: "a.ts" },
					{ severity: "nit", file: "b.ts" },
				],
			})
		),
		"clean"
	);
});

test("an unclean round counts each severity, leaving decision items out", () => {
	assert.equal(
		computeVerdict(
			reportOf({
				findings: [
					{ severity: "critical", file: "a.ts" },
					{ severity: "major", file: "a.ts" },
					{ severity: "major", file: "b.ts" },
					{ severity: "minor", file: "c.ts" },
					{ severity: "nit", file: "d.ts" },
					{ severity: "nit", file: "e.ts" },
					{ severity: "critical", file: "f.ts", kind: "decision" },
				],
			})
		),
		"1 critical, 2 major, 1 minor, 2 nit"
	);
});

test("the line follows an existing pr-review line under ## Review and nothing else changes", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW);

	try {
		const result = runRecord(root, planPath, reportOf());

		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			readFileSync(planPath, "utf8"),
			PLAN_WITH_REVIEW.replace(
				"- pr-review round 1 at abc1234: clean\n",
				"- pr-review round 1 at abc1234: clean\n- review round 1 at def5678: clean\n"
			)
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("an unclean round writes its counts, and a long sha is shortened to eight characters", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW);

	try {
		const result = runRecord(
			root,
			planPath,
			reportOf({
				round: 2,
				sha: "0123456789abcdef0123456789abcdef01234567",
				findings: [{ severity: "major", file: "src/a.ts", line: 9 }],
			})
		);

		assert.equal(result.status, 0, result.stderr);
		assert.match(
			readFileSync(planPath, "utf8"),
			/- review round 2 at 01234567: 0 critical, 1 major, 0 minor, 0 nit\n\n## PR Readiness/
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a part marker follows the sha", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW);

	try {
		const result = runRecord(root, planPath, reportOf({ part: { k: 1, m: 2 } }));

		assert.equal(result.status, 0, result.stderr);
		assert.match(
			readFileSync(planPath, "utf8"),
			/- review round 1 at def5678 \(part 1 of 2\): clean\n/
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a plan with no ## Review gets the heading at the end", () => {
	const plan = "---\nstatus: approved\n---\n\n## Tasks\n";
	const { root, planPath } = makeRepo(plan);

	try {
		const result = runRecord(root, planPath, reportOf());

		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			readFileSync(planPath, "utf8"),
			`${plan}\n## Review\n\n- review round 1 at def5678: clean\n`
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("## Review Issues is not mistaken for ## Review", () => {
	const plan = "## Review Issues\n\n- none\n";
	const { root, planPath } = makeRepo(plan);

	try {
		const result = runRecord(root, planPath, reportOf());

		assert.equal(result.status, 0, result.stderr);
		assert.equal(
			readFileSync(planPath, "utf8"),
			`${plan}\n## Review\n\n- review round 1 at def5678: clean\n`
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a finding on a never-reviewed path exits 1, names it, and leaves the plan byte-identical", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW);

	try {
		const result = runRecord(
			root,
			planPath,
			reportOf({
				findings: [
					{ severity: "minor", file: "src/ok.ts" },
					{ severity: "minor", file: ".prism/plans/x/plan.md", line: 12 },
				],
			})
		);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /\.prism\/plans\/x\/plan\.md:12/);
		assert.doesNotMatch(result.stderr, /src\/ok\.ts/);
		assert.equal(readFileSync(planPath, "utf8"), PLAN_WITH_REVIEW);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a sha with surrounding whitespace is trimmed and accepted", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW);

	try {
		const result = runRecord(root, planPath, reportOf({ sha: "  def5678\n" }));

		assert.equal(result.status, 0, result.stderr);
		assert.match(readFileSync(planPath, "utf8"), /- review round 1 at def5678: clean\n/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a never-reviewed path spelled absolute, with ./, with dot segments, or with backslashes still exits 1", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW);

	try {
		for (const file of [
			path.join(root, ".prism", "plans", "x", "plan.md"),
			"./.prism/lessons.md",
			"src/../REVIEW.md",
			".prism\\plans\\x\\plan.md",
		]) {
			const result = runRecord(
				root,
				planPath,
				reportOf({ findings: [{ severity: "minor", file }] })
			);

			assert.equal(result.status, 1, `${file}: ${result.stderr}`);
			assert.equal(readFileSync(planPath, "utf8"), PLAN_WITH_REVIEW, file);
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("a set reviewIgnore replaces the default", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW, {
		reviewIgnore: ["generated/**"],
	});

	try {
		const blocked = runRecord(
			root,
			planPath,
			reportOf({ findings: [{ severity: "minor", file: "generated/a.ts" }] })
		);
		assert.equal(blocked.status, 1);

		const allowed = runRecord(
			root,
			planPath,
			reportOf({ findings: [{ severity: "minor", file: "REVIEW.md" }] })
		);
		assert.equal(allowed.status, 0, allowed.stderr);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("malformed input exits 2 and writes nothing", () => {
	const cases: [string, unknown][] = [
		["round 3", reportOf({ round: 3 })],
		["round 0", reportOf({ round: 0 })],
		["missing sha", reportOf({ sha: undefined })],
		["passes not an array", reportOf({ passes: "swept" })],
		["findings not an array", reportOf({ findings: {} })],
		["pass without a token", reportOf({ passes: [{ pass: "Correctness" }] })],
		["finding without severity", reportOf({ findings: [{ file: "a.ts" }] })],
		["finding without file", reportOf({ findings: [{ severity: "minor" }] })],
		["unknown severity", reportOf({ findings: [{ severity: "Major", file: "a.ts" }] })],
		["part without integers", reportOf({ part: { k: "1", m: 2 } })],
		["empty passes", reportOf({ passes: [] })],
		["sha with non-hex characters", reportOf({ sha: "xyz1234" })],
		["sha shorter than seven", reportOf({ sha: "abc123" })],
		["sha longer than forty", reportOf({ sha: "0".repeat(41) })],
		["upper-case sha", reportOf({ sha: "DEF5678" })],
		["part k of 0", reportOf({ part: { k: 0, m: 2 } })],
		["part k above m", reportOf({ part: { k: 3, m: 2 } })],
		["part m of 1", reportOf({ part: { k: 1, m: 1 } })],
		["part with a fractional k", reportOf({ part: { k: 1.5, m: 2 } })],
		["not JSON", "{ round: 1"],
	];

	for (const [label, report] of cases) {
		const { root, planPath } = makeRepo(PLAN_WITH_REVIEW);

		try {
			const result = runRecord(root, planPath, report);

			assert.equal(result.status, 2, `${label}: ${result.stderr}`);
			assert.equal(readFileSync(planPath, "utf8"), PLAN_WITH_REVIEW, label);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}
});

test("a malformed config, a missing argument, and an unreadable report exit 2", () => {
	const { root, planPath } = makeRepo(PLAN_WITH_REVIEW, { reviewIgnore: "x/**" });

	try {
		assert.equal(runRecord(root, planPath, reportOf()).status, 2);

		const unparsable = makeRepo(PLAN_WITH_REVIEW, "{ not json");
		try {
			assert.equal(
				runRecord(unparsable.root, unparsable.planPath, reportOf()).status,
				2
			);
		} finally {
			rmSync(unparsable.root, { recursive: true, force: true });
		}

		const noReport = spawnSync(process.execPath, [SCRIPT, planPath], {
			encoding: "utf8",
		});
		assert.equal(noReport.status, 2);

		const missingFile = spawnSync(
			process.execPath,
			[SCRIPT, planPath, path.join(root, "absent.json")],
			{ encoding: "utf8" }
		);
		assert.equal(missingFile.status, 2);
		assert.equal(readFileSync(planPath, "utf8"), PLAN_WITH_REVIEW);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
