/**
 * Suite for `review/lines.mjs`: every record line under `## Review` read as
 * `{ kind, round, sha, part, verdict }`, and agreement with the line
 * `review/record.mjs` writes.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { readReviewLines } from "./hooks/review/lines.mjs";

const RECORD_SCRIPT = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"hooks",
	"review",
	"record.mjs"
);

function planWithReview(lines: string[]): string {
	return [
		"---",
		"status: approved",
		"---",
		"",
		"## Tasks",
		"",
		"## Review",
		"",
		...lines,
		"",
		"## PR Readiness",
		"",
		"Retro:",
		"",
	].join("\n");
}

test("reads review, self-review, and pr-review round lines in file order", () => {
	const text = planWithReview([
		"- review round 1 at abc12345: 0 critical, 2 major, 1 minor, 0 nit",
		"- self-review round 2 at def67890: clean",
		"- pr-review round 3 at 0123abcd: clean, 1 decision",
	]);

	assert.deepEqual(
		readReviewLines(text).map(({ line: _line, ...rest }) => rest),
		[
			{
				kind: "round",
				round: 1,
				sha: "abc12345",
				part: null,
				verdict: "0 critical, 2 major, 1 minor, 0 nit",
			},
			{ kind: "round", round: 2, sha: "def67890", part: null, verdict: "clean" },
			{
				kind: "round",
				round: 3,
				sha: "0123abcd",
				part: null,
				verdict: "clean, 1 decision",
			},
		]
	);
});

test("reads a confirm line with a null round", () => {
	const [entry] = readReviewLines(planWithReview(["- pr-review confirm at abc12345: clean"]));

	assert.equal(entry?.kind, "confirm");
	assert.equal(entry?.round, null);
	assert.equal(entry?.sha, "abc12345");
	assert.equal(entry?.verdict, "clean");
});

test("reads the part marker on round and confirm lines", () => {
	const entries = readReviewLines(
		planWithReview([
			"- review round 2 at abc12345 (part 1 of 2): clean",
			"- pr-review confirm at def67890 (part 2 of 2): clean",
		])
	);

	assert.deepEqual(entries[0]?.part, { k: 1, m: 2 });
	assert.equal(entries[0]?.sha, "abc12345");
	assert.deepEqual(entries[1]?.part, { k: 2, m: 2 });
	assert.equal(entries[1]?.kind, "confirm");
});

test("carries the line text without its leading dash", () => {
	const [entry] = readReviewLines(planWithReview(["- review round 1 at abc12345: clean"]));

	assert.equal(entry?.line, "review round 1 at abc12345: clean");
});

test("skips lines that are not record lines", () => {
	const entries = readReviewLines(
		planWithReview([
			"Some prose about the review.",
			"- review round one at abc12345: clean",
			"- a note",
			"- review round 1 at abc12345: clean",
		])
	);

	assert.equal(entries.length, 1);
	assert.equal(entries[0]?.round, 1);
});

test("ignores record-shaped lines outside ## Review, including ## Review Issues", () => {
	const text = [
		"## Review Issues",
		"",
		"- review round 9 at aaaaaaaa: clean",
		"",
		"## Review",
		"",
		"- review round 1 at bbbbbbbb: clean",
		"",
		"## Notes",
		"",
		"- review round 7 at cccccccc: clean",
		"",
	].join("\n");

	assert.deepEqual(
		readReviewLines(text).map((entry) => entry.round),
		[1]
	);
});

test("reads lines inside an HTML comment as nothing", () => {
	const text = planWithReview(["<!-- - review round 1 at abc12345: clean -->"]);

	assert.deepEqual(readReviewLines(text), []);
});

test("returns an empty list for a plan with no ## Review", () => {
	assert.deepEqual(readReviewLines("## Tasks\n\n### T1: x\n"), []);
});

test("reads CRLF line endings the same as LF", () => {
	const text = planWithReview(["- review round 1 at abc12345 (part 1 of 3): clean"]).replace(
		/\n/g,
		"\r\n"
	);
	const [entry] = readReviewLines(text);

	assert.equal(entry?.verdict, "clean");
	assert.deepEqual(entry?.part, { k: 1, m: 3 });
});

test("parses back the round, sha, part, and verdict record.mjs just wrote", () => {
	const root = mkdtempSync(path.join(os.tmpdir(), "review-lines-"));

	try {
		mkdirSync(path.join(root, ".git"));
		mkdirSync(path.join(root, ".prism", "plans", "x"), { recursive: true });
		const planPath = path.join(root, ".prism", "plans", "x", "plan.md");
		const reportPath = path.join(root, "report.json");
		writeFileSync(planPath, planWithReview([]));
		writeFileSync(
			reportPath,
			JSON.stringify({
				round: 2,
				sha: "0123456789abcdef0123456789abcdef01234567",
				part: { k: 1, m: 2 },
				passes: [{ pass: "Correctness", token: "swept — 3 entry points" }],
				findings: [{ severity: "major", file: "src/a.ts", line: 4 }],
			})
		);

		const result = spawnSync(process.execPath, [RECORD_SCRIPT, planPath, reportPath], {
			encoding: "utf8",
		});
		assert.equal(result.status, 0, result.stderr);

		const entries = readReviewLines(readFileSync(planPath, "utf8"));

		assert.equal(entries.length, 1);
		assert.equal(entries[0]?.kind, "round");
		assert.equal(entries[0]?.round, 2);
		assert.equal(entries[0]?.sha, "01234567");
		assert.deepEqual(entries[0]?.part, { k: 1, m: 2 });
		assert.equal(entries[0]?.verdict, "0 critical, 1 major, 0 minor, 0 nit");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
