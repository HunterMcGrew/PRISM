// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * The commit gate's weakened-tests check: a commit never removes a line from a
 * test file unless the plan says the behavior changed.
 *
 * A line counts as removed only when this commit removes it, diffing the
 * would-be index from `tree.mjs` against HEAD, and `git blame <base>..HEAD`
 * marks its HEAD line `boundary`, meaning no commit since the merge base with
 * `origin/<defaultBranch>` added it. A line this branch added and later
 * rewrote isn't a weakening, even when its text matches a line of the default
 * branch's, a removal an earlier commit already made isn't counted again, and
 * a test file the default branch doesn't have is skipped. Without an
 * `origin/<defaultBranch>` the base is HEAD.
 *
 * The check runs on a folder-plan branch, where `loadContext` found a plan
 * folder. A named task that lists the file, or amends it onto its list, and
 * carries `behavior change:` permits the removal. A branch with a flat plan or
 * no plan skips the check, because it has nowhere to record a behavior change.
 * The test files are the `testGlobs` config key, which `resolveTestGlobs`
 * reads, and `DEFAULT_TEST_GLOBS` when it is absent.
 *
 * Known misses:
 * - a weakening that only adds lines, such as an early `return` or a mock
 *   that stubs out the code under test
 * - a test file outside the `testGlobs` set
 * - a task's `behavior change:` permits any removal in a file it lists,
 *   whatever the removed line held
 * - an archived plan counts as no plan, so its branch skips the check
 * - on a stacked branch, a line a parent PR added is one the default branch
 *   lacks, so removing it isn't counted
 */
import { compileMatcher } from "../lib/match.mjs";
import { runGit } from "./tree.mjs";

// Every path the check hands to git is a file name the parse already resolved, so
// a name starting with `:` or holding `*` must not be read as pathspec magic.
const LITERAL_PATHSPECS = { GIT_LITERAL_PATHSPECS: "1" };
const NO_NEWLINE_MARKER = "\\ No newline at end of file";
// Each `**/` form is listed beside its root form, because a `**/` prefix does
// not match a file at the repo root.
export const DEFAULT_TEST_GLOBS = [
	"*.test.*",
	"**/*.test.*",
	"*.spec.*",
	"**/*.spec.*",
	"__tests__/**",
	"**/__tests__/**",
	"test/**",
	"**/test/**",
	"tests/**",
	"**/tests/**",
];

/** @typedef {import("./checks.mjs").Context} Context */
/** @typedef {{ from: string, to: string | null }} Change */

// What a deny says when the plan holds tasks and the commit names none: the
// plan's `behavior change:` and `new dependency:` lines hang off a task, so
// asking for one would send the agent to edit a plan that may already have it.
// A plan with no tasks keeps the plan-line remedy, because no subject can name
// a task there.
export const NO_TASK_REASON =
	"the commit's subject names no task the plan holds";
export const NO_TASK_REMEDY =
	'Name the task in the subject as "T<n>: <summary>", passed with -m or a heredoc in this command, because a -F file written in the same command is not there when the gate reads it.';

export const TEST_GUARD_CHECK = {
	name: "weakened tests",
	run: checkWeakenedTests,
};

/**
 * The `testGlobs` a config sets, or `DEFAULT_TEST_GLOBS` when it leaves them
 * unset. A list that is set replaces the default. Throws an `Error` naming
 * `testGlobs` on a value that is not an array of strings and on an entry
 * holding `{`, because `compileMatcher` reads a brace literally and the glob
 * would silently match nothing.
 *
 * @param {Record<string, unknown> | null | undefined} config
 * @returns {string[]}
 */
export function resolveTestGlobs(config) {
	const globs = config?.["testGlobs"];
	if (globs === undefined) return DEFAULT_TEST_GLOBS;

	if (!Array.isArray(globs) || globs.some((glob) => typeof glob !== "string")) {
		throw new Error(
			`testGlobs is ${JSON.stringify(globs)}, which is not an array of glob strings.`
		);
	}

	const braced = globs.find((glob) => glob.includes("{"));
	if (braced !== undefined) {
		throw new Error(
			`testGlobs pattern "${braced}" uses "{", and braces are not supported. List each alternative as its own pattern.`
		);
	}

	return globs;
}

/**
 * Denies the first test file that loses one of the default branch's lines the
 * plan doesn't permit.
 *
 * @param {Context} ctx
 * @returns {{ reason: string, remedy: string } | null}
 */
function checkWeakenedTests(ctx) {
	if (!ctx.planFolder) return null;

	const matchers = ctx.testGlobs.map(compileMatcher);
	const candidates = ctx.paths.filter((file) =>
		matchers.some((matches) => matches(file))
	);
	const base = findBase(ctx);
	for (const change of readTestChanges(ctx, candidates)) {
		const removed = countRemovedBaseLines(ctx, base, change);
		if (removed === 0 || permitsRemoval(ctx, change)) continue;

		const label = change.to ? `${change.from} (now ${change.to})` : change.from;
		const lines = `${removed} line${removed === 1 ? "" : "s"}`;
		if (ctx.noTaskNamed) {
			return {
				reason: `${label} loses ${lines}, and ${NO_TASK_REASON}.`,
				remedy: NO_TASK_REMEDY,
			};
		}

		return {
			reason: `${label} loses ${lines}, and the plan doesn't record a behavior change for it.`,
			remedy: `Restore the removed lines, or add "- behavior change: <what and why>" under the task that lists ${change.from}. Make that edit in its own command, before the commit, since the gate reads the plan before the command runs.`,
		};
	}

	return null;
}

/**
 * True when a named task carries `behavior change:` and lists the file the
 * commit changes, on either side of a rename.
 *
 * @param {Context} ctx
 * @param {Change} change
 */
function permitsRemoval(ctx, { from, to }) {
	return ctx.namedTasks.some(
		(task) =>
			Boolean(task.behaviorChange) &&
			[from, to].some((file) => claimsFile(task, file))
	);
}

/**
 * True when `file` is on the task's file list or amended onto it. Every check
 * that asks whether a task owns a file reads it through here.
 *
 * @param {import("../plan/tasks.mjs").Task} task
 * @param {string | null} file
 */
export function claimsFile(task, file) {
	return (
		file !== null &&
		(task.files.includes(file) ||
			task.amended.some((entry) => entry.path === file))
	);
}

/**
 * The commit the blame range starts from: the merge base of HEAD and
 * `origin/<defaultBranch>`, or HEAD when there is no such ref or the branch
 * has no commits past it, since blame reads the working tree over an empty
 * range.
 *
 * @param {Context} ctx
 */
function findBase(ctx) {
	const base = runGit(
		ctx.repoRoot,
		["merge-base", "HEAD", `origin/${ctx.defaultBranch}`],
		{ fallback: "" }
	);
	const head = runGit(ctx.repoRoot, ["rev-parse", "HEAD"]);

	return base && base !== head ? base : "HEAD";
}

/**
 * The test files present at HEAD that the commit changes, as `{ from, to }`,
 * where `to` is set only for a rename. Every candidate is diffed together, so
 * a renamed test file pairs with its new path rather than reading as deleted.
 *
 * @param {Context} ctx
 * @param {string[]} candidates
 * @returns {Change[]}
 */
function readTestChanges(ctx, candidates) {
	if (candidates.length === 0) return [];

	const fields = runGit(
		ctx.repoRoot,
		[
			"diff",
			"--cached",
			"-M",
			"--name-status",
			"-z",
			"HEAD",
			"--",
			...candidates,
		],
		{ env: { ...LITERAL_PATHSPECS, GIT_INDEX_FILE: ctx.index.indexFile }, trim: false }
	).split("\0");
	/** @type {Change[]} */
	const changes = [];
	for (let i = 0; i < fields.length - 1; i += 1) {
		const status = fields[i];
		if (status.startsWith("R")) {
			changes.push({ from: fields[i + 1], to: fields[i + 2] });
			i += 2;
		} else {
			if (status !== "A") changes.push({ from: fields[i + 1], to: null });
			i += 1;
		}
	}

	return changes;
}

/**
 * Counts the lines this commit removes from HEAD's copy that the default
 * branch's copy holds, judging each by its HEAD line number rather than by its
 * text.
 *
 * @param {Context} ctx
 * @param {string} base
 * @param {Change} change
 */
function countRemovedBaseLines(ctx, base, change) {
	const removedNow = readRemovedLines(ctx, change);
	if (removedNow.length === 0 || base === "HEAD") return removedNow.length;

	const baseLineNumbers = readBaseLineNumbers(ctx, base, change.from);
	if (baseLineNumbers === null) return removedNow.length;

	return removedNow.filter((line) => baseLineNumbers.has(line)).length;
}

/**
 * HEAD's line numbers that `git blame <base>..HEAD` marks `boundary`, which
 * are the lines no commit since `base` added. Blame follows each commit's own
 * diff, so a branch line whose text matches a line of the default branch's
 * stays the branch's, where one diff from `base` to HEAD would pair the two.
 * Blame passes `--no-textconv`, because a textconv driver an agent sets with an
 * ungated `git config` changes the text blame compares. Blame's own diff
 * follows `diff.algorithm` and no flag here pins it, so a config that picks a
 * different algorithm can attribute an ambiguous line to a different commit.
 * Returns null when blame fails, such as with a `blame.ignoreRevsFile` naming a
 * missing file, so the caller counts every removed line: a failure that
 * passed the commit would let one config line turn the check off.
 *
 * @param {Context} ctx
 * @param {string} base
 * @param {string} file
 * @returns {Set<number> | null}
 */
function readBaseLineNumbers(ctx, base, file) {
	const blame = runGit(
		ctx.repoRoot,
		["blame", "--no-textconv", "--line-porcelain", `${base}..HEAD`, "--", file],
		{ trim: false, fallback: null }
	);
	if (typeof blame !== "string") return null;

	/** @type {Set<number>} */
	const lines = new Set();
	/** @type {number | null} */
	let number = null;
	for (const line of blame.split("\n")) {
		const header = /^[0-9a-f]{40,64} \d+ (\d+)/.exec(line);
		if (header) number = Number(header[1]);
		else if (line === "boundary" && number !== null) lines.add(number);
	}

	return lines;
}

/**
 * HEAD's line number for each `-` line in the would-be index's zero-context
 * diff against HEAD, read from the hunk headers, so a `---` file header never
 * counts as one. A line next to a missing-final-newline marker that the hunk
 * adds back with the same text is unchanged, because only its newline moved.
 * The diff passes `--no-color`, `--no-ext-diff`, `--no-textconv`, `--text`,
 * and `--inter-hunk-context=0`, because a config that colors, replaces,
 * converts, or merges the diff, or an attribute that marks the file binary,
 * would change the text this parses, and an agent can set any of them with an
 * ungated `git config` or a write to `.git/info/attributes`.
 *
 * @param {Context} ctx
 * @param {Change} change
 * @returns {number[]}
 */
function readRemovedLines(ctx, { from, to }) {
	const diff = runGit(
		ctx.repoRoot,
		[
			"-c",
			"core.quotePath=false",
			"diff",
			"--no-color",
			"--no-ext-diff",
			"--no-textconv",
			"--text",
			"--cached",
			"-M",
			"-U0",
			"--inter-hunk-context=0",
			"--diff-algorithm=histogram",
			"HEAD",
			"--",
			from,
			...(to ? [to] : []),
		],
		{ env: { ...LITERAL_PATHSPECS, GIT_INDEX_FILE: ctx.index.indexFile }, trim: false }
	);

	/** @type {number[]} */
	const removed = [];
	for (const hunk of splitHunks(diff)) {
		const unchanged = findNewlineOnlyLines(hunk.body);
		let number = hunk.oldStart;
		hunk.body.forEach((line, index) => {
			if (!line.startsWith("-")) return;
			if (!unchanged.has(index)) removed.push(number);
			number += 1;
		});
	}

	return removed;
}

/**
 * The body indexes of the `-` lines a hunk only re-terminates. A `\ No newline`
 * marker follows the last line of a file that lacks its final newline, so that
 * line differs from its twin by the newline alone. Only the two lines beside a
 * marker pair, and only when their text is equal: after a `-` line, the `+`
 * line that follows the marker, and after a `+` line, the `-` line just before
 * that `+` run. A line that merely repeats elsewhere in the hunk is a moved
 * line, not an unchanged one.
 *
 * @param {string[]} body
 * @returns {Set<number>}
 */
function findNewlineOnlyLines(body) {
	/** @type {Set<number>} */
	const unchanged = new Set();
	body.forEach((line, marker) => {
		if (line !== NO_NEWLINE_MARKER || marker === 0) return;

		const anchor = marker - 1;
		let twin = -1;
		if (body[anchor].startsWith("-")) {
			twin = body[marker + 1]?.startsWith("+") ? marker + 1 : -1;
		} else if (body[anchor].startsWith("+")) {
			let runStart = anchor;
			while (body[runStart - 1]?.startsWith("+")) runStart -= 1;
			twin = body[runStart - 1]?.startsWith("-") ? runStart - 1 : -1;
		}
		if (twin === -1 || body[twin].slice(1) !== body[anchor].slice(1)) return;

		unchanged.add(body[anchor].startsWith("-") ? anchor : twin);
	});

	return unchanged;
}

/**
 * Each `@@` hunk in a unified diff, with its header's old start line and its body lines.
 *
 * @param {string} diff
 */
function splitHunks(diff) {
	/** @type {{ oldStart: number, body: string[] }[]} */
	const hunks = [];
	/** @type {{ oldStart: number, body: string[] } | null} */
	let current = null;
	for (const line of diff.split("\n")) {
		const header = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
		if (line.startsWith("diff --git ")) {
			current = null;
		} else if (header) {
			current = {
				oldStart: Number(header[1]),
				body: [],
			};
			hunks.push(current);
		} else if (current) {
			current.body.push(line);
		}
	}

	return hunks;
}
