// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Approves a folder plan without a person when every condition holds:
 * `node auto-approve.mjs <plan-folder> [--check]`.
 *
 * The conditions are checked by script so approval is never the planner's
 * self-assessment: an approved intent behind the plan, at least one task,
 * every task listing at least one file inside the repo, every listed file inside the spec's Affected systems
 * globs, challenge rounds 1 and 2 with the highest-numbered one not blocking,
 * and no listed file on a stop path from `stop-paths.mjs`.
 *
 * A `carried` line approves, because it means the confirm round's leftover
 * findings change neither the intent nor the foundation and go to the PR as
 * open items. Only a confirm round may write one.
 *
 * The intent is the folder's own `intent.md`, or for an epic child, which
 * holds no intent, the epic's: its `spec.md` names the epic folder on an
 * `epic:` line, because approving an epic approves its children.
 *
 * Task count has no upper limit, because a cap sends a sound plan to a person
 * for its size alone and pushes the planner to fold tasks together to fit.
 *
 * It writes through the filesystem rather than an agent edit, so the approval
 * guard's frontmatter arm never sees it, and the guard's execution arm only
 * matches `approve.mjs` itself. Exit 0 means approved (or, with `--check`,
 * approvable), 1 means a condition failed and nothing was written, and 2 is
 * a usage error.
 */
import {
	existsSync,
	readFileSync,
	realpathSync,
	statSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compileMatcher } from "../lib/match.mjs";
import {
	approvalLines,
	formatLocalDate,
	readFrontmatter,
	sectionBody,
	stampApproval,
} from "./frontmatter.mjs";
import { matchStopPath, resolveStopPaths } from "./stop-paths.mjs";
import { parseTasks, readPlanConfig } from "./tasks.mjs";

/**
 * @typedef {import("./stop-paths.mjs").StopPaths} StopPaths
 * @typedef {import("./tasks.mjs").Task} Task
 * @typedef {[condition: string, detail: string][]} Failures
 * @typedef {{ code: number, message: string }} AutoApproveResult
 */

const ROUND_LINE =
	/^round (\d+): (clean|resolved \d+|carried \d+|blocking \d+)$/;
// Rounds 1 to 3 are the fix loop, so the first confirm round is round 4.
const FIRST_CONFIRM_ROUND = 4;
const USAGE = "Usage: auto-approve.mjs <plan-folder> [--check]";

/**
 * Checks every condition, then writes the approval lines unless `check` is
 * set. Returns `{ code, message }`, where `code` is the exit code. `today` is
 * the `approved_at` value, passed in so tests can pin it, and `stopPaths`
 * defaults to the built-in dependency files with no contract paths.
 *
 * @param {{ folder: string, check?: boolean, today: string, stopPaths?: StopPaths }} input
 * @returns {AutoApproveResult}
 */
export function autoApprove({
	folder,
	check = false,
	today,
	stopPaths = resolveStopPaths(null),
}) {
	const planPath = path.join(folder, "plan.md");
	if (!existsSync(planPath)) {
		return { code: 2, message: `auto-approve: ${folder} holds no plan.md.` };
	}

	const text = readFileSync(planPath, "utf8");
	const { status, approved_by: approvedBy } = approvalLines(text);
	if (status === null) {
		return fail([["frontmatter", "plan.md has no status line"]]);
	}

	/** @type {Task[]} */
	let tasks;
	try {
		tasks = parseTasks(text);
	} catch (error) {
		return fail([
			["tasks", error instanceof Error ? error.message : String(error)],
		]);
	}

	const failures = [
		...checkIntent(folder),
		...checkTaskCount(tasks),
		...checkTaskFiles(tasks, findRepoRoot(folder)),
		...checkAffectedSystems(tasks, path.join(folder, "spec.md")),
		...checkChallenge(text),
		...checkStopPaths(tasks, stopPaths),
	];
	if (failures.length > 0) return fail(failures);

	if (check) {
		return {
			code: 0,
			message: "auto-approve: every condition holds. --check wrote nothing.",
		};
	}

	if (status === "approved") {
		return {
			code: 0,
			message: `auto-approve: every condition holds, and plan.md is already approved by ${approvedBy}. Nothing written.`,
		};
	}

	if (status !== "draft") {
		return fail([
			["frontmatter", 'plan.md needs exactly one "status: draft" line'],
		]);
	}

	const stamped = stampApproval(text, "auto", today);

	if (stamped === text) {
		return fail([
			[
				"frontmatter",
				'the status line is not a plain "status: draft", so nothing was stamped',
			],
		]);
	}

	writeFileSync(planPath, stamped);

	return { code: 0, message: `auto-approve: approved ${planPath}.` };
}

/**
 * @param {Failures} failures
 * @returns {AutoApproveResult}
 */
function fail(failures) {
	return {
		code: 1,
		message: failures
			.map(
				([condition, detail]) => `auto-approve: ${condition} failed: ${detail}`
			)
			.join("\n"),
	};
}

/**
 * Passes when the folder's `intent.md` is approved, or when there is none and
 * `spec.md`'s `epic:` line names a sibling folder whose `intent.md` is. The
 * value must be a bare folder name, so it can't point outside `plans/`.
 *
 * @param {string} folder
 * @returns {Failures}
 */
function checkIntent(folder) {
	const intentPath = path.join(folder, "intent.md");
	if (existsSync(intentPath)) return checkApproved(intentPath);

	const specPath = path.join(folder, "spec.md");
	const epic = existsSync(specPath)
		? readFrontmatter(readFileSync(specPath, "utf8"))?.fields["epic"]
		: undefined;
	if (!epic) {
		return [
			[
				"intent",
				`${folder} holds no intent.md, and ${specPath} has no epic: line`,
			],
		];
	}

	if (/[/\\]|\.\./.test(epic)) {
		return [
			[
				"intent",
				`${specPath} names epic "${epic}", which is not a plan folder name`,
			],
		];
	}

	const epicIntent = path.join(
		path.dirname(path.resolve(folder)),
		epic,
		"intent.md"
	);
	if (!existsSync(epicIntent)) {
		return [
			[
				"intent",
				`${specPath} names epic "${epic}", and ${epicIntent} does not exist`,
			],
		];
	}

	return checkApproved(epicIntent);
}

/**
 * @param {string} intentPath
 * @returns {Failures}
 */
function checkApproved(intentPath) {
	const { status } = approvalLines(readFileSync(intentPath, "utf8"));
	if (status === "approved") return [];

	return [
		[
			"intent",
			`${intentPath} reads ${status === null ? "no status" : `status: ${status}`}, not status: approved`,
		],
	];
}

/**
 * @param {Task[]} tasks
 * @returns {Failures}
 */
function checkTaskCount(tasks) {
	if (tasks.length === 0) return [["task count", "plan.md has no tasks"]];

	return [];
}

/**
 * A directory entry fails because the stop-path `**` globs only match files,
 * so a bare `admin` would hide `admin/package.json`.
 *
 * @param {Task[]} tasks
 * @param {string | null} repoRoot
 * @returns {Failures}
 */
function checkTaskFiles(tasks, repoRoot) {
	if (repoRoot === null) {
		return [
			["files", "no git checkout above the plan folder to check paths in"],
		];
	}

	/** @type {Failures} */
	const failures = [];
	for (const task of tasks) {
		if (task.files.length === 0) {
			failures.push(["files", `${task.id} lists no files`]);
			continue;
		}

		for (const file of task.files) {
			const normalized = path.posix.normalize(file);
			if (normalized.startsWith("/") || normalized.split("/")[0] === "..") {
				failures.push([
					"files",
					`${task.id} lists ${file}, which is outside the repo`,
				]);
			} else if (
				normalized === "." ||
				statSync(path.join(repoRoot, normalized), {
					throwIfNoEntry: false,
				})?.isDirectory()
			) {
				failures.push([
					"files",
					`${task.id} lists ${file}, which is a directory, not a file`,
				]);
			}
		}
	}

	return failures;
}

/**
 * Walks up to the nearest directory holding `.git`, which is a file in a
 * worktree and a directory elsewhere.
 *
 * @param {string} folder
 * @returns {string | null}
 */
function findRepoRoot(folder) {
	let dir = path.resolve(folder);

	while (!existsSync(path.join(dir, ".git"))) {
		const parent = path.dirname(dir);

		if (parent === dir) return null;

		dir = parent;
	}

	return dir;
}

/**
 * @param {Task[]} tasks
 * @param {string} specPath
 * @returns {Failures}
 */
function checkAffectedSystems(tasks, specPath) {
	const globs = existsSync(specPath)
		? affectedSystemsGlobs(readFileSync(specPath, "utf8"))
		: null;
	if (!globs || globs.length === 0) {
		return [
			[
				"affected systems",
				"spec.md has no fenced glob block under ## Affected systems",
			],
		];
	}

	// compileMatcher escapes `[`, so a glob naming the `[...slug]` catch-all
	// route matches it literally.
	const matchers = globs.map((glob) => compileMatcher(glob));
	/** @type {Failures} */
	const failures = [];
	for (const task of tasks) {
		for (const file of task.files) {
			const normalized = path.posix.normalize(file);
			if (!matchers.some((matches) => matches(normalized))) {
				failures.push([
					"affected systems",
					`${task.id} lists ${file}, which no Affected systems glob matches`,
				]);
			}
		}
	}

	return failures;
}

/**
 * @param {string} text
 * @returns {Failures}
 */
function checkChallenge(text) {
	const rounds = (sectionBody(text, "Challenge") ?? "")
		.split("\n")
		.map((line) => ROUND_LINE.exec(line.trimEnd()))
		.filter((match) => match !== null)
		.map((match) => ({
			number: Number(match[1]),
			line: match[0],
			kind: match[2] ?? "",
		}));
	const numbers = rounds.map((round) => round.number);

	if (new Set(numbers).size !== numbers.length) {
		return [["challenge", "## Challenge repeats a round number"]];
	}

	if (!numbers.includes(1) || !numbers.includes(2)) {
		return [
			[
				"challenge",
				`## Challenge holds rounds ${numbers.join(", ") || "none"}, and rounds 1 and 2 are needed`,
			],
		];
	}

	const early = rounds.find(
		(round) =>
			round.number < FIRST_CONFIRM_ROUND && round.line.includes(": carried ")
	);
	if (early) {
		return [
			[
				"challenge",
				`"${early.line}" carries findings before round ${FIRST_CONFIRM_ROUND}, and only a confirm round may`,
			],
		];
	}

	const last = rounds.reduce((high, round) =>
		round.number > high.number ? round : high
	);
	if (last.kind.startsWith("blocking")) {
		return [["challenge", `the last round line reads "${last.line}"`]];
	}

	return [];
}

/**
 * @param {Task[]} tasks
 * @param {StopPaths} stopPaths
 * @returns {Failures}
 */
function checkStopPaths(tasks, stopPaths) {
	/** @type {Failures} */
	const failures = [];
	for (const task of tasks) {
		for (const file of task.files) {
			const stop = matchStopPath(file, stopPaths);
			if (stop) {
				failures.push([
					"stop paths",
					`${task.id} lists ${file}, a ${stop.kind} path (${stop.glob})`,
				]);
			}
		}
	}

	return failures;
}

/**
 * Returns the lines of the first fenced block under `## Affected systems`,
 * blank lines dropped, or null when the section or its fence is missing.
 *
 * @param {string} specText
 * @returns {string[] | null}
 */
function affectedSystemsGlobs(specText) {
	const lines = (sectionBody(specText, "Affected systems") ?? "").split("\n");
	const open = lines.findIndex((line) => line.startsWith("```"));
	if (open === -1) return null;

	const rest = lines.slice(open + 1);
	const close = rest.findIndex((line) => line.startsWith("```"));
	if (close === -1) return null;

	return rest
		.slice(0, close)
		.map((line) => line.trim())
		.filter(Boolean);
}

// --- CLI ---

/** @param {string[]} args */
function runCli(args) {
	const check = args.includes("--check");
	const rest = args.filter((arg) => arg !== "--check");
	const folder = rest[0];

	if (rest.length !== 1 || folder === undefined || folder.startsWith("-")) {
		process.stderr.write(`${USAGE}\n`);
		process.exitCode = 2;

		return;
	}

	const repoRoot = findRepoRoot(folder);
	/** @type {StopPaths} */
	let stopPaths;
	try {
		stopPaths = resolveStopPaths(repoRoot ? readPlanConfig(repoRoot) : null);
	} catch (error) {
		// A config that cannot be read approves nothing, and is not a held condition.
		process.stderr.write(
			`auto-approve: ${error instanceof Error ? error.message : String(error)}\n`
		);
		process.exitCode = 2;

		return;
	}

	const result = autoApprove({
		folder,
		check,
		today: formatLocalDate(new Date()),
		stopPaths,
	});
	(result.code === 0 ? process.stdout : process.stderr).write(
		`${result.message}\n`
	);
	process.exitCode = result.code;
}

if (
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	runCli(process.argv.slice(2));
}
