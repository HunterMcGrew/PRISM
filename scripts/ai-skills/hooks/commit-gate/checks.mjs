// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * The commit gate's subject, stops, and config checks, and the context every
 * check reads.
 *
 * Each check returns null to pass or `{ reason, remedy }` to deny, with a
 * one-line remedy. The subject check reads the subject's form on a
 * folder-plan branch, which takes the task forms, and keeps a `plan:` commit
 * inside the branch's plan folder and a `retro:` commit inside `RETRO_PATHS`
 * and the plan folder. A branch is a folder-plan branch when the plan
 * `findPlanForBranch` resolves from the branch name is a chain file directly
 * under `.prism/plans/<folder>/`, so a flat plan, an archived plan, and a
 * branch with no plan all skip the subject, stop-path, and weakened-test
 * checks. The stops check's flag denies run on every branch and read nothing
 * from the config. Its stop-path half runs wherever a task list exists to
 * read. The weakened-tests check lives in `test-guard.mjs`. The entry point
 * runs config, subject, weakened tests, and stops in that order.
 *
 * `loadContext` reads `.ai-skills/config.json` before it looks for a plan,
 * because `findPlanForBranch` reads `ticketPrefix` itself and swallows a
 * config it can't parse. A config that doesn't parse, or a `stopPaths` or
 * `testGlobs` value that `resolveStopPaths` or `resolveTestGlobs` rejects,
 * lands in `ctx.configError`, and `CONFIG_CHECK` turns it into a deny, so the
 * gate never skips a check on a config it can't read.
 *
 * Known misses:
 * - a branch whose name carries no ticket ID matching `ticketPrefix` reads as
 *   having no plan, so the subject check never sees its plan
 * - the subject check reads a task subject's form, not whether the plan holds
 *   the task it names
 * - the stops check's stop-path half needs a task list, so a branch with no
 *   plan folder, or a folder whose `plan.md` isn't written yet, commits a
 *   dependency or contract change unasked
 * - a dependency file other than the npm and composer manifests counts on any
 *   change, since the gate reads no other manifest format
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { findPlanForBranch } from "../compact-handoff.mjs";
import { CHAIN_FILES } from "../plan/lookup.mjs";
import { matchStopPath, resolveStopPaths } from "../plan/stop-paths.mjs";
import { parseSubject, parseTasks, readPlanConfig } from "../plan/tasks.mjs";
import { resolveTestGlobs } from "./test-guard.mjs";
import { runGit } from "./tree.mjs";

/**
 * @typedef {import("./parse.mjs").Commit} Commit
 * @typedef {import("./parse.mjs").Deny} Deny
 * @typedef {import("./tree.mjs").WouldBeIndex} WouldBeIndex
 * @typedef {import("../plan/tasks.mjs").Task} Task
 * @typedef {import("../plan/stop-paths.mjs").StopPaths} StopPaths
 * @typedef {{ reason: string, remedy: string }} CheckResult
 * @typedef {object} Context
 * @property {string} repoRoot
 * @property {string | null} planFolder The absolute plan folder, or null off a folder-plan branch.
 * @property {Task[] | null} tasks Null when there is no `plan.md` to read, and empty when its tasks don't parse.
 * @property {Commit} commit
 * @property {ReturnType<typeof parseSubject>} subject
 * @property {WouldBeIndex} index
 * @property {string[]} paths The files the would-be index changes against HEAD.
 * @property {Task[]} namedTasks The tasks a task or fix subject names that the plan holds.
 * @property {StopPaths | null} stopPaths Null when the config couldn't be read.
 * @property {string[]} testGlobs
 * @property {string} defaultBranch
 * @property {string | null} configError The message of the config error, or null.
 */

const PLANS_PREFIX = ".prism/plans/";
const FALLBACK_BRANCH = "main";
const CONFIG_REMEDY = "Fix .ai-skills/config.json, then commit again.";
// A path ending in `/` admits everything under it, and any other is exact.
const PROMOTION_PATHS = [
	".prism/retros/",
	".prism/lessons.md",
	".prism/archived/lessons-archive.md",
	".prism/metrics/review-misses.jsonl",
	".prism/architect/",
	".prism/spec/adrs/",
	".prism/rules/",
];
// The generated copies a promotion commits beside its source.
const GENERATED_ROOTS = [".claude/", ".codex/", ".cursor/"];
const GENERATED_TARGETS = ["architect/", "rules/", "spec/adrs/"];
export const RETRO_PATHS = [
	...PROMOTION_PATHS,
	...GENERATED_ROOTS.flatMap((root) =>
		GENERATED_TARGETS.map((target) => `${root}${target}`)
	),
	"AGENTS.md",
	"templates/install/.prism/",
];
// The manifest fields the stops check reads as dependency entries. A file not listed here is a lockfile.
const DEPENDENCY_FIELDS = new Map([
	[
		"package.json",
		[
			"dependencies",
			"devDependencies",
			"peerDependencies",
			"optionalDependencies",
		],
	],
	["composer.json", ["require", "require-dev"]],
]);
const SUBJECT_FORMS =
	"Start the subject with T<n>:, T<a>-T<b>:, T<a>,T<b>:, T<n> fix:, plan:, or retro:.";
const NAME_PATHS = "Name the paths: git add <path> && git commit -- <path>.";
/** @type {Record<string, (flag: string) => CheckResult>} */
const DENY_TEXT = {
	all: (flag) => ({
		reason: `\`${flag}\` commits every tracked change, including files other sessions are editing.`,
		remedy: NAME_PATHS,
	}),
	include: (flag) => ({
		reason: `\`${flag}\` commits the named paths on top of whatever the shared index holds, including files other sessions staged.`,
		remedy: `Drop ${flag}. ${NAME_PATHS}`,
	}),
	"expanded-paths": (flag) => ({
		reason: `The shell rewrites the path \`${flag}\` before git reads it, so the gate would judge different files than git commits.`,
		remedy: "Write each path out literally.",
	}),
	"magic-pathspec": (flag) => ({
		reason: `The pathspec \`${flag}\` uses git's \`:\` magic, which the gate doesn't read.`,
		remedy: "Write each path relative to the commit's directory, with no magic.",
	}),
	"multiple-commits": () => ({
		reason:
			"The command holds more than one commit, and the gate judges only the first.",
		remedy: "Run each commit as its own command.",
	}),
	"no-paths": () => ({
		reason:
			"The commit names no paths, so it would take whatever the shared index holds.",
		remedy: NAME_PATHS,
	}),
	"no-verify": (flag) => ({
		reason: `\`${flag}\` skips the git hooks.`,
		remedy: "Drop it, and fix what the hook reports.",
	}),
	"hooks-path": () => ({
		reason: "`-c core.hooksPath=` points git away from the repo's hooks.",
		remedy: "Drop the -c option, so .githooks runs.",
	}),
	"kill-switch": (flag) => ({
		reason: `The command sets ${flag}, which turns the agent hooks off.`,
		remedy:
			"Leave PRISM_HOOK_DISABLE and PRISM_HOOK_DENY_DISABLE to the person; run the command without them.",
	}),
};

export const CONFIG_CHECK = { name: "config", run: checkConfig };
export const SUBJECT_CHECK = { name: "subject", run: checkSubject };
export const STOPS_CHECK = { name: "stops", run: checkStops };

/**
 * Gathers what the checks read for one commit.
 *
 * The config is read first, so a config error is held in `configError` and
 * the plan is skipped. The plan comes from the ticket ID in the branch name
 * through `findPlanForBranch`, and counts only when it is a chain file under
 * `.prism/plans/<folder>/`, which sets `planFolder`. `paths` are the files the
 * would-be index changes against HEAD, so a directory pathspec expands and an
 * unchanged named file drops out. `tasks` is null when the plan folder has no
 * `plan.md`, and empty when its tasks can't be parsed. `subject` is the commit
 * subject as `parseSubject` reads it, or null, and `namedTasks` are the tasks a
 * task or fix subject names that the plan holds.
 *
 * @param {{ repoRoot: string, commit: Commit, index: WouldBeIndex }} options
 * @returns {Context}
 */
export function loadContext({ repoRoot, commit, index }) {
	const settings = readSettings(repoRoot);
	const planFolder = settings.configError ? null : findPlanFolder(repoRoot);
	const planText = readPlanText(planFolder);
	/** @type {Task[] | null} */
	let tasks = null;
	if (planText !== null) {
		try {
			tasks = parseTasks(planText);
		} catch {
			tasks = [];
		}
	}

	const subject = parseSubject(commit.subject ?? "", settings.ticketPrefix);
	const context = {
		repoRoot,
		planFolder,
		tasks,
		commit,
		subject,
		index,
		paths: readChangedPaths(repoRoot, index),
		stopPaths: settings.stopPaths,
		testGlobs: settings.testGlobs,
		defaultBranch: settings.defaultBranch,
		configError: settings.configError,
	};

	return { ...context, namedTasks: findNamedTasks(context) };
}

// --- Checks ---

/**
 * Turns a config the gate can't read into a deny, so no later check runs on
 * guesses.
 *
 * @param {Context} ctx
 * @returns {CheckResult | null}
 */
function checkConfig(ctx) {
	return ctx.configError
		? { reason: ctx.configError, remedy: CONFIG_REMEDY }
		: null;
}

/**
 * On a folder-plan branch the subject parses as a folder-plan subject, never
 * the ticket key. A `plan:` commit stays inside the plan folder and a `retro:`
 * commit inside its promotion paths and the plan folder, so a draft commit
 * can't carry code under a subject that claims no task.
 *
 * @param {Context} ctx
 * @returns {CheckResult | null}
 */
function checkSubject(ctx) {
	if (!ctx.planFolder) return null;

	const planDir = formatRepoPath(ctx, ctx.planFolder);
	const parsed = ctx.subject;
	if (!parsed || parsed.kind === "ticket") {
		if (ctx.commit.subject !== null) {
			return {
				reason: `"${ctx.commit.subject}" isn't a folder-plan subject.`,
				remedy: SUBJECT_FORMS,
			};
		}

		return {
			reason: "The gate can't read a subject from this command.",
			remedy: readsMessageFile(ctx.commit)
				? `Pass the message with -m or a heredoc, which the gate reads. ${SUBJECT_FORMS}`
				: SUBJECT_FORMS,
		};
	}

	if (parsed.kind === "plan") {
		const outside = ctx.paths.find((p) => !p.startsWith(`${planDir}/`));
		if (outside) {
			return {
				reason: `A plan: commit names only ${planDir}/ paths, and ${outside} is outside them.`,
				remedy: `Commit ${outside} under its task's subject instead.`,
			};
		}
	}

	if (parsed.kind === "retro") {
		const allowed = [...RETRO_PATHS, `${planDir}/`];
		const outside = ctx.paths.find(
			(p) =>
				!allowed.some(
					(entry) => p === entry || (entry.endsWith("/") && p.startsWith(entry))
				)
		);
		if (outside) {
			return {
				reason: `A retro: commit names only promotion paths and the plan folder, and ${outside} is outside them.`,
				remedy: `Commit ${outside} under its task's subject instead.`,
			};
		}
	}

	return null;
}

/**
 * The parser's flag denies, then stop paths. A dependency file whose
 * dependency entries change needs a named task that lists it and carries
 * `new dependency:`, and a contract path needs a named task that lists it.
 * The flag denies read only `ctx.commit`, so the entry point can judge them
 * before any config read.
 *
 * @param {Pick<Context, "commit"> & Partial<Context>} ctx
 * @returns {CheckResult | null}
 */
function checkStops(ctx) {
	const [deny] = ctx.commit.denies;
	if (deny) return denyText(deny);

	const { tasks, stopPaths, paths, repoRoot, index } = ctx;
	if (!tasks || !stopPaths || !paths || !repoRoot || !index) return null;

	const named = ctx.namedTasks ?? [];
	for (const p of paths) {
		const stop = matchStopPath(p, stopPaths);
		if (!stop) continue;

		const owners = named.filter((task) => task.files.includes(p));
		if (stop.kind === "contract" && owners.length === 0) {
			return {
				reason: `${p} is a contract path (${stop.glob}) that no named task lists.`,
				remedy: `Commit ${p} under the task that lists it, or stop and ask about the contract change.`,
			};
		}
		if (
			stop.kind === "dependency" &&
			!owners.some((task) => task.newDependency) &&
			changesDependencyEntry(repoRoot, index, p)
		) {
			return {
				reason: `${p} is a dependency file (${stop.glob}), and no named task lists it with a new dependency: line.`,
				remedy: `Add "- new dependency: <package and why>" under the task that lists ${p}, or stop and ask.`,
			};
		}
	}

	return null;
}

/**
 * @param {Deny} deny
 * @returns {CheckResult}
 */
function denyText(deny) {
	const text = DENY_TEXT[deny.id];
	if (!text) throw new Error(`commit gate has no text for the "${deny.id}" deny`);

	return text(deny.flag);
}

/**
 * True when a dependency file's dependency entries differ between HEAD and the
 * would-be tree. Any other dependency file counts every change, and a manifest
 * that fails to parse on either side counts as changed, so the gate asks
 * rather than guesses.
 *
 * @param {string} repoRoot
 * @param {WouldBeIndex} index
 * @param {string} file
 */
function changesDependencyEntry(repoRoot, index, file) {
	const fields = DEPENDENCY_FIELDS.get(path.posix.basename(file).toLowerCase());
	/** @type {string | null} */
	const before = runGit(repoRoot, ["show", `HEAD:${file}`], {
		fallback: null,
	});
	/** @type {string | null} */
	const after = runGit(repoRoot, ["show", `${index.treeHash}:${file}`], {
		fallback: null,
	});
	if (!fields) return before !== after;

	/** @param {string | null} text */
	const entries = (text) => {
		if (text === null) return {};

		const manifest = JSON.parse(text);

		return Object.fromEntries(fields.map((field) => [field, manifest[field]]));
	};
	try {
		return JSON.stringify(entries(before)) !== JSON.stringify(entries(after));
	} catch {
		return true;
	}
}

// --- Context readers ---

/**
 * The config values the checks read, or `configError` when one can't be read.
 * `readPlanConfig` throws on a file that exists but doesn't parse, and
 * `resolveStopPaths` and `resolveTestGlobs` throw on a value they reject.
 *
 * @param {string} repoRoot
 * @returns {{ ticketPrefix: string | null, defaultBranch: string, stopPaths: StopPaths | null, testGlobs: string[], configError: string | null }}
 */
function readSettings(repoRoot) {
	try {
		const config = readPlanConfig(repoRoot);
		const defaultBranch = config?.["defaultBranch"];
		const ticketPrefix = config?.["ticketPrefix"];

		return {
			ticketPrefix: typeof ticketPrefix === "string" ? ticketPrefix : null,
			defaultBranch:
				typeof defaultBranch === "string" && defaultBranch
					? defaultBranch
					: FALLBACK_BRANCH,
			stopPaths: resolveStopPaths(
				/** @type {Parameters<typeof resolveStopPaths>[0]} */ (config)
			),
			testGlobs: resolveTestGlobs(config),
			configError: null,
		};
	} catch (error) {
		return {
			ticketPrefix: null,
			defaultBranch: FALLBACK_BRANCH,
			stopPaths: null,
			testGlobs: [],
			configError: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * The absolute plan folder for the branch, or null when its plan is not a chain
 * file directly under `.prism/plans/<folder>/`. An archived plan lives under
 * `.prism/archived/plans/`, so it never matches.
 *
 * @param {string} repoRoot
 * @returns {string | null}
 */
function findPlanFolder(repoRoot) {
	const branch = runGit(repoRoot, ["symbolic-ref", "--short", "-q", "HEAD"], {
		fallback: "",
	});
	const file = findPlanForBranch(repoRoot, branch);
	if (!file) return null;

	const folder = path.posix.dirname(file);
	const isFolderPlan =
		CHAIN_FILES.includes(path.posix.basename(file)) &&
		`${path.posix.dirname(folder)}/` === PLANS_PREFIX;

	return isFolderPlan ? path.join(repoRoot, ...folder.split("/")) : null;
}

/** @param {string | null} planFolder */
function readPlanText(planFolder) {
	const file = planFolder ? path.join(planFolder, "plan.md") : null;
	if (!file || !existsSync(file)) return null;

	return readFileSync(file, "utf8");
}

/**
 * @param {string} repoRoot
 * @param {WouldBeIndex} index
 * @returns {string[]}
 */
function readChangedPaths(repoRoot, index) {
	const output = runGit(
		repoRoot,
		["diff", "--cached", "--name-only", "--no-renames", "-z", "HEAD"],
		{ env: { GIT_INDEX_FILE: index.indexFile }, trim: false }
	);

	return output.split("\0").filter(Boolean);
}

// --- Helpers ---

/**
 * @param {{ subject: ReturnType<typeof parseSubject>, tasks: Task[] | null }} context
 * @returns {Task[]}
 */
function findNamedTasks({ subject, tasks }) {
	if (subject?.kind !== "task" && subject?.kind !== "fix") return [];

	return subject.ids
		.map((id) => (tasks ?? []).find((task) => task.id === id))
		.filter((task) => task !== undefined);
}

/**
 * True when the commit takes its message from a `-F` or `--file` source.
 *
 * @param {Commit} commit
 */
function readsMessageFile(commit) {
	return commit.flags.some((flag) => flag === "-F" || flag === "--file");
}

/**
 * @param {Context} ctx
 * @param {string} absolute
 */
function formatRepoPath(ctx, absolute) {
	return path.relative(ctx.repoRoot, absolute).split(path.sep).join("/");
}
