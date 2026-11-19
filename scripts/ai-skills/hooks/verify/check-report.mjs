// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Checks the `## Verification` section a verify run wrote into a plan.
 *
 * Usage: node <hook-runtime>/verify/check-report.mjs <plan.md> [<expected.json>]
 *
 * The section opens with `verdict: done` or `verdict: blocked` and carries a
 * `head:` line. Its table rows are `| <check> | <result> | <evidence> |`,
 * where `<result>` is `pass`, `fail`, or `n/a: <reason>`, and each failing
 * check has a line `- <check>: <path>[:<line>]` under `### Failures`, or the
 * section says `- none`.
 *
 * With one argument it checks the shape alone: the verdict, the head line, one
 * Failures line for every `fail` row and the reverse, and a valid result on
 * every row. With an expected file, `{ "failures": [{ "check", "file" }] }`, it
 * also compares the reported failures against that list. Exits 0 when clean, 1
 * with one line per problem otherwise, and 2 on a usage error or an unreadable
 * input.
 */
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const FAILURE_LINE = /^-\s+(\S+):\s+(\S+?)(?::\d+)*\s*$/;
const NOT_APPLICABLE = /^n\/a:\s*\S/;
const VERDICTS = new Set(["done", "blocked"]);

/**
 * @typedef {{ check: string, file: string }} Failure
 * @typedef {{ check: string, result: string }} Row
 * @typedef {{
 *   verdict: string | null,
 *   head: string | null,
 *   blockedLines: string[],
 *   rows: Row[],
 *   failures: Failure[],
 *   badFailureLines: string[],
 * }} Report
 */

/**
 * Returns one problem string per problem in a plan's Verification section, or
 * an empty array when it is clean. With `expectedFailures`, a failure the
 * section lacks is `missed` and one it adds is a `false failure`. With null,
 * only the shape is checked.
 *
 * @param {string} planText
 * @param {Failure[] | null} [expectedFailures]
 * @returns {string[]}
 */
export function checkReport(planText, expectedFailures = null) {
	const section = extractVerificationSection(planText);

	if (section === null) {
		return ["no Verification section"];
	}

	const report = parseSection(section);
	/** @type {string[]} */
	const problems = [];

	if (report.verdict === null) {
		problems.push("no verdict line");
	} else if (!VERDICTS.has(report.verdict)) {
		problems.push(`unknown verdict: ${report.verdict}`);
	} else if (report.verdict === "blocked") {
		const blockedLines =
			report.blockedLines.length > 0 ? report.blockedLines : ["(none given)"];

		for (const line of blockedLines) {
			problems.push(`verdict is blocked: ${line}`);
		}
	}

	if (report.head === null || report.head === "") {
		problems.push("no head line");
	}

	for (const row of report.rows) {
		if (!isValidResult(row.result)) {
			problems.push(`unknown result for ${row.check}: ${row.result}`);
		}
	}

	if (expectedFailures !== null) {
		const reported = new Set(report.failures.map(failureKey));
		const expected = new Set(expectedFailures.map(failureKey));

		for (const failure of expectedFailures) {
			if (!reported.has(failureKey(failure))) {
				problems.push(`missed: ${describeFailure(failure)}`);
			}
		}

		for (const failure of report.failures) {
			if (!expected.has(failureKey(failure))) {
				problems.push(`false failure: ${describeFailure(failure)}`);
			}
		}
	}

	for (const line of report.badFailureLines) {
		problems.push(`unparseable Failures line: ${line}`);
	}

	for (const failure of report.failures) {
		const hasRow = report.rows.some(
			(row) => row.result === "fail" && row.check === failure.check
		);

		if (!hasRow) {
			problems.push(
				`Failures line with no fail row: ${describeFailure(failure)}`
			);
		}
	}

	for (const row of report.rows) {
		const hasLine = report.failures.some(
			(failure) => failure.check === row.check
		);

		if (row.result === "fail" && !hasLine) {
			problems.push(`fail row with no Failures line: ${row.check}`);
		}
	}

	return problems;
}

/**
 * Returns the lines between the `## Verification` heading and the next `## `
 * heading, or null when the plan has no such heading.
 *
 * @param {string} planText
 * @returns {string[] | null}
 */
export function extractVerificationSection(planText) {
	const lines = planText.split(/\r?\n/);
	const start = lines.findIndex((line) => line.trimEnd() === "## Verification");

	if (start === -1) {
		return null;
	}

	const rest = lines.slice(start + 1);
	const end = rest.findIndex((line) => line.startsWith("## "));

	return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Reads the verdict, the head, the `blocked:` lines, the table rows, and the
 * Failures lines out of a Verification section's lines. A Failures line that
 * is neither a failure nor `- none` lands in `badFailureLines`.
 *
 * @param {string[]} sectionLines
 * @returns {Report}
 */
export function parseSection(sectionLines) {
	/** @type {Report} */
	const report = {
		verdict: null,
		head: null,
		blockedLines: [],
		rows: [],
		failures: [],
		badFailureLines: [],
	};
	let inFailures = false;

	for (const rawLine of sectionLines) {
		const line = rawLine.trim();

		if (line.startsWith("### ")) {
			inFailures = line === "### Failures";
			continue;
		}

		if (line.startsWith("verdict:")) {
			report.verdict = line.slice("verdict:".length).trim();
		} else if (line.startsWith("head:")) {
			report.head = line.slice("head:".length).trim();
		} else if (line.startsWith("blocked:")) {
			report.blockedLines.push(line);
		} else if (line.startsWith("|")) {
			const row = parseTableRow(line);

			if (row !== null) {
				report.rows.push(row);
			}
		} else if (inFailures) {
			const match = FAILURE_LINE.exec(line);

			if (match) {
				report.failures.push({
					check: /** @type {string} */ (match[1]),
					file: /** @type {string} */ (match[2]),
				});
			} else if (line !== "" && line !== "- none") {
				report.badFailureLines.push(line);
			}
		}
	}

	return report;
}

/**
 * Splits a table row on `|` and trims each cell, so padded and unpadded tables
 * read the same. Returns null for the header and separator rows, and for a
 * row with fewer than three cells, so a row missing its evidence cell is
 * dropped rather than counted.
 *
 * @param {string} line
 * @returns {Row | null}
 */
function parseTableRow(line) {
	const cells = line.split("|").map((cell) => cell.trim());

	if (cells[0] === "") {
		cells.shift();
	}

	if (cells.at(-1) === "") {
		cells.pop();
	}

	const [check, result, evidence] = cells;

	if (
		check === undefined ||
		result === undefined ||
		evidence === undefined ||
		check.toLowerCase() === "check" ||
		/^:?-+:?$/.test(check)
	) {
		return null;
	}

	return { check, result };
}

/**
 * @param {string} result
 * @returns {boolean}
 */
function isValidResult(result) {
	return result === "pass" || result === "fail" || NOT_APPLICABLE.test(result);
}

/**
 * @param {Failure} failure
 * @returns {string}
 */
function failureKey(failure) {
	return `${failure.check}\u0000${failure.file}`;
}

/**
 * @param {Failure} failure
 * @returns {string}
 */
function describeFailure(failure) {
	return `${failure.check} ${failure.file}`;
}

/**
 * Reads expected.json and returns its failures, throwing when the file is
 * unreadable or any entry lacks a string `check` or `file`.
 *
 * @param {string} expectedPath
 * @returns {Failure[]}
 */
function loadExpected(expectedPath) {
	const parsed = JSON.parse(readFileSync(expectedPath, "utf8"));

	if (!Array.isArray(parsed?.failures)) {
		throw new Error("expected a top-level failures array");
	}

	for (const failure of parsed.failures) {
		const isValid = ["check", "file"].every(
			(key) => typeof failure?.[key] === "string"
		);

		if (!isValid) {
			throw new Error("each failure needs string check and file fields");
		}
	}

	return parsed.failures;
}

/** @param {string[]} args */
function runCli(args) {
	if (args.length !== 1 && args.length !== 2) {
		process.stderr.write(
			"usage: node <hook-runtime>/verify/check-report.mjs <plan.md> [<expected.json>]\n"
		);
		process.exitCode = 2;
		return;
	}

	const [planPath, expectedPath] = /** @type {[string, string?]} */ (args);
	/** @type {string} */
	let planText;
	/** @type {Failure[] | null} */
	let expectedFailures = null;

	try {
		planText = readFileSync(planPath, "utf8");
		if (expectedPath !== undefined) {
			expectedFailures = loadExpected(expectedPath);
		}
	} catch (error) {
		process.stderr.write(
			`check-report: ${error instanceof Error ? error.message : String(error)}\n`
		);
		process.exitCode = 2;
		return;
	}

	const problems = checkReport(planText, expectedFailures);

	if (problems.length === 0) {
		process.stdout.write(
			expectedFailures === null
				? "check-report: the section's shape is sound\n"
				: `check-report: all ${expectedFailures.length} expected failures reported, no others\n`
		);
		return;
	}

	for (const problem of problems) {
		process.stdout.write(`${problem}\n`);
	}

	process.exitCode = 1;
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) runCli(process.argv.slice(2));
