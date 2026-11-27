// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Says whether a folder plan's retro writes a report:
 * `node retro-trigger.mjs <plan-folder>`.
 *
 * It prints one line per reason and exits 0 when any holds. A reason is a
 * `## Challenge` round numbered 3 or higher (`challenge: round <n>`), a
 * `## Review` record line whose verdict is not exactly `clean`
 * (`review: <line>`), or a task with an `amended` field (`amended: T<n>`).
 * With none it prints nothing and exits 1. A missing or unreadable `plan.md`,
 * a malformed task list, or a usage error exits 2.
 *
 * `clean, 1 decision` is not `clean`, and a review that asked for changes
 * triggers even when a later round came back clean, because the first round
 * still asked for them.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readReviewLines } from "../review/lines.mjs";
import { readChallengeRounds } from "./auto-approve.mjs";
import { parseTasks } from "./tasks.mjs";

/**
 * @typedef {{ code: 0 | 1, reasons: string[] } | { code: 2, message: string }} RetroTriggerResult
 */

// Rounds 1 and 2 are the challenge every plan runs, so a third means the fix loop ran.
const FIRST_TRIGGER_ROUND = 3;
const USAGE = "Usage: retro-trigger.mjs <plan-folder>";

/**
 * Reads the folder's `plan.md` and returns its reasons in the order
 * challenge, review, amended, with `code` the exit code.
 *
 * @param {string} folder
 * @returns {RetroTriggerResult}
 */
export function retroTrigger(folder) {
	const planPath = path.join(folder, "plan.md");
	if (!existsSync(planPath)) {
		return { code: 2, message: `retro-trigger: ${folder} holds no plan.md.` };
	}

	/** @type {string} */
	let text;
	/** @type {import("./tasks.mjs").Task[]} */
	let tasks;
	try {
		text = readFileSync(planPath, "utf8");
		tasks = parseTasks(text);
	} catch (error) {
		return {
			code: 2,
			message: `retro-trigger: ${planPath}: ${error instanceof Error ? error.message : String(error)}`,
		};
	}

	const reasons = [
		...readChallengeRounds(text)
			.filter((round) => round.number >= FIRST_TRIGGER_ROUND)
			.map((round) => `challenge: round ${round.number}`),
		...readReviewLines(text)
			.filter((entry) => entry.verdict !== "clean")
			.map((entry) => `review: ${entry.line}`),
		...tasks
			.filter((task) => task.amended.length > 0)
			.map((task) => `amended: ${task.id}`),
	];

	return { code: reasons.length > 0 ? 0 : 1, reasons };
}

// --- CLI ---

/** @param {string[]} args */
function runCli(args) {
	const folder = args[0];

	if (args.length !== 1 || folder === undefined || folder.startsWith("-")) {
		process.stderr.write(`${USAGE}\n`);
		process.exitCode = 2;

		return;
	}

	const result = retroTrigger(folder);
	if (result.code === 2) {
		process.stderr.write(`${result.message}\n`);
	} else if (result.reasons.length > 0) {
		process.stdout.write(`${result.reasons.join("\n")}\n`);
	}

	process.exitCode = result.code;
}

if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runCli(process.argv.slice(2));
}
