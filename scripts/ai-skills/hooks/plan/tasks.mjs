// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * Reads the `## Tasks` section of a folder plan and reports which tasks are
 * done, judged by the commit subjects between a base ref and HEAD.
 *
 * Usage: tasks.mjs <plan.md> [--base <ref>] [--json]
 *
 * Without `--base`, the range starts at the commit that first added the plan
 * folder's `intent.md`, because no task can finish before its plan existed,
 * and it follows first parents only. A branch stacked on another plan's
 * branch then never counts the parent's `T<n>:` commits, including ones a
 * merge of the parent brings in. A folder whose `intent.md` isn't committed
 * yet has no task done, and a plan with no `intent.md` beside it reads from
 * `origin/<defaultBranch>`, where `defaultBranch` comes from
 * `.ai-skills/config.json` and falls back to `main`.
 *
 * A task is done when a `T<n>:`, `T<a>-T<b>:`, or `T<a>,T<b>:` subject names
 * it. A `T<n> fix:` subject names a task without completing it, so a fix on a
 * finished task can't mark an unfinished one done by accident.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readRepoConfig } from "../lib/command.mjs";

/**
 * @typedef {object} Task
 * @property {string} id
 * @property {string} summary
 * @property {string[]} files
 * @property {string | null} proof
 * @property {boolean} proofFailsOnMain
 * @property {string[]} dependsOn
 * @property {string | null} behaviorChange
 * @property {{ path: string, why: string }[]} amended
 * @property {string | null} newDependency
 */

const TASK_HEADING = /^### (T\d+): (\S.*)$/;
const TASK_ID = /^T\d+$/;
const FIELD_LINE = /^- ([A-Za-z][A-Za-z ]*):\s*(.*)$/;
/** @type {Record<string, (task: Task, value: string) => void>} */
const FIELD_SETTERS = {
	files: (task, value) => {
		task.files = parseFiles(task.id, value);
	},
	proof: (task, value) => {
		task.proof = value;
	},
	"proof fails on main": (task, value) => {
		task.proofFailsOnMain = value === "yes";
	},
	"depends on": (task, value) => {
		task.dependsOn = parseDependsOn(task.id, value);
	},
	"behavior change": (task, value) => {
		task.behaviorChange = value;
	},
	amended: (task, value) => {
		task.amended.push(parseAmended(task.id, value));
	},
	"new dependency": (task, value) => {
		task.newDependency = value;
	},
};
const REPEATABLE_KEYS = new Set(["amended"]);
const GLOB_CHARS = /[*?{]/;
const FALLBACK_BRANCH = "main";

/**
 * Parses every `### T<n>: <summary>` task under `## Tasks`.
 *
 * HTML comments are stripped first, because the plan template carries a
 * commented example task that must not parse as a real one. Throws on a
 * malformed `###` heading, a duplicate task ID, a malformed `depends on`,
 * `amended`, or `files` field, a `depends on` ID that names no task, a field
 * other than `amended` given twice in one task, a miscased field key anywhere
 * in a task, and an unknown field key in the field list that opens a task.
 * Prose below that list may use any bullets.
 *
 * @param {string} text
 * @returns {Task[]}
 */
export function parseTasks(text) {
	const lines = text.replace(/<!--[\s\S]*?-->/g, "").split("\n");
	/** @type {Task[]} */
	const tasks = [];
	const seen = new Set();
	let inTasks = false;
	/** @type {Task | null} */
	let current = null;
	let currentKeys = new Set();
	let inFieldList = false;

	for (const line of lines) {
		if (/^## /.test(line)) {
			inTasks = line.trim() === "## Tasks";
			current = null;
			continue;
		}

		if (!inTasks) continue;

		if (/^### /.test(line)) {
			const heading = TASK_HEADING.exec(line.trim());

			if (!heading) {
				throw new Error(`Unparseable task heading: ${line.trim()}`);
			}

			const [, id = "", summary = ""] = heading;

			if (seen.has(id)) {
				throw new Error(`Duplicate task ID ${id}`);
			}

			seen.add(id);
			currentKeys = new Set();
			inFieldList = true;
			current = {
				id,
				summary,
				files: [],
				proof: null,
				proofFailsOnMain: false,
				dependsOn: [],
				behaviorChange: null,
				amended: [],
				newDependency: null,
			};
			tasks.push(current);
			continue;
		}

		if (!current) continue;

		const field = FIELD_LINE.exec(line);

		if (field) {
			const key = /** @type {string} */ (field[1]);

			if (Object.hasOwn(FIELD_SETTERS, key)) {
				if (currentKeys.has(key) && !REPEATABLE_KEYS.has(key)) {
					throw new Error(`${current.id}: repeated field "${key}"`);
				}

				currentKeys.add(key);
				FIELD_SETTERS[key]?.(current, (field[2] ?? "").trim());
			} else if (
				Object.hasOwn(FIELD_SETTERS, key.toLowerCase()) ||
				inFieldList
			) {
				throw new Error(`${current.id}: unknown field "${key}"`);
			}
		} else if (line.trim() !== "") {
			inFieldList = false;
		}
	}

	for (const task of tasks) {
		for (const id of task.dependsOn) {
			if (!seen.has(id)) {
				throw new Error(`${task.id}: depends on ${id}, which names no task`);
			}
		}
	}

	return tasks;
}

/**
 * Classifies a commit subject by the plan's subject grammar, or returns null
 * for a subject the grammar doesn't cover.
 *
 * The ticket form is built from `ticketPrefix`, the escaped prefix followed by
 * `-<digits>: `, matched without regard to case. With no prefix, no subject
 * reads as a ticket subject.
 *
 * @param {string} subject
 * @param {string | null} [ticketPrefix]
 * @returns {{ kind: "task" | "fix", ids: string[] } | { kind: "plan" | "retro" | "ticket" } | null}
 */
export function parseSubject(subject, ticketPrefix = null) {
	const range = /^T(\d+)-T(\d+): \S/.exec(subject);

	if (range) {
		const low = Number(range[1]);
		const high = Number(range[2]);

		if (low > high) return null;

		/** @type {string[]} */
		const ids = [];

		for (let n = low; n <= high; n += 1) ids.push(`T${n}`);

		return { kind: "task", ids };
	}

	const list = /^(T\d+(?:,T\d+)*): \S/.exec(subject);

	if (list) return { kind: "task", ids: (list[1] ?? "").split(",") };

	const fix = /^(T\d+) fix: \S/.exec(subject);

	if (fix) return { kind: "fix", ids: [fix[1] ?? ""] };

	if (/^plan: \S/.test(subject)) return { kind: "plan" };

	if (/^retro: \S/.test(subject)) return { kind: "retro" };

	if (ticketPrefix) {
		const escaped = ticketPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		if (new RegExp(`^${escaped}-\\d+: \\S`, "i").test(subject))
			return { kind: "ticket" };
	}

	return null;
}

/**
 * Returns the set of task IDs that `task` subjects name. `fix` subjects add
 * nothing, because fixing a task says nothing about whether it was finished.
 *
 * @param {string[]} subjects
 * @param {string | null} [ticketPrefix]
 * @returns {Set<string>}
 */
export function doneTasks(subjects, ticketPrefix = null) {
	/** @type {Set<string>} */
	const done = new Set();

	for (const subject of subjects) {
		const parsed = parseSubject(subject, ticketPrefix);

		if (parsed?.kind === "task") {
			for (const id of parsed.ids) done.add(id);
		}
	}

	return done;
}

/**
 * Parses the shared CLI shape of `tasks.mjs` and `bundles.mjs`, or returns
 * null when the arguments don't fit it.
 *
 * `base` stays null when `--base` is absent, so a caller can tell a build run
 * from a read-only one. `loadPlanState` then picks the default range.
 *
 * @param {string[]} argv
 * @returns {{ planPath: string, base: string | null, json: boolean } | null}
 */
export function parseCliArgs(argv) {
	/** @type {{ planPath: string | null, base: string | null, json: boolean }} */
	const args = { planPath: null, base: null, json: false };

	for (let i = 0; i < argv.length; i += 1) {
		const arg = /** @type {string} */ (argv[i]);

		if (arg === "--json") {
			args.json = true;
		} else if (arg === "--base") {
			const base = argv[i + 1];

			if (!base || base.startsWith("-")) return null;

			args.base = base;
			i += 1;
		} else if (!args.planPath && !arg.startsWith("-")) {
			args.planPath = arg;
		} else {
			return null;
		}
	}

	return args.planPath
		? { planPath: args.planPath, base: args.base, json: args.json }
		: null;
}

/**
 * Reads the plan and the commit subjects in `<base>..HEAD`, with git run from
 * the plan's directory so the CLI works from any working directory. With no
 * `base`, the range is the one the header describes. The repo's config, read
 * once, supplies the default branch for that range and the ticket prefix for
 * the subject grammar.
 *
 * @param {string} planPath
 * @param {string | null} base
 * @returns {{ tasks: Task[], done: Set<string> }}
 */
export function loadPlanState(planPath, base) {
	const text = readFileSync(planPath, "utf8");
	const dir = path.dirname(path.resolve(planPath));
	/** @param {string[]} args */
	const git = (args) =>
		execFileSync("git", args, {
			cwd: dir,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});

	const config = readRepoConfig(git(["rev-parse", "--show-toplevel"]).trim());
	const defaultBranch =
		typeof config?.["defaultBranch"] === "string" && config["defaultBranch"]
			? config["defaultBranch"]
			: FALLBACK_BRANCH;
	const ticketPrefix =
		typeof config?.["ticketPrefix"] === "string" ? config["ticketPrefix"] : null;

	/** @type {string} */
	let log;
	if (base || !existsSync(path.join(dir, "intent.md"))) {
		log = git(["log", "--format=%s", `${base ?? `origin/${defaultBranch}`}..HEAD`]);
	} else {
		const added = git([
			"log",
			"--diff-filter=A",
			"--format=%H",
			"--",
			"intent.md",
		])
			.trim()
			.split("\n")
			.at(-1);
		log = added
			? git(["log", "--first-parent", "--format=%s", `${added}..HEAD`]) +
				git(["log", "-1", "--format=%s", added])
			: "";
	}

	const subjects = log.split("\n").filter(Boolean);

	return { tasks: parseTasks(text), done: doneTasks(subjects, ticketPrefix) };
}

/**
 * Backticks, quotes, and a leading `./` are stripped, so stop-path and import
 * checks see the bare path.
 *
 * @param {string} taskId
 * @param {string} value
 * @returns {string[]}
 */
function parseFiles(taskId, value) {
	return value
		.split(",")
		.map((entry) =>
			entry
				.trim()
				.replace(/^[`"']+|[`"']+$/g, "")
				.replace(/^\.\//, "")
		)
		.filter(Boolean)
		.map((file) => {
			if (/\s/.test(file) || GLOB_CHARS.test(file)) {
				throw new Error(
					`${taskId}: files entry "${file}" must be one path with no spaces or glob characters`
				);
			}

			if (file.endsWith("/")) {
				throw new Error(
					`${taskId}: files entry "${file}" names a directory; list the files, not the directory`
				);
			}

			if (file === ".") {
				throw new Error(
					`${taskId}: files entry "${file}" names the repo root, not a file`
				);
			}

			return file;
		});
}

/**
 * @param {string} taskId
 * @param {string} value
 * @returns {string[]}
 */
function parseDependsOn(taskId, value) {
	if (value === "" || value.startsWith("none")) return [];

	const ids = value.split(",").map((id) => id.trim());

	for (const id of ids) {
		if (!TASK_ID.test(id)) {
			throw new Error(`${taskId}: unparseable depends on entry "${id}"`);
		}
	}

	return ids;
}

/**
 * @param {string} taskId
 * @param {string} value
 * @returns {{ path: string, why: string }}
 */
function parseAmended(taskId, value) {
	const match = /^(\S+): (\S.*)$/.exec(value);

	if (!match) {
		throw new Error(`${taskId}: amended must read "<path>: <why>"`);
	}

	return { path: match[1] ?? "", why: match[2] ?? "" };
}

/** @param {string[]} argv */
function runCli(argv) {
	const args = parseCliArgs(argv);

	if (!args) {
		process.stderr.write(
			"Usage: tasks.mjs <plan.md> [--base <ref>] [--json]\n"
		);
		process.exitCode = 2;
		return;
	}

	/** @type {ReturnType<typeof loadPlanState>} */
	let state;

	try {
		state = loadPlanState(args.planPath, args.base);
	} catch (error) {
		process.stderr.write(
			`tasks.mjs: ${(error instanceof Error ? error.message : String(error)).trim()}\n`
		);
		process.exitCode = 1;
		return;
	}

	const rows = state.tasks.map((task) => ({
		id: task.id,
		summary: task.summary,
		status: state.done.has(task.id) ? "done" : "open",
	}));

	if (args.json) {
		process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
		return;
	}

	for (const row of rows) {
		process.stdout.write(`${row.id}  ${row.status}  ${row.summary}\n`);
	}
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) runCli(process.argv.slice(2));
