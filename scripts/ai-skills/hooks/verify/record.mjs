// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Writes a plan's `## Verification` section from a verify run's report.
 *
 * Usage: node <hook-runtime>/verify/record.mjs <plan.md> <report.json>
 *
 * It replaces the lines between the `## Verification` heading and the next
 * `## ` heading, or adds the heading at the end of a plan with none, and
 * touches no other byte. The section is composed in the shape
 * `check-report.mjs` parses and checked with its `checkReport` before the
 * write, so the writer cannot drift from the reader. Exits 0 when written,
 * and 2 writing nothing on a usage error, an unreadable file, invalid JSON, a
 * shape error, or a `checkReport` problem other than `verdict is blocked:`.
 * A `blocked` report is written, and `check-report.mjs` is what fails it.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { checkReport } from "./check-report.mjs";

const SHA_PATTERN = /^[0-9a-f]{7,40}$/;

const VERDICTS = ["done", "blocked"];

const HEADING = "## Verification";

const BLOCKED_PROBLEM_PREFIX = "verdict is blocked:";

/**
 * @typedef {{ check: string, why: string }} BlockedEntry
 * @typedef {{ check: string, result: string, evidence: string }} VerifyRow
 * @typedef {{ check: string, file: string, line?: number }} VerifyFailure
 * @typedef {{
 *   verdict: "done" | "blocked",
 *   base: string,
 *   head: string,
 *   blocked: BlockedEntry[],
 *   rows: VerifyRow[],
 *   failures: VerifyFailure[],
 * }} VerifyReport
 */

/** Raised for a report that does not hold the shape `prism-verify` writes. */
export class ReportShapeError extends Error {}

/**
 * Checks a parsed report against the shape and returns it typed, with `base`
 * and `head` trimmed.
 *
 * A cell holding `|` or a line break is rejected, because either would break
 * the table row or the line `check-report.mjs` reads it from.
 *
 * @param {unknown} value
 * @returns {VerifyReport}
 */
export function validateVerifyReport(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new ReportShapeError("the report is not a JSON object.");
	}

	const report = /** @type {Record<string, unknown>} */ (value);

	if (typeof report.verdict !== "string" || !VERDICTS.includes(report.verdict)) {
		throw new ReportShapeError(
			`verdict is ${JSON.stringify(report.verdict)}; it must be "done" or "blocked".`
		);
	}

	const base = requireSha(report.base, "base");
	const head = requireSha(report.head, "head");

	if (!Array.isArray(report.rows)) {
		throw new ReportShapeError("rows is not an array.");
	}

	if (report.rows.length === 0) {
		throw new ReportShapeError("rows is empty; a run names every check it ran.");
	}

	for (const row of report.rows) {
		requireObject(row, "row");
		requireCell(row.check, "row check", { noWhitespace: true });
		requireCell(row.result, `row ${row.check} result`);
		requireCell(row.evidence, `row ${row.check} evidence`);
	}

	if (!Array.isArray(report.blocked)) {
		throw new ReportShapeError("blocked is not an array.");
	}

	for (const entry of report.blocked) {
		requireObject(entry, "blocked entry");
		requireCell(entry.check, "blocked check");
		requireCell(entry.why, `blocked ${entry.check} why`);
	}

	if (!Array.isArray(report.failures)) {
		throw new ReportShapeError("failures is not an array.");
	}

	for (const failure of report.failures) {
		requireObject(failure, "failure");
		requireCell(failure.check, "failure check", { noWhitespace: true });
		requireCell(failure.file, `failure ${failure.check} file`, { noWhitespace: true });

		if (
			failure.line !== undefined &&
			(!Number.isSafeInteger(failure.line) || /** @type {number} */ (failure.line) < 1)
		) {
			throw new ReportShapeError(
				`failure ${failure.check} line is ${JSON.stringify(failure.line)}; it must be a positive integer.`
			);
		}
	}

	if ((report.verdict === "blocked") !== (report.blocked.length > 0)) {
		throw new ReportShapeError(
			report.verdict === "blocked"
				? "verdict is blocked but blocked is empty; name each check that could not run."
				: "verdict is done but blocked has entries; a run with a blocked check is blocked."
		);
	}

	return /** @type {VerifyReport} */ ({ ...report, base, head });
}

/**
 * The section's lines after the heading, in the shape `check-report.mjs`
 * parses.
 *
 * @param {VerifyReport} report
 * @returns {string[]}
 */
export function composeVerificationSection(report) {
	const failureLines =
		report.failures.length === 0
			? ["- none"]
			: report.failures.map(
					(failure) =>
						`- ${failure.check}: ${failure.file}${failure.line === undefined ? "" : `:${failure.line}`}`
				);

	return [
		"",
		`verdict: ${report.verdict}`,
		`base: ${report.base}`,
		`head: ${report.head}`,
		...report.blocked.map((entry) => `blocked: ${entry.check}: ${entry.why}`),
		"",
		"| check | result | evidence |",
		"| --- | --- | --- |",
		...report.rows.map((row) => `| ${row.check} | ${row.result} | ${row.evidence} |`),
		"",
		"### Failures",
		"",
		...failureLines,
	];
}

/**
 * The plan text with the `## Verification` section's body replaced by
 * `sectionLines`, or with the heading and section appended when the plan has
 * none. Every byte outside the section is unchanged.
 *
 * @param {string} planText
 * @param {string[]} sectionLines
 * @returns {string}
 */
export function replaceVerificationSection(planText, sectionLines) {
	const lines = planText.split("\n");
	const heading = lines.findIndex((line) => line.trimEnd() === HEADING);

	if (heading === -1) {
		return `${planText.replace(/\n+$/, "")}\n\n${HEADING}\n${sectionLines.join("\n")}\n`;
	}

	const next = lines.findIndex(
		(line, index) => index > heading && line.startsWith("## ")
	);

	if (next === -1) {
		return `${[...lines.slice(0, heading + 1), ...sectionLines].join("\n")}\n`;
	}

	return [
		...lines.slice(0, heading + 1),
		...sectionLines,
		"",
		...lines.slice(next),
	].join("\n");
}

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {string}
 */
function requireSha(value, field) {
	if (typeof value !== "string" || !SHA_PATTERN.test(value.trim())) {
		throw new ReportShapeError(
			`${field} is ${JSON.stringify(value)}; it must be 7 to 40 lower-case hex characters.`
		);
	}

	return value.trim();
}

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {asserts value is Record<string, unknown>}
 */
function requireObject(value, field) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new ReportShapeError(`${field} ${JSON.stringify(value)} is not an object.`);
	}
}

/**
 * @param {unknown} value
 * @param {string} field
 * @param {{ noWhitespace?: boolean }} [options]
 */
function requireCell(value, field, { noWhitespace = false } = {}) {
	if (typeof value !== "string" || value.trim() === "") {
		throw new ReportShapeError(`${field} is ${JSON.stringify(value)}; it must be a non-empty string.`);
	}

	if (/[|\n\r]/.test(value)) {
		throw new ReportShapeError(`${field} ${JSON.stringify(value)} holds a | or a line break.`);
	}

	if (noWhitespace && /\s/.test(value)) {
		throw new ReportShapeError(`${field} ${JSON.stringify(value)} holds whitespace.`);
	}
}

/** @param {string[]} args */
function runCli(args) {
	if (args.length !== 2) {
		process.stderr.write(
			"usage: node <hook-runtime>/verify/record.mjs <plan.md> <report.json>\n"
		);
		process.exitCode = 2;
		return;
	}

	const [planPath, reportPath] = /** @type {[string, string]} */ (args);
	/** @type {string} */
	let planText;
	/** @type {VerifyReport} */
	let report;

	try {
		planText = readFileSync(planPath, "utf8");
		report = validateVerifyReport(JSON.parse(readFileSync(reportPath, "utf8")));
	} catch (error) {
		process.stderr.write(
			`record: ${(error instanceof Error ? error.message : String(error)).trim()}\n`
		);
		process.exitCode = 2;
		return;
	}

	const newText = replaceVerificationSection(planText, composeVerificationSection(report));
	const problems = checkReport(newText).filter(
		(problem) => !problem.startsWith(BLOCKED_PROBLEM_PREFIX)
	);

	if (problems.length > 0) {
		for (const problem of problems) {
			process.stderr.write(`record: ${problem}\n`);
		}
		process.exitCode = 2;
		return;
	}

	writeFileSync(planPath, newText);
	process.stdout.write(`record: wrote ${HEADING} (${report.verdict})\n`);
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) runCli(process.argv.slice(2));
