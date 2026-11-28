// @prism-hook-runtime — PRISM delivers this file into a consumer's `.claude/hooks/`.
// A copy carrying this line is PRISM's own and is replaced in place; one without it
// is the consumer's own file and is backed up to `.bak` before being replaced.
/**
 * `merge-bar.mjs <plan.md> [--head <ref>]` checks that a plan's last review
 * record line still holds at the head about to merge.
 *
 * The bar holds when that line reads a bare `clean`, its sha is the head or an
 * ancestor of it, and every commit after the sha is exempt: its subject begins
 * `retro:`, every file it changes sits under the plan's folder, or it changes
 * no files. A merge commit after the sha is never exempt, because a clean
 * refresh and a conflict resolution that changed code look the same from here.
 * Exits 0 when the bar holds, 1 printing one reason per failure, and 2 on a
 * usage error, an unreadable plan, an unknown `--head`, no repo, or a git call
 * that fails.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readReviewLines } from "./lines.mjs";

const SHORT_SHA_LENGTH = 8;

const RERUN = "run another review round";

/** Raised for a plan, ref, or repo the check cannot read; the CLI exits 2. */
export class MergeBarError extends Error {}

/**
 * Returns every reason the merge bar fails for the plan at `head`, or an
 * empty list when it holds.
 *
 * @param {string} planPath
 * @param {string} [head]
 * @returns {string[]}
 */
export function checkMergeBar(planPath, head = "HEAD") {
	/** @type {string} */
	let text;
	try {
		text = readFileSync(planPath, "utf8");
	} catch (error) {
		throw new MergeBarError(
			`cannot read ${planPath}: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	const planDir = realpathSync(path.dirname(path.resolve(planPath)));
	const repoRoot = findRepoRoot(planDir);
	if (repoRoot === null) {
		throw new MergeBarError(`no git repo holds ${planPath}.`);
	}

	const git = (/** @type {string[]} */ ...args) => runGit(repoRoot, args);

	const headSha = git("rev-parse", "--verify", "--quiet", `${head}^{commit}`);
	if (headSha === null) {
		throw new MergeBarError(`--head ${head} names no commit.`);
	}

	const last = readReviewLines(text).at(-1);
	if (last === undefined) {
		return [`no review record line under ## Review; ${RERUN}.`];
	}

	/** @type {string[]} */
	const reasons = [];

	if (last.verdict !== "clean") {
		reasons.push(`the last review line reads "${last.line}", not a bare clean.`);
	}

	const reviewedSha = git("rev-parse", "--verify", "--quiet", `${last.sha}^{commit}`);
	if (reviewedSha === null) {
		reasons.push(`reviewed sha ${last.sha} names no commit in this repo; ${RERUN}.`);
		return reasons;
	}

	if (!isAncestor(repoRoot, reviewedSha, headSha)) {
		reasons.push(`reviewed sha ${last.sha} is not reachable from ${head}; ${RERUN}.`);
		return reasons;
	}

	const planFolder = `${path.relative(repoRoot, planDir).replace(/\\/g, "/")}/`;
	const log = git("log", "--reverse", "--format=%H%x00%P%x00%s", `${reviewedSha}..${headSha}`);
	if (log === null) {
		throw new MergeBarError(`git log ${short(reviewedSha)}..${short(headSha)} failed.`);
	}

	for (const entry of log.split("\n").filter(Boolean)) {
		const [sha = "", parents = "", subject = ""] = entry.split("\0");
		const shortSha = short(sha);

		if (parents.trim().split(/\s+/).length > 1) {
			reasons.push(`merge commit ${shortSha} "${subject}" follows the reviewed sha; ${RERUN}.`);
			continue;
		}

		if (subject.startsWith("retro:")) continue;

		const changed = git("diff-tree", "--no-commit-id", "--name-only", "-r", "-z", sha);
		if (changed === null) {
			throw new MergeBarError(`git diff-tree failed for commit ${shortSha} "${subject}".`);
		}

		const files = changed.split("\0").filter(Boolean);

		if (files.every((file) => file.startsWith(planFolder))) continue;

		reasons.push(
			`commit ${shortSha} "${subject}" changes files outside ${planFolder} after the reviewed sha; ${RERUN}.`
		);
	}

	return reasons;
}

/**
 * @param {string} sha
 * @returns {string}
 */
function short(sha) {
	return sha.slice(0, SHORT_SHA_LENGTH);
}

/**
 * Runs git with no shell and returns its trimmed stdout, or null on a
 * non-zero exit.
 *
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string | null}
 */
function runGit(cwd, args) {
	const result = spawnSync("git", args, { cwd, encoding: "utf8" });

	if (result.error) {
		throw new MergeBarError(`cannot run git: ${result.error.message}`);
	}

	return result.status === 0 ? result.stdout.trim() : null;
}

/**
 * @param {string} cwd
 * @param {string} ancestor
 * @param {string} descendant
 * @returns {boolean}
 */
function isAncestor(cwd, ancestor, descendant) {
	return (
		spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], { cwd }).status === 0
	);
}

/**
 * @param {string} start
 * @returns {string | null}
 */
function findRepoRoot(start) {
	let dir = start;

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
	/** @type {string | undefined} */
	let planPath;
	let head = "HEAD";

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === "--head" && argv[index + 1] !== undefined) {
			head = /** @type {string} */ (argv[index + 1]);
			index += 1;
		} else if (planPath === undefined && arg !== undefined && !arg.startsWith("--")) {
			planPath = arg;
		} else {
			planPath = undefined;
			break;
		}
	}

	if (planPath === undefined) {
		process.stderr.write("Usage: merge-bar.mjs <plan.md> [--head <ref>]\n");
		process.exitCode = 2;
		return;
	}

	/** @type {string[]} */
	let reasons;
	try {
		reasons = checkMergeBar(planPath, head);
	} catch (error) {
		process.stderr.write(
			`merge-bar.mjs: ${(error instanceof Error ? error.message : String(error)).trim()}\n`
		);
		process.exitCode = 2;
		return;
	}

	for (const reason of reasons) process.stdout.write(`${reason}\n`);
	process.exitCode = reasons.length === 0 ? 0 : 1;
}

const isEntryModule =
	process.argv[1] !== undefined &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryModule) runCli(process.argv.slice(2));
