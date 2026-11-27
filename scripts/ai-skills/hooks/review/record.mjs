// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * `record.mjs <plan.md> <report.json>` writes a review round's one record line
 * under the plan's `## Review` section.
 *
 * The line is `- review round <n> at <short sha>[ (part <k> of <m>)]: <verdict>`,
 * and nothing is written under it, because findings and grades reach the
 * session in the report. Exits 0 when written, 1 writing nothing when a
 * finding cites a path `reviewIgnore` names, and 2 on a usage error, a
 * malformed report, or a config it cannot read.
 */
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readPlanConfig } from "../plan/tasks.mjs";
import { isNeverReviewed, normalizeReviewPath, resolveReviewIgnore } from "./ignore.mjs";

const SEVERITIES = ["critical", "major", "minor", "nit"];

const SHORT_SHA_LENGTH = 8;

const SHA_PATTERN = /^[0-9a-f]{7,40}$/;

const FINISHED_TOKEN_PATTERNS = [/^swept — \S/, /^n\/a: \S/];

/**
 * @typedef {{ pass?: string, token: string }} ReviewPass
 * @typedef {{ severity: string, file: string, line?: number, kind?: string, summary?: string }} ReviewFinding
 * @typedef {{ round: number, sha: string, part?: { k: number, m: number }, passes: ReviewPass[], findings: ReviewFinding[] }} ReviewReport
 */

/** Raised for a report that does not hold the shape `REVIEW.md` names. */
export class ReportShapeError extends Error {}

/**
 * Checks a parsed report against the shape and returns it typed.
 *
 * A severity outside the four lower-case names throws rather than counting as
 * nothing, because a typo such as `Major` would otherwise read as `clean`.
 *
 * @param {unknown} value
 * @returns {ReviewReport}
 */
export function validateReport(value) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new ReportShapeError("the report is not a JSON object.");
	}

	const report = /** @type {Record<string, unknown>} */ (value);

	if (report.round !== 1 && report.round !== 2) {
		throw new ReportShapeError(
			`round is ${JSON.stringify(report.round)}; a review runs at most two rounds, so it must be 1 or 2.`
		);
	}

	if (typeof report.sha !== "string" || report.sha.trim() === "") {
		throw new ReportShapeError("sha is missing.");
	}

	if (!SHA_PATTERN.test(report.sha.trim())) {
		throw new ReportShapeError(
			`sha ${JSON.stringify(report.sha)} is not 7 to 40 lower-case hex characters.`
		);
	}

	if (!Array.isArray(report.passes)) {
		throw new ReportShapeError("passes is not an array.");
	}

	if (report.passes.length === 0) {
		throw new ReportShapeError("passes is empty; a round names every pass it ran.");
	}

	if (!Array.isArray(report.findings)) {
		throw new ReportShapeError("findings is not an array.");
	}

	for (const pass of report.passes) {
		if (pass === null || typeof pass !== "object" || typeof pass.token !== "string") {
			throw new ReportShapeError(
				`pass ${JSON.stringify(pass)} has no string token.`
			);
		}
	}

	for (const finding of report.findings) {
		if (
			finding === null ||
			typeof finding !== "object" ||
			!SEVERITIES.includes(finding.severity)
		) {
			throw new ReportShapeError(
				`finding ${JSON.stringify(finding)} has no severity of ${SEVERITIES.join(", ")}.`
			);
		}

		if (typeof finding.file !== "string" || finding.file.trim() === "") {
			throw new ReportShapeError(`finding ${JSON.stringify(finding)} has no file.`);
		}
	}

	if (report.part !== undefined) {
		const part = /** @type {Record<string, unknown> | null} */ (report.part);

		if (
			part === null ||
			typeof part !== "object" ||
			!Number.isInteger(part.k) ||
			!Number.isInteger(part.m) ||
			/** @type {number} */ (part.m) < 2 ||
			/** @type {number} */ (part.k) < 1 ||
			/** @type {number} */ (part.k) > /** @type {number} */ (part.m)
		) {
			throw new ReportShapeError(
				`part is ${JSON.stringify(report.part)}; it needs integers with 1 <= k <= m and m >= 2.`
			);
		}
	}

	return /** @type {ReviewReport} */ (report);
}

/**
 * The round's verdict: `clean`, or the open counts.
 *
 * A round is `clean` when no Critical or Major is open apart from decision
 * items and every pass token reads `swept — …` or `n/a: …` with text after
 * the prefix. A bare `swept`, or a prefix with nothing after it, names no
 * reach, so it reads as a sweep that did not finish. Decision items
 * wait on a person rather than a fix, so the counts leave them out too.
 *
 * @param {ReviewReport} report
 * @returns {string}
 */
export function computeVerdict(report) {
	const counted = report.findings.filter((finding) => finding.kind !== "decision");
	const count = (/** @type {string} */ severity) =>
		counted.filter((finding) => finding.severity === severity).length;

	const [crit, maj, min, nit] = SEVERITIES.map(count);
	const everyPassFinished = report.passes.every((pass) =>
		FINISHED_TOKEN_PATTERNS.some((pattern) => pattern.test(pass.token))
	);

	if (crit === 0 && maj === 0 && everyPassFinished) return "clean";

	return `${crit} critical, ${maj} major, ${min} minor, ${nit} nit`;
}

/**
 * The plan text with `line` appended as the last line of `## Review`, before
 * the next `## ` heading, or under a new `## Review` at the end of the file.
 *
 * @param {string} text
 * @param {string} line
 * @returns {string}
 */
export function appendReviewLine(text, line) {
	const lines = text.split("\n");
	const heading = lines.findIndex((entry) => /^## Review\s*$/.test(entry));

	if (heading === -1) {
		const body = text.endsWith("\n") ? text : `${text}\n`;

		return `${body}\n## Review\n\n${line}\n`;
	}

	let end = lines.findIndex(
		(entry, index) => index > heading && entry.startsWith("## ")
	);
	if (end === -1) end = lines.length;

	let last = end - 1;
	while (last > heading && lines[last].trim() === "") last -= 1;

	if (last === heading) {
		lines.splice(heading + 1, 0, "", line);
	} else {
		lines.splice(last + 1, 0, line);
	}

	return lines.join("\n");
}

/**
 * @param {string} start
 * @returns {string | null}
 */
function findRepoRoot(start) {
	let dir = path.resolve(start);

	while (!existsSync(path.join(dir, ".git"))) {
		const parent = path.dirname(dir);

		if (parent === dir) return null;

		dir = parent;
	}

	return dir;
}

/**
 * @param {string[]} argv
 */
function runCli(argv) {
	const [planPath, reportPath] = argv;

	if (!planPath || !reportPath) {
		process.stderr.write("Usage: record.mjs <plan.md> <report.json>\n");
		process.exitCode = 2;
		return;
	}

	/** @type {ReviewReport} */
	let report;
	/** @type {string} */
	let planText;
	/** @type {import("./ignore.mjs").ReviewIgnoreLists} */
	let lists;
	/** @type {string | null} */
	let repoRoot;

	try {
		report = validateReport(JSON.parse(readFileSync(reportPath, "utf8")));
		planText = readFileSync(planPath, "utf8");

		repoRoot = findRepoRoot(path.dirname(planPath));
		lists = resolveReviewIgnore(repoRoot ? readPlanConfig(repoRoot) : null);
	} catch (error) {
		process.stderr.write(
			`record.mjs: ${(error instanceof Error ? error.message : String(error)).trim()}\n`
		);
		process.exitCode = 2;
		return;
	}

	const root = repoRoot ?? path.resolve(path.dirname(planPath));
	const neverReviewed = report.findings
		.map((finding) => ({ ...finding, file: normalizeReviewPath(finding.file, root) }))
		.filter((finding) => isNeverReviewed(finding.file, lists));

	if (neverReviewed.length > 0) {
		for (const finding of neverReviewed) {
			const where =
				finding.line === undefined ? finding.file : `${finding.file}:${finding.line}`;
			process.stderr.write(
				`record.mjs: ${where} is never reviewed (reviewIgnore); drop the finding and record again.\n`
			);
		}
		process.exitCode = 1;
		return;
	}

	const sha = report.sha.trim().slice(0, SHORT_SHA_LENGTH);
	const part = report.part ? ` (part ${report.part.k} of ${report.part.m})` : "";
	const line = `- review round ${report.round} at ${sha}${part}: ${computeVerdict(report)}`;

	writeFileSync(planPath, appendReviewLine(planText, line));
	process.stdout.write(`${line}\n`);
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) runCli(process.argv.slice(2));
